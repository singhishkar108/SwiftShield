import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { postJSON } from "../lib/api";
import { reUsername, reAccountNumber } from "../lib/validators";
import { useAuth } from "../AuthContext";
import Layout from "../components/Layout";
import ReCaptchaBox from "../components/ReCaptchaBox";
import ErrorList from "../components/ErrorList";
import TextField from "../components/TextField";
import PasswordField from "../components/PasswordField";
import AuthShell from "../components/AuthShell";
import { useTilt } from "../hooks/useTilt";
import { useMagnet } from "../hooks/useMagnet";
import "./auth.css";

export default function Login() {
  const navigate = useNavigate();
  const { setToken, setUsername, setFullName } = useAuth();

  const [form, setForm] = useState({ username: "", accountNumber: "", password: "" });
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    const es = [];
    if (!reUsername.test(form.username)) es.push("Username is invalid format.");
    if (!reAccountNumber.test(form.accountNumber)) es.push("Account number is invalid format.");
    if (!form.password) es.push("Password is required.");
    if (!captchaToken) es.push("Please complete the reCAPTCHA verification.");
    if (es.length) return setErrors(es);

    try {
      setBusy(true);
      setErrors([]);
      const res = await postJSON("/api/auth/login", { ...form, captchaToken });
      
      setToken(res.token);
      setUsername(res.username);
      if (res.fullName && setFullName) setFullName(res.fullName);
      
      navigate("/welcome");
    } catch (err) {
      setErrors([err.message || "Invalid credentials provided."]);
    } finally {
      setBusy(false);
    }
  };

  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 30);
    return () => clearTimeout(t);
  }, []);

  const cardRef = useTilt();
  const ctaRef = useMagnet();

  return (
    <Layout username={null} isAuthed={false} onLogout={() => {}}>
      <AuthShell
        title="Sign in to SwiftShield Bank Inc"
        subtitle="Secure access to International Payments."
        ready={ready}
      >
        <ErrorList errors={errors} />

        <form ref={cardRef} className="auth-card glass fancy-glow fade-up s3" onSubmit={onSubmit}>
          <TextField
            id="username"
            name="username"
            label="Username"
            value={form.username}
            onChange={onChange}
            autoComplete="username"
            required
          />

          <TextField
            id="accountNumber"
            name="accountNumber"
            label="Account Number"
            value={form.accountNumber}
            onChange={onChange}
            inputMode="numeric"
            autoComplete="off"
            required
          />

          <PasswordField
            value={form.password}
            onChange={onChange}
            autoComplete="current-password"
            required
          />

          <div style={{ textAlign: "right", margin: "-0.25rem 0 0.5rem" }}>
            <Link className="link muted" to="/forgot-password" style={{ fontSize: "0.85rem" }}>
              Forgot password?
            </Link>
          </div>

          <ReCaptchaBox
            siteKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
            onChange={setCaptchaToken}
          />

          <button
            ref={ctaRef}
            type="submit"
            className={`btn solid xlg shimmer cta-magnet ${busy ? "loading" : ""}`}
            disabled={busy || !captchaToken}
            style={{ width: "100%", marginTop: "0.5rem" }}
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>

          <div className="f-secure muted" style={{ marginTop: ".8rem", textAlign: "center" }}>
            Protected by TLS 1.3 • reCAPTCHA • CSRF • Rate limiting
          </div>
        </form>

        <div className="f-alt fade-up s3" style={{ textAlign: "center", marginTop: "1rem" }}>
          <span className="muted">Don't have an account?</span>{" "}
          <Link className="link" to="/register">
            Create an account
          </Link>
        </div>
      </AuthShell>
    </Layout>
  );
}