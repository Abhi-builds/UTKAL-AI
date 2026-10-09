from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.all_models import EcologicalRestriction, User
from backend.app.schemas.all_schemas import (
    EcologicalRestrictionCreate,
    EcologicalRestrictionUpdate,
    EcologicalRestrictionOut
)
from backend.app.api.deps import get_current_user, log_audit
from backend.app.api.projects import verify_project_access

router = APIRouter(prefix="/projects/{project_id}/restrictions", tags=["Ecological Restrictions"])

@router.get("/", response_model=List[EcologicalRestrictionOut])
def list_restrictions(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verify_project_access(project_id, current_user, db)
    return db.query(EcologicalRestriction).filter(EcologicalRestriction.project_id == project_id).all()

@router.post("/", response_model=EcologicalRestrictionOut)
def create_restriction(
    project_id: int,
    restr_in: EcologicalRestrictionCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verify_project_access(project_id, current_user, db)
    restr = EcologicalRestriction(
        project_id=project_id,
        name=restr_in.name,
        restriction_type=restr_in.restriction_type,
        buffer_meters=restr_in.buffer_meters,
        source_traceability=restr_in.source_traceability,
        is_hard_constraint=restr_in.is_hard_constraint,
        target_layer_type=restr_in.target_layer_type,
        active=restr_in.active
    )
    db.add(restr)
    db.commit()
    db.refresh(restr)

    log_audit(
        db,
        action="CREATE_RESTRICTION",
        user_id=current_user.id,
        resource_type="EcologicalRestriction",
        resource_id=str(restr.id),
        details={"name": restr.name, "type": restr.restriction_type, "buffer": restr.buffer_meters},
        request=request
    )

    return restr

@router.put("/{restriction_id}", response_model=EcologicalRestrictionOut)
def update_restriction(
    project_id: int,
    restriction_id: int,
    restr_update: EcologicalRestrictionUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verify_project_access(project_id, current_user, db)
    restr = db.query(EcologicalRestriction).filter(
        EcologicalRestriction.id == restriction_id,
        EcologicalRestriction.project_id == project_id
    ).first()
    if not restr:
        raise HTTPException(status_code=404, detail="Restriction not found")

    for f, v in restr_update.model_dump(exclude_unset=True).items():
        setattr(restr, f, v)

    db.commit()
    db.refresh(restr)
    return restr

@router.delete("/{restriction_id}")
def delete_restriction(
    project_id: int,
    restriction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verify_project_access(project_id, current_user, db)
    restr = db.query(EcologicalRestriction).filter(
        EcologicalRestriction.id == restriction_id,
        EcologicalRestriction.project_id == project_id
    ).first()
    if not restr:
        raise HTTPException(status_code=404, detail="Restriction not found")
    db.delete(restr)
    db.commit()
    return {"message": "Restriction deleted"}
