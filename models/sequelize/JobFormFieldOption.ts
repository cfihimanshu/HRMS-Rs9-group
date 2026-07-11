import { DataTypes, Model } from "sequelize";
import sequelize from "../../lib/sequelize";

class JobFormFieldOption extends Model<any, any> { [key: string]: any; }

JobFormFieldOption.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    fieldId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: "job_form_field_options",
    timestamps: true,
  }
);

export default JobFormFieldOption;
