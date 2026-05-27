"""SQLAlchemy reflected models for the existing MySQL schema.
The tables are automapped at runtime so they always match the current DB structure.
Each table is exposed as a class with a PascalCase name (e.g., `User`).
"""

from sqlalchemy.ext.automap import automap_base
from app.database import engine, Base

# Automap the existing tables
AutomapBase = automap_base()
AutomapBase.prepare(engine, reflect=True)

# Expose each reflected table as a nicely‑named class
User = AutomapBase.classes.users
County = AutomapBase.classes.counties
Precinct = AutomapBase.classes.precincts
Voter = AutomapBase.classes.voters
SmsTemplate = AutomapBase.classes.sms_templates
EmailTemplate = AutomapBase.classes.email_templates
WhatsappTemplate = AutomapBase.classes.whatsapp_templates
SmsJob = AutomapBase.classes.sms_jobs
EmailJob = AutomapBase.classes.email_jobs
WhatsappJob = AutomapBase.classes.whatsapp_jobs
Dashboard = getattr(AutomapBase.classes, "dashboard", None)
SmsProvider = AutomapBase.classes.sms_providers
EmailProvider = AutomapBase.classes.email_providers
WhatsappProvider = AutomapBase.classes.whatsapp_providers
Permission = AutomapBase.classes.permissions
Role = AutomapBase.classes.roles

# Export the Base so Alembic can discover the metadata
__all__ = [
    "Base",
    "User",
    "County",
    "Precinct",
    "SmsTemplate",
    "SmsJob",
    "Dashboard",
    "SmsProvider",
    "EmailProvider",
    "WhatsappProvider",
    "Permission",
    "Role",
]
