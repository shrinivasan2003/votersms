# BallotDA — Civic Engagement Portal

BallotDA is a multi-tenant civic engagement platform for managing voter outreach campaigns via SMS, Email, and WhatsApp. Each customer organisation operates in a fully isolated data environment within a single shared application.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | FastAPI (Python 3.12) |
| Database | MySQL |
| Migrations | Alembic |
| Email | Postmark |
| Auth | JWT (Bearer token) |
| Web Server | Nginx + systemd |

---

## Architecture Overview

- **Platform Admin** — manages customer organisations; accessed at `/admin`. No access to the main application.
- **Customer Users** — log in at `/login`; see only their own organisation's data enforced at every API query via `customer_id`.
- **Landing Page** — public entry point at `/`.

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- Python 3.12+
- MySQL 8+

---

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/votersms.git
cd votersms
```

---

### 2. Database

```bash
mysql -u root -p
```
```sql
CREATE DATABASE votersms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

---

### 3. Backend

```bash
cd python_server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `.env` (never commit this file):

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_mysql_password
DB_NAME=votersms

JWT_SECRET=generate_with_python_secrets_token_hex_32
JWT_EXPIRE_MINUTES=1440

ALLOWED_ORIGINS=http://localhost:5173

# Platform admin credentials (backend only — never expose in frontend)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Postmark — leave API key blank to disable welcome emails
POSTMARK_API_KEY=your_postmark_server_token
POSTMARK_SENDER_EMAIL=noreply@yourdomain.com
POSTMARK_SENDER_NAME=BallotDA

WEBHOOK_SECRET=generate_with_python_secrets_token_hex_24
```

Run migrations and start:

```bash
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`

---

### 4. Frontend

```bash
# From repo root
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## Admin Panel (`/admin`)

Three tabs — completely separate from the customer-facing application:

| Tab | Purpose |
|-----|---------|
| **Create User** | Create a new customer organisation + initial admin user. Sends a Postmark welcome email automatically. |
| **Monitor Usage** | View all customer accounts with last login, status. Pause / Deactivate / Activate / Delete accounts. |
| **Master Settings** | Configure Postmark sender name and email. Shows API key connection status (key itself stays in `.env`). |

---

## Customer Application

After customer login, the sidebar provides:

| Section | Pages |
|---------|-------|
| **Masters** | Organisation, Recipients / Voters, SMS Templates, Email Templates, WhatsApp Templates |
| **Transactions** | SMS Jobs, Email Jobs, WhatsApp Jobs, Process Jobs |
| **Reports** | SMS Delivery Report, Email Analytics |
| **Configuration** | SMS Providers, Email Providers, WhatsApp Providers (per-customer, isolated) |

---

## Data Isolation

Every API query applies a `customer_id` filter when the logged-in user has a `customer_id`:

- Customer users → `WHERE customer_id = :cid`
- Platform admin (`customer_id = NULL`) → sees all data unfiltered

Affected tables: `voters`, `sms_templates`, `email_templates`, `whatsapp_templates`, `sms_jobs`, `email_jobs`, `whatsapp_jobs`, `sms_providers`, `email_providers`, `whatsapp_providers`, `contact_lists`

---

## Production Deployment

### First-time setup on a Linux server

```bash
# Install dependencies (Ubuntu/Debian)
sudo apt install -y git nginx mysql-server python3 python3-venv nodejs npm

# Clone
cd /opt && sudo git clone <repo-url> votersms
sudo chown -R $USER:$USER /opt/votersms

# Backend
cd /opt/votersms/python_server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Create and populate .env (see Local Development section above)
alembic upgrade head

# Frontend
cd /opt/votersms
npm install && npm run build

# systemd service → /etc/systemd/system/votersms.service
sudo systemctl enable votersms
sudo systemctl start votersms

# Nginx → /etc/nginx/sites-available/votersms
sudo systemctl reload nginx
```

### Deploying updates

```bash
cd /opt/votersms
git pull origin main
npm run build                          # if frontend changed
sudo systemctl restart votersms        # if backend changed

# Only if new migrations were added:
cd python_server && source .venv/bin/activate && alembic upgrade head

# Only if new packages were added:
pip install -r requirements.txt
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_HOST` | Yes | MySQL host |
| `DB_PORT` | Yes | MySQL port (default 3306) |
| `DB_USER` | Yes | MySQL username |
| `DB_PASS` | Yes | MySQL password |
| `DB_NAME` | Yes | MySQL database name |
| `JWT_SECRET` | Yes | Random hex string for signing tokens |
| `JWT_EXPIRE_MINUTES` | No | Token expiry (default 1440) |
| `ALLOWED_ORIGINS` | Yes | Comma-separated frontend URLs |
| `ADMIN_USERNAME` | Yes | Platform admin username |
| `ADMIN_PASSWORD` | Yes | Platform admin password |
| `POSTMARK_API_KEY` | No | Postmark server token (welcome emails disabled if blank) |
| `POSTMARK_SENDER_EMAIL` | No | Verified sender address in Postmark |
| `POSTMARK_SENDER_NAME` | No | Display name for outgoing emails |
| `WEBHOOK_SECRET` | No | Postmark webhook security token |
