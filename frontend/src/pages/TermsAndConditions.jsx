import React from 'react';

function TermsAndConditions() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-lg font-bold text-ops-primary mb-1">
        Terms &amp; Conditions
      </h1>
      <p className="text-xs text-ops-muted mb-6">
        Effective date: September 30, 2026
      </p>

      <div className="bg-ops-card border border-ops-border rounded-lg p-5 space-y-5 text-sm text-ops-secondary leading-relaxed">
        <section>
          <h2 className="text-sm font-semibold text-ops-primary mb-2">
            1. Prototype status
          </h2>
          <p>
            SignalVision is a prototype built for evaluation in Smart India
            Hackathon 2026. It is not a certified traffic control system and
            must not be connected to physical signal hardware.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-ops-primary mb-2">
            2. No warranty
          </h2>
          <p>
            The software is provided "as is", without warranty of any kind,
            express or implied. Use at your own risk. The team makes no claim
            of fitness for any operational or safety-critical purpose.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-ops-primary mb-2">
            3. Permitted use
          </h2>
          <p>
            Intended for SIH 2026 evaluation, demonstration, and educational
            use only. Do not deploy this code on live infrastructure or rely
            on it for any safety-related decision.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-ops-primary mb-2">
            4. Open source licenses
          </h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>YOLOv8 / Ultralytics: AGPL-3.0</li>
            <li>FastAPI: MIT License</li>
            <li>React: MIT License</li>
            <li>OpenCV: Apache 2.0</li>
            <li>Leaflet: BSD 2-Clause</li>
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-ops-primary mb-2">
            5. Contact
          </h2>
          <p>
            Team placeholder, to be filled before submission:{' '}
            <span className="font-mono-num text-ops-primary">
              team@signalvision.example
            </span>
          </p>
        </section>
      </div>
    </div>
  );
}

export default TermsAndConditions;
