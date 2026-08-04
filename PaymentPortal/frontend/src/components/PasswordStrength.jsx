import React from "react";
import zxcvbn from "zxcvbn";

export default function PasswordStrength({ password }) {
  if (!password) return null;
  const result = zxcvbn(password);
  const score = result.score; // 0..4
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
  const color = ["#c0392b", "#e67e22", "#f1c40f", "#27ae60", "#2ecc71"][score];

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{
            height: 6,
            flex: 1,
            background: i <= score ? color : "#ddd",
            borderRadius: 3
          }}/>
        ))}
      </div>
      <small style={{ color }}>{labels[score]}{result.feedback.warning ? ` — ${result.feedback.warning}` : ""}</small>
    </div>
  );
}
