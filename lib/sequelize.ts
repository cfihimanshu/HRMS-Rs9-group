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
      // Plain sync creates only a missing table. It never alters an existing one.
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
      // Adding a required column to a populated imported database can fail. Preserve
      // NOT NULL only when Sequelize also has a safe default for existing rows.
      allowNull: attribute.allowNull !== false || attribute.defaultValue === undefined,
    };
    if (attribute.defaultValue !== undefined) definition.defaultValue = attribute.defaultValue;
    if (attribute.comment) definition.comment = attribute.comment;

    try {
      await instance.getQueryInterface().addColumn(tableName, columnName, definition);
      console.info(`[database schema] Added missing column: ${tableName}.${columnName}`);
      existingColumns[columnName] = definition;
    } catch (error: any) {
      // Another server instance may have added the same column after describeTable.
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
  // Production schema changes are deployed through reviewed migrations. Runtime
  // column creation is intentionally opt-in so connecting the app to a live
  // database can never mutate its schema merely by authenticating.
  if (process.env.AUTO_CREATE_MISSING_COLUMNS !== "true") return;

  const checks = globalThis.schemaCheckPromises || new Map<string, Promise<void>>();
  globalThis.schemaCheckPromises = checks;

  for (const model of Object.values(instance.models)) {
    const modelName = (model as any).name;
    if (!checks.has(modelName)) {
      const check = ensureModelSchema(instance, model).catch((error) => {
        // Allow a later request to retry after a temporary privilege/connection issue.
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
    await authenticateWithoutSchemaCheck(...args);
    await ensureLoadedModelsSchema(instance);
  }) as Sequelize["authenticate"];
  globalThis.sequelizeSchemaWrapperInstalled = true;
}

const getSequelizeInstance = () => {
  if (globalThis.sequelizeInstance) {
    installSchemaCheck(globalThis.sequelizeInstance);
    return globalThis.sequelizeInstance;
  }

  const requiredDatabaseEnv = ["MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_HOST"] as const;
  const missingDatabaseEnv = requiredDatabaseEnv.filter(key => !process.env[key]);
  if (missingDatabaseEnv.length > 0) {
    throw new Error(`Missing required database environment variables: ${missingDatabaseEnv.join(", ")}`);
  }

  const instance = new Sequelize(
    process.env.MYSQL_DATABASE!,
    process.env.MYSQL_USER!,
    process.env.MYSQL_PASSWORD!,
    {
      host: process.env.MYSQL_HOST!,
      port: Number(process.env.MYSQL_PORT) || 3306,
      dialect: "mysql",
      dialectModule: mysql2,
      logging: false,
      dialectOptions: {
        connectTimeout: 5000,
        ssl: process.env.MYSQL_SSL === "true"
          ? { rejectUnauthorized: process.env.MYSQL_SSL_REJECT_UNAUTHORIZED !== "false" }
          : undefined
      },
      pool: {
        max: 20,
        min: 0,
        acquire: 10000,
        idle: 5000,
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

export async function safeAuthenticate(timeoutMs = 4000) {
  try {
    const authPromise = sequelize.authenticate();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database connection timeout")), timeoutMs)
    );
    await Promise.race([authPromise, timeoutPromise]);
    return true;
  } catch (err) {
    console.warn("Database connection timeout or error:", (err as any)?.message);
    return false;
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
