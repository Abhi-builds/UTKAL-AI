import React, { useEffect, useState } from 'react';
import { ProjectSummary, User } from '../types';
import { api } from '../services/api';
import { Plus, MapPin, Sparkles, Folder, Calendar, Layers, Compass, Trash2, ArrowRight, Activity } from 'lucide-react';

interface DashboardPageProps {
  currentUser: User | null;
  onSelectProject: (projectId: number) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ currentUser, onSelectProject }) => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);

  // New project form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [housingTarget, setHousingTarget] = useState(5000);
  const [density, setDensity] = useState(120);
  const [greenTarget, setGreenTarget] = useState(30);
  const [roadPct, setRoadPct] = useState(18);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err: any) {
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
      const p = await api.createProject({
        name,
        description,
        housing_target_units: housingTarget,
        development_density_du_ha: density,
        green_space_target_pct: greenTarget,
        road_allocation_pct: roadPct,
      });
      setShowCreateModal(false);
      setName('');
      setDescription('');
      onSelectProject(p.id);
    } catch (err: any) {
      alert(`Error creating project: ${err.message}`);
    }
  };

  const handleCreateDemoProject = async () => {
    setIsCreatingDemo(true);
    try {
      // 1. Create Demo Project
      const p = await api.createProject({
        name: 'Bhubaneswar North Eco-Extension',
        description: 'Synthetic demonstration planning sector exploring ecological buffers and alternative land-use layouts in Bhubaneswar, Odisha.',
        housing_target_units: 5200,
        development_density_du_ha: 120,
        green_space_target_pct: 32,
        road_allocation_pct: 18,
      });

      // 2. Load Bhubaneswar dataset
      await api.loadDemoData(p.id);

      // 3. Generate Trio Scenarios automatically
      await api.generateTrioScenarios(p.id);

      // 4. Open in studio
      onSelectProject(p.id);
    } catch (err: any) {
      alert(`Error loading demo workspace: ${err.message}`);
      setIsCreatingDemo(false);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project? All associated scenarios and layers will be permanently removed.')) {
      try {
        await api.deleteProject(id);
        fetchProjects();
      } catch (err: any) {
        alert(`Delete failed: ${err.message}`);
      }
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Welcome Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        marginBottom: '32px',
        padding: '28px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)',
        border: '1px solid var(--border-glow)',
        borderRadius: 'var(--radius-xl)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-success" style={{ fontSize: '11px' }}>
              LOCAL OFFLINE STUDIO
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              Bound to 127.0.0.1 • PostgreSQL 18
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>
            Welcome back, {currentUser?.full_name || currentUser?.username}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '640px' }}>
            Design and evaluate climate-resilient urban expansion layouts. Set ecological setbacks, test multi-objective land uses, and detect spatial constraint violations before construction begins.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleCreateDemoProject}
            disabled={isCreatingDemo}
            className="btn btn-secondary"
            style={{ padding: '10px 18px', background: 'rgba(255, 255, 255, 0.06)' }}
          >
            <Sparkles size={16} color="#34d399" />
            {isCreatingDemo ? 'Setting up Demo...' : 'Load Bhubaneswar Demo'}
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            style={{ padding: '10px 18px' }}
          >
            <Plus size={16} />
            Create Project
          </button>
        </div>
      </div>

      {/* Projects Grid Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Folder size={20} color="#10b981" />
          Planning Projects ({projects.length})
        </h2>
      </div>

      {/* Projects List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>
          Loading your planning projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Compass size={48} color="var(--text-dim)" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
            No Planning Projects Found
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', maxWidth: '460px', margin: '0 auto 24px' }}>
            Get started by initializing a new city planning sector or load the synthetic Bhubaneswar demonstration dataset with pre-configured layers and restrictions.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button onClick={handleCreateDemoProject} disabled={isCreatingDemo} className="btn btn-primary">
              <Sparkles size={16} />
              {isCreatingDemo ? 'Loading Demo...' : 'Load Bhubaneswar Demonstration Workspace'}
            </button>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-secondary">
              <Plus size={16} />
              Create Blank Project
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => onSelectProject(p.id)}
              className="card"
              style={{
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'var(--transition)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span className="badge badge-info" style={{ fontSize: '10px' }}>
                    PROJECT ID #{p.id}
                  </span>
                  <button
                    onClick={(e) => handleDeleteProject(e, p.id)}
                    className="btn btn-danger"
                    style={{ padding: '4px 8px', borderRadius: '4px' }}
                    title="Delete Project"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                  {p.name}
                </h3>

                <p style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  lineHeight: '1.4',
                  marginBottom: '16px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {p.description || 'No description provided for this planning sector.'}
                </p>
              </div>

              <div>
                {/* Stats row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'rgba(0,0,0,0.25)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  fontSize: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                    <Layers size={14} color="#38bdf8" />
                    <span><b>{p.layer_count}</b> Layers</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                    <Compass size={14} color="#34d399" />
                    <span><b>{p.scenario_count}</b> Scenarios</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim)', fontSize: '11px' }}>
                    <Calendar size={13} />
                    <span>{new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--primary)', fontSize: '13px', fontWeight: 600 }}>
                  <span>Open Studio</span>
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
              Create City-Planning Project
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '20px' }}>
              Define study boundaries, density targets, and ecological baseline assumptions.
            </p>

            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Project / Sector Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="E.g., Chandaka Southern Eco-Corridor Planning Sector"
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Description & Planning Context</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe regional context, target demographics, and primary conservation objectives..."
                  className="form-input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Target Housing (Units)</label>
                  <input
                    type="number"
                    value={housingTarget}
                    onChange={(e) => setHousingTarget(Number(e.target.value))}
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Density (DU / ha)</label>
                  <input
                    type="number"
                    value={density}
                    onChange={(e) => setDensity(Number(e.target.value))}
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Min Green Space Target (%)</label>
                  <input
                    type="number"
                    value={greenTarget}
                    onChange={(e) => setGreenTarget(Number(e.target.value))}
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Road Allocation (%)</label>
                  <input
                    type="number"
                    value={roadPct}
                    onChange={(e) => setRoadPct(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
