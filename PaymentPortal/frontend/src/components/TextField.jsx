export default function TextField({ id, name, label, value, onChange, type="text", inputMode, required }) {
    return (
      <div className="f-row">
        <label htmlFor={id || name}>{label}</label>
        <div className="field">
          <input
            id={id || name}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            inputMode={inputMode}
            required={required}
          />
          <span className="focus-underline" />
        </div>
      </div>
    );
  }
  