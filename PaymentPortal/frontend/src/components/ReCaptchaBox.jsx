 import React, { useEffect, useRef } from "react";

    /**
     * Google reCAPTCHA v2 Checkbox wrapper
     *
     * Props:
     *   siteKey (string) - your reCAPTCHA site key
     *   onChange (fn)    - callback with token (string) or null (expired/error)
     */
export default function ReCaptchaBox({ siteKey, onChange }) {
  const ref = useRef(null);
  const widgetId = useRef(null);

  useEffect(() => {
    function render() {
      if (!window.grecaptcha || !ref.current || widgetId.current !== null) return;

      widgetId.current = window.grecaptcha.render(ref.current, {
        sitekey: siteKey,
        callback: (token) => onChange(token),
        "expired-callback": () => onChange(null),
        "error-callback": () => onChange(null),
      });
    }

    // wait for script to load
    const id = setInterval(() => {
      if (window.grecaptcha && window.grecaptcha.render) {
        clearInterval(id);
        render();
      }
    }, 200);

    return () => clearInterval(id);
  }, [siteKey, onChange]);

  return (
    <div style={{ marginTop: 12 }}>
      <div ref={ref} className="g-recaptcha" />
    </div>
  );
}

