import db from './server/db.js';

const createTablesQuery = `
CREATE TABLE IF NOT EXISTS counties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  state VARCHAR(50) DEFAULT 'GA',
  status VARCHAR(50) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS precincts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  county VARCHAR(255) NOT NULL,
  zipcode VARCHAR(20),
  status VARCHAR(50) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sms_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  body TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

console.log('Connecting to database and creating tables...');

// Split queries because mysql2 might not support multiple statements in one call by default
const queries = createTablesQuery.split(';').filter(q => q.trim());

const executeQueries = async () => {
  for (const query of queries) {
    try {
      await new Promise((resolve, reject) => {
        db.query(query, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
      console.log('Success executing query:', query.substring(0, 50) + '...');
    } catch (err) {
      console.error('Error executing query:', err.message);
    }
  }
  process.exit();
};

executeQueries();
