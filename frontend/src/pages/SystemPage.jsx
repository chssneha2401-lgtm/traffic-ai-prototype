import React from 'react';
import { Shield, Server, Cpu, TriangleAlert, Check } from 'lucide-react';
import RuntimeMetricsCard from '../components/RuntimeMetricsCard';

/**
 * System & Fail-Safe: how the controller degrades safely, plus live engine
 * health. Scope is honest: one instrumented node, no fleet management yet.
 */
function SystemPage() {
  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Fail-safe design */}
        <div className="bg-ops-card border border-ops-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-ops-green" />
            <h3 className="text-sm font-semibold text-ops-primary">Fail-Safe Design</h3>
          </div>
          <ul className="space-y-3 text-xs text-ops-secondary">
            <li className="flex gap-2">
              <Check size={13} className="text-ops-green mt-0.5 shrink-0" />
              <span>
                <strong className="text-ops-primary">Camera or detector failure:</strong>{' '}
                the junction falls back to minimum green times (10s per lane) so
                every approach keeps being served.
              </span>
            </li>
            <li className="flex gap-2">
              <Check size={13} className="text-ops-green mt-0.5 shrink-0" />
              <span>
                <strong className="text-ops-primary">Zero-traffic input:</strong>{' '}
                all lanes receive minimum green; no lane is ever starved by the
                adaptive algorithm.
              </span>
            </li>
            <li className="flex gap-2">
              <Check size={13} className="text-ops-green mt-0.5 shrink-0" />
              <span>
                <strong className="text-ops-primary">Green-time clamps:</strong>{' '}
                allocation is hard-limited between 10s and 60s regardless of
                detection output, preventing pathological timings.
              </span>
            </li>
            <li className="flex gap-2">
              <Check size={13} className="text-ops-green mt-0.5 shrink-0" />
              <span>
                <strong className="text-ops-primary">Amber phase is fixed:</strong>{' '}
                a constant 3s amber runs before every transition, independent
                of the adaptive engine.
              </span>
            </li>
            <li className="flex gap-2">
              <Check size={13} className="text-ops-green mt-0.5 shrink-0" />
              <span>
                <strong className="text-ops-primary">Mid-phase protection:</strong>{' '}
                surges extend a running green but never shrink it mid-phase,
                so a lane already moving is not cut off abruptly.
              </span>
            </li>
          </ul>
        </div>

        {/* Deployment reality */}
        <div className="space-y-4">
          <div className="bg-ops-card border border-ops-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Server size={16} className="text-ops-cyan" />
              <h3 className="text-sm font-semibold text-ops-primary">Deployment Status</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-ops-muted">Instrumented nodes</p>
                <p className="text-ops-primary font-semibold font-mono-num">1 of 9</p>
              </div>
              <div>
                <p className="text-ops-muted">Streaming feeds</p>
                <p className="text-ops-primary font-semibold font-mono-num">1 of 24</p>
              </div>
              <div>
                <p className="text-ops-muted">Database persistence</p>
                <p className="text-ops-amber font-semibold">Not implemented</p>
              </div>
              <div>
                <p className="text-ops-muted">Multi-junction sync</p>
                <p className="text-ops-amber font-semibold">Not implemented</p>
              </div>
            </div>
          </div>

          <div className="bg-ops-card border border-ops-border rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Cpu size={16} className="text-ops-teal" />
              <h3 className="text-sm font-semibold text-ops-primary">Engine Configuration</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-ops-muted">Detector</span>
                <span className="text-ops-primary">YOLOv8n · conf &gt;= 0.50</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ops-muted">Vehicle classes</span>
                <span className="text-ops-primary">car, motorcycle, bus, truck</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ops-muted">Lane assignment</span>
                <span className="text-ops-primary">Point-in-polygon ROI</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ops-muted">Signal cycle</span>
                <span className="text-ops-primary">A -&gt; B -&gt; C -&gt; D</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ops-muted">ANPR engine</span>
                <span className="text-ops-primary">EasyOCR (video mode)</span>
              </div>
            </div>
          </div>

          <div className="bg-ops-card border border-ops-amber/40 rounded-lg p-4 flex items-start gap-3">
            <TriangleAlert size={16} className="text-ops-amber mt-0.5 shrink-0" />
            <p className="text-[11px] text-ops-secondary">
              This page describes designed behavior of a hackathon prototype.
              The fail-safe paths listed are implemented in the timer engine,
              but the system has not been certified for deployment on real
              signal hardware.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <RuntimeMetricsCard />
      </div>
    </div>
  );
}

export default SystemPage;
