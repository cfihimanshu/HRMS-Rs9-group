import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class AssetInventory extends Model<any, any> { [key: string]: any; }

AssetInventory.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    oldAssetId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    assetType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    assetDetail: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    serialNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    purchaseDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    purchaseValue: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    condition: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "Good",
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Available",  // Available | In Use | Damaged | Disposed
    },
    companyId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    registeredBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    photoUrl: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    customFields: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    phonePassword: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    simCompany: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sim1Number: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sim2Number: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    externalWhatsappNo: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    laptopOs: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    laptopHostName: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    simPlanType: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    routerWifiSsid: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    printerCartridge: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    furnitureLocation: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    socialMediaApp: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    socialMediaUsername: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    socialMediaPassword: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    phoneCharger: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    phoneColor: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    laptopCharger: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    laptopBag: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    simPuk: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    simKycName: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    routerIp: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    routerAdminPass: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    routerIsp: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    printerIp: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "asset_inventory",
    timestamps: true,
  }
);

export default AssetInventory;
