from typing import Dict, Any, List

# Coordinates based on Bhubaneswar, Odisha (approx 20.296° N, 85.824° E)
# Scale: ~0.01 deg lat is ~1.11 km, ~0.01 deg lon is ~1.04 km

BASE_LON = 85.8200
BASE_LAT = 20.2950

def get_bhubaneswar_boundary() -> Dict[str, Any]:
    """Synthetic project study boundary for Bhubaneswar Eco-Planning Sector."""
    coords = [
        [BASE_LON - 0.008, BASE_LAT - 0.007],
        [BASE_LON + 0.012, BASE_LAT - 0.007],
        [BASE_LON + 0.014, BASE_LAT + 0.002],
        [BASE_LON + 0.010, BASE_LAT + 0.009],
        [BASE_LON - 0.006, BASE_LAT + 0.009],
        [BASE_LON - 0.009, BASE_LAT + 0.002],
        [BASE_LON - 0.008, BASE_LAT - 0.007]
    ]
    return {
        "type": "FeatureCollection",
        "name": "Bhubaneswar Demonstration Study Boundary",
        "metadata": {
            "is_synthetic": True,
            "disclaimer": "DEMONSTRATION DATA: Synthetic planning boundary for demonstration and testing only. Not an official statutory boundary."
        },
        "features": [
            {
                "type": "Feature",
                "id": "boundary_01",
                "properties": {
                    "name": "Patia-Chandaka Eco-Planning Study Sector",
                    "zone_code": "BBSR-DEMO-Z1",
                    "target_population": 22000,
                    "is_synthetic": True
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [coords]
                }
            }
        ]
    }

def get_bhubaneswar_water() -> Dict[str, Any]:
    """Synthetic water bodies (wetland canal and retention pond)."""
    # Stream / canal flowing from northwest to southeast
    stream_coords = [
        [BASE_LON - 0.005, BASE_LAT + 0.008],
        [BASE_LON - 0.002, BASE_LAT + 0.004],
        [BASE_LON + 0.001, BASE_LAT + 0.001],
        [BASE_LON + 0.004, BASE_LAT - 0.002],
        [BASE_LON + 0.008, BASE_LAT - 0.006],
        [BASE_LON + 0.009, BASE_LAT - 0.005],
        [BASE_LON + 0.005, BASE_LAT - 0.001],
        [BASE_LON + 0.002, BASE_LAT + 0.002],
        [BASE_LON - 0.001, BASE_LAT + 0.005],
        [BASE_LON - 0.004, BASE_LAT + 0.009],
        [BASE_LON - 0.005, BASE_LAT + 0.008]
    ]
    # Small lake / water tank
    lake_coords = [
        [BASE_LON + 0.003, BASE_LAT + 0.004],
        [BASE_LON + 0.006, BASE_LAT + 0.004],
        [BASE_LON + 0.006, BASE_LAT + 0.006],
        [BASE_LON + 0.003, BASE_LAT + 0.006],
        [BASE_LON + 0.003, BASE_LAT + 0.004]
    ]
    return {
        "type": "FeatureCollection",
        "name": "Bhubaneswar Water Bodies",
        "metadata": {"is_synthetic": True},
        "features": [
            {
                "type": "Feature",
                "id": "water_stream_01",
                "properties": {
                    "name": "Synthetic Daya Canal Tributary",
                    "type": "natural_drainage",
                    "buffer_requirement_meters": 50,
                    "is_synthetic": True
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [stream_coords]
                }
            },
            {
                "type": "Feature",
                "id": "water_lake_01",
                "properties": {
                    "name": "Synthetic Rainwater Retention Lake",
                    "type": "wetland_pond",
                    "buffer_requirement_meters": 30,
                    "is_synthetic": True
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [lake_coords]
                }
            }
        ]
    }

