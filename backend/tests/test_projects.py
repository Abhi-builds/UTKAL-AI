def test_create_project_and_ownership_isolation(client, planner_token, admin_token):
    # 1. Planner creates a project
    headers_planner = {"Authorization": f"Bearer {planner_token}"}
    res = client.post("/api/v1/projects/", json={
        "name": "Planner Green District",
        "description": "Eco residential testing area",
        "housing_target_units": 4500,
        "green_space_target_pct": 35.0
    }, headers=headers_planner)
    assert res.status_code == 200
    p_data = res.json()
    project_id = p_data["id"]

    # 2. Another user registers
    import uuid
    u2_name = f"planner2_{uuid.uuid4().hex[:6]}"
    reg_res = client.post("/api/v1/auth/register", json={
        "username": u2_name,
        "email": f"{u2_name}@example.com",
        "password": "Password123!"
    })
    assert reg_res.status_code == 200
    login_res = client.post("/api/v1/auth/login", json={
        "username_or_email": u2_name,
        "password": "Password123!"
    })
    u2_token = login_res.json()["access_token"]
    headers_u2 = {"Authorization": f"Bearer {u2_token}"}

    # 3. User 2 attempts to access Planner 1's project -> MUST BE 403 FORBIDDEN!
    res_forbidden = client.get(f"/api/v1/projects/{project_id}", headers=headers_u2)
    assert res_forbidden.status_code == 403
    assert "permission" in res_forbidden.json()["detail"].lower()

    # 4. Admin CAN access Planner 1's project
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    res_admin = client.get(f"/api/v1/projects/{project_id}", headers=headers_admin)
    assert res_admin.status_code == 200
    assert res_admin.json()["name"] == "Planner Green District"

def test_load_demo_data(client, planner_token):
    headers = {"Authorization": f"Bearer {planner_token}"}
    p_res = client.post("/api/v1/projects/", json={
        "name": "Bhubaneswar Demo Workspace",
        "description": "Synthetic demonstration project"
    }, headers=headers)
    p_id = p_res.json()["id"]

    # Load demo data
    demo_res = client.post(f"/api/v1/projects/{p_id}/load-demo-data", headers=headers)
    assert demo_res.status_code == 200
    p_full = demo_res.json()
    assert len(p_full["layers"]) >= 5
    assert len(p_full["restrictions"]) >= 2
    assert p_full["study_boundary_geojson"] is not None
