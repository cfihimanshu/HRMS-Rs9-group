import { Sequelize } from "sequelize";
import mysql2 from "mysql2";

/* eslint-disable no-var */
declare global {
  var sequelizeInstance: Sequelize | undefined;
  var schemaCheckPromises: Map<string, Promise<void>> | undefined;
  var sequelizeSchemaWrapperInstalled: boolean | undefined;
}
/* eslint-enable no-var */

function getPhysicalTableName(model: any): string {
  const table = model.getTableName();
  return typeof table === "string" ? table : table.tableName;
}

async function ensureModelSchema(instance: Sequelize, model: any) {
  const tableName = getPhysicalTableName(model);
  let existingColumns: Record<string, unknown>;

  try {
    existingColumns = await instance.getQueryInterface().describeTable(tableName);
  } catch (error: any) {
    const message = String(error?.message || "");
    if (
      error?.original?.code === "ER_NO_SUCH_TABLE" ||
      message.includes("doesn't exist") ||
      message.includes("No description found")
    ) {
      await model.sync();
      console.info(`[database schema] Created missing table: ${tableName}`);
      return;
    }
    throw error;
  }

  const attributes = model.rawAttributes || model.getAttributes?.() || {};
  for (const [attributeName, attribute] of Object.entries(attributes) as Array<[string, any]>) {
    if (attribute?.type?.key === "VIRTUAL") continue;

    const columnName = attribute.field || attribute.fieldName || attributeName;
    if (Object.prototype.hasOwnProperty.call(existingColumns, columnName)) continue;

    const definition: any = {
      type: attribute.type,
      allowNull: attribute.allowNull !== false || attribute.defaultValue === undefined,
    };
    if (attribute.defaultValue !== undefined) definition.defaultValue = attribute.defaultValue;
    if (attribute.comment) definition.comment = attribute.comment;

    try {
      await instance.getQueryInterface().addColumn(tableName, columnName, definition);
      console.info(`[database schema] Added missing column: ${tableName}.${columnName}`);
      existingColumns[columnName] = definition;
    } catch (error: any) {
      if (error?.original?.code === "ER_DUP_FIELDNAME") {
        existingColumns[columnName] = definition;
        continue;
      }
      throw new Error(
        `Unable to add required column ${tableName}.${columnName}: ${error?.message || error}`
      );
    }
  }
}

async function ensureLoadedModelsSchema(instance: Sequelize) {
  if (process.env.AUTO_CREATE_MISSING_COLUMNS !== "true") return;

  const checks = globalThis.schemaCheckPromises || new Map<string, Promise<void>>();
  globalThis.schemaCheckPromises = checks;

  for (const model of Object.values(instance.models)) {
    const modelName = (model as any).name;
    if (!checks.has(modelName)) {
      const check = ensureModelSchema(instance, model).catch((error) => {
        checks.delete(modelName);
        throw error;
      });
      checks.set(modelName, check);
    }
    await checks.get(modelName);
  }
}

function installSchemaCheck(instance: Sequelize) {
  if (globalThis.sequelizeSchemaWrapperInstalled) return;

  const authenticateWithoutSchemaCheck = instance.authenticate.bind(instance);
  instance.authenticate = (async (...args: Parameters<Sequelize["authenticate"]>) => {
    try {
      await authenticateWithoutSchemaCheck(...args);
    } catch (err: any) {
      const msg = String(err?.message || err || "");
      if (
        msg.includes("ETIMEDOUT") ||
        msg.includes("ECONNRESET") ||
        msg.includes("Connection lost") ||
        msg.includes("ProtocolError") ||
        msg.includes("SequelizeConnectionError")
      ) {
        console.warn("[Sequelize Connection Retry] Retrying authentication after transient timeout/error:", msg);
        await new Promise((r) => setTimeout(r, 300));
        await authenticateWithoutSchemaCheck(...args);
      } else {
        throw err;
      }
    }
    await ensureLoadedModelsSchema(instance);
  }) as Sequelize["authenticate"];
  globalThis.sequelizeSchemaWrapperInstalled = true;
}

const getSequelizeInstance = () => {
  if (globalThis.sequelizeInstance) {
    installSchemaCheck(globalThis.sequelizeInstance);
    return globalThis.sequelizeInstance;
  }

  const requiredDatabaseEnv = ["MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD"] as const;
  const missingDatabaseEnv: string[] = requiredDatabaseEnv.filter(key => !process.env[key]);
  if (!process.env.MYSQL_HOST && !process.env.MYSQL_SOCKET_PATH) {
    missingDatabaseEnv.push("MYSQL_HOST or MYSQL_SOCKET_PATH");
  }
  if (missingDatabaseEnv.length > 0) {
    throw new Error(`Missing required database environment variables: ${missingDatabaseEnv.join(", ")}`);
  }

  const isVercel = process.env.VERCEL === "1";
  const connectTimeout = Number(process.env.MYSQL_CONNECT_TIMEOUT_MS || 10000);
  const poolMax = Number(process.env.MYSQL_POOL_MAX || (isVercel ? 2 : (process.env.NODE_ENV === "production" ? 5 : 20)));
  const poolAcquire = Number(process.env.MYSQL_POOL_ACQUIRE_MS || 15000);
  const socketPath = process.env.MYSQL_SOCKET_PATH?.trim();

  const host = process.env.MYSQL_HOST || "localhost";
  const isRemote = host !== "localhost" && host !== "127.0.0.1";
  const useSsl = process.env.MYSQL_SSL === "true" || (isRemote && process.env.MYSQL_SSL !== "false");
  const sslConfig = useSsl
    ? { rejectUnauthorized: process.env.MYSQL_SSL_REJECT_UNAUTHORIZED === "true" }
    : undefined;

  const instance = new Sequelize(
    process.env.MYSQL_DATABASE!,
    process.env.MYSQL_USER!,
    process.env.MYSQL_PASSWORD!,
    {
      host,
      port: Number(process.env.MYSQL_PORT) || 3306,
      dialect: "mysql",
      dialectModule: mysql2,
      logging: false,
      dialectOptions: {
        connectTimeout,
        ...(socketPath ? { socketPath } : {}),
        ssl: sslConfig,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
      },
      pool: {
        max: poolMax,
        min: 0,
        acquire: poolAcquire,
        idle: 2000,
        evict: 1000
      }
    }
  );

  installSchemaCheck(instance);
  globalThis.sequelizeInstance = instance;
  return instance;
};

const sequelize = getSequelizeInstance();

let isAssociationsInitialized = false;

export async function safeAuthenticate(timeoutMs = 5000) {
  try {
    const authPromise = sequelize.authenticate();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database connection timeout")), timeoutMs)
    );
    await Promise.race([authPromise, timeoutPromise]);
    return true;
  } catch (err) {
    console.warn("Database connection timeout or error:", (err as any)?.message);
    try {
      await new Promise((r) => setTimeout(r, 200));
      await sequelize.authenticate();
      return true;
    } catch (_) {
      return false;
    }
  }
}

export async function connectSequelize() {
  try {
    const ok = await safeAuthenticate(5000);
    if (ok && !isAssociationsInitialized) {
      await import("../models/sequelize/associations");
      isAssociationsInitialized = true;
    }
  } catch (error) {
    console.error("Unable to connect to the MySQL database:", error);
  }
}

export default sequelize;
