from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.all_models import Scenario, ValidationResult, Layer, EcologicalRestriction, User
from backend.app.schemas.all_schemas import ValidationResultOut
from backend.app.api.deps import get_current_user
from backend.app.api.projects import verify_project_access
from backend.app.services.constraint_validator import ConstraintValidator

router = APIRouter(prefix="/projects/{project_id}/scenarios/{scenario_id}/validation", tags=["Constraint Validation"])

@router.get("/", response_model=ValidationResultOut)
def get_validation_findings(
    project_id: int,
    scenario_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verify_project_access(project_id, current_user, db)
    val = db.query(ValidationResult).filter(
        ValidationResult.scenario_id == scenario_id,
        ValidationResult.project_id == project_id
    ).first()
    if not val:
        raise HTTPException(status_code=404, detail="Validation result not found for this scenario")
    return val

@router.post("/revalidate", response_model=ValidationResultOut)
def revalidate_scenario(
    project_id: int,
    scenario_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = verify_project_access(project_id, current_user, db)
    scenario = db.query(Scenario).filter(
        Scenario.id == scenario_id,
        Scenario.project_id == project_id
    ).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    layers = db.query(Layer).filter(Layer.project_id == project_id).all()
    restrictions = db.query(EcologicalRestriction).filter(EcologicalRestriction.project_id == project_id).all()

    layer_dicts = [{"layer_type": l.layer_type, "geojson_data": l.geojson_data} for l in layers]
    restr_dicts = [
        {
            "id": r.id,
            "name": r.name,
            "restriction_type": r.restriction_type,
            "buffer_meters": r.buffer_meters,
            "is_hard_constraint": r.is_hard_constraint,
            "source_traceability": r.source_traceability,
            "active": r.active
        }
        for r in restrictions
    ]

    val_res = ConstraintValidator.validate_layout(
        layout_geojson=scenario.layout_geojson,
        boundary_geojson=project.study_boundary_geojson,
        layers=layer_dicts,
        restrictions=restr_dicts,
        green_target_pct=project.green_space_target_pct
    )

    db_val = db.query(ValidationResult).filter(ValidationResult.scenario_id == scenario_id).first()
    if not db_val:
        db_val = ValidationResult(scenario_id=scenario.id, project_id=project.id)
        db.add(db_val)

    db_val.is_valid = val_res["is_valid"]
    db_val.total_findings = val_res["total_findings"]
    db_val.hard_violations_count = val_res["hard_violations_count"]
    db_val.warnings_count = val_res["warnings_count"]
    db_val.findings = val_res["findings"]

    scenario.status = "validated" if val_res["is_valid"] else "failed"

    db.commit()
    db.refresh(db_val)
    return db_val
