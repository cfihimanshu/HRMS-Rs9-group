const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'root123',
  database: 'hrms_new'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting: ' + err.stack);
    return;
  }
  console.log('Connected to database hrms_new.');

  connection.query("SHOW INDEX FROM `legal_notice_types` WHERE Key_name != 'PRIMARY'", (err, results) => {
    if (err) {
      console.error('Error running show index:', err);
      connection.end();
      return;
    }
    console.log('Found ' + results.length + ' indexes.');
    
    // Drop unique/excess indexes
    let idx = 0;
    const dropNext = () => {
      if (idx >= results.length) {
        console.log('Done cleaning indexes.');
        connection.end();
        return;
      }
      const indexName = results[idx].Key_name;
      console.log('Dropping index: ' + indexName);
      connection.query("ALTER TABLE `legal_notice_types` DROP INDEX `" + indexName + "`", (err) => {
        if (err) {
          console.error('Failed to drop index ' + indexName + ':', err.message);
        } else {
          console.log('Dropped ' + indexName);
        }
        idx++;
        dropNext();
      });
    };
    dropNext();
  });
});
