import random
from typing import Dict, Any, List, Optional
from shapely.geometry import box, Polygon, MultiPolygon, Point, LineString
from shapely.ops import unary_union
from backend.app.services.spatial_engine import SpatialEngine

class LayoutGenerator:
    """
    Explainable grid and parcel-based land-use layout generator.
    Produces alternative city designs adhering to or testing configured ecological restrictions.
    """

    @classmethod
    def generate_layout(
        cls,
        boundary_geojson: Dict[str, Any],
        layers: List[Dict[str, Any]],
        restrictions: List[Dict[str, Any]],
        strategy: str = "balanced", # capacity_focused | balanced | ecological_priority
        housing_target: int = 5000,
        density_du_ha: float = 120.0,
        road_pct: float = 18.0,
        green_pct: float = 30.0,
        services_pct: float = 12.0,
        deliberate_violation: bool = False
    ) -> Dict[str, Any]:
        boundary_geom = SpatialEngine.to_shapely(boundary_geojson)
        if not boundary_geom or boundary_geom.is_empty:
            raise ValueError("Invalid or empty study boundary geometry")

        # Collect constraint geometries
        water_geoms = []
        restricted_geoms = []
        survey_geoms = []
        existing_geoms = []
        green_geoms = []

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
            elif l_type == "greenery":
                green_geoms.append(l_geom)

        water_union = unary_union(water_geoms) if water_geoms else None
        restricted_union = unary_union(restricted_geoms) if restricted_geoms else None
        existing_union = unary_union(existing_geoms) if existing_geoms else None
        survey_union = unary_union(survey_geoms) if survey_geoms else None
        existing_green_union = unary_union(green_geoms) if green_geoms else None

        # Build buffers based on restrictions
        buffer_geoms = []
        for r in restrictions:
            if not r.get("active", True):
                continue
            r_type = r.get("restriction_type", "")
            r_dist = float(r.get("buffer_meters", 50.0))
            if r_type == "water_buffer" and water_union:
                b = SpatialEngine.buffer_metric(water_union, r_dist)
                if b and not b.is_empty:
                    buffer_geoms.append(b)
            elif r_type == "survey_buffer" and survey_union:
                b = SpatialEngine.buffer_metric(survey_union, r_dist)
                if b and not b.is_empty:
                    buffer_geoms.append(b)

        # In ecological priority mode, increase buffers
        if strategy == "ecological_priority" and water_union:
            extra_buf = SpatialEngine.buffer_metric(water_union, 75.0)
            if extra_buf:
                buffer_geoms.append(extra_buf)

        no_build_list = []
        if water_union:
            no_build_list.append(water_union)
        if restricted_union:
            no_build_list.append(restricted_union)
        if existing_union:
            no_build_list.append(existing_union)
        no_build_list.extend(buffer_geoms)

        # In ecological priority, survey zones are also strict no-build
        if strategy == "ecological_priority" and survey_union:
            no_build_list.append(survey_union)

        hard_no_build = unary_union(no_build_list) if no_build_list else None

        # Generate parcel grid over study area
        grid_cells = SpatialEngine.create_grid(boundary_geom, cell_size_meters=60.0)

        # Land use allocations based on strategy
        features = []
        total_cells = len(grid_cells)
        if total_cells == 0:
            raise ValueError("No cells could be generated inside boundary")

        # Distribution ratios by strategy
        if strategy == "capacity_focused":
            res_ratio = 0.65
            green_ratio = 0.15
            service_ratio = 0.10
            road_ratio = 0.10
            base_density = density_du_ha * 1.3
        elif strategy == "ecological_priority":
            res_ratio = 0.30
            green_ratio = 0.50
            service_ratio = 0.10
            road_ratio = 0.10
            base_density = density_du_ha * 0.7
        else: # balanced
            res_ratio = 0.45
            green_ratio = 0.30
            service_ratio = 0.12
            road_ratio = 0.13
            base_density = density_du_ha

        cell_index = 0
        allocated_res_units = 0

        for cell in grid_cells:
            cell_index += 1
            cell_id = f"parcel_{strategy}_{cell_index:03d}"
            cell_area_ha = SpatialEngine.calculate_area_hectares(cell)

            # Check overlap with hard no-build mask
            overlaps_no_build = hard_no_build is not None and cell.intersects(hard_no_build)
            overlap_pct = 0.0
            if overlaps_no_build:
                inter = cell.intersection(hard_no_build)
                overlap_pct = inter.area / cell.area if cell.area > 0 else 0.0

            # If overlapping hard no-build buffer, designate as protected riparian / eco green buffer
            if overlaps_no_build and overlap_pct > 0.005:
                features.append({
                    "type": "Feature",
                    "id": cell_id,
                    "properties": {
                        "cell_id": cell_id,
                        "land_use": "ecological_buffer",
                        "category": "Green Space",
                        "density_du_ha": 0,
                        "housing_units": 0,
                        "area_ha": cell_area_ha,
                        "color": "#10b981", # emerald
                        "description": "Protected riparian/ecological buffer parcel"
                    },
                    "geometry": SpatialEngine.to_geojson(cell)
                })
                continue

            # Assign land use and building typology based on strategy distribution
            rnd = (cell_index * 13 + 7) % 100 / 100.0

            # Scale factor for building inset inside parcel (setbacks)
            m_lon, m_lat = SpatialEngine.get_metric_scales(cell.centroid.y)
            setback_m = 4.0
            dx_setback = setback_m / m_lon
            dy_setback = setback_m / m_lat

            # Default building properties
            bld_info = {}
            road_info = {}
            park_info = {}

            if rnd < green_ratio:
                land_use = "park_greenspace"
                category = "Green Space"
                color = "#22c55e" # green
                h_units = 0
                density = 0
                park_info = {
                    "park_name": f"Neighborhood Eco-Park #{cell_index}",
                    "amenities": ["Permeable Walking Trail", "Native Shade Trees", "Rain Garden Bioswale"],
                    "tree_count": int(round(cell_area_ha * 240)),
                    "canopy_cover_pct": 72
                }
            elif rnd < (green_ratio + road_ratio):
                land_use = "local_road_infrastructure"
                category = "Transportation"
                color = "#64748b" # slate
                h_units = 0
                density = 0
                road_info = {
                    "road_name": f"Eco-Corridor Avenue {cell_index}",
                    "width_meters": 18.0 if strategy == "capacity_focused" else 14.0,
                    "lanes": 4 if strategy == "capacity_focused" else 2,
                    "sidewalk_width_m": 2.5,
                    "has_bike_lane": True,
                    "surface": "Permeable Sound-Absorbing Asphalt",
                    "tree_canopy_row": True
                }
            elif rnd < (green_ratio + road_ratio + service_ratio):
                land_use = "public_facility"
                category = "Civic / Services"
                color = "#3b82f6" # blue
                h_units = 0
                density = 0
                height_m = 14.0
                storeys = 3
                bld_info = {
                    "building_id": f"BLD-CIVIC-{cell_index:03d}",
                    "building_name": f"Civic Community Pavilion #{cell_index}",
                    "building_type": "Civic Health & Learning Center",
                    "storeys": storeys,
                    "height_meters": height_m,
                    "roof_type": "Solar Canopy & Public Terrace Garden",
                    "facade_material": "Locally Sourced Laterite & High-Performance Glazing",
                    "footprint_ratio": 0.55
                }
            else:
                if strategy == "capacity_focused":
                    land_use = "residential_high_density"
                    density = base_density
                    color = "#f97316" # orange
                    storeys = 12 + (cell_index % 5)
                    height_m = round(storeys * 3.1, 1)
                    bld_type = "High-Rise Eco Tower"
                    facade = "Terracotta Ceramic & Low-E Solar Glass"
                elif strategy == "ecological_priority":
                    land_use = "residential_eco_low_impact"
                    density = base_density
                    color = "#eab308" # yellow
                    storeys = 3 + (cell_index % 2)
                    height_m = round(storeys * 3.2, 1)
                    bld_type = "Biophilic Low-Impact Solar Villa"
                    facade = "Cross-Laminated Timber & Natural Stone"
                else:
                    land_use = "residential_mixed_medium"
                    density = base_density
                    color = "#f59e0b" # amber
                    storeys = 6 + (cell_index % 3)
                    height_m = round(storeys * 3.1, 1)
                    bld_type = "Bioclimatic Mid-Rise Apartment"
                    facade = "Recycled Composite & Aerated Green Balconies"

                category = "Residential"
                h_units = int(round(cell_area_ha * density))
                allocated_res_units += h_units

                bld_info = {
                    "building_id": f"BLD-RES-{cell_index:03d}",
                    "building_name": f"{bld_type} Sector {cell_index}",
                    "building_type": bld_type,
                    "storeys": storeys,
                    "height_meters": height_m,
                    "housing_units": h_units,
                    "roof_type": "Rooftop Photovoltaic Array & Sky Garden",
                    "facade_material": facade,
                    "footprint_ratio": 0.60
                }

            props = {
                "cell_id": cell_id,
                "land_use": land_use,
                "category": category,
                "density_du_ha": density,
                "housing_units": h_units,
                "area_ha": cell_area_ha,
                "color": color,
                "description": f"Proposed {land_use.replace('_', ' ')} allocation",
                "building": bld_info if bld_info else None,
                "road": road_info if road_info else None,
                "park": park_info if park_info else None,
            }

            features.append({
                "type": "Feature",
                "id": cell_id,
                "properties": props,
                "geometry": SpatialEngine.to_geojson(cell)
            })

        # DELIBERATE VIOLATION INJECTION (For demonstration of independent validator)
        if deliberate_violation:
            # Place a deliberate commercial/building parcel right in the restricted sanctuary zone
            # and a deliberate highway straight through the water body buffer!
            if restricted_union and not restricted_union.is_empty:
                r_centroid = restricted_union.centroid
                m_lon, m_lat = SpatialEngine.get_metric_scales(r_centroid.y)
                violation_box = box(
                    r_centroid.x - (30.0 / m_lon),
                    r_centroid.y - (30.0 / m_lat),
                    r_centroid.x + (30.0 / m_lon),
                    r_centroid.y + (30.0 / m_lat)
                )
                features.append({
                    "type": "Feature",
                    "id": "VIOLATION_PARCEL_SANCTUARY_01",
                    "properties": {
                        "cell_id": "VIOLATION_PARCEL_SANCTUARY_01",
                        "land_use": "commercial_shopping_complex",
                        "category": "Commercial",
                        "density_du_ha": 150.0,
                        "housing_units": 0,
                        "area_ha": SpatialEngine.calculate_area_hectares(violation_box),
                        "color": "#ef4444", # red
                        "is_deliberate_violation": True,
                        "description": "DELIBERATELY INJECTED: Commercial complex proposed inside protected wildlife sanctuary"
                    },
                    "geometry": SpatialEngine.to_geojson(violation_box)
                })

            if water_union and not water_union.is_empty:
                w_centroid = water_union.centroid
                m_lon, m_lat = SpatialEngine.get_metric_scales(w_centroid.y)
                violation_road_box = box(
                    w_centroid.x - (10.0 / m_lon),
                    w_centroid.y - (50.0 / m_lat),
                    w_centroid.x + (10.0 / m_lon),
                    w_centroid.y + (50.0 / m_lat)
                )
                features.append({
                    "type": "Feature",
                    "id": "VIOLATION_ROAD_WATER_BUFFER_02",
                    "properties": {
                        "cell_id": "VIOLATION_ROAD_WATER_BUFFER_02",
                        "land_use": "heavy_traffic_highway",
                        "category": "Transportation",
                        "density_du_ha": 0,
                        "housing_units": 0,
                        "area_ha": SpatialEngine.calculate_area_hectares(violation_road_box),
                        "color": "#dc2626", # deep red
                        "is_deliberate_violation": True,
                        "description": "DELIBERATELY INJECTED: Proposed highway cutting directly across natural stream & 50m water buffer"
                    },
                    "geometry": SpatialEngine.to_geojson(violation_road_box)
                })

        render_img = "/renders/eco_city_3d_masterplan.jpg"
        if strategy == "capacity_focused":
            render_img = "/renders/capacity_focused_3d_city.jpg"
        elif strategy == "ecological_priority":
            render_img = "/renders/biophilic_ecological_3d.jpg"

        return {
            "type": "FeatureCollection",
            "name": f"UTKAL Land-Use Layout — {strategy.replace('_', ' ').title()}",
            "metadata": {
                "strategy": strategy,
                "deliberate_violation": deliberate_violation,
                "total_parcels": len(features),
                "total_housing_units": allocated_res_units,
                "target_units": housing_target,
                "render_image_url": render_img,
                "has_3d_buildings": True,
            },
            "features": features
        }
