# BallotDA Civic Engagement Portal

BallotDA is a professional Civic Engagement Portal designed for managing voters, precincts, and communication campaigns via SMS, Email, and WhatsApp.

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **Aiven MySQL Database** (or any MySQL instance)

### 2. Database Setup
The project uses a secure cloud database. To initialize the tables and seed the default admin user:

```bash
cd server
npm install
node setup_db.js
```

### 3. Environment Configuration
Create a `.env` file inside the `server/` directory with the following credentials:
```env
DB_HOST=your-aiven-host
DB_PORT=your-port
DB_USER=your-user
DB_PASS=your-password
DB_NAME=defaultdb
```
*(Note: `.env` files are ignored by Git for security)*

## 🛠️ Running the Application

You need two terminal windows open simultaneously:

### Terminal 1: Backend (Server)
```bash
cd server
node index.js
```
*Server will run on: `http://localhost:5000`*

### Terminal 2: Frontend (Website)
```bash
npm install
npm run dev
```
*Portal will be accessible at: `http://localhost:5173`*

## 🔑 Default Credentials
- **Username:** `admin`
- **Password:** `admin123`

## 📦 Features
- **Dashboard**: Real-time analytics and statistics.
- **Voter Master**: Manage voters and precinct details.
- **Communication Hub**:
  - SMS & WhatsApp Template Management.
  - SMS Provider Integration (Twilio).
  - Bulk Message Dispatch Engine.
- **Security**: Role-based access control and secure API authentication.

## 🔗 Repository
[https://github.com/AbinayaAnand17/votersms](https://github.com/AbinayaAnand17/votersms)
