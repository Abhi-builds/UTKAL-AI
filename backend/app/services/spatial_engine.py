import math
from typing import Dict, Any, List, Tuple, Optional
from shapely.geometry import shape, mapping, Polygon, MultiPolygon, Point, LineString, box
from shapely.ops import unary_union
import shapely

class SpatialEngine:
    """
    Robust geospatial engine powered by Shapely and metric projections.
    Provides metric buffering, spatial intersections, boundary checks, and area calculations.
    """

    @staticmethod
    def get_metric_scales(lat: float) -> Tuple[float, float]:
        """
        Returns (meters_per_degree_lon, meters_per_degree_lat) for a given latitude.
        1 deg lat ~ 111,320m.
        1 deg lon ~ 111,320m * cos(lat).
        """
        lat_rad = math.radians(lat)
        m_per_deg_lat = 111320.0
        m_per_deg_lon = 111320.0 * math.cos(lat_rad)
        return m_per_deg_lon, m_per_deg_lat

    @classmethod
    def to_shapely(cls, geojson_obj: Dict[str, Any]):
        """Convert GeoJSON geometry or feature to Shapely geometry."""
        if not geojson_obj:
            return None
        if "type" in geojson_obj:
            if geojson_obj["type"] == "Feature":
                return shape(geojson_obj["geometry"])
            elif geojson_obj["type"] == "FeatureCollection":
                geoms = [shape(f["geometry"]) for f in geojson_obj.get("features", []) if f.get("geometry")]
                return unary_union(geoms) if geoms else None
            else:
                return shape(geojson_obj)
        return None

    @classmethod
    def to_geojson(cls, geom) -> Optional[Dict[str, Any]]:
        """Convert Shapely geometry to GeoJSON dict."""
        if geom is None or geom.is_empty:
            return None
        return mapping(geom)

    @classmethod
    def buffer_metric(cls, geom, buffer_meters: float, center_lat: float = 20.2961):
        """
        Buffers geometry by distance in meters, projecting accurately into metric space.
        """
        if geom is None or geom.is_empty or buffer_meters <= 0:
            return geom

        m_lon, m_lat = cls.get_metric_scales(center_lat)
        # Approximate degree delta
        deg_buffer = buffer_meters / ((m_lon + m_lat) / 2.0)
        return geom.buffer(deg_buffer)

    @classmethod
    def calculate_area_hectares(cls, geom, center_lat: float = 20.2961) -> float:
        """Calculate area in hectares for a geometry in WGS84."""
        if geom is None or geom.is_empty:
            return 0.0
        m_lon, m_lat = cls.get_metric_scales(center_lat)
        # Degree area scaled to square meters
        sq_meters = geom.area * m_lon * m_lat
        hectares = sq_meters / 10000.0
        return round(hectares, 4)

    @classmethod
    def calculate_length_meters(cls, geom, center_lat: float = 20.2961) -> float:
        """Calculate length in meters for line geometry."""
        if geom is None or geom.is_empty:
            return 0.0
        m_lon, m_lat = cls.get_metric_scales(center_lat)
        avg_scale = (m_lon + m_lat) / 2.0
        return round(geom.length * avg_scale, 2)

    @classmethod
    def point_distance_meters(cls, p1: Point, p2: Point, center_lat: float = 20.2961) -> float:
        """Calculate Euclidean metric distance between two points in WGS84."""
        m_lon, m_lat = cls.get_metric_scales(center_lat)
        dx = (p1.x - p2.x) * m_lon
        dy = (p1.y - p2.y) * m_lat
        return math.hypot(dx, dy)

    @classmethod
    def create_grid(
        cls,
        boundary_geom,
        cell_size_meters: float = 60.0,
        center_lat: float = 20.2961
    ) -> List[Polygon]:
        """
        Creates a regular 2D grid covering the boundary polygon.
        """
        if boundary_geom is None or boundary_geom.is_empty:
            return []

        minx, miny, maxx, maxy = boundary_geom.bounds
        m_lon, m_lat = cls.get_metric_scales(center_lat)

        dx = cell_size_meters / m_lon
        dy = cell_size_meters / m_lat

        grid_cells = []
        cur_y = miny
        while cur_y < maxy:
            cur_x = minx
            while cur_x < maxx:
                cell = box(cur_x, cur_y, cur_x + dx, cur_y + dy)
                if boundary_geom.intersects(cell):
                    clipped = boundary_geom.intersection(cell)
                    if not clipped.is_empty and clipped.area > (cell.area * 0.1):
                        if isinstance(clipped, Polygon):
                            grid_cells.append(clipped)
                        elif isinstance(clipped, MultiPolygon):
                            for poly in clipped.geoms:
                                if poly.area > (cell.area * 0.1):
                                    grid_cells.append(poly)
                cur_x += dx
            cur_y += dy

        return grid_cells
