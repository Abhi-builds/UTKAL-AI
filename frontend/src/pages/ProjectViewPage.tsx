import React, { useEffect, useState } from 'react';
import { Project, Scenario, Finding, Layer } from '../types';
import { api } from '../services/api';
import { MapView } from '../components/MapView';
import { Urban3DViewer } from '../components/Urban3DViewer';
import { ValidationResults } from '../components/ValidationResults';
import { ScenarioCompare } from '../components/ScenarioCompare';
import { LayoutGeneratorModal } from '../components/LayoutGeneratorModal';
import { LayerManager } from '../components/LayerManager';
import { ReportModal } from '../components/ReportModal';
import {
  ArrowLeft,
  Sparkles,
  FileDown,
  Layers,
  ShieldCheck,
  Compass,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Info,
  Droplets,
  TreePine,
  Home,
  RefreshCw,
  Box,
  Image as ImageIcon,
  Building2,
  Download,
  X,
} from 'lucide-react';

interface ProjectViewPageProps {
  projectId: number;
  onBack: () => void;
}

export const ProjectViewPage: React.FC<ProjectViewPageProps> = ({ projectId, onBack }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'scenarios' | 'audit' | 'compare' | 'layers'>('scenarios');

  // 2D GIS Map vs 3D Digital Twin view mode
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [is3DImageModalOpen, setIs3DImageModalOpen] = useState(false);
  const [modalRenderUrl, setModalRenderUrl] = useState<string>('/renders/eco_city_3d_masterplan.jpg');
  const [modalRenderTitle, setModalRenderTitle] = useState<string>('3D Architectural Master Plan');

  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [inspectedFeature, setInspectedFeature] = useState<any | null>(null);

  // Modals
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(false);

  const getScenarioRenderUrl = (s: Scenario | null) => {
    if (!s) return '/renders/eco_city_3d_masterplan.jpg';
    if (s.layout_geojson?.metadata?.render_image_url) {
      return s.layout_geojson.metadata.render_image_url;
    }
    if (s.strategy === 'capacity_focused') return '/renders/capacity_focused_3d_city.jpg';
    if (s.strategy === 'ecological_priority') return '/renders/biophilic_ecological_3d.jpg';
    return '/renders/eco_city_3d_masterplan.jpg';
  };

  const fetchProjectDetails = async () => {
    try {
      const data = await api.getProject(projectId);
      setProject(data);
      if (data.scenarios && data.scenarios.length > 0 && !activeScenario) {
        setActiveScenario(data.scenarios[0]);
      }
    } catch (err: any) {
      alert(`Failed to load project details: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  const handleGenerate = async (params: {
    name: string;
    strategy: string;
    deliberate_violation: boolean;
    housing_target_units: number;
    green_space_target_pct: number;
  }) => {
    setIsGenerating(true);
    try {
      const newScen = await api.generateScenario(projectId, params);
      await fetchProjectDetails();
      setActiveScenario(newScen);
      if (params.deliberate_violation) {
        setActiveTab('audit');
      }
    } catch (err: any) {
      alert(`Generation failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateTrio = async () => {
    setIsGenerating(true);
    try {
      const trio = await api.generateTrioScenarios(projectId);
      await fetchProjectDetails();
      if (trio.length > 0) {
        setActiveScenario(trio[0]);
      }
      setActiveTab('compare');
    } catch (err: any) {
      alert(`Batch generation failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevalidate = async () => {
    if (!activeScenario) return;
    setIsRevalidating(true);
    try {
      const val = await api.revalidateScenario(projectId, activeScenario.id);
      setActiveScenario((prev) => (prev ? { ...prev, validation_result: val } : null));
      await fetchProjectDetails();
    } catch (err: any) {
      alert(`Revalidation failed: ${err.message}`);
    } finally {
      setIsRevalidating(false);
    }
  };

  const handleUploadLayer = async (file: File, name: string, layerType: string) => {
    await api.uploadLayerFile(projectId, file, name, layerType);
    await fetchProjectDetails();
  };

  const handleDeleteLayer = async (layerId: number) => {
    await api.deleteLayer(projectId, layerId);
    await fetchProjectDetails();
  };

  const handleLoadDemoData = async () => {
    setIsLoading(true);
    try {
      await api.loadDemoData(projectId);
      await fetchProjectDetails();
    } catch (err: any) {
      alert(`Demo data loading failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !project) {
    return (
      <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
        Loading project studio workspace...
      </div>
    );
  }

  const scenarios = project.scenarios || [];
  const layers = project.layers || [];
  const currentVal = activeScenario?.validation_result;
  const currentMetrics = activeScenario?.environmental_metrics?.metrics_data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Studio Header Bar */}
      <div style={{
        padding: '12px 24px',
        background: 'rgba(15, 23, 42, 0.95)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        {/* Left: Project title & target tags */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={onBack} className="btn btn-secondary" style={{ padding: '6px 10px' }} title="Back to Dashboard">
            <ArrowLeft size={16} />
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                {project.name}
              </h1>
              {activeScenario && (
                <span className={`badge ${currentVal?.is_valid ? 'badge-success' : 'badge-danger'}`}>
                  {currentVal?.is_valid ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                  {currentVal?.is_valid ? 'ECOLOGICALLY COMPLIANT' : `${currentVal?.hard_violations_count} VIOLATION(S)`}
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', gap: '12px', marginTop: '2px' }}>
              <span>Target Housing: <b>{project.housing_target_units.toLocaleString()} DU</b></span>
              <span>Density: <b>{project.development_density_du_ha} DU/ha</b></span>
              <span>Min Green Space: <b>{project.green_space_target_pct}%</b></span>
              <span>CRS: <b>{project.crs}</b></span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* 2D vs 3D View Mode Toggle */}
          <div style={{
            display: 'flex',
            background: 'rgba(30, 41, 59, 0.9)',
            borderRadius: '8px',
            padding: '3px',
            border: '1px solid var(--border-color)',
            gap: '3px',
          }}>
            <button
              onClick={() => setViewMode('2d')}
              className={`btn ${viewMode === '2d' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
              }}
              title="Switch to 2D Planar GIS Map"
            >
              <Compass size={14} />
              2D GIS Map
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`btn ${viewMode === '3d' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                background: viewMode === '3d' ? 'linear-gradient(135deg, #0284c7, #0d9488)' : undefined,
              }}
              title="Switch to Interactive 3D Urban Digital Twin (Real Buildings, Heights, Roads, Lighting)"
            >
              <Box size={14} />
              3D Digital Twin
            </button>
          </div>

          {/* 3D Master Plan Rendering Button */}
          <button
            onClick={() => {
              setModalRenderUrl(getScenarioRenderUrl(activeScenario));
              setModalRenderTitle(activeScenario ? `${activeScenario.name} — 3D Master Plan` : '3D Master Plan Visualizer');
              setIs3DImageModalOpen(true);
            }}
            className="btn btn-secondary"
            style={{ fontSize: '12px', borderColor: '#38bdf8', color: '#38bdf8' }}
            title="Inspect Photorealistic 3D Master Plan Architectural Image"
          >
            <ImageIcon size={14} />
            3D Plan Image
          </button>

          {layers.length === 0 && (
            <button onClick={handleLoadDemoData} className="btn btn-secondary" style={{ fontSize: '12px' }}>
              <Sparkles size={14} color="#34d399" />
              Load Bhubaneswar Data
            </button>
          )}

          <button
            onClick={() => setIsGeneratorOpen(true)}
            className="btn btn-primary"
            style={{ fontSize: '13px' }}
          >
            <Sparkles size={15} />
            Generate Layouts
          </button>

          <button
            onClick={() => setIsReportOpen(true)}
            disabled={scenarios.length === 0}
            className="btn btn-secondary"
            style={{ fontSize: '13px' }}
          >
            <FileDown size={15} />
            Export Report
          </button>
        </div>
      </div>

      {/* Main Studio Workspace: Map/3D + Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 440px', flex: 1, minHeight: 0 }}>
        {/* Left Column: Offline GIS Map OR 3D Digital Twin */}
        <div style={{ position: 'relative', height: '100%', borderRight: '1px solid var(--border-color)' }}>
          {viewMode === '2d' ? (
            <MapView
              boundaryGeoJson={project.study_boundary_geojson}
              layers={layers}
              activeScenario={activeScenario}
              selectedFinding={selectedFinding}
              onSelectFeature={(props) => setInspectedFeature(props)}
            />
          ) : (
            <Urban3DViewer
              scenario={activeScenario}
              layers={layers}
              onSelectFeature={(props) => setInspectedFeature(props)}
            />
          )}

          {/* Inspected Feature Floating Card */}
          {inspectedFeature && (
            <div
              className="card"
              style={{
                position: 'absolute',
                top: 16,
                left: 16,
                zIndex: 400,
                width: '280px',
                padding: '14px',
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
                  Feature Properties
                </span>
                <button
                  onClick={() => setInspectedFeature(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '14px' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-muted)' }}>
                {Object.entries(inspectedFeature).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '2px' }}>
                    <span style={{ color: 'var(--text-dim)' }}>{k}:</span>
                    <span style={{ fontWeight: 600, color: '#f8fafc', maxWidth: '160px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {String(v)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Tabbed Inspector */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-main)', overflowY: 'auto' }}>
          {/* Tabs Bar */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(15, 23, 42, 0.6)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}>
            <button
              onClick={() => setActiveTab('scenarios')}
              style={{
                flex: 1,
                padding: '12px 6px',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${activeTab === 'scenarios' ? 'var(--primary)' : 'transparent'}`,
                color: activeTab === 'scenarios' ? '#34d399' : 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Compass size={14} />
              Layouts ({scenarios.length})
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              style={{
                flex: 1,
                padding: '12px 6px',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${activeTab === 'audit' ? (currentVal?.is_valid ? '#34d399' : '#ef4444') : 'transparent'}`,
                color: activeTab === 'audit' ? '#f8fafc' : 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <ShieldCheck size={14} color={currentVal?.is_valid ? '#10b981' : '#ef4444'} />
              Audit Findings
            </button>

            <button
              onClick={() => setActiveTab('compare')}
              style={{
                flex: 1,
                padding: '12px 6px',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${activeTab === 'compare' ? 'var(--primary)' : 'transparent'}`,
                color: activeTab === 'compare' ? '#34d399' : 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <BarChart3 size={14} />
              Trade-offs
            </button>

            <button
              onClick={() => setActiveTab('layers')}
              style={{
                flex: 1,
                padding: '12px 6px',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${activeTab === 'layers' ? 'var(--primary)' : 'transparent'}`,
                color: activeTab === 'layers' ? '#34d399' : 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Layers size={14} />
              Layers ({layers.length})
            </button>
          </div>

          {/* Tab Content Container */}
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* TAB 1: SCENARIOS */}
            {activeTab === 'scenarios' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {scenarios.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-dim)' }}>
                    <Compass size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                    <p style={{ fontSize: '13px', marginBottom: '14px' }}>No layouts generated yet for this sector.</p>
                    <button onClick={() => setIsGeneratorOpen(true)} className="btn btn-primary" style={{ fontSize: '12px' }}>
                      <Sparkles size={14} />
                      Generate Alternative Layouts
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                      Select Active Scenario for Map & Inspection
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {scenarios.map((s) => {
                        const isSelected = s.id === activeScenario?.id;
                        const val = s.validation_result;
                        const met = s.environmental_metrics?.metrics_data;

                        return (
                          <div
                            key={s.id}
                            onClick={() => {
                              setActiveScenario(s);
                              setSelectedFinding(null);
                            }}
                            className="card"
                            style={{
                              padding: '14px',
                              cursor: 'pointer',
                              borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
                              background: isSelected ? 'rgba(16, 185, 129, 0.06)' : 'var(--bg-card)',
                            }}
                          >
                            {/* 3D Master Plan Rendering Preview Thumbnail */}
                            <div style={{
                              position: 'relative',
                              height: '100px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              marginBottom: '10px',
                              border: '1px solid var(--border-color)',
                            }}>
                              <img
                                src={getScenarioRenderUrl(s)}
                                alt={s.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              <div style={{
                                position: 'absolute',
                                bottom: 6,
                                right: 6,
                                display: 'flex',
                                gap: '5px',
                              }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveScenario(s);
                                    setViewMode('3d');
                                  }}
                                  style={{
                                    background: 'rgba(15, 23, 42, 0.9)',
                                    color: '#38bdf8',
                                    border: '1px solid rgba(56, 189, 248, 0.5)',
                                    borderRadius: '4px',
                                    padding: '3px 7px',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                  title="Open interactive 3D digital twin with buildings and roads"
                                >
                                  <Box size={11} /> 3D Twin
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModalRenderUrl(getScenarioRenderUrl(s));
                                    setModalRenderTitle(s.name);
                                    setIs3DImageModalOpen(true);
                                  }}
                                  style={{
                                    background: 'rgba(15, 23, 42, 0.9)',
                                    color: '#34d399',
                                    border: '1px solid rgba(52, 211, 153, 0.5)',
                                    borderRadius: '4px',
                                    padding: '3px 7px',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                  title="Inspect high-res 3D master plan architectural image"
                                >
                                  <ImageIcon size={11} /> 3D Image
                                </button>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span className="badge badge-info" style={{ fontSize: '9px' }}>
                                {s.strategy.replace('_', ' ').toUpperCase()}
                              </span>
                              <span className={`badge ${val?.is_valid ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '9px' }}>
                                {val?.is_valid ? 'COMPLIANT' : `${val?.hard_violations_count} VIOLATIONS`}
                              </span>
                            </div>

                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                              {s.name}
                            </div>

                            {met && (
                              <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px' }}>
                                <span>Housing: <b style={{ color: '#f97316' }}>{met.housing_capacity_units} DU</b></span>
                                <span>Green Space: <b style={{ color: '#22c55e' }}>{met.green_space_pct}%</b></span>
                                <span>Runoff: <b style={{ color: '#38bdf8' }}>{met.runoff_retention_estimate_pct}%</b></span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB 2: CONSTRAINT AUDIT */}
            {activeTab === 'audit' && (
              <ValidationResults
                validationResult={currentVal || null}
                selectedFinding={selectedFinding}
                onSelectFinding={(f) => setSelectedFinding(f)}
                onRevalidate={handleRevalidate}
                isRevalidating={isRevalidating}
              />
            )}

            {/* TAB 3: TRADE-OFFS & PARETO */}
            {activeTab === 'compare' && (
              <ScenarioCompare
                scenarios={scenarios}
                activeScenarioId={activeScenario?.id || null}
                onSelectScenario={(s) => setActiveScenario(s)}
              />
            )}

            {/* TAB 4: LAYERS & RESTRICTIONS */}
            {activeTab === 'layers' && (
              <LayerManager
                layers={layers}
                onUploadLayer={handleUploadLayer}
                onDeleteLayer={handleDeleteLayer}
                onLoadDemoData={handleLoadDemoData}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </div>

      {/* Generator Modal */}
      <LayoutGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onGenerate={handleGenerate}
        onGenerateTrio={handleGenerateTrio}
        isGenerating={isGenerating}
      />

      {/* Export Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        projectId={project.id}
        projectName={project.name}
      />

      {/* High-Resolution 3D Master Plan Image Modal */}
      {is3DImageModalOpen && (
        <div className="modal-overlay" onClick={() => setIs3DImageModalOpen(false)}>
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '1000px', width: '95vw', padding: '24px', background: '#0a0f1d' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="badge badge-success" style={{ fontSize: '11px' }}>PROPER 3D DESIGN PLAN</span>
                  <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#f8fafc' }}>
                    {modalRenderTitle}
                  </h3>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '3px' }}>
                  Photorealistic 3D Architectural Master Plan Rendering • Real Storeyed Buildings, Road Ribbons, Wetlands & Canopy Buffers
                </p>
              </div>

              <button
                onClick={() => setIs3DImageModalOpen(false)}
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
                src={modalRenderUrl}
                alt={modalRenderTitle}
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
                  <Building2 size={15} /> Real Storeyed Buildings & Solar Rooftops
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#38bdf8' }}>
                  <Droplets size={15} /> Protected Stream & 50m Riparian Buffer
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#22c55e' }}>
                  <TreePine size={15} /> Tree-Lined Road Avenues & Parks
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    setIs3DImageModalOpen(false);
                    setViewMode('3d');
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px' }}
                >
                  <Box size={14} />
                  Open Interactive 3D Twin
                </button>
                <a
                  href={modalRenderUrl}
                  download="utkal_3d_architectural_plan.jpg"
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
