from typing import Dict, Any, List, Optional
from shapely.geometry import shape
from shapely.ops import unary_union
from backend.app.services.spatial_engine import SpatialEngine

class ConstraintValidator:
    """
    Independent Spatial Constraint Validation Engine.
    Evaluates proposed land-use layouts against ecological restrictions,
    statutory boundaries, buffers, geometry rules, and land-use budgets.
    """

    @classmethod
    def validate_layout(
        cls,
        layout_geojson: Dict[str, Any],
        boundary_geojson: Optional[Dict[str, Any]],
        layers: List[Dict[str, Any]],
        restrictions: List[Dict[str, Any]],
        green_target_pct: float = 30.0
    ) -> Dict[str, Any]:
        findings = []
        hard_violations = 0
        warnings = 0

        # Rule 1: Check Input Layer Completeness
        layer_types = {l.get("layer_type") for l in layers}
        if "water" not in layer_types:
            findings.append({
                "rule_id": "INPUT_DATA_01",
                "rule_name": "Missing Surface Water Layer",
                "severity": "WARNING",
                "affected_feature_id": None,
                "affected_feature_type": "Project Context",
                "message": "Missing water layer. Note: Absence of recorded water layer does not imply absence of flood risk or hydrological features on the ground.",
                "details": {"source": "Traceability Policy: Missing data requires on-site verification."}
            })
            warnings += 1

        if "boundary" not in layer_types and not boundary_geojson:
            findings.append({
                "rule_id": "INPUT_DATA_02",
                "rule_name": "Missing Study Boundary",
                "severity": "HARD_VIOLATION",
                "affected_feature_id": None,
                "affected_feature_type": "Project Context",
                "message": "Project lacks a study boundary geometry. All layouts must have a verified outer limit.",
                "details": {}
            })
            hard_violations += 1

        # Prepare base reference geometries
        boundary_geom = SpatialEngine.to_shapely(boundary_geojson)
        
        water_geoms = []
        restricted_geoms = []
        survey_geoms = []
        existing_geoms = []

        for layer in layers:
            l_type = layer.get("layer_type")
            l_geom = SpatialEngine.to_shapely(layer.get("geojson_data"))
            if not l_geom:
                continue
            if l_type == "water":
                water_geoms.append(l_geom)
            elif l_type == "restricted_zone":
                restricted_geoms.append(l_geom)
            elif l_type == "survey_needed":
                survey_geoms.append(l_geom)
            elif l_type == "existing_dev":
                existing_geoms.append(l_geom)

        water_union = unary_union(water_geoms) if water_geoms else None
        restricted_union = unary_union(restricted_geoms) if restricted_geoms else None
        survey_union = unary_union(survey_geoms) if survey_geoms else None
        existing_union = unary_union(existing_geoms) if existing_geoms else None

        # Build restriction buffers
        buffer_checks = []
        for r in restrictions:
            if not r.get("active", True):
                continue
            r_type = r.get("restriction_type")
            r_name = r.get("name")
            r_dist = float(r.get("buffer_meters", 50.0))
            is_hard = r.get("is_hard_constraint", True)
            src = r.get("source_traceability", "User assumption")

            target_union = None
            if r_type == "water_buffer" and water_union:
                target_union = water_union
            elif r_type == "survey_buffer" and survey_union:
                target_union = survey_union

            if target_union:
                buffered = SpatialEngine.buffer_metric(target_union, r_dist)
                buffer_checks.append({
                    "rule_id": f"RESTRICTION_{r.get('id', r_type)}",
                    "rule_name": f"{r_name} ({r_dist}m Buffer)",
                    "geom": buffered,
                    "is_hard": is_hard,
                    "source": src,
                    "target_union": target_union,
                    "buffer_dist": r_dist
                })

        # Parse proposed layout features
        features = layout_geojson.get("features", [])
        if not features:
            findings.append({
                "rule_id": "LAYOUT_EMPTY",
                "rule_name": "Empty Layout",
                "severity": "HARD_VIOLATION",
                "affected_feature_id": None,
                "affected_feature_type": "Layout",
                "message": "Layout contains zero features to validate.",
                "details": {}
            })
            return {
                "is_valid": False,
                "total_findings": 1,
                "hard_violations_count": 1,
                "warnings_count": 0,
                "findings": findings
            }

        total_layout_area = 0.0
        green_layout_area = 0.0
        feature_geoms = []

        for f in features:
            f_id = f.get("id") or f.get("properties", {}).get("cell_id", "unnamed")
            f_props = f.get("properties", {})
            f_land_use = f_props.get("land_use", "unknown")
            f_category = f_props.get("category", "")

            # Rule 2: Geometry validity check
            raw_geom = f.get("geometry")
            if not raw_geom:
                findings.append({
                    "rule_id": "GEOM_01",
                    "rule_name": "Missing Geometry",
                    "severity": "HARD_VIOLATION",
                    "affected_feature_id": f_id,
                    "affected_feature_type": f_land_use,
                    "message": f"Feature '{f_id}' has no geometry coordinates.",
                    "details": {}
                })
                hard_violations += 1
                continue

            try:
                g = shape(raw_geom)
            except Exception as e:
                findings.append({
                    "rule_id": "GEOM_02",
                    "rule_name": "Malformed Geometry",
                    "severity": "HARD_VIOLATION",
                    "affected_feature_id": f_id,
                    "affected_feature_type": f_land_use,
                    "message": f"Geometry parsing failed: {str(e)}",
                    "details": {}
                })
                hard_violations += 1
                continue

            if not g.is_valid:
                findings.append({
                    "rule_id": "GEOM_03",
                    "rule_name": "Self-Intersecting / Invalid Geometry",
                    "severity": "HARD_VIOLATION",
                    "affected_feature_id": f_id,
                    "affected_feature_type": f_land_use,
                    "message": f"Feature '{f_id}' contains self-intersecting or invalid topology.",
                    "details": {"reason": shapely.explain_validity(g)}
                })
                hard_violations += 1
                continue

            f_area = SpatialEngine.calculate_area_hectares(g)
            total_layout_area += f_area
            if f_category == "Green Space" or "green" in f_land_use or "park" in f_land_use or "buffer" in f_land_use:
                green_layout_area += f_area

            # Rule 3: Study Boundary Containment
            if boundary_geom and not boundary_geom.contains(g):
                # Check overlap percentage outside
                outside = g.difference(boundary_geom)
                if not outside.is_empty and outside.area > (g.area * 0.05):
                    findings.append({
                        "rule_id": "BOUNDARY_01",
                        "rule_name": "Study Area Boundary Exceedance",
                        "severity": "HARD_VIOLATION",
                        "affected_feature_id": f_id,
                        "affected_feature_type": f_land_use,
                        "message": f"Feature '{f_id}' extends outside the approved study boundary.",
                        "details": {"outside_area_ha": SpatialEngine.calculate_area_hectares(outside)}
                    })
                    hard_violations += 1

            # Rule 4: Protected Sanctuary / No-Build Zone Encroachment
            is_built = f_category in ["Residential", "Commercial", "Civic / Services", "Transportation"]
            if is_built and restricted_union and g.intersects(restricted_union):
                overlap = g.intersection(restricted_union)
                if overlap.area > 1e-9:
                    overlap_ha = SpatialEngine.calculate_area_hectares(overlap)
                    findings.append({
                        "rule_id": "RESTRICTION_NO_BUILD",
                        "rule_name": "Strict Sanctuary No-Build Encroachment",
                        "severity": "HARD_VIOLATION",
                        "affected_feature_id": f_id,
                        "affected_feature_type": f_land_use,
                        "message": f"CRITICAL: Proposed {f_land_use} '{f_id}' encroaches {overlap_ha:.2f} ha directly into the protected wildlife sanctuary / strict no-build zone.",
                        "details": {
                            "overlap_ha": overlap_ha,
                            "source": "Statutory Wildlife Protection Rule / Ecological Exclusion"
                        }
                    })
                    hard_violations += 1

            # Rule 5: Configured Buffer Distances (e.g. 50m Water Buffer)
            if is_built:
                for b_chk in buffer_checks:
                    buf_geom = b_chk["geom"]
                    if buf_geom and g.intersects(buf_geom):
                        overlap = g.intersection(buf_geom)
                        if overlap.area > 1e-9:
                            overlap_ha = SpatialEngine.calculate_area_hectares(overlap)
                            sev = "HARD_VIOLATION" if b_chk["is_hard"] else "WARNING"
                            findings.append({
                                "rule_id": b_chk["rule_id"],
                                "rule_name": b_chk["rule_name"],
                                "severity": sev,
                                "affected_feature_id": f_id,
                                "affected_feature_type": f_land_use,
                                "message": f"{sev}: Proposed {f_land_use} '{f_id}' breaches the {b_chk['buffer_dist']}m ecological buffer ({overlap_ha:.2f} ha overlap).",
                                "details": {
                                    "buffer_meters": b_chk["buffer_dist"],
                                    "overlap_ha": overlap_ha,
                                    "source": b_chk["source"]
                                }
                            })
                            if b_chk["is_hard"]:
                                hard_violations += 1
                            else:
                                warnings += 1

            # Rule 6: Survey Needed Zone Advisory
            if is_built and survey_union and g.intersects(survey_union):
                overlap = g.intersection(survey_union)
                if overlap.area > 1e-9:
                    overlap_ha = SpatialEngine.calculate_area_hectares(overlap)
                    findings.append({
                        "rule_id": "SURVEY_PENDING",
                        "rule_name": "Unverified Ecological Survey Area",
                        "severity": "WARNING",
                        "affected_feature_id": f_id,
                        "affected_feature_type": f_land_use,
                        "message": f"Proposed development '{f_id}' lies within an unverified wetland survey zone ({overlap_ha:.2f} ha). Comprehensive field study is required before environmental clearance.",
                        "details": {"overlap_ha": overlap_ha, "statutory_note": "Precautionary planning principle"}
                    })
                    warnings += 1

            # Rule 7: Overlap with Existing Built-Up Infrastructure
            if is_built and existing_union and g.intersects(existing_union):
                overlap = g.intersection(existing_union)
                if overlap.area > (g.area * 0.1):
                    overlap_ha = SpatialEngine.calculate_area_hectares(overlap)
                    findings.append({
                        "rule_id": "OVERLAP_EXISTING",
                        "rule_name": "Conflict with Existing Development",
                        "severity": "WARNING",
                        "affected_feature_id": f_id,
                        "affected_feature_type": f_land_use,
                        "message": f"Proposed {f_land_use} overlaps existing built-up structures ({overlap_ha:.2f} ha). Demolition or displacement required.",
                        "details": {"overlap_ha": overlap_ha}
                    })
                    warnings += 1

            feature_geoms.append((f_id, g))

        # Rule 8: Mutual Parcel Overlap Check
        for i in range(len(feature_geoms)):
            id_a, geom_a = feature_geoms[i]
            for j in range(i + 1, min(i + 10, len(feature_geoms))):
                id_b, geom_b = feature_geoms[j]
                if geom_a.intersects(geom_b):
                    inter = geom_a.intersection(geom_b)
                    if inter.area > 1e-7:
                        inter_ha = SpatialEngine.calculate_area_hectares(inter)
                        if inter_ha > 0.05:
                            findings.append({
                                "rule_id": "INTERNAL_OVERLAP",
                                "rule_name": "Mutually Conflicting Land Allocations",
                                "severity": "HARD_VIOLATION",
                                "affected_feature_id": f"{id_a} & {id_b}",
                                "affected_feature_type": "Layout Topology",
                                "message": f"Proposed parcels '{id_a}' and '{id_b}' overlap each other by {inter_ha:.2f} ha.",
                                "details": {"overlap_ha": inter_ha}
                            })
                            hard_violations += 1

        # Rule 9: Land-Use Budget Check (Minimum Green Space Target)
        green_pct_actual = (green_layout_area / total_layout_area * 100.0) if total_layout_area > 0 else 0.0
        if green_pct_actual < green_target_pct:
            findings.append({
                "rule_id": "BUDGET_GREEN_SPACE",
                "rule_name": "Green Space Target Deficit",
                "severity": "WARNING",
                "affected_feature_id": None,
                "affected_feature_type": "Overall Land Use Budget",
                "message": f"Allocated green space ({green_pct_actual:.1f}%) is below the configured project target ({green_target_pct:.1f}%).",
                "details": {
                    "actual_pct": round(green_pct_actual, 1),
                    "target_pct": round(green_target_pct, 1),
                    "deficit_pct": round(green_target_pct - green_pct_actual, 1)
                }
            })
            warnings += 1

        is_valid = (hard_violations == 0)

        return {
            "is_valid": is_valid,
            "total_findings": len(findings),
            "hard_violations_count": hard_violations,
            "warnings_count": warnings,
            "findings": findings
        }
