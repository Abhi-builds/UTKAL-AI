import React, { useState } from 'react';
import { X, Sparkles, AlertTriangle, Layers, Compass } from 'lucide-react';

interface LayoutGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (params: {
    name: string;
    strategy: string;
    deliberate_violation: boolean;
    housing_target_units: number;
    green_space_target_pct: number;
  }) => Promise<void>;
  onGenerateTrio: () => Promise<void>;
  isGenerating: boolean;
}

export const LayoutGeneratorModal: React.FC<LayoutGeneratorModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  onGenerateTrio,
  isGenerating,
}) => {
  const [name, setName] = useState('');
  const [strategy, setStrategy] = useState<'capacity_focused' | 'balanced' | 'ecological_priority'>('balanced');
  const [deliberateViolation, setDeliberateViolation] = useState(false);
  const [housingTarget, setHousingTarget] = useState(5000);
  const [greenTarget, setGreenTarget] = useState(30);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onGenerate({
      name: name || `Design — ${strategy.replace('_', ' ').toUpperCase()}`,
      strategy,
      deliberate_violation: deliberateViolation,
      housing_target_units: housingTarget,
      green_space_target_pct: greenTarget,
    });
    onClose();
  };

  const handleTrio = async () => {
    await onGenerateTrio();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #10b981, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Compass size={18} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>City Design & Layout Generator</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                Algorithmic land-use parcel synthesizer & constraint optimizer
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '6px', borderRadius: '50%' }}>
            <X size={16} />
          </button>
        </div>

        {/* Quick Benchmark Trio Button */}
        <div style={{
          padding: '14px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#34d399' }}>
              One-Click Scenario Benchmark
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Generate all 3 benchmark alternatives (Capacity, Balanced, Ecological) simultaneously.
            </div>
          </div>
          <button
            type="button"
            onClick={handleTrio}
            disabled={isGenerating}
            className="btn btn-primary"
            style={{ fontSize: '12px', padding: '6px 14px', whiteSpace: 'nowrap' }}
          >
            <Sparkles size={14} />
            Generate Trio
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Scenario Name (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder={`E.g., Alternative - ${strategy.replace('_', ' ')}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Planning Strategy & Ecological Priority</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div
                onClick={() => setStrategy('capacity_focused')}
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${strategy === 'capacity_focused' ? '#f59e0b' : 'var(--border-color)'}`,
                  background: strategy === 'capacity_focused' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>Capacity</div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>High-density housing focus</div>
              </div>

              <div
                onClick={() => setStrategy('balanced')}
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${strategy === 'balanced' ? '#38bdf8' : 'var(--border-color)'}`,
                  background: strategy === 'balanced' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>Balanced</div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Sustainable mixed growth</div>
              </div>

              <div
                onClick={() => setStrategy('ecological_priority')}
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${strategy === 'ecological_priority' ? '#22c55e' : 'var(--border-color)'}`,
                  background: strategy === 'ecological_priority' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#22c55e' }}>Ecological</div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Nature-first buffers</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Target Housing (Units): {housingTarget.toLocaleString()}</label>
              <input
                type="range"
                min="2000"
                max="8000"
                step="250"
                value={housingTarget}
                onChange={(e) => setHousingTarget(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--primary)' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Min Green Space Target: {greenTarget}%</label>
              <input
                type="range"
                min="15"
                max="60"
                step="5"
                value={greenTarget}
                onChange={(e) => setGreenTarget(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--primary)' }}
              />
            </div>
          </div>

          {/* Deliberate Violation Demonstration Toggle */}
          <div style={{
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            background: deliberateViolation ? 'rgba(239, 68, 68, 0.12)' : 'rgba(0,0,0,0.25)',
            border: `1px solid ${deliberateViolation ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)'}`,
            marginBottom: '20px',
            transition: 'var(--transition)',
          }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={deliberateViolation}
                onChange={(e) => setDeliberateViolation(e.target.checked)}
                style={{ marginTop: '3px' }}
              />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: deliberateViolation ? '#f87171' : 'var(--text-main)' }}>
                  Demonstrate Spatial Rule Violation Detection
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: '1.4', marginTop: '2px' }}>
                  Injects a deliberate commercial building inside the sanctuary no-build zone and a highway across the 50m water buffer. Demonstrates how the validator catches infractions!
                </div>
              </div>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="btn btn-primary"
            >
              <Sparkles size={16} />
              {isGenerating ? 'Generating...' : 'Generate & Audit Layout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
