# UTKAL — Local Ecological City Planning System

UTKAL is an offline-ready, computer-assisted land-use planning and ecological decision-support application. It enables urban planners to generate, test, audit, and compare alternative city layouts before construction begins, ensuring housing and infrastructure targets respect natural waterways, green corridors, and environmental restrictions.

---

## Architecture Overview

- **Frontend:** React 19, TypeScript, Vite, Leaflet GIS (100% offline Canvas/SVG vector rendering, zero external map tile calls), Lucide Icons, Custom Design System.
- **Backend:** Python 3.11+, FastAPI, SQLAlchemy 2.0, Shapely 2.2.0 (metric spatial geometry calculations), NetworkX (green connectivity graphs), ReportLab (PDF generation).
- **Database:** PostgreSQL with PostGIS / GeoAlchemy2 spatial storage and Alembic database migrations.
- **Security:** Password hashing with bcrypt, JWT token authentication (`python-jose`), Role-Based Access Control (`admin` and `planner`), multi-tenant project isolation, and audit logging.

---

## Default Accounts (Pre-Seeded)

| Role | Username | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin` | `UtkalAdmin2026!` | User management, audit trail inspection, system oversight |
| **Lead Urban Planner** | `planner` | `Planner2026!` | Project creation, layer management, layout generation, reports |

---

## Quick Start: Running on Your Laptop (Native Setup)

The application is bound to `127.0.0.1` by default and runs locally without external dependencies.

### Step 1: Start PostgreSQL

UTKAL includes a pre-configured local PostgreSQL server and database script:

```powershell
# In PowerShell from the project root:
.\scripts\start_postgres.ps1
```

*Note: The database runs on `127.0.0.1:5433` with database name `utkal_db`.*

### Step 2: Start the FastAPI Backend

```powershell
# Open a terminal:
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Verify backend health at: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)

### Step 3: Start the Frontend UI

```powershell
# In a separate terminal inside the frontend folder:
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

Open your web browser and navigate to: [http://127.0.0.1:5173](http://127.0.0.1:5173)

---

## Alternative Setup: Docker Compose

If you have Docker Desktop installed, you can launch the complete containerized stack (PostGIS + FastAPI + React/Nginx) with one command:

```bash
docker-compose up --build
```

- Frontend: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:8000`
- Database: `127.0.0.1:5432`

---

## Demonstration Workflow Walkthrough (11 Steps)

Follow this sequence to demonstrate UTKAL's complete end-to-end functionality:

