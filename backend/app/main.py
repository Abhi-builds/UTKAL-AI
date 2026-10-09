import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.core.database import engine, Base, check_postgis_status, SessionLocal
from backend.app.core.security import hash_password
from backend.app.models.all_models import User
from backend.app.api import auth, projects, layers, restrictions, generator, validation, metrics, reports, audit

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("utkal")

def seed_initial_users():
    """Ensure default administrator and planner accounts exist upon first run."""
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin_user = User(
                email="admin@utkal.local",
                username="admin",
                full_name="UTKAL System Administrator",
                hashed_password=hash_password("UtkalAdmin2026!"),
                role="admin",
                is_active=True
            )
            db.add(admin_user)
            logger.info("Created default system administrator: admin / UtkalAdmin2026!")

        planner_user = db.query(User).filter(User.username == "planner").first()
        if not planner_user:
            planner_user = User(
                email="planner@utkal.local",
                username="planner",
                full_name="Lead Urban Planner",
                hashed_password=hash_password("Planner2026!"),
                role="planner",
                is_active=True
            )
            db.add(planner_user)
            logger.info("Created sample planner account: planner / Planner2026!")

        db.commit()
    except Exception as e:
        logger.error(f"Error seeding initial accounts: {e}")
        db.rollback()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables and check PostGIS
    logger.info("Initializing UTKAL Database schema...")
    try:
        Base.metadata.create_all(bind=engine)
        has_postgis = check_postgis_status()
        logger.info(f"Database schema initialized. Native PostGIS active: {has_postgis}")
        seed_initial_users()
    except Exception as e:
        logger.error(f"Database startup check failed: {e}")
    yield
    logger.info("Shutting down UTKAL Backend.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Local Ecological City Planning System for sustainable urban land-use modeling.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
api_v1 = settings.API_V1_STR
app.include_router(auth.router, prefix=api_v1)
app.include_router(projects.router, prefix=api_v1)
app.include_router(layers.router, prefix=api_v1)
app.include_router(restrictions.router, prefix=api_v1)
app.include_router(generator.router, prefix=api_v1)
app.include_router(validation.router, prefix=api_v1)
app.include_router(metrics.router, prefix=api_v1)
app.include_router(reports.router, prefix=api_v1)
app.include_router(audit.router, prefix=api_v1)

@app.get(f"{api_v1}/health", tags=["System"])
def health_check():
    has_postgis = check_postgis_status()
    return {
        "status": "healthy",
        "system": "UTKAL Local Ecological City Planning System",
        "version": "1.0.0",
        "offline_ready": True,
        "database": {
            "type": "PostgreSQL 18",
            "host": settings.POSTGRES_SERVER,
            "port": settings.POSTGRES_PORT,
            "name": settings.POSTGRES_DB,
            "postgis_extension": has_postgis
        }
    }
