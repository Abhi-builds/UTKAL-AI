import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import SessionLocal, Base, engine
from backend.app.core.security import create_access_token
from backend.app.models.all_models import User, Project

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="session")
def db_session():
    db = SessionLocal()
    yield db
    db.close()

@pytest.fixture(scope="session")
def admin_token(db_session):
    admin = db_session.query(User).filter(User.username == "admin").first()
    return create_access_token(subject=admin.id, role="admin")

@pytest.fixture(scope="session")
def planner_token(db_session):
    planner = db_session.query(User).filter(User.username == "planner").first()
    return create_access_token(subject=planner.id, role="planner")
