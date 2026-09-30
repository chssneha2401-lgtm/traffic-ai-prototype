import React, { useState, useEffect, useRef } from 'react';
import { ScanLine, Search, Upload, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';

const TYPE_LABEL = {
  2: 'Car', 3: 'Motorcycle', 5: 'Bus', 7: 'Truck',
};

function ANPRTab() {
  const [plateLog, setPlateLog] = useState([]);
  const [dataSource, setDataSource] = useState(null); // 'live_ocr' | 'demo_data'
  const [isEnabled, setIsEnabled] = useState(() => localStorage.getItem('anpr_enabled') === 'true');
  const [search, setSearch] = useState('');
  const [hasLoadedData, setHasLoadedData] = useState(false);

  // Image upload state
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('anpr_enabled', isEnabled.toString());
  }, [isEnabled]);

  const fetchPlateLog = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/anpr-log`);
      const data = await response.json();
      setPlateLog(data.plates || []);
      setDataSource(data.source || null);
      setHasLoadedData(true);
    } catch (error) {
      console.error('Error fetching ANPR log:', error);
    }
  };

  useEffect(() => {
    if (isEnabled) {
      fetchPlateLog();
      const interval = setInterval(fetchPlateLog, 5000);
      return () => clearInterval(interval);
    }
  }, [isEnabled]);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API_BASE_URL}/api/upload-test-image`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error(`Backend returned ${response.status}`);
      const data = await response.json();
      setUploadResult(data);
    } catch (error) {
      console.error('Image upload failed:', error);
      setUploadError(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const filtered = plateLog.filter((p) =>
    (p.plate_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.lane || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-ops-card border border-ops-border rounded-lg p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-base font-semibold text-ops-primary flex items-center gap-2">
          <ScanLine size={16} className="text-ops-muted" />
          Automated License Plate Recognition
          {dataSource && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded"
              style={{
                color: dataSource === 'live_ocr' ? '#10b981' : '#f59e0b',
                backgroundColor: dataSource === 'live_ocr' ? '#10b98120' : '#f59e0b20',
              }}
            >
              {dataSource === 'live_ocr' ? 'LIVE OCR' : 'DEMO DATA'}
            </span>
          )}
        </h2>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-ops-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            Poll video ANPR log
          </label>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ops-cyan/10 border border-ops-cyan/40 text-ops-cyan hover:bg-ops-cyan/20 rounded-md text-xs font-semibold disabled:opacity-50"
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            {uploading ? 'Processing...' : 'Upload Test Image'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              handleUpload(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {/* Image upload results */}
      {(previewUrl || uploadError) && (
        <div className="mb-5 bg-ops-surface/60 border border-ops-border rounded-md p-3">
          <p className="text-[10px] font-bold text-ops-muted uppercase tracking-wider mb-2">
            Static Image Test
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Uploaded test"
                className="w-full rounded border border-ops-border max-h-72 object-contain bg-black"
              />
            )}
            <div>
              {uploadError && (
                <p className="text-xs text-ops-red">{uploadError}</p>
              )}
              {uploadResult && (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-ops-card rounded p-2 text-center">
                      <p className="text-lg font-bold font-mono-num text-ops-cyan">{uploadResult.vehicles_detected}</p>
                      <p className="text-[10px] text-ops-muted">Vehicles</p>
                    </div>
                    <div className="bg-ops-card rounded p-2 text-center">
                      <p className="text-lg font-bold font-mono-num text-ops-green">{uploadResult.plates?.length || 0}</p>
                      <p className="text-[10px] text-ops-muted">Plates read</p>
                    </div>
                    <div className="bg-ops-card rounded p-2 text-center">
                      <p className="text-sm font-bold font-mono-num text-ops-secondary pt-1.5">
                        {uploadResult.detection_ms ? `${uploadResult.detection_ms}ms` : '-'}
                      </p>
                      <p className="text-[10px] text-ops-muted">Detection</p>
                    </div>
                  </div>
                  {(uploadResult.plates || []).length === 0 ? (
                    <p className="text-xs text-ops-muted">
                      No plates recognized. Use a close-up image with readable plates for best results.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {uploadResult.plates.map((p, i) => (
                        <div key={i} className="flex items-center justify-between bg-ops-card rounded px-2.5 py-1.5">
                          <span className="font-mono-num text-xs font-bold text-ops-cyan">{p.plate_number}</span>
                          <span className="text-[10px] text-ops-muted">
                            {TYPE_LABEL[p.vehicle_class] || 'Vehicle'} · {(p.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-ops-surface/60 rounded-md p-3 text-center">
          <p className="text-2xl font-bold font-mono-num text-ops-cyan">{plateLog.length}</p>
          <p className="text-[11px] text-ops-muted">Plates Detected</p>
        </div>
        <div className="bg-ops-surface/60 rounded-md p-3 text-center">
          <p className="text-2xl font-bold font-mono-num text-ops-green">
            {plateLog.filter((p) => p.confidence > 0.8).length}
          </p>
          <p className="text-[11px] text-ops-muted">High Confidence</p>
        </div>
        <div className="bg-ops-surface/60 rounded-md p-3 text-center">
          <p className="text-2xl font-bold font-mono-num text-ops-amber">
            {new Set(plateLog.map((p) => p.lane)).size}
          </p>
          <p className="text-[11px] text-ops-muted">Lanes Covered</p>
        </div>
      </div>

      {/* Search filter */}
      <div className="relative mb-3">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ops-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by plate number or lane..."
          className="w-full bg-ops-surface border border-ops-border rounded-md pl-9 pr-3 py-2 text-xs text-ops-primary placeholder:text-ops-muted focus:outline-none focus:border-ops-cyan/50"
        />
      </div>

      {/* Plate log table */}
      <div className="bg-ops-surface/40 rounded-md overflow-hidden border border-ops-border">
        <table className="w-full text-xs">
          <thead className="bg-ops-surface">
            <tr className="text-ops-muted">
              <th className="px-4 py-2.5 text-left font-medium">Timestamp</th>
              <th className="px-4 py-2.5 text-left font-medium">Plate Number</th>
              <th className="px-4 py-2.5 text-left font-medium">Lane</th>
              <th className="px-4 py-2.5 text-left font-medium">Confidence</th>
              <th className="px-4 py-2.5 text-left font-medium">Vehicle Type</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-ops-muted">
                  {isEnabled ? (plateLog.length === 0 ? 'No plates recognized yet' : 'No matches for filter') : 'Enable polling to stream plates'}
                </td>
              </tr>
            ) : (
              filtered.map((plate, index) => (
                <tr key={index} className="border-t border-ops-border/50 hover:bg-ops-card/50">
                  <td className="px-4 py-2.5 font-mono-num text-ops-secondary">{plate.timestamp}</td>
                  <td className="px-4 py-2.5 font-mono-num font-bold text-ops-cyan">{plate.plate_number}</td>
                  <td className="px-4 py-2.5 text-ops-secondary">{plate.lane?.replace('_', ' ')}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold"
                      style={{
                        color: plate.confidence > 0.8 ? '#10b981' : '#f59e0b',
                        backgroundColor: plate.confidence > 0.8 ? '#10b98120' : '#f59e0b20',
                      }}
                    >
                      {(plate.confidence * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-ops-secondary">{plate.vehicle_type || 'Unknown'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ANPRTab;
