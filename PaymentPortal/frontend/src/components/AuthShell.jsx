import React from "react";

// Pre-computed particles array for better re-render performance
const PARTICLE_COUNT = 36;
const PARTICLES = Array.from({ length: PARTICLE_COUNT });

export default function AuthShell({
  title = "Secure Payment Portal",
  subtitle = "Protected by SwiftShield Multi-Layer Encryption",
  children,
  ready = true,
}) {
  return (
    <section className={`auth-hero ${ready ? "ready" : ""}`}>
      {/* Decorative Background Elements */}
      <div className="auth-bg" aria-hidden="true">
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
        <div className="particles">
          {PARTICLES.map((_, i) => (
            <span key={i} style={{ "--i": i }} />
          ))}
        </div>
      </div>

      {/* Main Content Container */}
      <div className="auth-wrap">
        <header className="auth-header">
          <div className="auth-badge fade-up s1" style={{ marginBottom: "0.5rem" }}>
            <span className="dot" />
            <span className="badge-text">SWIFTSHIELD SECURE</span>
          </div>
          <h1 className="fade-up s1 shimmer-text">{title}</h1>
          <p className="subtitle fade-up s2">{subtitle}</p>
        </header>

        <main className="auth-body fade-up s3">
          {children}
        </main>
      </div>
    </section>
  );
}