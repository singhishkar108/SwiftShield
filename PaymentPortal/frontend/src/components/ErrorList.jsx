import React from "react";

export default function ErrorList({ errors = [] }) {
  // Normalize items to ensure string rendering and filter empty entries
  const list = (Array.isArray(errors) ? errors : [errors])
    .map((err) => (typeof err === "object" && err !== null ? err.message || JSON.stringify(err) : String(err || "")))
    .filter((msg) => msg.trim().length > 0);

  if (!list.length) return null;

  return (
    <div className="f-error" role="alert" aria-live="polite">
      <div style={styles.header}>
        <span style={styles.icon}>⚠️</span>
        <strong>Please correct the following:</strong>
      </div>
      <ul style={styles.list}>
        {list.map((msg, i) => (
          <li key={i} style={styles.item}>
            {msg}
          </li>
        ))}
      </ul>
    </div>
  );
}

const styles = {
  header: {
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
    marginBottom: "0.4rem",
    fontSize: "0.95rem",
  },
  icon: {
    fontSize: "1rem",
  },
  list: {
    margin: 0,
    paddingLeft: "1.2rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.2rem",
  },
  item: {
    lineHeight: "1.35",
    fontSize: "0.9rem",
  },
};