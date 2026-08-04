import { useState } from "react";

export default function PasswordField({ id="password", name="password", label="Password", value, onChange, required }) {
  const [show, setShow] = useState(false);
  return (
    <div className="f-row pw-row">
      <label htmlFor={id}>{label}</label>
      <div className="field pw-wrap">
        <input
          id={id}
          type={show ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete="current-password"
        />
        <span className="focus-underline" />
        <button
          type="button"
          className={`pw-toggle ${show ? "on" : ""}`}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          onClick={() => setShow(s => !s)}
        >
          {/* simple eye icon via CSS bg or tiny SVG */}
          <span className="icon" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
