from typing import Dict, Any, List, Optional
import networkx as nx
from shapely.geometry import shape, Point
from shapely.ops import unary_union
from backend.app.services.spatial_engine import SpatialEngine

class MetricsCalculator:
    """
    Computes explainable ecological and urban development indicators:
    - Green Space Area (ha) and Percentage (%)
    - Development Footprint (ha)
    - Road Footprint (ha)
    - Housing Capacity (Units and estimated population)
    - Restricted Land Affected (ha)
    - Area in Pending Survey Zones (ha)
    - Green Space Connectivity Index (Graph-based, 0.0 to 1.0)
    - Average Walk Distance to Green Space (meters)
    - Permeable Runoff Retention Estimate (%)
    - Pareto dominance ranking
    """

    @classmethod
    def calculate_metrics(
        cls,
        layout_geojson: Dict[str, Any],
        layers: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        features = layout_geojson.get("features", [])
        
        # Prepare reference layers
        water_geoms = []
        restricted_geoms = []
        survey_geoms = []

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

        restricted_union = unary_union(restricted_geoms) if restricted_geoms else None
        survey_union = unary_union(survey_geoms) if survey_geoms else None

        total_area_ha = 0.0
        green_area_ha = 0.0
        dev_footprint_ha = 0.0
        road_footprint_ha = 0.0
        civic_area_ha = 0.0
        housing_units = 0

        restricted_affected_ha = 0.0
        survey_affected_ha = 0.0

        green_polygons = []
        res_centroids = []

        for f in features:
            props = f.get("properties", {})
            f_cat = props.get("category", "")
            f_use = props.get("land_use", "")
            geom_raw = f.get("geometry")
            if not geom_raw:
                continue

            try:
                g = shape(geom_raw)
            except Exception:
                continue

            area_ha = SpatialEngine.calculate_area_hectares(g)
            total_area_ha += area_ha

            if f_cat == "Green Space" or "green" in f_use or "buffer" in f_use or "park" in f_use:
                green_area_ha += area_ha
                green_polygons.append(g)
            elif f_cat == "Transportation" or "road" in f_use:
                road_footprint_ha += area_ha
            elif f_cat == "Civic / Services" or "public" in f_use:
                civic_area_ha += area_ha
                dev_footprint_ha += area_ha
            elif f_cat in ["Residential", "Commercial"] or "residential" in f_use:
                dev_footprint_ha += area_ha
                h = props.get("housing_units", 0)
                housing_units += int(h)
                res_centroids.append(g.centroid)

            # Check overlap with restricted land
            if f_cat in ["Residential", "Commercial", "Transportation", "Civic / Services"]:
                if restricted_union and g.intersects(restricted_union):
                    overlap = g.intersection(restricted_union)
                    restricted_affected_ha += SpatialEngine.calculate_area_hectares(overlap)
                if survey_union and g.intersects(survey_union):
                    overlap = g.intersection(survey_union)
                    survey_affected_ha += SpatialEngine.calculate_area_hectares(overlap)

        green_pct = (green_area_ha / total_area_ha * 100.0) if total_area_ha > 0 else 0.0
        dev_pct = (dev_footprint_ha / total_area_ha * 100.0) if total_area_ha > 0 else 0.0
        road_pct = (road_footprint_ha / total_area_ha * 100.0) if total_area_ha > 0 else 0.0

        # Estimated population: ~4.2 persons per dwelling unit (census average)
        estimated_population = int(housing_units * 4.2)

        # Graph-based green space connectivity index (0.0 - 1.0)
        # Using NetworkX graph where nodes are green parcels and edges represent proximity within 120m
        connectivity_index = 0.0
        if len(green_polygons) > 1:
            G = nx.Graph()
            for idx in range(len(green_polygons)):
                G.add_node(idx, area=green_polygons[idx].area)

            for i in range(len(green_polygons)):
                c1 = green_polygons[i].centroid
                for j in range(i + 1, len(green_polygons)):
                    c2 = green_polygons[j].centroid
                    dist_m = SpatialEngine.point_distance_meters(c1, c2)
                    if dist_m <= 120.0: # 120m ecological stepping-stone threshold
                        G.add_edge(i, j, weight=dist_m)

            # Ratio of edges to possible edges + largest connected component ratio
            largest_cc_size = len(max(nx.connected_components(G), key=len))
            cc_ratio = largest_cc_size / len(green_polygons)
            edge_density = nx.density(G)
            connectivity_index = round(0.6 * cc_ratio + 0.4 * edge_density, 3)
        elif len(green_polygons) == 1:
            connectivity_index = 0.35

        # Average walk distance to nearest green space (meters)
        avg_walk_dist_m = 0.0
        if res_centroids and green_polygons:
            total_dist = 0.0
            for rc in res_centroids:
                min_d = min(
                    SpatialEngine.point_distance_meters(rc, gp.centroid)
                    for gp in green_polygons
                )
                total_dist += min_d
            avg_walk_dist_m = round(total_dist / len(res_centroids), 1)

        # Runoff retention estimate:
        # Green spaces retain ~85% rainfall; roads retain ~15%; built parcels retain ~30%
        runoff_retention_pct = round(
            (green_pct * 0.85 + (100 - green_pct - road_pct - dev_pct) * 0.70 + dev_pct * 0.30 + road_pct * 0.15),
            1
        )

        return {
            "total_area_ha": round(total_area_ha, 2),
            "green_space_area_ha": round(green_area_ha, 2),
            "green_space_pct": round(green_pct, 1),
            "development_footprint_ha": round(dev_footprint_ha, 2),
            "development_footprint_pct": round(dev_pct, 1),
            "road_footprint_ha": round(road_footprint_ha, 2),
            "road_footprint_pct": round(road_pct, 1),
            "housing_capacity_units": housing_units,
            "estimated_population": estimated_population,
            "restricted_land_affected_ha": round(restricted_affected_ha, 3),
            "survey_needed_affected_ha": round(survey_affected_ha, 3),
            "green_connectivity_index": connectivity_index,
            "avg_distance_to_green_m": avg_walk_dist_m,
            "runoff_retention_estimate_pct": runoff_retention_pct,
            "metadata_documentation": {
                "green_space": {
                    "unit": "hectares and percentage (%)",
                    "method": "Sum of allocated park, buffer, and vegetation parcel areas",
                    "inputs": "Layout parcels marked as Green Space",
                    "limitations": "Does not measure internal canopy density of individual plots."
                },
                "connectivity": {
                    "unit": "Index (0.0 - 1.0)",
                    "method": "NetworkX graph analysis with 120m ecological stepping stone threshold",
                    "inputs": "Centroids of contiguous green parcels",
                    "limitations": "Structural connectivity model; species-specific dispersal requires specialized ecological modeling."
                },
                "runoff_retention": {
                    "unit": "Percentage (%)",
                    "method": "Weighted hydrological runoff coefficient estimate",
                    "inputs": "Land use distribution percentages",
                    "limitations": "Screening estimate only; not a substitute for hydrodynamic catchment modeling."
                }
            }
        }

    @classmethod
    def calculate_pareto_ranks(cls, scenarios_metrics: List[Dict[str, Any]]) -> List[int]:
        """
        Calculates Pareto dominance ranks for scenarios across two key conflicting objectives:
        Objective 1 (Maximize): Housing Capacity (units)
        Objective 2 (Maximize): Green Space Percentage (%)
        Rank 1 = Non-dominated (Pareto front)
        """
        n = len(scenarios_metrics)
        if n == 0:
            return []

        ranks = [1] * n
        for i in range(n):
            c_i = scenarios_metrics[i].get("housing_capacity_units", 0)
            g_i = scenarios_metrics[i].get("green_space_pct", 0)
            for j in range(n):
                if i == j:
                    continue
                c_j = scenarios_metrics[j].get("housing_capacity_units", 0)
                g_j = scenarios_metrics[j].get("green_space_pct", 0)
                # Scenario j dominates i if j is >= in both and strictly greater in at least one
                if (c_j >= c_i and g_j >= g_i) and (c_j > c_i or g_j > g_i):
                    ranks[i] += 1

        return ranks
