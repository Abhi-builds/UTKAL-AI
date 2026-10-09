import io
import csv
import json
from datetime import datetime, timezone
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

class ReportGenerator:
    """
    Generates authentic project reports in JSON, CSV, GeoJSON, and PDF formats
    using live database records.
    """

    @classmethod
    def generate_json_report(
        cls,
        project_data: Dict[str, Any],
        scenarios_data: List[Dict[str, Any]]
    ) -> str:
        report = {
            "title": f"UTKAL Ecological City Planning Report — {project_data.get('name')}",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "disclaimer": (
                "UTKAL supports preliminary land-use scenario exploration and decision support. "
                "It does NOT replace professional environmental impact assessments (EIA), "
                "statutory master plan approvals, or on-ground ecological surveys."
            ),
            "project": project_data,
            "scenarios": scenarios_data
        }
        return json.dumps(report, indent=2, default=str)

    @classmethod
    def generate_csv_report(
        cls,
        project_data: Dict[str, Any],
        scenarios_data: List[Dict[str, Any]]
    ) -> str:
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["UTKAL Ecological City Planning System — Scenario Comparison Report"])
        writer.writerow(["Project Name", project_data.get("name")])
        writer.writerow(["Generated At", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")])
        writer.writerow([])

        # Table header
        headers = [
            "Scenario Name",
            "Strategy",
            "Status",
            "Valid (Compliant)",
            "Hard Violations",
            "Warnings",
            "Total Area (ha)",
            "Green Space (ha)",
            "Green Space (%)",
            "Dev Footprint (ha)",
            "Road Footprint (ha)",
            "Housing Units",
            "Est. Population",
            "Restricted Land Affected (ha)",
            "Survey Land Affected (ha)",
            "Connectivity Index",
            "Avg Walk to Green (m)",
            "Runoff Retention (%)",
            "Pareto Rank"
        ]
        writer.writerow(headers)

        for s in scenarios_data:
            val = s.get("validation_result") or {}
            met = s.get("environmental_metrics") or {}
            m_data = met.get("metrics_data") or {}

            writer.writerow([
                s.get("name"),
                s.get("strategy"),
                s.get("status"),
                "YES" if val.get("is_valid") else "NO",
                val.get("hard_violations_count", 0),
                val.get("warnings_count", 0),
                m_data.get("total_area_ha", 0),
                m_data.get("green_space_area_ha", 0),
                f"{m_data.get('green_space_pct', 0)}%",
                m_data.get("development_footprint_ha", 0),
                m_data.get("road_footprint_ha", 0),
                m_data.get("housing_capacity_units", 0),
                m_data.get("estimated_population", 0),
                m_data.get("restricted_land_affected_ha", 0),
                m_data.get("survey_needed_affected_ha", 0),
                m_data.get("green_connectivity_index", 0),
                m_data.get("avg_distance_to_green_m", 0),
                f"{m_data.get('runoff_retention_estimate_pct', 0)}%",
                m_data.get("pareto_rank", 1)
            ])

        return output.getvalue()

    @classmethod
    def generate_pdf_report(
        cls,
        project_data: Dict[str, Any],
        scenarios_data: List[Dict[str, Any]]
    ) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=20,
            leading=24,
            textColor=colors.HexColor('#065f46')
        )
        subtitle_style = ParagraphStyle(
            'SubtitleStyle',
            parent=styles['Normal'],
            fontSize=11,
            leading=15,
            textColor=colors.HexColor('#475569')
        )
        h2_style = ParagraphStyle(
            'H2Style',
            parent=styles['Heading2'],
            fontSize=14,
            leading=18,
            textColor=colors.HexColor('#0f172a'),
            spaceBefore=14,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'BodyStyle',
            parent=styles['Normal'],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#1e293b')
        )
        disclaimer_style = ParagraphStyle(
            'DisclaimerStyle',
            parent=styles['Normal'],
            fontSize=8,
            leading=10,
            textColor=colors.HexColor('#991b1b')
        )

        story = []

        # Header
        story.append(Paragraph("UTKAL — Ecological City Planning System", title_style))
        story.append(Paragraph(f"Project Assessment Report: <b>{project_data.get('name', 'Urban Sector')}</b>", subtitle_style))
        story.append(Paragraph(f"Report Generated: {datetime.now(timezone.utc).strftime('%B %d, %Y - %H:%M UTC')}", subtitle_style))
        story.append(Spacer(1, 10))

        # Regulatory Notice
        disclaimer_box = [
            [Paragraph("<b>STATUTORY NOTICE & SCOPE LIMITATION:</b> This report reflects computer-assisted land-use scenarios and spatial constraint evaluations generated by UTKAL. It is designed to assist urban planning teams in exploring ecological trade-offs. It DOES NOT replace statutory statutory environmental impact assessments (EIA), certified geotechnical investigations, or official master planning approval.", disclaimer_style)]
        ]
        t_disc = Table(disclaimer_box, colWidths=[540])
        t_disc.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#fef2f2')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#f87171')),
            ('PADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(t_disc)
        story.append(Spacer(1, 12))

        # Project Parameters
        story.append(Paragraph("1. Project Parameters & Ecological Targets", h2_style))
        proj_rows = [
            ["Project Parameter", "Target / Value", "Planning Reference"],
            ["Housing Target", f"{project_data.get('housing_target_units', 5000):,} units", "Target dwelling units for sector"],
            ["Development Density", f"{project_data.get('development_density_du_ha', 120)} DU / ha", "Master plan residential density ceiling"],
            ["Green Space Allocation", f"{project_data.get('green_space_target_pct', 30)}% minimum", "Mandatory ecological corridor target"],
            ["Road Network Target", f"{project_data.get('road_allocation_pct', 18)}%", "Right-of-way and local access network"],
            ["Civic Services Target", f"{project_data.get('public_services_pct', 12)}%", "Community facilities, clinics & schools"],
        ]
        t_proj = Table(proj_rows, colWidths=[160, 160, 220])
        t_proj.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#065f46')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('PADDING', (0,0), (-1,-1), 4),
            ('FONTSIZE', (0,0), (-1,-1), 8),
        ]))
        story.append(t_proj)
        story.append(Spacer(1, 14))

        # Scenarios Comparison Table
        story.append(Paragraph("2. Generated Alternative Scenarios & Environmental Metrics", h2_style))
        scen_headers = ["Scenario / Strategy", "Status", "Green Space %", "Housing Units", "Restricted Hit", "Connectivity", "Pareto"]
        scen_rows = [scen_headers]

        for s in scenarios_data:
            val = s.get("validation_result") or {}
            met = (s.get("environmental_metrics") or {}).get("metrics_data") or {}
            status_text = "COMPLIANT" if val.get("is_valid") else f"FAILED ({val.get('hard_violations_count', 0)} viol)"

            scen_rows.append([
                Paragraph(f"<b>{s.get('name')}</b><br/><font color='#64748b'>{s.get('strategy')}</font>", body_style),
                status_text,
                f"{met.get('green_space_pct', 0)}%",
                f"{met.get('housing_capacity_units', 0):,}",
                f"{met.get('restricted_land_affected_ha', 0)} ha",
                f"{met.get('green_connectivity_index', 0)}",
                f"Rank {met.get('pareto_rank', 1)}"
            ])

        t_scen = Table(scen_rows, colWidths=[150, 85, 65, 75, 70, 55, 40])
        t_scen.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e293b')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('PADDING', (0,0), (-1,-1), 4),
            ('FONTSIZE', (0,0), (-1,-1), 8),
        ]))
        story.append(t_scen)
        story.append(Spacer(1, 14))

        # Constraint Violations & Findings Detail
        story.append(Paragraph("3. Spatial Constraint Audit & Rule Findings", h2_style))
        for s in scenarios_data:
            val = s.get("validation_result") or {}
            findings = val.get("findings") or []
            story.append(Paragraph(f"<b>Scenario: {s.get('name')}</b> ({'Passes all rules' if val.get('is_valid') else 'Violations detected'})", body_style))
            if not findings:
                story.append(Paragraph("<i>No constraint violations found. Complies with boundary, buffers, and sanctuary restrictions.</i>", body_style))
                story.append(Spacer(1, 6))
            else:
                find_rows = [["Rule ID", "Severity", "Finding Description"]]
                for f in findings[:6]:
                    find_rows.append([
                        f.get("rule_id", "RULE"),
                        f.get("severity", "INFO"),
                        Paragraph(f.get("message", ""), body_style)
                    ])
                t_find = Table(find_rows, colWidths=[90, 80, 370])
                t_find.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#475569')),
                    ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
                    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
                    ('PADDING', (0,0), (-1,-1), 3),
                    ('FONTSIZE', (0,0), (-1,-1), 7),
                ]))
                story.append(t_find)
                story.append(Spacer(1, 8))

        doc.build(story)
        return buffer.getvalue()
