from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

import sys, os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.database import DB_URL
config.set_main_option('sqlalchemy.url', DB_URL)

# The app's runtime model layer (app/models) uses SQLAlchemy automap to
# reflect tables directly from the live DB, rather than declaring them
# against app.database.Base — so Base.metadata is always empty and is
# NOT usable as Alembic's diff target (comparing against it would make
# autogenerate think every real table should be dropped).
#
# Instead, target_metadata is built by reflecting the *actual* live
# schema at the moment `alembic revision --autogenerate` runs. This
# makes autogenerate diff "live schema" vs "live schema" for any table
# that hasn't changed — i.e. it only proposes changes for tables you've
# actually edited since the last migration, exactly like a normal
# Alembic setup with declared models would.
from sqlalchemy import create_engine, MetaData

target_metadata = MetaData()


def _reflect_target_metadata():
    reflect_engine = create_engine(DB_URL)
    try:
        target_metadata.reflect(bind=reflect_engine)
    finally:
        reflect_engine.dispose()


_reflect_target_metadata()

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
