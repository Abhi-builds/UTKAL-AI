from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.all_models import AuditLog, User
from backend.app.schemas.all_schemas import AuditLogOut
from backend.app.api.deps import get_current_user, get_current_admin

router = APIRouter(prefix="/audit", tags=["Security & Audit Logs"])

@router.get("/", response_model=List[AuditLogOut])
def get_audit_logs(
    limit: int = 100,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Administrator access to security and operational audit trail."""
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
