import { useState, useEffect } from "react";

export default function DevLoginModal({ onClose, onLogin }) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dots, setDots] = useState(30);

  // Countdown timer showing seconds until token expires
  useEffect(() => {
    const calc = () => 30 - (Math.floor(Date.now() / 1000) % 30);
    setDots(calc());
    const t = setInterval(() => setDots(calc()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = async () => {
    if (!token.trim())
      return setError("Enter the 6-digit code from Google Authenticator");
    const cleanToken = token.replace(/\D/g, "").trim();
    if (cleanToken.length !== 6)
      return setError("Code must be exactly 6 digits");

    setLoading(true);
    setError("");

    try {
      const result = await window.db.auth.verifyOtp(cleanToken);
      if (result.valid) {
        const loginResult = await window.db.auth.devAccess();
        if (loginResult.success) {
          onLogin(loginResult.user);
          onClose();
        } else {
          setError("Access denied");
        }
      } else {
        setError("Invalid or expired code. Check Google Authenticator.");
        setToken("");
      }
    } catch (e) {
      setError("Cannot reach server. Check internet connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 16,
          padding: "36px 40px",
          width: 360,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>
            Developer Access
          </div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
            Enter the 6-digit code from Google Authenticator
          </div>
        </div>

        {/* Timer */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 16,
            fontSize: 12,
            color: dots <= 5 ? "#e94560" : "#888",
          }}
        >
          Code expires in {dots}s
          <div
            style={{
              height: 3,
              background: "#f0f0f0",
              borderRadius: 99,
              marginTop: 6,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(dots / 30) * 100}%`,
                background: dots <= 5 ? "#e94560" : "#00d4aa",
                transition: "width 1s linear, background 0.3s",
              }}
            />
          </div>
        </div>

        {/* OTP Input */}
        <input
          autoFocus
          value={token}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 6);
            setToken(v);
            setError("");
            if (v.length === 6) {
              setTimeout(() => {
                const clean = v.replace(/\D/g, "").trim();
                if (clean.length === 6) {
                  setLoading(true);
                  window.db.auth
                    .verifyOtp(clean)
                    .then((result) => {
                      if (result.valid) {
                        window.db.auth.devAccess().then((loginResult) => {
                          if (loginResult.success) {
                            onLogin(loginResult.user);
                            onClose();
                          }
                        });
                      } else {
                        setError("Invalid or expired code.");
                        setToken("");
                        setLoading(false);
                      }
                    })
                    .catch(() => {
                      setError("Cannot reach server.");
                      setLoading(false);
                    });
                }
              }, 100);
            }
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="000000"
          maxLength={6}
          style={{
            width: "100%",
            padding: "14px",
            textAlign: "center",
            fontSize: 28,
            letterSpacing: 8,
            fontFamily: "monospace",
            fontWeight: 700,
            borderRadius: 10,
            border: `2px solid ${error ? "#e94560" : "#e0e0e0"}`,
            outline: "none",
            boxSizing: "border-box",
            background: error ? "#fff5f5" : "white",
          }}
        />

        {/* Auto submits when 6 digits entered */}
        <div
          style={{
            fontSize: 11,
            color: "#aaa",
            textAlign: "center",
            marginTop: 6,
          }}
        >
          Auto-submits when 6 digits entered
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: "#fff5f5",
              border: "1px solid #fcc",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: "#e94560",
              marginTop: 12,
              textAlign: "center",
            }}
          >
            ❌ {error}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px",
              background: "#f0f0f0",
              color: "#333",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || token.length !== 6}
            style={{
              flex: 2,
              padding: "10px",
              background: loading || token.length !== 6 ? "#ccc" : "#1a1a2e",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading || token.length !== 6 ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "⏳ Verifying..." : "🔐 Verify"}
          </button>
        </div>
      </div>
    </div>
  );
}
