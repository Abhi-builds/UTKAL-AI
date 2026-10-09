def test_generate_trio_alternatives(client, planner_token):
    headers = {"Authorization": f"Bearer {planner_token}"}
    p_res = client.post("/api/v1/projects/", json={
        "name": "Alternative Comparison Study",
        "description": "3-scenario comparison"
    }, headers=headers)
    p_id = p_res.json()["id"]
    client.post(f"/api/v1/projects/{p_id}/load-demo-data", headers=headers)

    trio_res = client.post(f"/api/v1/projects/{p_id}/generator/generate-trio", headers=headers)
    assert trio_res.status_code == 200
    scenarios = trio_res.json()
    assert len(scenarios) == 3

    strategies = {s["strategy"] for s in scenarios}
    assert strategies == {"capacity_focused", "balanced", "ecological_priority"}

    # Verify each has layout_geojson and environmental metrics
    for s in scenarios:
        assert s["layout_geojson"]["type"] == "FeatureCollection"
        assert len(s["layout_geojson"]["features"]) > 0
        met = s["environmental_metrics"]["metrics_data"]
        assert "green_space_pct" in met
        assert "housing_capacity_units" in met
        assert "pareto_rank" in met
