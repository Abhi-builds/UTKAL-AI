def test_deliberate_violation_caught_and_corrected_design_passes(client, planner_token):
    headers = {"Authorization": f"Bearer {planner_token}"}

    # 1. Create project and load Bhubaneswar demo data
    p_res = client.post("/api/v1/projects/", json={
        "name": "Validation Benchmark Project",
        "description": "Demonstrating spatial violation detection"
    }, headers=headers)
    p_id = p_res.json()["id"]
    client.post(f"/api/v1/projects/{p_id}/load-demo-data", headers=headers)

    # 2. Generate DELIBERATELY INVALID layout (commercial building in sanctuary & highway in 50m water buffer)
    violation_gen_res = client.post(f"/api/v1/projects/{p_id}/generator/generate", json={
        "name": "Intentionally Flawed Scenario",
        "strategy": "capacity_focused",
        "deliberate_violation": True
    }, headers=headers)
    assert violation_gen_res.status_code == 200
    flawed_data = violation_gen_res.json()

    # 3. Verify Validator CAUGHT IT!
    val = flawed_data["validation_result"]
    assert val is not None
    assert val["is_valid"] is False, "Flawed design must be marked invalid!"
    assert val["hard_violations_count"] >= 1, "Must detect hard constraint violations"
    
    # Check that rule findings explain why
    rule_names = [f["rule_name"] for f in val["findings"]]
    has_sanctuary_or_buffer = any(
        "sanctuary" in r.lower() or "buffer" in r.lower() or "no-build" in r.lower()
        for r in rule_names
    )
    assert has_sanctuary_or_buffer, f"Must identify specific sanctuary or buffer rule: {rule_names}"

    # 4. Generate CORRECTED design (compliant layout respecting all constraints)
    corrected_gen_res = client.post(f"/api/v1/projects/{p_id}/generator/generate", json={
        "name": "Corrected Compliant Scenario",
        "strategy": "balanced",
        "deliberate_violation": False
    }, headers=headers)
    assert corrected_gen_res.status_code == 200
    corrected_data = corrected_gen_res.json()

    # 5. Verify Corrected Design PASSES!
    val_corrected = corrected_data["validation_result"]
    assert val_corrected is not None
    assert val_corrected["is_valid"] is True, "Corrected design must pass all hard constraints"
    assert val_corrected["hard_violations_count"] == 0, "No hard violations allowed in compliant design"
