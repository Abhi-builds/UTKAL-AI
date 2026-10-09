from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.all_models import Project, Layer, EcologicalRestriction, User
from backend.app.schemas.all_schemas import ProjectCreate, ProjectUpdate, ProjectOut, ProjectSummary
from backend.app.api.deps import get_current_user, log_audit
from backend.app.services.demo_data_loader import load_all_sample_layers

router = APIRouter(prefix="/projects", tags=["Planning Projects"])

def verify_project_access(project_id: int, current_user: User, db: Session) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user.role != "admin" and project.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You do not have permission to access another planner's project."
        )
    return project

@router.post("/", response_model=ProjectOut)
def create_project(
    project_in: ProjectCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_project = Project(
        name=project_in.name,
        description=project_in.description,
        owner_id=current_user.id,
        study_boundary_geojson=project_in.study_boundary_geojson,
        crs=project_in.crs,
        housing_target_units=project_in.housing_target_units,
        development_density_du_ha=project_in.development_density_du_ha,
        road_allocation_pct=project_in.road_allocation_pct,
        green_space_target_pct=project_in.green_space_target_pct,
        public_services_pct=project_in.public_services_pct
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    log_audit(
        db,
        action="CREATE_PROJECT",
        user_id=current_user.id,
        resource_type="Project",
        resource_id=str(new_project.id),
        details={"name": new_project.name},
        request=request
    )

    return new_project

@router.get("/", response_model=List[ProjectSummary])
def list_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Project)
    if current_user.role != "admin":
        query = query.filter(Project.owner_id == current_user.id)
    
    projects = query.order_by(Project.created_at.desc()).all()
    summaries = []
    for p in projects:
        summaries.append(ProjectSummary(
            id=p.id,
            name=p.name,
            description=p.description,
            owner_id=p.owner_id,
            created_at=p.created_at,
            updated_at=p.updated_at,
            scenario_count=len(p.scenarios),
            layer_count=len(p.layers)
        ))
    return summaries

@router.get("/{project_id}", response_model=ProjectOut)
def get_project_details(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return verify_project_access(project_id, current_user, db)

@router.put("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = verify_project_access(project_id, current_user, db)

    for field, val in project_update.model_dump(exclude_unset=True).items():
        setattr(project, field, val)

    db.commit()
    db.refresh(project)

    log_audit(
        db,
        action="UPDATE_PROJECT",
        user_id=current_user.id,
        resource_type="Project",
        resource_id=str(project.id),
        details={"updated_fields": list(project_update.model_dump(exclude_unset=True).keys())},
        request=request
    )

    return project

@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = verify_project_access(project_id, current_user, db)
    db.delete(project)
    db.commit()

    log_audit(
        db,
        action="DELETE_PROJECT",
        user_id=current_user.id,
        resource_type="Project",
        resource_id=str(project_id),
        request=request
    )

    return {"message": "Project deleted successfully", "project_id": project_id}

@router.post("/{project_id}/load-demo-data", response_model=ProjectOut)
def load_project_demo_data(
    project_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Populates project with the synthetic Bhubaneswar demonstration dataset:
    - Study Boundary
    - Water Bodies (Canal & Lake)
    - Vegetation & Forest Patches
    - Road Network
    - Existing Development
    - Restricted Wildlife Sanctuary Buffer (No-Build)
    - Survey Needed Wetland Zone
    - Configures 50m water buffer and Sanctuary restrictions
    """
    project = verify_project_access(project_id, current_user, db)

    # Remove previous layers if any
    db.query(Layer).filter(Layer.project_id == project.id).delete()
    db.query(EcologicalRestriction).filter(EcologicalRestriction.project_id == project.id).delete()

    sample_layers = load_all_sample_layers()
    for s_layer in sample_layers:
        db_layer = Layer(
            project_id=project.id,
            name=s_layer["name"],
            layer_type=s_layer["layer_type"],
            geojson_data=s_layer["geojson_data"],
            source_info=s_layer["source_info"],
            quality_notes=s_layer["quality_notes"],
            feature_count=s_layer["feature_count"],
            is_synthetic=True,
            is_visible=True
        )
        db.add(db_layer)
        if s_layer["layer_type"] == "boundary":
            project.study_boundary_geojson = s_layer["geojson_data"]

    # Configure default ecological restrictions
    r_water = EcologicalRestriction(
        project_id=project.id,
        name="Statutory Waterbody Setback",
        restriction_type="water_buffer",
        buffer_meters=50.0,
        source_traceability="Odisha Master Plan & Riverine Protection Guideline (Synthetic assumption)",
        is_hard_constraint=True,
        target_layer_type="water",
        active=True
    )
    r_sanctuary = EcologicalRestriction(
        project_id=project.id,
        name="Chandaka Sanctuary Eco-Sensitive Buffer",
        restriction_type="no_build",
        buffer_meters=0.0,
        source_traceability="Wildlife Protection Act - Eco-Sensitive Zone Guideline (Synthetic demo assumption)",
        is_hard_constraint=True,
        target_layer_type="restricted_zone",
        active=True
    )
    r_survey = EcologicalRestriction(
        project_id=project.id,
        name="Lowland Wetland Survey Precaution",
        restriction_type="survey_buffer",
        buffer_meters=30.0,
        source_traceability="Precautionary Principle - Seasonal Drainage Investigation",
        is_hard_constraint=False, # Advisory / warning
        target_layer_type="survey_needed",
        active=True
    )
    db.add(r_water)
    db.add(r_sanctuary)
    db.add(r_survey)

    db.commit()
    db.refresh(project)

    log_audit(
        db,
        action="LOAD_DEMO_DATA",
        user_id=current_user.id,
        resource_type="Project",
        resource_id=str(project.id),
        details={"dataset": "Bhubaneswar Synthetic Eco-Planning"},
        request=request
    )

    return project
