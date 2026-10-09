from shapely.geometry import Point, box
from backend.app.services.spatial_engine import SpatialEngine

def test_metric_scales():
    m_lon, m_lat = SpatialEngine.get_metric_scales(20.2961)
    assert 100000 < m_lat < 112000
    assert 90000 < m_lon < 110000

def test_buffer_metric():
    p = Point(85.820, 20.295)
    buffered = SpatialEngine.buffer_metric(p, buffer_meters=50.0)
    assert buffered is not None
    assert buffered.area > 0

    # Area of 50m radius circle should be ~pi * 50^2 = 7854 sq m = ~0.785 ha
    area_ha = SpatialEngine.calculate_area_hectares(buffered)
    assert 0.70 < area_ha < 0.90

def test_grid_generation():
    boundary = box(85.815, 20.290, 85.825, 20.300)
    grid = SpatialEngine.create_grid(boundary, cell_size_meters=100.0)
    assert len(grid) > 10
    for cell in grid:
        assert boundary.intersects(cell)
