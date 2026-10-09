from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="planner", nullable=False)  # "admin" | "planner"
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    study_boundary_geojson = Column(JSON, nullable=True)
    crs = Column(String(50), default="EPSG:4326", nullable=False)
    
    # Planning targets & parameters
    housing_target_units = Column(Integer, default=5000, nullable=False)
    development_density_du_ha = Column(Float, default=120.0, nullable=False)
    road_allocation_pct = Column(Float, default=18.0, nullable=False)
    green_space_target_pct = Column(Float, default=30.0, nullable=False)
    public_services_pct = Column(Float, default=12.0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    owner = relationship("User", back_populates="projects")
    layers = relationship("Layer", back_populates="project", cascade="all, delete-orphan")
    restrictions = relationship("EcologicalRestriction", back_populates="project", cascade="all, delete-orphan")
    scenarios = relationship("Scenario", back_populates="project", cascade="all, delete-orphan")


class Layer(Base):
    __tablename__ = "layers"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    # boundary, water, greenery, roads, existing_dev, restricted_zone, survey_needed
    layer_type = Column(String(50), nullable=False, index=True)
    geojson_data = Column(JSON, nullable=False)
    crs = Column(String(50), default="EPSG:4326", nullable=False)
    source_info = Column(String(500), nullable=True)
    quality_notes = Column(Text, nullable=True)
    feature_count = Column(Integer, default=0)
    is_synthetic = Column(Boolean, default=True)
    is_visible = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    project = relationship("Project", back_populates="layers")


class EcologicalRestriction(Base):
    __tablename__ = "ecological_restrictions"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    # no_build, water_buffer, green_corridor, survey_buffer, slope_limit
    restriction_type = Column(String(50), nullable=False)
    buffer_meters = Column(Float, default=50.0, nullable=False)
    source_traceability = Column(String(500), default="User-defined planning assumption", nullable=False)
    is_hard_constraint = Column(Boolean, default=True, nullable=False)
    target_layer_type = Column(String(50), default="water", nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    project = relationship("Project", back_populates="restrictions")


class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    # capacity_focused, balanced, ecological_priority
    strategy = Column(String(50), nullable=False)
    parameters = Column(JSON, nullable=False, default=dict)
    # generated, validated, failed
    status = Column(String(50), default="generated", nullable=False)
    layout_geojson = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    project = relationship("Project", back_populates="scenarios")
    validation_result = relationship("ValidationResult", back_populates="scenario", uselist=False, cascade="all, delete-orphan")
    environmental_metrics = relationship("EnvironmentalMetrics", back_populates="scenario", uselist=False, cascade="all, delete-orphan")


class ValidationResult(Base):
    __tablename__ = "validation_results"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    is_valid = Column(Boolean, default=True, nullable=False)
    total_findings = Column(Integer, default=0, nullable=False)
    hard_violations_count = Column(Integer, default=0, nullable=False)
    warnings_count = Column(Integer, default=0, nullable=False)
    findings = Column(JSON, nullable=False, default=list)
    checked_at = Column(DateTime(timezone=True), default=utcnow)

    scenario = relationship("Scenario", back_populates="validation_result")


class EnvironmentalMetrics(Base):
    __tablename__ = "environmental_metrics"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    metrics_data = Column(JSON, nullable=False, default=dict)
    calculated_at = Column(DateTime(timezone=True), default=utcnow)

    scenario = relationship("Scenario", back_populates="environmental_metrics")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(100), nullable=True)
    resource_id = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="audit_logs")
