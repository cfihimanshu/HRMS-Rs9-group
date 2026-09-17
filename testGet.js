const { Op } = require('sequelize');

function test(userId) {
  let whereClause = {};
  whereClause.employee_id = userId;
  console.log(whereClause);
}
test('1782968291659');
