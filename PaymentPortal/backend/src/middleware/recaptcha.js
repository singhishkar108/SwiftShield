// Bot Defense — Google reCAPTCHA v2 Checkbox verification (server-side)
// Requests must include captchaToken; we verify with Google's siteverify API
// using RECAPTCHA_SECRET. No valid token => request is rejected.

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET || "";

export async function requireRecaptcha(req, res, next) {
  try {
    const token = req.body?.captchaToken;
    if (!RECAPTCHA_SECRET || !token) {
      console.error("❌ reCAPTCHA missing secret or token", {
        hasSecret: !!RECAPTCHA_SECRET,
        hasToken: !!token
      });
      return res.status(400).json({ error: "captcha verification failed" });
    }

    const params = new URLSearchParams();
    params.append("secret", RECAPTCHA_SECRET);
    params.append("response", token);

    const r = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });

    const data = await r.json();

    // 🔎 debug log
    console.log("🔍 reCAPTCHA verification response:", data);

    if (!data.success) {
      return res.status(400).json({
        error: "captcha verification failed",
        reason: data["error-codes"] || []
      });
    }

    return next();
  } catch (e) {
    console.error("❌ reCAPTCHA verify error:", e);
    return res.status(400).json({ error: "captcha verification failed" });
  }
}
