def test_login_success(client):
    res = client.post("/api/v1/auth/login", json={
        "username_or_email": "admin",
        "password": "UtkalAdmin2026!"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"

def test_login_invalid_password(client):
    res = client.post("/api/v1/auth/login", json={
        "username_or_email": "admin",
        "password": "WrongPassword999"
    })
    assert res.status_code == 401

def test_register_new_planner(client):
    import uuid
    u_name = f"user_{uuid.uuid4().hex[:6]}"
    res = client.post("/api/v1/auth/register", json={
        "username": u_name,
        "email": f"{u_name}@example.com",
        "password": "Password123!",
        "full_name": "Test Urban Planner"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "planner"
    assert data["username"] == u_name

def test_planner_cannot_escalate_to_admin(client):
    import uuid
    u_name = f"hacker_{uuid.uuid4().hex[:6]}"
    res = client.post("/api/v1/auth/register", json={
        "username": u_name,
        "email": f"{u_name}@example.com",
        "password": "Password123!",
        "role": "admin"  # Attempting privilege escalation
    })
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "planner"  # Must remain planner
