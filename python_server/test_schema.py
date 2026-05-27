import sys
from sqlalchemy import create_engine, MetaData
from app.database import SQLALCHEMY_DATABASE_URL
engine = create_engine(SQLALCHEMY_DATABASE_URL)
metadata = MetaData()
metadata.reflect(bind=engine)
for col in metadata.tables['email_providers'].columns:
    print(col.name)
