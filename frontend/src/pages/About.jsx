import React from 'react';
import { ExternalLink } from 'lucide-react';

const TECH_STACK = [
  { group: 'Backend', items: ['Python 3.11', 'FastAPI', 'Uvicorn', 'WebSockets'] },
  { group: 'Computer vision', items: ['YOLOv8n (Ultralytics)', 'OpenCV', 'NumPy', 'EasyOCR (ANPR)'] },
  { group: 'Frontend', items: ['React 18', 'Vite', 'TailwindCSS', 'Recharts', 'Leaflet', 'Lucide icons'] },
  { group: 'Streaming', items: ['MJPEG over HTTP', 'WebSocket live data at 1 Hz'] },
];

function About() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-lg font-bold text-ops-primary mb-1">About SignalVision</h1>
      <p className="text-xs text-ops-muted mb-6">Prototype · Smart India Hackathon 2026</p>

      <div className="space-y-4">
        <div className="bg-ops-card border border-ops-border rounded-lg p-5 text-sm text-ops-secondary leading-relaxed">
          <h2 className="text-sm font-semibold text-ops-primary mb-2">What it does</h2>
          <p>
            SignalVision counts vehicles per lane with YOLOv8 on CCTV or
            simulated feeds, then reallocates green time proportionally to lane
            density every cycle, replacing fixed timers. The full loop (detection,
            adaptive timing, signal state machine, dashboard) runs on a single
            machine for one instrumented junction.
          </p>
        </div>

        <div className="bg-ops-card border border-ops-border rounded-lg p-5">
          <h2 className="text-sm font-semibold text-ops-primary mb-3">Tech stack</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TECH_STACK.map((g) => (
              <div key={g.group}>
                <p className="text-xs font-semibold text-ops-secondary mb-1.5">{g.group}</p>
                <ul className="space-y-1">
                  {g.items.map((item) => (
                    <li key={item} className="text-xs text-ops-muted">{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-ops-card border border-ops-border rounded-lg p-5 text-sm text-ops-secondary leading-relaxed">
          <h2 className="text-sm font-semibold text-ops-primary mb-2">Team</h2>
          <p>
            Team name placeholder, to be filled before submission. Built for the
            Smart India Hackathon 2026, Smart Transportation category.
          </p>
        </div>

        <div className="bg-ops-card border border-ops-border rounded-lg p-5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ops-primary">Source code</h2>
            <p className="text-xs text-ops-muted mt-1">
              Repository link placeholder, add your GitHub URL before submission.
            </p>
          </div>
          <a
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-xs text-ops-secondary hover:text-ops-primary border border-ops-border rounded-md px-3 py-2"
          >
            <ExternalLink size={14} />
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
}

export default About;
