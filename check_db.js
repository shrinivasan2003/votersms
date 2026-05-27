import db from './server/db.js';

db.query('SHOW TABLES', (err, rows) => {
  if (err) {
    console.error('Error fetching tables:', err);
  } else {
    console.log('Tables in database:', rows);
  }
  process.exit();
});
