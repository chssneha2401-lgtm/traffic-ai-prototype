import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="border-t border-ops-border mt-8 py-4 px-1 flex flex-wrap items-center justify-between gap-2 text-xs text-ops-muted">
      <p>SignalVision Prototype · Smart India Hackathon 2026</p>
      <div className="flex items-center gap-4">
        <Link to="/privacy" className="hover:text-ops-secondary">Privacy Policy</Link>
        <Link to="/terms" className="hover:text-ops-secondary">Terms &amp; Conditions</Link>
        <Link to="/about" className="hover:text-ops-secondary">About</Link>
        <a
          href="https://github.com/"
          target="_blank"
          rel="noreferrer"
          className="hover:text-ops-secondary"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}

export default Footer;
