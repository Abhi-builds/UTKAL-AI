import React, { useState } from 'react';
import { Layer } from '../types';
import { Layers, Upload, Download, Trash2, Check, AlertCircle } from 'lucide-react';

interface LayerManagerProps {
  layers: Layer[];
  onUploadLayer: (file: File, name: string, layerType: string) => Promise<void>;
  onDeleteLayer: (layerId: number) => Promise<void>;
  onLoadDemoData: () => Promise<void>;
  isLoading?: boolean;
}

export const LayerManager: React.FC<LayerManagerProps> = ({
  layers,
  onUploadLayer,
  onDeleteLayer,
  onLoadDemoData,
  isLoading = false,
}) => {
  const [showUpload, setShowUpload] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [layerType, setLayerType] = useState('greenery');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setSelectedFile(f);
      if (!uploadName) {
        setUploadName(f.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadName) return;

    setIsUploading(true);
    setErrorMsg('');
    try {
      await onUploadLayer(selectedFile, uploadName, layerType);
      setShowUpload(false);
      setSelectedFile(null);
      setUploadName('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload layer');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Geographic Layers ({layers.length})</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Imported vector layers from local files (GeoJSON / Shapefile)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {layers.length === 0 && (
            <button
              onClick={onLoadDemoData}
              disabled={isLoading}
              className="btn btn-primary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              Load Demo Data
            </button>
          )}

          <button
            onClick={() => setShowUpload(!showUpload)}
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            <Upload size={14} />
            Add Layer
          </button>
        </div>
      </div>

      {/* Upload Form Modal/Inline */}
      {showUpload && (
        <form
          onSubmit={handleUploadSubmit}
          style={{
            padding: '16px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700 }}>Import Local GeoJSON File</div>

          {errorMsg && (
            <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', fontSize: '11px', borderRadius: '4px' }}>
              {errorMsg}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Select GeoJSON File (.geojson, .json)</label>
            <input
              type="file"
              accept=".geojson,.json"
              onChange={handleFileChange}
              required
              className="form-input"
              style={{ padding: '6px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Layer Name</label>
              <input
                type="text"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                required
                placeholder="E.g., North Buffer Zone"
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Layer Classification</label>
              <select
                value={layerType}
                onChange={(e) => setLayerType(e.target.value)}
                className="form-input"
              >
                <option value="boundary">Study Area Boundary</option>
                <option value="water">Surface Water / Wetland</option>
                <option value="greenery">Forest / Vegetation</option>
                <option value="roads">Road Infrastructure</option>
                <option value="existing_dev">Existing Built-Up</option>
                <option value="restricted_zone">Restricted Eco-Zone (No-Build)</option>
                <option value="survey_needed">Survey Needed Zone</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={() => setShowUpload(false)}
              className="btn btn-secondary"
              style={{ fontSize: '12px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="btn btn-primary"
              style={{ fontSize: '12px' }}
            >
              {isUploading ? 'Importing...' : 'Upload & Register'}
            </button>
          </div>
        </form>
      )}

      {/* Layers List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {layers.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
            No layers attached yet. Click "Load Demo Data" to load the synthetic Bhubaneswar dataset.
          </div>
        ) : (
          layers.map((l) => (
            <div
              key={l.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                    {l.name}
                  </span>
                  <span className="badge badge-info" style={{ fontSize: '9px' }}>
                    {l.layer_type}
                  </span>
                  {l.is_synthetic && (
                    <span className="badge badge-warning" style={{ fontSize: '9px' }} title="Synthetic demonstration data">
                      DEMO DATA
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Features: {l.feature_count} • CRS: {l.crs} • Source: {l.source_info || 'Local file'}
                </div>
              </div>

              <button
                onClick={() => onDeleteLayer(l.id)}
                className="btn btn-danger"
                style={{ padding: '6px', borderRadius: 'var(--radius-sm)' }}
                title="Remove layer"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
