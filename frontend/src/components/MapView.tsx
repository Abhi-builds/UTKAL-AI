import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layer, Scenario, Finding } from '../types';
import { Eye, EyeOff, Layers, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

interface MapViewProps {
  boundaryGeoJson: any;
  layers: Layer[];
  activeScenario: Scenario | null;
  selectedFinding: Finding | null;
  onSelectFeature?: (featureProps: any) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  boundaryGeoJson,
  layers,
  activeScenario,
  selectedFinding,
  onSelectFeature,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geojsonLayersGroupRef = useRef<L.FeatureGroup | null>(null);
  const scenarioLayerGroupRef = useRef<L.FeatureGroup | null>(null);
  const highlightLayerGroupRef = useRef<L.FeatureGroup | null>(null);

  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({
    boundary: true,
    water: true,
    greenery: true,
    roads: true,
    existing_dev: true,
    restricted_zone: true,
    survey_needed: true,
    scenario: true,
  });

  const [showLayerPanel, setShowLayerPanel] = useState(false);

  // Initialize Leaflet map (100% offline, canvas renderer, no online tile layer!)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Create map centered on Bhubaneswar demonstration coords
      const map = L.map(mapContainerRef.current, {
        center: [20.2961, 85.8245],
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
      });

      // Neutral offline CAD grid canvas backdrop
      const canvasGrid = L.GridLayer.extend({
        createTile: function () {
          const tile = document.createElement('canvas');
          tile.width = 256;
          tile.height = 256;
          const ctx = tile.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#090d16';
            ctx.fillRect(0, 0, 256, 256);

            // Subtle engineering grid
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(256, 0);
            ctx.moveTo(0, 0); ctx.lineTo(0, 256);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(16, 185, 129, 0.05)';
            ctx.strokeRect(64, 64, 128, 128);
          }
          return tile;
        },
      });

      map.addLayer(new (canvasGrid as any)());

      geojsonLayersGroupRef.current = L.featureGroup().addTo(map);
      scenarioLayerGroupRef.current = L.featureGroup().addTo(map);
      highlightLayerGroupRef.current = L.featureGroup().addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      // cleanup handled on component unmount
    };
  }, []);

  // Update Base Layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = geojsonLayersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // 1. Boundary
    if (boundaryGeoJson && visibleLayers['boundary']) {
      try {
        const bLayer = L.geoJSON(boundaryGeoJson, {
          style: {
            color: '#10b981',
            weight: 2.5,
            dashArray: '6, 6',
            fillColor: '#10b981',
            fillOpacity: 0.04,
          },
        });
        group.addLayer(bLayer);
      } catch (err) {
        console.error('Error rendering boundary:', err);
      }
    }

    // 2. Project Layers
    layers.forEach((layer) => {
      if (!layer.geojson_data || !visibleLayers[layer.layer_type]) return;

      let style: L.PathOptions = { weight: 1.5, fillOpacity: 0.4 };

      switch (layer.layer_type) {
        case 'water':
          style = { color: '#0284c7', fillColor: '#38bdf8', fillOpacity: 0.65, weight: 2 };
          break;
        case 'greenery':
          style = { color: '#15803d', fillColor: '#22c55e', fillOpacity: 0.55, weight: 1.5 };
          break;
        case 'roads':
          style = { color: '#94a3b8', weight: 3.5, opacity: 0.9 };
          break;
        case 'existing_dev':
          style = { color: '#475569', fillColor: '#334155', fillOpacity: 0.5, weight: 1.5 };
          break;
        case 'restricted_zone':
          style = { color: '#ef4444', fillColor: '#dc2626', fillOpacity: 0.4, weight: 2.5, dashArray: '4, 4' };
          break;
        case 'survey_needed':
          style = { color: '#f59e0b', fillColor: '#fbbf24', fillOpacity: 0.35, weight: 2, dashArray: '6, 4' };
          break;
      }

      try {
        const geoLayer = L.geoJSON(layer.geojson_data, {
          style: () => style,
          onEachFeature: (feature, l) => {
            l.on('click', () => {
              if (onSelectFeature) onSelectFeature(feature.properties || {});
            });
            const name = feature.properties?.name || layer.name;
            const extra = feature.properties?.note || feature.properties?.description || '';
            l.bindPopup(`
              <div style="font-size: 13px; line-height: 1.4;">
                <div style="font-weight: 700; color: #f8fafc; margin-bottom: 4px;">${name}</div>
                <div style="color: #94a3b8; font-size: 11px;">Layer: ${layer.name} (${layer.layer_type})</div>
                ${extra ? `<div style="margin-top: 6px; font-size: 11px; color: #cbd5e1;">${extra}</div>` : ''}
              </div>
            `);
          },
        });
        group.addLayer(geoLayer);
      } catch (err) {
        console.error(`Error rendering layer ${layer.name}:`, err);
      }
    });

    // Auto-fit bounds if we have layers
    const allBounds = group.getBounds();
    if (allBounds.isValid()) {
      map.fitBounds(allBounds, { padding: [30, 30] });
    }
  }, [layers, boundaryGeoJson, visibleLayers]);

  // Update Active Scenario Layout
  useEffect(() => {
    const group = scenarioLayerGroupRef.current;
    if (!group) return;

    group.clearLayers();

    if (!activeScenario || !activeScenario.layout_geojson || !visibleLayers['scenario']) {
      return;
    }

    try {
      const sLayer = L.geoJSON(activeScenario.layout_geojson, {
        style: (feature) => {
          const props = feature?.properties || {};
          const isViolation = props.is_deliberate_violation || props.land_use?.includes('commercial_shopping');

          return {
            color: isViolation ? '#ef4444' : '#1e293b',
            weight: isViolation ? 3 : 1,
            fillColor: props.color || '#3b82f6',
            fillOpacity: isViolation ? 0.8 : 0.6,
          };
        },
        onEachFeature: (feature, l) => {
          const props = feature.properties || {};
          l.on('click', () => {
            if (onSelectFeature) onSelectFeature(props);
          });

          l.bindPopup(`
            <div style="font-size: 13px; line-height: 1.4; min-width: 180px;">
              <div style="font-weight: 700; color: #f8fafc; margin-bottom: 2px;">
                ${props.cell_id || 'Parcel'}
              </div>
              <div style="color: #38bdf8; font-size: 12px; font-weight: 600;">
                ${(props.land_use || '').replace(/_/g, ' ').toUpperCase()}
              </div>
              <div style="margin-top: 6px; font-size: 11px; color: #94a3b8;">
                <div>Category: <b style="color: #e2e8f0;">${props.category || 'N/A'}</b></div>
                <div>Area: <b style="color: #e2e8f0;">${props.area_ha || 0} ha</b></div>
                <div>Housing Units: <b style="color: #e2e8f0;">${props.housing_units || 0}</b></div>
                <div>Density: <b style="color: #e2e8f0;">${props.density_du_ha || 0} DU/ha</b></div>
              </div>
              ${props.is_deliberate_violation ? `
                <div style="margin-top: 8px; padding: 4px 6px; background: rgba(239, 68, 68, 0.2); border-left: 3px solid #ef4444; color: #fca5a5; font-size: 11px;">
                  ⚠️ DELIBERATE RULE VIOLATION
                </div>
              ` : ''}
            </div>
          `);
        },
      });

      group.addLayer(sLayer);
    } catch (err) {
      console.error('Error rendering scenario layout:', err);
    }
  }, [activeScenario, visibleLayers]);

  // Highlight Selected Violation
  useEffect(() => {
    const map = mapInstanceRef.current;
    const hGroup = highlightLayerGroupRef.current;
    if (!map || !hGroup) return;

    hGroup.clearLayers();

    if (!selectedFinding || !activeScenario) return;

    const featId = selectedFinding.affected_feature_id;
    if (!featId) return;

    const features = activeScenario.layout_geojson?.features || [];
    const targetFeat = features.find((f: any) => f.id === featId || f.properties?.cell_id === featId);

    if (targetFeat) {
      try {
        const hl = L.geoJSON(targetFeat, {
          style: {
            color: '#ef4444',
            weight: 4,
            fillColor: '#ef4444',
            fillOpacity: 0.85,
            dashArray: '2, 4',
          },
        });
        hGroup.addLayer(hl);
        map.fitBounds(hl.getBounds(), { maxZoom: 16, padding: [50, 50] });
      } catch (err) {
        console.error('Error highlighting finding:', err);
      }
    }
  }, [selectedFinding, activeScenario]);

  const toggleLayer = (key: string) => {
    setVisibleLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '520px' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Layer Switcher Toggle Button */}
      <button
        onClick={() => setShowLayerPanel(!showLayerPanel)}
        className="btn btn-secondary"
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 400,
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(8px)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <Layers size={16} />
        Layers & Overlays
      </button>

      {/* Layer Switcher Floating Panel */}
      {showLayerPanel && (
        <div
          className="card"
          style={{
            position: 'absolute',
            top: 60,
            right: 16,
            zIndex: 400,
            width: '260px',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(12px)',
            padding: '16px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>GIS Map Layers</span>
            <span style={{ fontSize: '10px', color: '#10b981' }}>100% Offline</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                Study Boundary
              </span>
              <input type="checkbox" checked={visibleLayers['boundary']} onChange={() => toggleLayer('boundary')} />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }} />
                Water & Drainage
              </span>
              <input type="checkbox" checked={visibleLayers['water']} onChange={() => toggleLayer('water')} />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                Forests & Parks
              </span>
              <input type="checkbox" checked={visibleLayers['greenery']} onChange={() => toggleLayer('greenery')} />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }} />
                Roadways
              </span>
              <input type="checkbox" checked={visibleLayers['roads']} onChange={() => toggleLayer('roads')} />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                Restricted Sanctuary
              </span>
              <input type="checkbox" checked={visibleLayers['restricted_zone']} onChange={() => toggleLayer('restricted_zone')} />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', cursor: 'pointer' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} />
                Survey Needed
              </span>
              <input type="checkbox" checked={visibleLayers['survey_needed']} onChange={() => toggleLayer('survey_needed')} />
            </label>

            <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 10, height: 10, borderRadius: '2px', background: '#f59e0b', display: 'inline-block' }} />
                Scenario Parcels
              </span>
              <input type="checkbox" checked={visibleLayers['scenario']} onChange={() => toggleLayer('scenario')} />
            </label>
          </div>
        </div>
      )}

      {/* Map Legend Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          zIndex: 400,
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(10px)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '11px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>LEGEND:</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: 10, height: 10, background: '#38bdf8', borderRadius: 2 }} /> Water / River
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: 10, height: 10, background: '#10b981', borderRadius: 2 }} /> Eco Corridor
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: 10, height: 10, background: '#22c55e', borderRadius: 2 }} /> Park / Green Space
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: 10, height: 10, background: '#f97316', borderRadius: 2 }} /> High Density Res
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: 10, height: 10, background: '#f59e0b', borderRadius: 2 }} /> Mixed Medium Res
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: 10, height: 10, background: '#eab308', borderRadius: 2 }} /> Low-Impact Eco Res
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: 10, height: 10, background: '#3b82f6', borderRadius: 2 }} /> Civic / Facility
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: 10, height: 10, background: '#ef4444', borderRadius: 2 }} /> Restricted Zone
          </span>
        </div>

        <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
          Map Engine: Leaflet Vector Offline • CRS: EPSG:4326
        </div>
      </div>
    </div>
  );
};
