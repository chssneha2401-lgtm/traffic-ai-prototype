import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { API_BASE_URL } from '../utils/constants';

const STATUS_COLOR = {
  free: '#10b981',
  moderate: '#f59e0b',
  congested: '#ef4444',
  live: '#00e5ff',
};

/**
 * City Congestion Map: geographic view of the configured Mumbai junctions.
 * J5 (Sion Circle) is the live node streaming real counts; the rest are
 * junction configuration data, honestly labeled in each popup.
 */
function CityMapPage() {
  const [junctions, setJunctions] = useState([]);
  const [center, setCenter] = useState([19.076, 72.8777]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJunctions = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/congestion-map`);
        const data = await response.json();
        setJunctions(data.junctions || []);
        if (data.map_center) {
          setCenter([data.map_center.lat, data.map_center.lng]);
        }
      } catch (error) {
        console.error('Error fetching junctions:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchJunctions();
    const interval = setInterval(fetchJunctions, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div className="bg-ops-card border border-ops-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-ops-primary">
            City Congestion Map · {junctions.length} junctions
          </h3>
          <div className="flex items-center gap-3 text-[10px] text-ops-muted">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />Free</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} />Moderate</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#ef4444' }} />Congested</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#00e5ff' }} />Live</span>
          </div>
        </div>

        {loading ? (
          <div className="h-[480px] flex items-center justify-center text-xs text-ops-muted">
            Loading junction data
          </div>
        ) : (
          <div className="h-[480px] rounded-md overflow-hidden border border-ops-border">
            <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              {junctions.map((j) => {
                const color = STATUS_COLOR[j.status] || '#64748b';
                return (
                  <CircleMarker
                    key={j.id}
                    center={[j.lat, j.lng]}
                    radius={j.is_live ? 12 : (j.total_count || 0) >= 70 ? 10 : 8}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 2 }}
                  >
                    <Popup>
                      <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 180 }}>
                        <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                          {j.name} {j.is_live ? '(LIVE)' : ''}
                        </h3>
                        <p style={{ fontSize: 12, margin: '2px 0' }}>ID: {j.id}</p>
                        <p style={{ fontSize: 12, margin: '2px 0' }}>
                          Status: <strong>{(j.status || 'unknown').toUpperCase()}</strong>
                        </p>
                        <p style={{ fontSize: 12, margin: '2px 0' }}>
                          Vehicles: <strong>{j.total_count ?? 0}</strong>
                        </p>
                        {j.lane_data && (
                          <div style={{ marginTop: 6, borderTop: '1px solid #334155', paddingTop: 6 }}>
                            <p style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Lane breakdown:</p>
                            {Object.entries(j.lane_data).map(([lane, d]) => (
                              <p key={lane} style={{ fontSize: 11 }}>
                                {lane.replace('_', ' ')}: {d.count} veh · {d.congestion}
                              </p>
                            ))}
                          </div>
                        )}
                        {!j.is_live && (
                          <p style={{ fontSize: 10, color: '#64748b', marginTop: 6 }}>
                            Configuration data - not streaming live
                          </p>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        )}

        <p className="text-[10px] text-ops-muted mt-2">
          Junction status thresholds: free &lt; 40 · moderate 40-70 · congested &gt; 70 vehicles ·
          live counts refresh every 10 seconds
        </p>
      </div>
    </div>
  );
}

export default CityMapPage;
