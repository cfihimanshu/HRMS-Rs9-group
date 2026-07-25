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
      type: DataTypes.STRING,
      allowNull: true,
    },
    simCompany: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sim1Number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sim2Number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    externalWhatsappNo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    laptopOs: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    laptopHostName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    simPlanType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    routerWifiSsid: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    printerCartridge: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    furnitureLocation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    socialMediaApp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    socialMediaUsername: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    socialMediaPassword: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phoneCharger: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phoneColor: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    laptopCharger: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    laptopBag: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    simPuk: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    simKycName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    routerIp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    routerAdminPass: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    routerIsp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    printerIp: {
      type: DataTypes.STRING,
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
