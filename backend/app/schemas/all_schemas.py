from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

# ----------------- User Schemas -----------------
class UserBase(BaseModel):
    email: str
    username: str
    full_name: Optional[str] = None
    role: str = "planner"

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    username_or_email: str
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserOut(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

# ----------------- Layer Schemas -----------------
class LayerBase(BaseModel):
    name: str
    layer_type: str
    crs: str = "EPSG:4326"
    source_info: Optional[str] = "Local file"
    quality_notes: Optional[str] = None
    is_synthetic: bool = True
    is_visible: bool = True

class LayerCreate(LayerBase):
    geojson_data: Dict[str, Any]

class LayerOut(LayerBase):
    id: int
    project_id: int
    feature_count: int
    geojson_data: Dict[str, Any]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ----------------- Restriction Schemas -----------------
class EcologicalRestrictionBase(BaseModel):
    name: str
    restriction_type: str # no_build, water_buffer, green_corridor, survey_buffer
    buffer_meters: float = 50.0
    source_traceability: str = "User-defined planning assumption"
    is_hard_constraint: bool = True
    target_layer_type: str = "water"
    active: bool = True

class EcologicalRestrictionCreate(EcologicalRestrictionBase):
    pass

class EcologicalRestrictionUpdate(BaseModel):
    name: Optional[str] = None
    restriction_type: Optional[str] = None
    buffer_meters: Optional[float] = None
    source_traceability: Optional[str] = None
    is_hard_constraint: Optional[bool] = None
    target_layer_type: Optional[str] = None
    active: Optional[bool] = None

class EcologicalRestrictionOut(EcologicalRestrictionBase):
    id: int
    project_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ----------------- Scenario & Layout Schemas -----------------
class ScenarioGenerateRequest(BaseModel):
    name: Optional[str] = None
    strategy: str = "balanced" # capacity_focused, balanced, ecological_priority
    grid_size_meters: float = 50.0
    housing_target_units: Optional[int] = None
    development_density_du_ha: Optional[float] = None
    road_allocation_pct: Optional[float] = None
    green_space_target_pct: Optional[float] = None
    public_services_pct: Optional[float] = None
    deliberate_violation: bool = False # For demonstration of validator catching violations

class FindingOut(BaseModel):
    rule_id: str
    rule_name: str
    severity: str # HARD_VIOLATION | WARNING
    affected_feature_id: Optional[str] = None
    affected_feature_type: Optional[str] = None
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)

class ValidationResultOut(BaseModel):
    id: int
    scenario_id: int
    project_id: int
    is_valid: bool
    total_findings: int
    hard_violations_count: int
    warnings_count: int
    findings: List[FindingOut]
    checked_at: datetime
    model_config = ConfigDict(from_attributes=True)

class EnvironmentalMetricsOut(BaseModel):
    id: int
    scenario_id: int
    metrics_data: Dict[str, Any]
    calculated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ScenarioOut(BaseModel):
    id: int
    project_id: int
    name: str
    strategy: str
    parameters: Dict[str, Any]
    status: str
    layout_geojson: Dict[str, Any]
    created_at: datetime
    validation_result: Optional[ValidationResultOut] = None
    environmental_metrics: Optional[EnvironmentalMetricsOut] = None
    model_config = ConfigDict(from_attributes=True)

# ----------------- Project Schemas -----------------
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    crs: str = "EPSG:4326"
    housing_target_units: int = 5000
    development_density_du_ha: float = 120.0
    road_allocation_pct: float = 18.0
    green_space_target_pct: float = 30.0
    public_services_pct: float = 12.0

class ProjectCreate(ProjectBase):
    study_boundary_geojson: Optional[Dict[str, Any]] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    study_boundary_geojson: Optional[Dict[str, Any]] = None
    housing_target_units: Optional[int] = None
    development_density_du_ha: Optional[float] = None
    road_allocation_pct: Optional[float] = None
    green_space_target_pct: Optional[float] = None
    public_services_pct: Optional[float] = None

class ProjectOut(ProjectBase):
    id: int
    owner_id: int
    study_boundary_geojson: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    layers: List[LayerOut] = []
    restrictions: List[EcologicalRestrictionOut] = []
    scenarios: List[ScenarioOut] = []
    model_config = ConfigDict(from_attributes=True)

class ProjectSummary(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    owner_id: int
    created_at: datetime
    updated_at: datetime
    scenario_count: int = 0
    layer_count: int = 0

# ----------------- Audit Log Schemas -----------------
class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)
