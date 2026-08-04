import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null, info: null };
  }

  static getDerivedStateFromError(err) {
    return { err };
  }

  componentDidCatch(err, info) {
    this.setState({ info });
    console.error("Render error caught by ErrorBoundary:", err, info);
  }

  handleReset = () => {
    this.setState({ err: null, info: null });
  };

  render() {
    if (this.state.err) {
      const errorMessage = String(this.state.err?.message || this.state.err);

      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.header}>
              <span style={styles.icon}>⚠️</span>
              <h2 style={styles.title}>Something went wrong</h2>
            </div>

            <p style={styles.subtitle}>
              An unexpected rendering error occurred. You can attempt to retry or return to safety.
            </p>

            <pre style={styles.errorBox}>
              <code>{errorMessage}</code>
            </pre>

            <div style={styles.actions}>
              <button 
                onClick={this.handleReset} 
                style={{ ...styles.btn, ...styles.btnPrimary }}
              >
                Try Again
              </button>
              <button 
                onClick={() => (window.location.href = "/")} 
                style={{ ...styles.btn, ...styles.btnSecondary }}
              >
                Go to Dashboard
              </button>
            </div>

            <p style={styles.footerNote}>
              Tip: Press <code>F12</code> or open DevTools → Console to inspect the full stack trace.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    color: "#ffffff",
  },
  card: {
    width: "100%",
    maxWidth: "600px",
    background: "rgba(255, 255, 255, 0.07)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderRadius: "16px",
    padding: "28px",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.45)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "12px",
  },
  icon: {
    fontSize: "1.8rem",
  },
  title: {
    margin: 0,
    fontSize: "1.5rem",
    fontWeight: 700,
  },
  subtitle: {
    color: "#cbd5e1",
    fontSize: "0.95rem",
    margin: "0 0 16px 0",
    lineHeight: "1.4",
  },
  errorBox: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    background: "rgba(255, 107, 107, 0.12)",
    border: "1px solid rgba(255, 107, 107, 0.35)",
    color: "#ffbcbc",
    padding: "14px",
    borderRadius: "10px",
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
    fontSize: "0.9rem",
    maxHeight: "180px",
    overflowY: "auto",
    margin: "0 0 20px 0",
  },
  actions: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "16px",
  },
  btn: {
    padding: "10px 18px",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "0.92rem",
    cursor: "pointer",
    border: "none",
    transition: "transform 0.15s ease, opacity 0.2s ease",
  },
  btnPrimary: {
    background: "linear-gradient(135deg, #00c6ff, #0072ff)",
    color: "#ffffff",
  },
  btnSecondary: {
    background: "rgba(255, 255, 255, 0.12)",
    color: "#ffffff",
    border: "1px solid rgba(255, 255, 255, 0.2)",
  },
  footerNote: {
    color: "#94a3b8",
    fontSize: "0.82rem",
    margin: 0,
  },
};