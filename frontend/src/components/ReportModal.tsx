import React, { useState } from 'react';
import { X, FileDown, FileText, Table, Code, Globe, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  projectName: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
}) => {
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownload = async (format: 'pdf' | 'csv' | 'json' | 'geojson') => {
    setDownloadingFormat(format);
    try {
      await api.exportReport(projectId, format);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <FileDown size={18} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Export Project Report</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{projectName}</p>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '6px', borderRadius: '50%' }}>
            <X size={16} />
          </button>
        </div>

        {/* Regulatory Notice Banner */}
        <div style={{
          padding: '12px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          fontSize: '11px',
          color: '#fca5a5',
          lineHeight: '1.4',
        }}>
          <b>Statutory Assessment Notice:</b> All exported reports are compiled directly from live database records. UTKAL provides decision-support scenarios and does not substitute certified environmental impact assessments (EIA) or statutory master plan approvals.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* PDF */}
          <button
            onClick={() => handleDownload('pdf')}
            disabled={downloadingFormat !== null}
            className="btn btn-secondary"
            style={{
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              background: 'rgba(255, 255, 255, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '6px', color: '#f87171' }}>
                <FileText size={20} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>PDF Assessment Report</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Comprehensive printable document with tables & audit findings</div>
              </div>
            </div>
            <span style={{ fontSize: '12px', color: '#38bdf8' }}>
              {downloadingFormat === 'pdf' ? 'Generating...' : 'Download PDF'}
            </span>
          </button>

          {/* CSV */}
          <button
            onClick={() => handleDownload('csv')}
            disabled={downloadingFormat !== null}
            className="btn btn-secondary"
            style={{
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              background: 'rgba(255, 255, 255, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', background: 'rgba(34, 197, 94, 0.15)', borderRadius: '6px', color: '#22c55e' }}>
                <Table size={20} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>CSV Scenario Summary</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Tabular spreadsheet metrics for Excel & statistical tools</div>
              </div>
            </div>
            <span style={{ fontSize: '12px', color: '#38bdf8' }}>
              {downloadingFormat === 'csv' ? 'Exporting...' : 'Download CSV'}
            </span>
          </button>

          {/* GeoJSON */}
          <button
            onClick={() => handleDownload('geojson')}
            disabled={downloadingFormat !== null}
            className="btn btn-secondary"
            style={{
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              background: 'rgba(255, 255, 255, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', background: 'rgba(56, 189, 248, 0.15)', borderRadius: '6px', color: '#38bdf8' }}>
                <Globe size={20} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>GeoJSON Vector Layouts</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Spatial parcels for QGIS, ArcGIS, and CAD systems</div>
              </div>
            </div>
            <span style={{ fontSize: '12px', color: '#38bdf8' }}>
              {downloadingFormat === 'geojson' ? 'Exporting...' : 'Download GeoJSON'}
            </span>
          </button>

          {/* JSON */}
          <button
            onClick={() => handleDownload('json')}
            disabled={downloadingFormat !== null}
            className="btn btn-secondary"
            style={{
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              background: 'rgba(255, 255, 255, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '6px', color: '#c084fc' }}>
                <Code size={20} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>Full Raw JSON Payload</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Structured API snapshot including all metadata & findings</div>
              </div>
            </div>
            <span style={{ fontSize: '12px', color: '#38bdf8' }}>
              {downloadingFormat === 'json' ? 'Exporting...' : 'Download JSON'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
