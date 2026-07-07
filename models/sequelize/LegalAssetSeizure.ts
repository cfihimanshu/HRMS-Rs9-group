import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class LegalAssetSeizure extends Model<any, any> { [key: string]: any; }

LegalAssetSeizure.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    masterId: {
      type: DataTypes.INTEGER, // Link to LegalRecoveryMaster
      allowNull: false,
    },
    assetType: {
      type: DataTypes.STRING, // e.g. 2-Wheeler, 4-Wheeler, Commercial Vehicle, Property
      allowNull: false,
    },
    assetDetails: {
      type: DataTypes.TEXT, // Registration Number, Engine No, Chassis No, etc.
      allowNull: false,
    },
    seizureDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING, // Location where the asset was seized
      allowNull: true,
    },
    yardName: {
      type: DataTypes.STRING, // Name of the yard where asset is parked
      allowNull: true,
    },
    policeIntimationStatus: {
      type: DataTypes.STRING, // Done, Pending, Not Required
      allowNull: true,
      defaultValue: "Pending",
    },
    photosUrls: {
      type: DataTypes.TEXT, // JSON string of photo URLs of the seized asset
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING, // Surrendered, Seized, Released, Sold
      allowNull: true,
      defaultValue: "Seized",
    }
  },
  {
    sequelize,
    tableName: "legal_asset_seizures",
    timestamps: true,
  }
);

export default LegalAssetSeizure;
