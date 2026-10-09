from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.all_models import Project, Scenario, User
from backend.app.schemas.all_schemas import ScenarioOut
from backend.app.api.deps import get_current_user
from backend.app.api.projects import verify_project_access

router = APIRouter(prefix="/projects/{project_id}/metrics", tags=["Scenario Comparisons & Metrics"])

@router.get("/compare", response_model=List[ScenarioOut])
def compare_scenarios(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verify_project_access(project_id, current_user, db)
    scenarios = db.query(Scenario).filter(Scenario.project_id == project_id).order_by(Scenario.created_at.desc()).all()
    return scenarios
