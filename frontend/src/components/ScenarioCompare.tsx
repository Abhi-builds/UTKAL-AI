import React, { useState } from 'react';
import { Scenario } from '../types';
import {
  CheckCircle2,
  AlertCircle,
  Award,
  Compass,
  Droplets,
  Home,
  TreePine,
  Image as ImageIcon,
  Building2,
  Download,
  X,
  Box,
} from 'lucide-react';

interface ScenarioCompareProps {
  scenarios: Scenario[];
  activeScenarioId: number | null;
  onSelectScenario: (scenario: Scenario) => void;
}

export const ScenarioCompare: React.FC<ScenarioCompareProps> = ({
  scenarios,
  activeScenarioId,
  onSelectScenario,
}) => {
  const [selected3DModalScenario, setSelected3DModalScenario] = useState<Scenario | null>(null);

  const getRenderUrl = (s: Scenario) => {
    if (s.layout_geojson?.metadata?.render_image_url) {
      return s.layout_geojson.metadata.render_image_url;
    }
    if (s.strategy === 'capacity_focused') return '/renders/capacity_focused_3d_city.jpg';
    if (s.strategy === 'ecological_priority') return '/renders/biophilic_ecological_3d.jpg';
    return '/renders/eco_city_3d_masterplan.jpg';
  };

  if (scenarios.length === 0) {
    return (
      <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dim)' }}>
        <Compass size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
        <p style={{ fontSize: '14px' }}>No scenarios generated yet. Run the City Design Generator or Generate Trio Alternatives to compare layouts.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {scenarios.map((scenario) => {
          const isSelected = scenario.id === activeScenarioId;
          const val = scenario.validation_result;
          const met = scenario.environmental_metrics?.metrics_data || ({} as any);
          const isCompliant = val?.is_valid;
          const paretoRank = met.pareto_rank || 1;

          return (
            <div
              key={scenario.id}
              onClick={() => onSelectScenario(scenario)}
              className="card"
              style={{
                cursor: 'pointer',
                borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
                boxShadow: isSelected ? 'var(--shadow-glow)' : 'var(--shadow-md)',
                background: isSelected ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-card)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              {/* Header */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className={`badge ${
                    scenario.strategy === 'capacity_focused'
                      ? 'badge-warning'
                      : scenario.strategy === 'ecological_priority'
                      ? 'badge-success'
                      : 'badge-info'
                  }`}>
                    {scenario.strategy.replace('_', ' ').toUpperCase()}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {paretoRank === 1 && (
                      <span className="badge badge-success" style={{ fontSize: '10px' }} title="Non-dominated Pareto Front layout">
                        <Award size={11} /> PARETO FRONT
                      </span>
                    )}
                    <span className={`badge ${isCompliant ? 'badge-success' : 'badge-danger'}`}>
                      {isCompliant ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                      {isCompliant ? 'COMPLIANT' : 'VIOLATION'}
                    </span>
                  </div>
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                  {scenario.name}
                </h3>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  Generated {new Date(scenario.created_at).toLocaleTimeString()}
                </div>
              </div>

              {/* 3D Master Plan Thumbnail */}
              <div
                style={{
                  position: 'relative',
                  height: '110px',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '1px solid var(--border-color)',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected3DModalScenario(scenario);
                }}
              >
                <img
                  src={getRenderUrl(scenario)}
                  alt={scenario.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute',
                  top: 6,
                  left: 6,
                  background: 'rgba(15, 23, 42, 0.85)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                }}>
                  <ImageIcon size={11} /> 3D Master Plan
                </div>
                <div style={{
                  position: 'absolute',
                  bottom: 6,
                  right: 6,
                  background: 'rgba(15, 23, 42, 0.85)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#f8fafc',
                }}>
                  Click to Expand
                </div>
              </div>

              {/* Key Quantitative Indicators */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Green Space */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <TreePine size={13} color="#22c55e" /> Green Space
                    </span>
                    <span style={{ fontWeight: 700, color: '#22c55e' }}>
                      {met.green_space_pct || 0}% ({met.green_space_area_ha || 0} ha)
                    </span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, met.green_space_pct || 0)}%`, height: '100%', background: '#22c55e' }} />
                  </div>
                </div>

                {/* Housing Capacity */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Home size={13} color="#f97316" /> Housing Capacity
                    </span>
                    <span style={{ fontWeight: 700, color: '#f97316' }}>
                      {(met.housing_capacity_units || 0).toLocaleString()} DU (~{(met.estimated_population || 0).toLocaleString()} pop)
                    </span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (met.housing_capacity_units || 0) / 70)}%`, height: '100%', background: '#f97316' }} />
                  </div>
                </div>

                {/* Runoff Retention */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Droplets size={13} color="#38bdf8" /> Runoff Retention
                    </span>
                    <span style={{ fontWeight: 700, color: '#38bdf8' }}>
                      {met.runoff_retention_estimate_pct || 0}%
                    </span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, met.runoff_retention_estimate_pct || 0)}%`, height: '100%', background: '#38bdf8' }} />
                  </div>
                </div>
              </div>

              {/* Detailed Metrics Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                padding: '10px',
                background: 'rgba(0,0,0,0.25)',
                borderRadius: 'var(--radius-md)',
                fontSize: '11px',
              }}>
                <div>
                  <div style={{ color: 'var(--text-dim)' }}>Connectivity Index</div>
                  <div style={{ fontWeight: 700, color: '#f8fafc' }}>{met.green_connectivity_index || 0} / 1.0</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-dim)' }}>Avg Walk to Green</div>
                  <div style={{ fontWeight: 700, color: '#f8fafc' }}>{met.avg_distance_to_green_m || 0} m</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-dim)' }}>Dev Footprint</div>
                  <div style={{ fontWeight: 700, color: '#f8fafc' }}>{met.development_footprint_ha || 0} ha</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-dim)' }}>Restricted Impact</div>
                  <div style={{ fontWeight: 700, color: (met.restricted_land_affected_ha || 0) > 0 ? '#ef4444' : '#10b981' }}>
                    {met.restricted_land_affected_ha || 0} ha
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, fontSize: '12px', padding: '8px' }}
                >
                  {isSelected ? 'Active Plan' : 'Select Plan'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected3DModalScenario(scenario);
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', padding: '8px 12px', borderColor: '#38bdf8', color: '#38bdf8' }}
                  title="View Photorealistic 3D Architectural Image"
                >
                  <ImageIcon size={14} /> 3D Image
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Matrix Table */}
      <div className="card" style={{ overflowX: 'auto', padding: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>
          Side-by-Side Trade-off Analysis Matrix
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-dim)' }}>
              <th style={{ padding: '8px' }}>Scenario</th>
              <th style={{ padding: '8px' }}>Compliance</th>
              <th style={{ padding: '8px' }}>Housing Units</th>
              <th style={{ padding: '8px' }}>Green Space %</th>
              <th style={{ padding: '8px' }}>Connectivity</th>
              <th style={{ padding: '8px' }}>Walk to Park</th>
              <th style={{ padding: '8px' }}>Runoff Retention</th>
              <th style={{ padding: '8px' }}>Sanctuary Encroachment</th>
              <th style={{ padding: '8px' }}>Pareto Rank</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => {
              const val = s.validation_result;
              const met = s.environmental_metrics?.metrics_data || ({} as any);
              const isSelected = s.id === activeScenarioId;

              return (
                <tr
                  key={s.id}
                  onClick={() => onSelectScenario(s)}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    background: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <td style={{ padding: '10px 8px', fontWeight: 600 }}>{s.name}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <span className={`badge ${val?.is_valid ? 'badge-success' : 'badge-danger'}`}>
                      {val?.is_valid ? 'PASSED' : `${val?.hard_violations_count} VIOLATIONS`}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', color: '#f97316', fontWeight: 600 }}>
                    {(met.housing_capacity_units || 0).toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 8px', color: '#22c55e', fontWeight: 600 }}>
                    {met.green_space_pct || 0}%
                  </td>
                  <td style={{ padding: '10px 8px' }}>{met.green_connectivity_index || 0}</td>
                  <td style={{ padding: '10px 8px' }}>{met.avg_distance_to_green_m || 0} m</td>
                  <td style={{ padding: '10px 8px', color: '#38bdf8' }}>{met.runoff_retention_estimate_pct || 0}%</td>
                  <td style={{ padding: '10px 8px', color: (met.restricted_land_affected_ha || 0) > 0 ? '#ef4444' : '#10b981' }}>
                    {met.restricted_land_affected_ha || 0} ha
                  </td>
                  <td style={{ padding: '10px 8px', fontWeight: 700 }}>
                    Rank {met.pareto_rank || 1}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3D Master Plan Rendering Modal */}
      {selected3DModalScenario && (
        <div className="modal-overlay" onClick={() => setSelected3DModalScenario(null)}>
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '980px', width: '95vw', padding: '24px', background: '#0a0f1d' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="badge badge-success" style={{ fontSize: '11px' }}>3D DESIGN PLAN</span>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                    {selected3DModalScenario.name}
                  </h3>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Strategy: {selected3DModalScenario.strategy.replace('_', ' ').toUpperCase()} • Photorealistic 3D Master Plan
                </p>
              </div>

              <button
                onClick={() => setSelected3DModalScenario(null)}
                className="btn btn-secondary"
                style={{ padding: '6px', borderRadius: '50%' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.7)',
              position: 'relative',
              background: '#020617',
              textAlign: 'center',
            }}>
              <img
                src={getRenderUrl(selected3DModalScenario)}
                alt={selected3DModalScenario.name}
                style={{ width: '100%', maxHeight: '68vh', objectFit: 'contain', display: 'block', margin: '0 auto' }}
              />
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '16px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              flexWrap: 'wrap',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#f97316' }}>
                  <Building2 size={15} /> Storeyed 3D Buildings
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#38bdf8' }}>
                  <Droplets size={15} /> Protected Stream & Riparian Buffer
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#22c55e' }}>
                  <TreePine size={15} /> Green Corridors & Road Network
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    onSelectScenario(selected3DModalScenario);
                    setSelected3DModalScenario(null);
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px' }}
                >
                  <Compass size={14} />
                  Select on Map
                </button>
                <a
                  href={getRenderUrl(selected3DModalScenario)}
                  download={`utkal_3d_render_${selected3DModalScenario.strategy}.jpg`}
                  className="btn btn-primary"
                  style={{ fontSize: '12px', textDecoration: 'none' }}
                >
                  <Download size={14} />
                  Download 3D Image
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
