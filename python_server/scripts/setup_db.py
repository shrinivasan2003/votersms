import os
import pymysql
import pymysql.constants.CLIENT as CLIENT
from dotenv import load_dotenv

load_dotenv()

schema = """
CREATE TABLE IF NOT EXISTS counties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  state VARCHAR(50) DEFAULT 'GA',
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS precincts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  county_id INT,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  zipcode VARCHAR(20),
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (county_id) REFERENCES counties(id)
);

CREATE TABLE IF NOT EXISTS voters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  precinct_id INT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (precinct_id) REFERENCES precincts(id)
);

CREATE TABLE IF NOT EXISTS sms_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'User',
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sms_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  precinct_id INT,
  template_id INT,
  provider_id VARCHAR(50),
  scheduled_at DATETIME,
  status VARCHAR(20) DEFAULT 'Pending',
  recipients INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (precinct_id) REFERENCES precincts(id),
  FOREIGN KEY (template_id) REFERENCES sms_templates(id)
);

CREATE TABLE IF NOT EXISTS email_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  precinct_id INT,
  template_id INT,
  provider_id VARCHAR(50),
  scheduled_at DATETIME,
  status VARCHAR(20) DEFAULT 'Pending',
  recipients INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (precinct_id) REFERENCES precincts(id),
  FOREIGN KEY (template_id) REFERENCES email_templates(id)
);

CREATE TABLE IF NOT EXISTS whatsapp_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  precinct_id INT,
  template_id INT,
  provider_id VARCHAR(50),
  scheduled_at DATETIME,
  status VARCHAR(20) DEFAULT 'Pending',
  recipients INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (precinct_id) REFERENCES precincts(id),
  FOREIGN KEY (template_id) REFERENCES whatsapp_templates(id)
);

CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) NOT NULL UNIQUE,
  resource_path VARCHAR(255),
  resource_type VARCHAR(50),
  parent_menu VARCHAR(255),
  icon VARCHAR(50),
  display_order INT DEFAULT 0,
  description TEXT,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sms_providers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'Twilio',
  priority INT DEFAULT 1,
  account_sid VARCHAR(255),
  auth_token VARCHAR(255),
  from_number VARCHAR(50),
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_providers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'SMTP',
  smtp_host VARCHAR(255),
  smtp_port VARCHAR(10),
  smtp_user VARCHAR(255),
  smtp_pass VARCHAR(255),
  config_email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS whatsapp_providers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'Twilio',
  account_sid VARCHAR(255),
  auth_token VARCHAR(255),
  from_number VARCHAR(50),
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

def setup_database():
    connection = pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASS", ""),
        database=os.getenv("DB_NAME", "votersms"),
        client_flag=CLIENT.MULTI_STATEMENTS,
        autocommit=True
    )
    
    try:
        print('Running schema setup...')
        with connection.cursor() as cursor:
            cursor.execute(schema)
        print('Database tables verified/created successfully.')
        
        with connection.cursor() as cursor:
            cursor.execute("INSERT IGNORE INTO counties (code, name, state) VALUES ('001', 'Fulton', 'GA')")
            cursor.execute("INSERT IGNORE INTO users (username, password, name, role) VALUES ('admin', 'admin123', 'Administrator', 'Admin')")
            cursor.execute("INSERT IGNORE INTO roles (code, name, description) VALUES ('admin', 'Administrator', 'Full system access with all privileges')")
            
        print('Ensured Fulton county, Admin user, and Administrator role exist.')
    except Exception as e:
        print('Setup failed:', e)
    finally:
        connection.close()

if __name__ == "__main__":
    setup_database()
