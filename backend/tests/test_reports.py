def test_export_reports_all_formats(client, planner_token):
    headers = {"Authorization": f"Bearer {planner_token}"}
    p_res = client.post("/api/v1/projects/", json={
        "name": "Export Assessment Unit",
        "description": "Report export testing"
    }, headers=headers)
    p_id = p_res.json()["id"]
    client.post(f"/api/v1/projects/{p_id}/load-demo-data", headers=headers)
    client.post(f"/api/v1/projects/{p_id}/generator/generate-trio", headers=headers)

    # 1. Test JSON Export
    res_json = client.get(f"/api/v1/projects/{p_id}/reports/json", headers=headers)
    assert res_json.status_code == 200
    assert "application/json" in res_json.headers["content-type"]
    assert "UTKAL Ecological City Planning Report" in res_json.text

    # 2. Test CSV Export
    res_csv = client.get(f"/api/v1/projects/{p_id}/reports/csv", headers=headers)
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert "Scenario Comparison Report" in res_csv.text

    # 3. Test PDF Export
    res_pdf = client.get(f"/api/v1/projects/{p_id}/reports/pdf", headers=headers)
    assert res_pdf.status_code == 200
    assert "application/pdf" in res_pdf.headers["content-type"]
    assert res_pdf.content.startswith(b"%PDF")

    # 4. Test GeoJSON Bundle Export
    res_geo = client.get(f"/api/v1/projects/{p_id}/reports/geojson", headers=headers)
    assert res_geo.status_code == 200
    assert "application/geo+json" in res_geo.headers["content-type"]
    assert "FeatureCollection" in res_geo.text
