import React, { useState, useEffect } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';

/**
 * Timer configuration modal. Sliders for total cycle time, min and max
 * green - persisted to the backend via POST /api/config, so parameters can
 * be tuned live during the demo.
 */
function SettingsModal({ open, onClose }) {
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  // Load current config each time the modal opens
  useEffect(() => {
    if (!open) return;
    const fetchConfig = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/config`);
        if (response.ok) setConfig(await response.json());
      } catch (error) {
        console.error('Error loading config:', error);
      }
    };
    fetchConfig();
  }, [open]);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_cycle_time: config.total_cycle_time,
          min_green_time: config.min_green_time,
          max_green_time: config.max_green_time,
        }),
      });
      if (response.ok) {
        setStatus({ ok: true, text: 'Saved. New timings apply from the next phase.' });
      } else {
        setStatus({ ok: false, text: 'Failed to save configuration.' });
      }
    } catch (error) {
      console.error('Error saving config:', error);
      setStatus({ ok: false, text: 'Failed to reach backend.' });
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(null), 4000);
    }
  };

  const Slider = ({ label, value, min, max, step, onChange, hint }) => (
    <div className="mb-5">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-ops-secondary">{label}</span>
        <span className="text-xs font-bold font-mono-num text-ops-cyan">{value}s</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-cyan-400"
      />
      {hint && <p className="text-[10px] text-ops-muted mt-1">{hint}</p>}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-ops-card border border-ops-border rounded-lg p-5 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-ops-primary flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-ops-muted" />
            Signal Timer Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-ops-surface text-ops-muted hover:text-ops-primary"
          >
            <X size={16} />
          </button>
        </div>

        {!config ? (
          <p className="text-xs text-ops-muted py-6 text-center">Loading configuration...</p>
        ) : (
          <>
            <Slider
              label="Total Cycle Time"
              value={config.total_cycle_time}
              min={60}
              max={180}
              step={5}
              onChange={(v) => setConfig({ ...config, total_cycle_time: v })}
              hint="Time for one complete A, B, C, D cycle"
            />
            <Slider
              label="Minimum Green Time"
              value={config.min_green_time}
              min={5}
              max={20}
              step={1}
              onChange={(v) => setConfig({ ...config, min_green_time: v })}
            />
            <Slider
              label="Maximum Green Time"
              value={config.max_green_time}
              min={30}
              max={90}
              step={5}
              onChange={(v) => setConfig({ ...config, max_green_time: v })}
            />

            {config.min_green_time > config.max_green_time && (
              <p className="text-xs text-ops-red mb-3">
                Minimum green time exceeds maximum. Adjust before saving.
              </p>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-ops-surface border border-ops-border hover:bg-ops-card rounded-md text-xs font-semibold text-ops-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || config.min_green_time > config.max_green_time}
                className="px-4 py-2 bg-ops-cyan/15 border border-ops-cyan/40 text-ops-cyan hover:bg-ops-cyan/25 disabled:opacity-50 rounded-md text-xs font-bold"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>

            {status && (
              <p className={`mt-3 text-xs ${status.ok ? 'text-ops-green' : 'text-ops-red'}`}>
                {status.text}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default SettingsModal;
