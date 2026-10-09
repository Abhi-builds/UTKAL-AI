import React from 'react';
import { ValidationResult, Finding } from '../types';
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldCheck, RefreshCw, MapPin } from 'lucide-react';

interface ValidationResultsProps {
  validationResult: ValidationResult | null;
  onSelectFinding: (finding: Finding) => void;
  selectedFinding: Finding | null;
  onRevalidate: () => void;
  isRevalidating?: boolean;
}

export const ValidationResults: React.FC<ValidationResultsProps> = ({
  validationResult,
  onSelectFinding,
  selectedFinding,
  onRevalidate,
  isRevalidating = false,
}) => {
  if (!validationResult) {
    return (
      <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>
        <ShieldCheck size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
        <p style={{ fontSize: '13px' }}>Select or generate a scenario to inspect spatial constraint validation results.</p>
      </div>
    );
  }

  const { is_valid, hard_violations_count, warnings_count, findings, checked_at } = validationResult;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header Status Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderRadius: 'var(--radius-md)',
        background: is_valid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        border: `1px solid ${is_valid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {is_valid ? (
            <CheckCircle2 size={24} color="#10b981" />
          ) : (
            <AlertCircle size={24} color="#ef4444" />
          )}
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: is_valid ? '#34d399' : '#f87171' }}>
              {is_valid ? 'ECOLOGICALLY COMPLIANT' : 'HARD CONSTRAINTS VIOLATED'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {is_valid
                ? 'Design satisfies all study boundaries, ecological buffers, and statutory restrictions.'
                : `${hard_violations_count} hard violations detected. Design cannot be approved as compliant.`}
            </div>
          </div>
        </div>

        <button
          onClick={onRevalidate}
          disabled={isRevalidating}
          className="btn btn-secondary"
          style={{ fontSize: '12px', padding: '6px 12px' }}
        >
          <RefreshCw size={13} className={isRevalidating ? 'animate-spin' : ''} />
          {isRevalidating ? 'Checking...' : 'Re-Validate'}
        </button>
      </div>

      {/* Counts Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div style={{
          padding: '12px',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: hard_violations_count > 0 ? '#ef4444' : '#10b981' }}>
            {hard_violations_count}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hard Violations</div>
        </div>

        <div style={{
          padding: '12px',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: warnings_count > 0 ? '#f59e0b' : '#10b981' }}>
            {warnings_count}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Planning Warnings</div>
        </div>
      </div>

      {/* Findings List */}
      <div>
        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>
          Detailed Audit Findings ({findings.length})
        </div>

        {findings.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#10b981', padding: '12px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 'var(--radius-sm)' }}>
            ✓ No violations or warnings found. All land uses respect statutory ecological criteria.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto' }}>
            {findings.map((finding, idx) => {
              const isHard = finding.severity === 'HARD_VIOLATION';
              const isSelected = selectedFinding?.message === finding.message;

              return (
                <div
                  key={idx}
                  onClick={() => onSelectFinding(finding)}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected
                      ? 'rgba(255, 255, 255, 0.07)'
                      : isHard
                      ? 'rgba(239, 68, 68, 0.04)'
                      : 'rgba(245, 158, 11, 0.04)',
                    border: `1px solid ${isSelected ? 'var(--primary)' : isHard ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`badge ${isHard ? 'badge-danger' : 'badge-warning'}`}>
                        {isHard ? 'HARD VIOLATION' : 'WARNING'}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                        {finding.rule_id}
                      </span>
                    </div>

                    {finding.affected_feature_id && (
                      <span style={{ fontSize: '11px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} />
                        {finding.affected_feature_id}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                    {finding.rule_name}
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4', margin: 0 }}>
                    {finding.message}
                  </p>

                  {finding.details?.source && (
                    <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--text-dim)' }}>
                      <b>Traceability:</b> {finding.details.source}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ fontSize: '10px', color: 'var(--text-dim)', textAlign: 'right' }}>
        Audit Engine: Independent Spatial Constraint Validator • Last checked: {new Date(checked_at).toLocaleTimeString()}
      </div>
    </div>
  );
};
