import { Sequelize, DataTypes, Model } from 'sequelize';

const sequelize = new Sequelize('hrms', 'root', 'Legal786skr', {
  host: '127.0.0.1',
  port: 3306,
  dialect: 'mysql',
  logging: false,
});

class User extends Model {}
User.init({
  id: { type: DataTypes.STRING, primaryKey: true },
  name: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  role: { type: DataTypes.STRING },
  companies: { type: DataTypes.JSON },
}, { sequelize, tableName: "users", timestamps: true });

class EmployeeProfile extends Model {}
EmployeeProfile.init({
  id: { type: DataTypes.STRING, primaryKey: true },
  user: { type: DataTypes.STRING },
  department: { type: DataTypes.STRING },
}, { sequelize, tableName: "employeeprofiles", timestamps: true });

class Department extends Model {}
Department.init({
  id: { type: DataTypes.STRING, primaryKey: true },
  name: { type: DataTypes.STRING },
}, { sequelize, tableName: "departments", timestamps: true });

class Company extends Model {}
Company.init({
  id: { type: DataTypes.STRING, primaryKey: true },
  name: { type: DataTypes.STRING },
}, { sequelize, tableName: "companies", timestamps: true });

async function run() {
  try {
    const employees = await User.findAll({ where: {}, raw: true });
    const profiles = await EmployeeProfile.findAll({ where: {}, raw: true });
    const departments = await Department.findAll({ where: {}, raw: true });
    const allCompanies = await Company.findAll({ where: {}, raw: true });

    const deptMap = departments.reduce((acc, dept) => {
      acc[dept.id] = dept;
      return acc;
    }, {});

    const compMap = allCompanies.reduce((acc, comp) => {
      acc[comp.id] = comp;
      return acc;
    }, {});

    const profilesWithDept = profiles.map(p => {
      const pJson = { ...p };
      if (pJson.department) {
        pJson.department = deptMap[pJson.department] || null;
      }
      return pJson;
    });

    const mergedData = employees.map(emp => {
      const empJson = { ...emp };
      const profile = profilesWithDept.find((p) => p.user?.toString() === empJson.id?.toString());
      
      if (typeof empJson.companies === 'string') {
        try { empJson.companies = JSON.parse(empJson.companies); } catch (e) {}
      }
      if (empJson.companies && Array.isArray(empJson.companies)) {
        empJson.companies = empJson.companies.map((compId) => compMap[compId] || { id: compId, name: "Unknown Company", code: "N/A" });
      }

      return {
        ...empJson,
        employeeProfile: profile || null
      };
    });
    console.log("Merged data length:", mergedData.length);
  } catch (e) {
    console.error("DB Error:", e);
  } finally {
    await sequelize.close();
  }
}
run();
