const { Sequelize } = require('sequelize');
const fs = require('fs');

async function run() {
  const sequelize = new Sequelize('fmojnedg_Rs9_Group_HRMS', 'fmojnedg_Rs9_Group', 'Legal786skr', {
    host: '103.191.208.201',
    dialect: 'mysql',
    logging: false,
  });

  try {
    const [results] = await sequelize.query(`
      SELECT 
        u.id as UserID,
        ep.employeeId as StaffID,
        u.name as Name,
        u.email as Email,
        u.mobile as Mobile,
        d.name as Department,
        des.name as Designation,
        u.status as Status
      FROM users u
      LEFT JOIN employeeprofiles ep ON u.id = ep.user
      LEFT JOIN departments d ON ep.department = d.id
      LEFT JOIN designations des ON ep.designation = des.id
    `);

    if (results.length === 0) {
      console.log("No data found.");
      return;
    }

    const header = ['HRMS Staff / Employee ID', 'User ID', 'Name', 'Email', 'Mobile', 'Department', 'Designation', 'Active / Inactive status'];
    const rows = results.map(r => {
      return [
        r.StaffID || '',
        r.UserID || '',
        r.Name || '',
        r.Email || '',
        r.Mobile || '',
        r.Department || '',
        r.Designation || '',
        r.Status || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [header.map(h => `"${h}"`).join(','), ...rows].join('\n');
    const outputPath = 'hrms_staff_export.csv';
    fs.writeFileSync(outputPath, csvContent);
    console.log(`Exported ${results.length} records to ${outputPath} successfully!`);

  } catch (err) {
    console.error("Failed to export", err);
  } finally {
    await sequelize.close();
  }
}

run();
