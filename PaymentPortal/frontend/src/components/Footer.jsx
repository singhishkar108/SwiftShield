import React from "react";
import { Link } from "react-router-dom";
import "../styles/footer.css";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mh-footer">
      {/* Navigation Grid */}
      <div className="mh-footer-inner">
        <div className="col brand-col">
          <div className="brand-header">
            <h4>SwiftShield Inc</h4>
            <span className="premium-pill">Institutional Grade</span>
          </div>
          <p className="brand-tagline">
            Empowering frictionless global capital transfers with end-to-end multi-layer encryption and real-time settlement tracking.
          </p>
          <div className="security-tag" style={{ marginTop: "0.75rem", fontWeight: 600 }}>
            <span>256-Bit Encrypted • SOC2 Type II Certified</span>
          </div>
        </div>

        <div className="col" aria-label="Company Links">
          <h5>Company</h5>
          <Link to="/about">About Us</Link>
          <Link to="/careers">Careers</Link>
          <Link to="/press">Press & Media</Link>
          <Link to="/partners">Partnerships</Link>
        </div>

        <div className="col" aria-label="Legal Information">
          <h5>Legal & Regulatory</h5>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/security">Security Architecture</Link>
          <Link to="/compliance">Compliance & AML</Link>
        </div>

        <div className="col" aria-label="Support and Operations">
          <h5>Support & Operations</h5>
          <Link to="/support">Help Center</Link>
          <Link to="/contact">Contact Treasury</Link>
          {/* <a href="/status" target="_blank" rel="noopener noreferrer">
            <span style={{ color: "#22c55e" }}></span> All Systems Operational
          </a> */}
        </div>
      </div>

      {/* Full-Width Centered Regulatory Disclaimer */}
      <div className="mh-footer-disclaimer-banner">
        <p>
          SwiftShield Bank Inc. is a licensed financial institution regulated for international payment processing and cross-border settlement services. Funds held in accounts are backed by multi-bank liquidity reserves.
        </p>
      </div>

      {/* Bottom Bar */}
      <div className="mh-footer-bar">
        <span>© {currentYear} SwiftShield Bank Inc. All rights reserved.</span>
        <div className="badges">
          <span>PCI DSS LEVEL 1</span>
          <span>ISO 27001</span>
          <span>TLS 1.3</span>
        </div>
      </div>
    </footer>
  );
}