import logging
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_postgis_status() -> bool:
    """Check if PostGIS extension is available or enabled in PostgreSQL."""
    try:
        with engine.connect() as conn:
            # Try enabling postgis if extension exists
            try:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
                conn.commit()
            except Exception as e:
                logger.info("CREATE EXTENSION postgis did not execute: %s", e)
                conn.rollback()

            res = conn.execute(text("SELECT extname, extversion FROM pg_extension WHERE extname = 'postgis';")).fetchone()
            if res:
                logger.info(f"PostGIS extension detected: {res[0]} version {res[1]}")
                return True
            else:
                logger.info("PostGIS extension not active yet in PostgreSQL. Spatial engine will use native Shapely+GeoAlchemy geometry handling.")
                return False
    except Exception as e:
        logger.warning(f"Could not verify PostGIS extension status: {e}")
        return False
