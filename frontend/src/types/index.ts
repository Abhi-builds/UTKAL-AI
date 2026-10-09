export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  role: 'admin' | 'planner';
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Layer {
  id: number;
  project_id: number;
  name: string;
  layer_type: 'boundary' | 'water' | 'greenery' | 'roads' | 'existing_dev' | 'restricted_zone' | 'survey_needed';
  geojson_data: any;
  crs: string;
  source_info?: string;
  quality_notes?: string;
  feature_count: number;
  is_synthetic: boolean;
  is_visible: boolean;
  created_at: string;
}

export interface EcologicalRestriction {
  id: number;
  project_id: number;
  name: string;
  restriction_type: 'no_build' | 'water_buffer' | 'green_corridor' | 'survey_buffer' | 'slope_limit';
  buffer_meters: number;
  source_traceability: string;
  is_hard_constraint: boolean;
  target_layer_type: string;
  active: boolean;
  created_at: string;
}

export interface Finding {
  rule_id: string;
  rule_name: string;
  severity: 'HARD_VIOLATION' | 'WARNING';
  affected_feature_id?: string;
  affected_feature_type?: string;
  message: string;
  details: Record<string, any>;
}

export interface ValidationResult {
  id: number;
  scenario_id: number;
  project_id: number;
  is_valid: boolean;
  total_findings: number;
  hard_violations_count: number;
  warnings_count: number;
  findings: Finding[];
  checked_at: string;
}

export interface EnvironmentalMetrics {
  id: number;
  scenario_id: number;
  metrics_data: {
    total_area_ha: number;
    green_space_area_ha: number;
    green_space_pct: number;
    development_footprint_ha: number;
    development_footprint_pct: number;
    road_footprint_ha: number;
    road_footprint_pct: number;
    housing_capacity_units: number;
    estimated_population: number;
    restricted_land_affected_ha: number;
    survey_needed_affected_ha: number;
    green_connectivity_index: number;
    avg_distance_to_green_m: number;
    runoff_retention_estimate_pct: number;
    pareto_rank?: number;
    metadata_documentation?: Record<string, any>;
  };
  calculated_at: string;
}

export interface Scenario {
  id: number;
  project_id: number;
  name: string;
  strategy: 'capacity_focused' | 'balanced' | 'ecological_priority';
  parameters: Record<string, any>;
  status: 'generated' | 'validated' | 'failed';
  layout_geojson: any;
  created_at: string;
  validation_result?: ValidationResult;
  environmental_metrics?: EnvironmentalMetrics;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  study_boundary_geojson?: any;
  crs: string;
  housing_target_units: number;
  development_density_du_ha: number;
  road_allocation_pct: number;
  green_space_target_pct: number;
  public_services_pct: number;
  created_at: string;
  updated_at: string;
  layers?: Layer[];
  restrictions?: EcologicalRestriction[];
  scenarios?: Scenario[];
}

export interface ProjectSummary {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
  scenario_count: number;
  layer_count: number;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  timestamp: string;
}