def get_bhubaneswar_greenery() -> Dict[str, Any]:
    """Synthetic existing forest patch and green park."""
    forest_coords = [
        [BASE_LON - 0.007, BASE_LAT + 0.003],
        [BASE_LON - 0.004, BASE_LAT + 0.003],
        [BASE_LON - 0.003, BASE_LAT + 0.007],
        [BASE_LON - 0.006, BASE_LAT + 0.008],
        [BASE_LON - 0.008, BASE_LAT + 0.005],
        [BASE_LON - 0.007, BASE_LAT + 0.003]
    ]
    park_coords = [
        [BASE_LON + 0.005, BASE_LAT - 0.005],
        [BASE_LON + 0.009, BASE_LAT - 0.005],
        [BASE_LON + 0.009, BASE_LAT - 0.003],
        [BASE_LON + 0.005, BASE_LAT - 0.003],
        [BASE_LON + 0.005, BASE_LAT - 0.005]
    ]
    return {
        "type": "FeatureCollection",
        "name": "Bhubaneswar Greenery & Forests",
        "metadata": {"is_synthetic": True},
        "features": [
            {
                "type": "Feature",
                "id": "green_forest_01",
                "properties": {
                    "name": "Synthetic Chandaka Buffer Forest Patch",
                    "ecological_value": "High",
                    "canopy_cover_pct": 78,
                    "is_synthetic": True
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [forest_coords]
                }
            },
            {
                "type": "Feature",
                "id": "green_park_01",
                "properties": {
                    "name": "Synthetic Neighborhood Community Park",
                    "ecological_value": "Moderate",
                    "is_synthetic": True
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [park_coords]
                }
            }
        ]
    }

def get_bhubaneswar_roads() -> Dict[str, Any]:
    """Synthetic existing arterial roadways."""
    return {
        "type": "FeatureCollection",
        "name": "Bhubaneswar Existing Roads",
        "metadata": {"is_synthetic": True},
        "features": [
            {
                "type": "Feature",
                "id": "road_arterial_01",
                "properties": {
                    "name": "Synthetic Nandankanan Sector Arterial",
                    "hierarchy": "Arterial",
                    "width_meters": 24,
                    "is_synthetic": True
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [BASE_LON - 0.008, BASE_LAT - 0.001],
                        [BASE_LON, BASE_LAT - 0.001],
                        [BASE_LON + 0.007, BASE_LAT - 0.001],
                        [BASE_LON + 0.012, BASE_LAT - 0.001]
                    ]
                }
            },
            {
                "type": "Feature",
                "id": "road_connector_02",
                "properties": {
                    "name": "Synthetic Infocity Sector Connector",
                    "hierarchy": "Collector",
                    "width_meters": 18,
                    "is_synthetic": True
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [BASE_LON + 0.002, BASE_LAT - 0.007],
                        [BASE_LON + 0.002, BASE_LAT - 0.001],
                        [BASE_LON + 0.002, BASE_LAT + 0.008]
                    ]
                }
            }
        ]
    }

def get_bhubaneswar_existing_dev() -> Dict[str, Any]:
    """Synthetic existing built-up structures."""
    dev_coords = [
        [BASE_LON - 0.005, BASE_LAT - 0.006],
        [BASE_LON - 0.001, BASE_LAT - 0.006],
        [BASE_LON - 0.001, BASE_LAT - 0.003],
        [BASE_LON - 0.005, BASE_LAT - 0.003],
        [BASE_LON - 0.005, BASE_LAT - 0.006]
    ]
    return {
        "type": "FeatureCollection",
        "name": "Bhubaneswar Existing Development",
        "metadata": {"is_synthetic": True},
        "features": [
            {
                "type": "Feature",
                "id": "dev_existing_01",
                "properties": {
                    "name": "Synthetic Institutional Campus",
                    "land_use": "Institutional/Educational",
                    "built_density": "Medium",
                    "is_synthetic": True
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [dev_coords]
                }
            }
        ]
    }

def get_bhubaneswar_restricted_zone() -> Dict[str, Any]:
    """Synthetic wildlife sanctuary eco-sensitive buffer / strict no-build zone."""
    restricted_coords = [
        [BASE_LON - 0.008, BASE_LAT + 0.005],
        [BASE_LON - 0.004, BASE_LAT + 0.005],
        [BASE_LON - 0.004, BASE_LAT + 0.0085],
        [BASE_LON - 0.007, BASE_LAT + 0.0085],
        [BASE_LON - 0.008, BASE_LAT + 0.005]
    ]
    return {
        "type": "FeatureCollection",
        "name": "Bhubaneswar Restricted Eco-Zone",
        "metadata": {"is_synthetic": True},
        "features": [
            {
                "type": "Feature",
                "id": "restricted_zone_01",
                "properties": {
                    "name": "Synthetic Chandaka Sanctuary Eco-Sensitive Zone",
                    "restriction_level": "Strict No-Build",
                    "legal_basis": "Synthetic Demo Assumption - Wildlife Protection",
                    "is_synthetic": True
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [restricted_coords]
                }
            }
        ]
    }