1. **Sign In:**
   - Open [http://127.0.0.1:5173](http://127.0.0.1:5173).
   - Click the **Lead Planner** quick login button (or enter `planner` / `Planner2026!`) and click **Sign In to Studio**.
2. **Explore or Create a Project:**
   - On the Dashboard, click **Load Bhubaneswar Demo** (or click **Create Project** to create a blank sector).
   - This automatically creates the project, attaches 7 local synthetic GIS layers, creates default 50m water buffer and sanctuary restrictions, and generates benchmark alternative layouts.
3. **Open the Study Map:**
   - The interactive Leaflet Planning Studio opens.
   - Inspect the study boundary, Daya canal tributary, rainwater retention lake, Chandaka forest corridor, and existing roadways.
   - Click the **Layers & Overlays** button on the top right to toggle individual layers on and off.
4. **Inspect Geographic Layers:**
   - Switch to the **Layers** tab in the right-hand panel.
   - View the feature counts and source metadata for each layer.
   - Use the **Add Layer** button to upload any local `.geojson` file from your disk.
5. **Configure Ecological Restrictions:**
   - Notice the default statutory restrictions:
     - *Statutory Waterbody Setback (50m Buffer)*
     - *Chandaka Sanctuary Eco-Sensitive Buffer (Strict No-Build Zone)*
     - *Lowland Wetland Survey Precaution (30m Survey Advisory)*
6. **Generate Alternative Layouts:**
   - Click **Generate Layouts** in the top bar.
   - Choose from 3 distinct planning strategies:
     - **Capacity Focused:** Prioritizes residential density (high housing output, compact road grid).
     - **Balanced:** Sustainable neighborhood mix with green fingers and public facilities.
     - **Ecological Priority:** Nature-first layout maximizing continuous riparian buffers and minimizing road coverage.
   - Adjust target housing units or green space target percentage.
   - Click **Generate & Audit Layout** (or click **Generate Trio** to benchmark all three).
7. **Detect a Deliberate Spatial-Rule Violation:**
   - Click **Generate Layouts**.
   - Check the box: **Demonstrate Spatial Rule Violation Detection**.
   - Click **Generate & Audit Layout**.
   - The scenario is generated with a deliberate commercial complex inside the wildlife sanctuary and a highway cutting across the water buffer.
   - The application immediately switches to the **Audit Findings** tab with a prominent red **HARD CONSTRAINTS VIOLATED** banner!
   - Inspect the specific rule findings explaining the sanctuary encroachment and 50m water buffer breach.
   - Click on the finding to see the offending parcel highlighted on the map!
8. **Review a Corrected Design:**
   - Select the **Balanced** or **Ecological Priority** scenario from the Layouts tab.
   - Notice that the banner turns green: **ECOLOGICALLY COMPLIANT (0 Hard Violations)**.
9. **Compare the Alternatives:**
   - Switch to the **Trade-offs** tab.
   - Inspect the side-by-side comparison matrix and Pareto rank cards.
   - Compare quantitative indicators:
     - Green Space Area (ha) and Percentage (%)
     - Housing Capacity (Units) and Estimated Population
     - Graph-based Green Connectivity Index (0.0 to 1.0)
     - Average Walking Distance to Nearest Green Space (meters)
     - Permeable Stormwater Runoff Retention (%)
     - Pareto Dominance Rank
10. **Explore the 3D Urban Digital Twin:**
    - In the top header bar, click **3D Digital Twin** (or click the **3D Twin** button on any scenario card).
    - The interactive 3D WebGL viewport initializes (using Three.js):
      - **Real 3D Storeyed Buildings:** Extruded by real building heights (12m to 54m), storeys (3 to 18 floors), procedural facade materials, window arrays, and rooftop solar / biophilic sky gardens.
      - **Real Asphalt Road Networks:** Arterial (24m), Collector (16m), and Local (10m) road ribbons with painted lane dividers and pedestrian sidewalks.
      - **3D Urban Forestry & Riparian Waterways:** Procedural 3D tree canopies lining road corridors and reflective water bodies.
      - **Dynamic Solar Lighting & Time of Day:** Switch between **Day (Midday Sun)**, **Sunset (Golden Hour)**, and **Night (Luminescent City Lights)** lighting presets.
      - **Interactive Building Raycasting:** Click directly on any 3D building to inspect its name, typology, floor count, height in meters, housing unit allocation, and roof typology in the floating HUD!
11. **Inspect High-Resolution 3D Architectural Master Plan Renderings:**
    - Click **3D Plan Image** in the top bar, or click the **3D Image** button on any scenario card.
    - A photorealistic, ultra-high-resolution 3D master plan aerial image opens in full view, showcasing:
      - Photorealistic high-density eco-towers with integrated vertical greenery.
      - Wide multi-lane parkways and tree-lined arterial boulevards.
      - Preserved riparian wetland corridors and biophilic public parks.
    - Click **Download 3D Image** to save the rendering locally for client presentations or master plan exhibits.
12. **Export a Report:**
    - Click the **Export Report** button in the top header.
    - Choose from 4 live export formats:
      - **PDF:** Formatted assessment report with executive summary, scenario comparisons, audit findings, and regulatory disclaimer.
      - **CSV:** Tabular spreadsheet metrics for Excel analysis.
      - **GeoJSON:** Vector layout polygons for QGIS or CAD import.
      - **JSON:** Complete machine-readable project and scenarios payload.
13. **Persistence Test (Restart Verification):**
    - Sign out or close the browser tab.
    - Restart the frontend or reload the page.
    - Sign back in as `planner` (or `admin`).
    - The saved project, all layers, generated layouts, and audit findings persist in PostgreSQL and load immediately!

---

## Running Automated Tests

UTKAL includes a comprehensive automated test suite covering authentication, permissions, multi-tenant isolation, spatial metric calculations, layout generation, violation detection, and report generation:

```powershell
# From the project root:
python -m pytest backend/tests
```

All 12 tests execute against the live PostgreSQL database and pass with a 100% success rate.

---

## Database Backup and Restore

To back up the PostgreSQL database:
```powershell
.\scripts\backup_db.ps1
```

To restore from a backup SQL dump:
```powershell
.\scripts\restore_db.ps1 -BackupFile "d:\UTKAL AI\utkal_backup_XXXX.sql"
```

---

## Security & Local Hosting Disclaimers

1. **Local Boundary:** UTKAL binds to `127.0.0.1` by default to prevent unauthorized network access.
2. **Access Control:** User passwords are encrypted with bcrypt, sessions are signed with JWTs, and users cannot access another planner's project simply by changing an ID parameter.
3. **Local Laptop Limits:** Local hosting provides privacy and air-gapped isolation against external cloud services, but does NOT protect against local malware or unauthorized physical access to the laptop itself. Protect your local workstation using full-disk encryption (BitLocker) and strong operating system credentials.
4. **Regulatory Disclaimers:** UTKAL generates computer-assisted planning scenarios to aid exploratory decision-making. It does **NOT** substitute certified Environmental Impact Assessments (EIA), on-site hydrological/geotechnical surveys, or statutory master plan approvals by urban development authorities.
