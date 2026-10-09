from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
import json
from backend.app.core.database import get_db
from backend.app.models.all_models import Layer, Project, User
from backend.app.schemas.all_schemas import LayerCreate, LayerOut
from backend.app.api.deps import get_current_user, log_audit
from backend.app.api.projects import verify_project_access

router = APIRouter(prefix="/projects/{project_id}/layers", tags=["Spatial Layers"])

@router.get("/", response_model=List[LayerOut])
def list_layers(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verify_project_access(project_id, current_user, db)
    return db.query(Layer).filter(Layer.project_id == project_id).all()

@router.post("/", response_model=LayerOut)
def add_layer_json(
    project_id: int,
    layer_in: LayerCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = verify_project_access(project_id, current_user, db)

    # Count features
    fc = 0
    if layer_in.geojson_data and "features" in layer_in.geojson_data:
        fc = len(layer_in.geojson_data["features"])
    elif layer_in.geojson_data and layer_in.geojson_data.get("type") == "Feature":
        fc = 1

    new_layer = Layer(
        project_id=project.id,
        name=layer_in.name,
        layer_type=layer_in.layer_type,
        geojson_data=layer_in.geojson_data,
        crs=layer_in.crs,
        source_info=layer_in.source_info,
        quality_notes=layer_in.quality_notes,
        feature_count=fc,
        is_synthetic=layer_in.is_synthetic,
        is_visible=layer_in.is_visible
    )
    db.add(new_layer)
    if layer_in.layer_type == "boundary":
        project.study_boundary_geojson = layer_in.geojson_data

    db.commit()
    db.refresh(new_layer)

    log_audit(
        db,
        action="ADD_LAYER",
        user_id=current_user.id,
        resource_type="Layer",
        resource_id=str(new_layer.id),
        details={"name": new_layer.name, "layer_type": new_layer.layer_type},
        request=request
    )

    return new_layer

@router.post("/upload", response_model=LayerOut)
async def upload_layer_file(
    project_id: int,
    file: UploadFile = File(...),
    name: str = Form(...),
    layer_type: str = Form(...),
    source_info: str = Form("Uploaded local file"),
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Uploads a local GeoJSON file and registers it as a project layer."""
    project = verify_project_access(project_id, current_user, db)

    try:
        content = await file.read()
        geojson_data = json.loads(content.decode("utf-8"))
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid GeoJSON file: {str(e)}"
        )

    fc = 0
    if isinstance(geojson_data, dict):
        if geojson_data.get("type") == "FeatureCollection":
            fc = len(geojson_data.get("features", []))
        elif geojson_data.get("type") == "Feature":
            fc = 1

    new_layer = Layer(
        project_id=project.id,
        name=name,
        layer_type=layer_type,
        geojson_data=geojson_data,
        crs="EPSG:4326",
        source_info=source_info,
        quality_notes=f"Uploaded file: {file.filename}",
        feature_count=fc,
        is_synthetic=False,
        is_visible=True
    )
    db.add(new_layer)
    if layer_type == "boundary":
        project.study_boundary_geojson = geojson_data

    db.commit()
    db.refresh(new_layer)

    log_audit(
        db,
        action="UPLOAD_LAYER",
        user_id=current_user.id,
        resource_type="Layer",
        resource_id=str(new_layer.id),
        details={"filename": file.filename, "type": layer_type},
        request=request
    )

    return new_layer

@router.delete("/{layer_id}")
def delete_layer(
    project_id: int,
    layer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    verify_project_access(project_id, current_user, db)
    layer = db.query(Layer).filter(Layer.id == layer_id, Layer.project_id == project_id).first()
    if not layer:
        raise HTTPException(status_code=404, detail="Layer not found")
    db.delete(layer)
    db.commit()
    return {"message": "Layer deleted"}