def get_bhubaneswar_survey_needed() -> Dict[str, Any]:
    """Synthetic zone requiring seasonal ecological/hydrological survey."""
    survey_coords = [
        [BASE_LON + 0.006, BASE_LAT + 0.001],
        [BASE_LON + 0.010, BASE_LAT + 0.001],
        [BASE_LON + 0.010, BASE_LAT + 0.004],
        [BASE_LON + 0.006, BASE_LAT + 0.004],
        [BASE_LON + 0.006, BASE_LAT + 0.001]
    ]
    return {
        "type": "FeatureCollection",
        "name": "Bhubaneswar Environmental Survey Area",
        "metadata": {"is_synthetic": True},
        "features": [
            {
                "type": "Feature",
                "id": "survey_zone_01",
                "properties": {
                    "name": "Synthetic Floodplain Wetland - Survey Pending",
                    "status": "ECOLOGICAL SURVEY REQUIRED",
                    "note": "Seasonal flooding potential; ground verification required before clearance",
                    "is_synthetic": True
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [survey_coords]
                }
            }
        ]
    }

def load_all_sample_layers() -> List[Dict[str, Any]]:
    """Return all sample demonstration layers ready to attach to a project."""
    return [
        {
            "name": "Study Area Boundary",
            "layer_type": "boundary",
            "geojson_data": get_bhubaneswar_boundary(),
            "source_info": "UTKAL Bhubaneswar Synthetic Dataset (Demo)",
            "quality_notes": "Synthetic boundary for testing",
            "feature_count": 1,
            "is_synthetic": True
        },
        {
            "name": "Water Bodies & Drainage",
            "layer_type": "water",
            "geojson_data": get_bhubaneswar_water(),
            "source_info": "UTKAL Bhubaneswar Synthetic Dataset (Demo)",
            "quality_notes": "Synthetic stream and lake geometries",
            "feature_count": 2,
            "is_synthetic": True
        },
        {
            "name": "Vegetation & Forest Patches",
            "layer_type": "greenery",
            "geojson_data": get_bhubaneswar_greenery(),
            "source_info": "UTKAL Bhubaneswar Synthetic Dataset (Demo)",
            "quality_notes": "Synthetic vegetation canopy polygons",
            "feature_count": 2,
            "is_synthetic": True
        },
        {
            "name": "Existing Road Network",
            "layer_type": "roads",
            "geojson_data": get_bhubaneswar_roads(),
            "source_info": "UTKAL Bhubaneswar Synthetic Dataset (Demo)",
            "quality_notes": "Synthetic arterial alignments",
            "feature_count": 2,
            "is_synthetic": True
        },
        {
            "name": "Existing Built-Up Areas",
            "layer_type": "existing_dev",
            "geojson_data": get_bhubaneswar_existing_dev(),
            "source_info": "UTKAL Bhubaneswar Synthetic Dataset (Demo)",
            "quality_notes": "Synthetic institutional footprint",
            "feature_count": 1,
            "is_synthetic": True
        },
        {
            "name": "Restricted Eco-Zone (No-Build)",
            "layer_type": "restricted_zone",
            "geojson_data": get_bhubaneswar_restricted_zone(),
            "source_info": "UTKAL Bhubaneswar Synthetic Dataset (Demo)",
            "quality_notes": "Synthetic sanctuary buffer zone",
            "feature_count": 1,
            "is_synthetic": True
        },
        {
            "name": "Additional Survey Needed Zone",
            "layer_type": "survey_needed",
            "geojson_data": get_bhubaneswar_survey_needed(),
            "source_info": "UTKAL Bhubaneswar Synthetic Dataset (Demo)",
            "quality_notes": "Synthetic seasonal wetland verification zone",
            "feature_count": 1,
            "is_synthetic": True
        }
    ]
