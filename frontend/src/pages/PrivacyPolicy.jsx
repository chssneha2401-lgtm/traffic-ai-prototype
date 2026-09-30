import React from 'react';

function PrivacyPolicy() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-lg font-bold text-ops-primary mb-1">Privacy Policy</h1>
      <p className="text-xs text-ops-muted mb-6">Effective date: September 30, 2026</p>

      <div className="bg-ops-card border border-ops-border rounded-lg p-5 space-y-5 text-sm text-ops-secondary leading-relaxed">
        <section>
          <h2 className="text-sm font-semibold text-ops-primary mb-2">1. What this is</h2>
          <p>
            SignalVision is a prototype demonstration built for Smart India
            Hackathon 2026. It is not a production traffic management system and
            is not operated by any government authority or company.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-ops-primary mb-2">2. Data processed</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-ops-primary">CCTV video frames:</strong> processed
              locally on the demo machine by YOLOv8 and OpenCV. Frames are used in
              memory for detection and are not written to disk or uploaded anywhere.
            </li>
            <li>
              <strong className="text-ops-primary">Vehicle counts and signal timings:</strong>{' '}
              held in server memory only. Cleared when the backend process stops.
            </li>
            <li>
              <strong className="text-ops-primary">License plates (ANPR):</strong> when
              plate recognition succeeds, results are stored in an in-memory log
              capped at roughly 100 entries and cleared on backend restart. No plate
              data leaves the demo machine.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-ops-primary mb-2">3. What we do not collect</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>No personal information, accounts, or contact details</li>
            <li>No cookies, local storage tracking, or analytics</li>
            <li>No telemetry, crash reporting, or third-party trackers</li>
            <li>No video or plate data is transmitted over the internet</li>
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-ops-primary mb-2">4. Third-party services</h2>
          <p>
            The city map loads tiles from OpenStreetMap. Standard web requests to
            OpenStreetMap are covered by their privacy policy. The demo runs fully
            offline except for map tiles, Google Fonts, and optional GitHub links.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-ops-primary mb-2">5. Contact</h2>
          <p>
            Team placeholder, to be filled before submission:{' '}
            <span className="font-mono-num text-ops-primary">team@signalvision.example</span>
          </p>
        </section>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
