from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.all_models import (
    Project,
    Layer,
    EcologicalRestriction,
    Scenario,
    ValidationResult,
    EnvironmentalMetrics,
    User
)
from backend.app.schemas.all_schemas import ScenarioGenerateRequest, ScenarioOut
from backend.app.api.deps import get_current_user, log_audit
from backend.app.api.projects import verify_project_access
from backend.app.services.layout_generator import LayoutGenerator
from backend.app.services.constraint_validator import ConstraintValidator
from backend.app.services.metrics_calculator import MetricsCalculator

router = APIRouter(prefix="/projects/{project_id}/generator", tags=["City Design & Layout Generator"])

def execute_generation_and_validation(
    project: Project,
    strategy: str,
    name: str,
    deliberate_violation: bool,
    params: Dict[str, Any],
    db: Session
) -> Scenario:
    # 1. Fetch project layers and restrictions
    layers = db.query(Layer).filter(Layer.project_id == project.id).all()
    restrictions = db.query(EcologicalRestriction).filter(EcologicalRestriction.project_id == project.id).all()

    layer_dicts = [
        {"layer_type": l.layer_type, "geojson_data": l.geojson_data}
        for l in layers
    ]
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

    boundary_geojson = project.study_boundary_geojson
    if not boundary_geojson:
        # Search for boundary in layers
        for l in layers:
            if l.layer_type == "boundary":
                boundary_geojson = l.geojson_data
                break

    if not boundary_geojson:
        raise HTTPException(
            status_code=400,
            detail="Cannot generate layout: Project has no study boundary layer or boundary polygon."
        )

    # 2. Run Layout Generator
    layout_fc = LayoutGenerator.generate_layout(
        boundary_geojson=boundary_geojson,
        layers=layer_dicts,
        restrictions=restr_dicts,
        strategy=strategy,
        housing_target=project.housing_target_units,
        density_du_ha=project.development_density_du_ha,
        road_pct=project.road_allocation_pct,
        green_pct=project.green_space_target_pct,
        services_pct=project.public_services_pct,
        deliberate_violation=deliberate_violation
    )

    # 3. Run Independent Constraint Validator
    val_res = ConstraintValidator.validate_layout(
        layout_geojson=layout_fc,
        boundary_geojson=boundary_geojson,
        layers=layer_dicts,
        restrictions=restr_dicts,
        green_target_pct=project.green_space_target_pct
    )

    # 4. Run Environmental Metrics Calculator
    metrics = MetricsCalculator.calculate_metrics(
        layout_geojson=layout_fc,
        layers=layer_dicts
    )

    # 5. Persist Scenario, ValidationResult, and EnvironmentalMetrics
    scenario_status = "validated" if val_res["is_valid"] else "failed"

    scenario = Scenario(
        project_id=project.id,
        name=name,
        strategy=strategy,
        parameters=params,
        status=scenario_status,
        layout_geojson=layout_fc
    )
    db.add(scenario)
    db.flush()

    db_val = ValidationResult(
        scenario_id=scenario.id,
        project_id=project.id,
        is_valid=val_res["is_valid"],
        total_findings=val_res["total_findings"],
        hard_violations_count=val_res["hard_violations_count"],
        warnings_count=val_res["warnings_count"],
        findings=val_res["findings"]
    )
    db.add(db_val)

    db_metrics = EnvironmentalMetrics(
        scenario_id=scenario.id,
        metrics_data=metrics
    )
    db.add(db_metrics)

    db.commit()
    db.refresh(scenario)

    # Recalculate Pareto ranks for all scenarios in project
    all_scenarios = db.query(Scenario).filter(Scenario.project_id == project.id).all()
    metrics_list = []
    for s in all_scenarios:
        if s.environmental_metrics:
            metrics_list.append(s.environmental_metrics.metrics_data)
        else:
            metrics_list.append({})

    ranks = MetricsCalculator.calculate_pareto_ranks(metrics_list)
    for idx, s in enumerate(all_scenarios):
        if s.environmental_metrics and idx < len(ranks):
            m_copy = dict(s.environmental_metrics.metrics_data)
            m_copy["pareto_rank"] = ranks[idx]
            s.environmental_metrics.metrics_data = m_copy
    db.commit()
    db.refresh(scenario)

    return scenario


@router.post("/generate", response_model=ScenarioOut)
def generate_scenario(
    project_id: int,
    req: ScenarioGenerateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    project = verify_project_access(project_id, current_user, db)

    s_name = req.name or f"Design — {req.strategy.replace('_', ' ').title()}"
    if req.deliberate_violation:
        s_name = f"{s_name} [DEMO VIOLATION]"

    scenario = execute_generation_and_validation(
        project=project,
        strategy=req.strategy,
        name=s_name,
        deliberate_violation=req.deliberate_violation,
        params=req.model_dump(),
        db=db
    )

    log_audit(
        db,
        action="GENERATE_SCENARIO",
        user_id=current_user.id,
        resource_type="Scenario",
        resource_id=str(scenario.id),
        details={"strategy": req.strategy, "valid": scenario.validation_result.is_valid},
        request=request
    )

    return scenario


@router.post("/generate-trio", response_model=List[ScenarioOut])
def generate_all_three_strategies(
    project_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates all 3 benchmark alternatives at once:
    1. Capacity-Focused (High density development)
    2. Balanced (Balanced urban & green spaces)
    3. Ecological Priority (Nature-first with maximum continuous green corridors)
    """
    project = verify_project_access(project_id, current_user, db)

    strategies = [
        ("capacity_focused", "Alternative A — Capacity Focused"),
        ("balanced", "Alternative B — Balanced Sustainable"),
        ("ecological_priority", "Alternative C — Ecological Priority")
    ]

    results = []
    for strat, name in strategies:
        sc = execute_generation_and_validation(
            project=project,
            strategy=strat,
            name=name,
            deliberate_violation=False,
            params={"strategy": strat, "batch": True},
            db=db
        )
        results.append(sc)

    log_audit(
        db,
        action="GENERATE_TRIO_SCENARIOS",
        user_id=current_user.id,
        resource_type="Project",
        resource_id=str(project_id),
        details={"strategies": [s[0] for s in strategies]},
        request=request
    )

    return results
