import json
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.all_models import Project, Scenario, User
from backend.app.api.deps import get_current_user, log_audit
from backend.app.api.projects import verify_project_access
from backend.app.services.report_generator import ReportGenerator

router = APIRouter(prefix="/projects/{project_id}/reports", tags=["Reports & Exports"])

def get_project_export_data(project_id: int, current_user: User, db: Session):
    project = verify_project_access(project_id, current_user, db)
    scenarios = db.query(Scenario).filter(Scenario.project_id == project_id).all()

    project_dict = {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "housing_target_units": project.housing_target_units,
        "development_density_du_ha": project.development_density_du_ha,
        "road_allocation_pct": project.road_allocation_pct,
        "green_space_target_pct": project.green_space_target_pct,
        "public_services_pct": project.public_services_pct,
        "crs": project.crs,
        "created_at": project.created_at.isoformat() if project.created_at else None
    }

    scenarios_list = []
    for s in scenarios:
        val = s.validation_result
        met = s.environmental_metrics
        scenarios_list.append({
            "id": s.id,
            "name": s.name,
            "strategy": s.strategy,
            "parameters": s.parameters,
            "status": s.status,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "validation_result": {
                "is_valid": val.is_valid,
                "total_findings": val.total_findings,
                "hard_violations_count": val.hard_violations_count,
                "warnings_count": val.warnings_count,
                "findings": val.findings
            } if val else None,
            "environmental_metrics": {
                "metrics_data": met.metrics_data
            } if met else None,
            "layout_geojson": s.layout_geojson
        })

    return project, project_dict, scenarios_list

@router.get("/json")
def export_json_report(
    project_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project, p_dict, s_list = get_project_export_data(project_id, current_user, db)
    json_str = ReportGenerator.generate_json_report(p_dict, s_list)

    log_audit(
        db,
        action="EXPORT_REPORT",
        user_id=current_user.id,
        resource_type="Report",
        resource_id=str(project_id),
        details={"format": "JSON"},
        request=request
    )

    clean_name = project.name.lower().replace(" ", "_")
    return Response(
        content=json_str,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=utkal_report_{clean_name}.json"}
    )

@router.get("/csv")
def export_csv_report(
    project_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project, p_dict, s_list = get_project_export_data(project_id, current_user, db)
    csv_str = ReportGenerator.generate_csv_report(p_dict, s_list)

    log_audit(
        db,
        action="EXPORT_REPORT",
        user_id=current_user.id,
        resource_type="Report",
        resource_id=str(project_id),
        details={"format": "CSV"},
        request=request
    )

    clean_name = project.name.lower().replace(" ", "_")
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=utkal_scenarios_{clean_name}.csv"}
    )

@router.get("/pdf")
def export_pdf_report(
    project_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project, p_dict, s_list = get_project_export_data(project_id, current_user, db)
    pdf_bytes = ReportGenerator.generate_pdf_report(p_dict, s_list)

    log_audit(
        db,
        action="EXPORT_REPORT",
        user_id=current_user.id,
        resource_type="Report",
        resource_id=str(project_id),
        details={"format": "PDF"},
        request=request
    )

    clean_name = project.name.lower().replace(" ", "_")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=utkal_report_{clean_name}.pdf"}
    )

@router.get("/geojson")
def export_geojson_bundle(
    project_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project, p_dict, s_list = get_project_export_data(project_id, current_user, db)
    bundle = {
        "type": "FeatureCollection",
        "name": f"UTKAL Scenarios Bundle — {project.name}",
        "features": []
    }
    for s in s_list:
        l_geo = s.get("layout_geojson") or {}
        for f in l_geo.get("features", []):
            f_copy = dict(f)
            f_copy["properties"] = dict(f.get("properties", {}))
            f_copy["properties"]["scenario_name"] = s.get("name")
            f_copy["properties"]["strategy"] = s.get("strategy")
            bundle["features"].append(f_copy)

    log_audit(
        db,
        action="EXPORT_REPORT",
        user_id=current_user.id,
        resource_type="Report",
        resource_id=str(project_id),
        details={"format": "GeoJSON"},
        request=request
    )

    clean_name = project.name.lower().replace(" ", "_")
    return Response(
        content=json.dumps(bundle, indent=2),
        media_type="application/geo+json",
        headers={"Content-Disposition": f"attachment; filename=utkal_layouts_{clean_name}.geojson"}
    )
