import { useState, useEffect } from "react";
import DevLoginModal from "./DevLoginModal";

export default function LoginScreen({ onLogin }) {
  const [mode,     setMode]     = useState("pin");
  const [pin,      setPin]      = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [attempts, setAttempts] = useState(0);
  const [showDev,  setShowDev]  = useState(false);

  const MAX_ATTEMPTS = 5;

  // ── Ctrl+Shift+D → dev login + keyboard PIN input
  useEffect(() => {
    const keys = new Set();

    const onDown = (e) => {
      keys.add(e.key);

      // Developer shortcut
      if (keys.has("Control") && keys.has("Shift") && keys.has("D")) {
        e.preventDefault();
        setShowDev(true);
        return;
      }

      // Keyboard PIN input — only in PIN mode
      if (mode !== "pin") return;
      if (attempts >= MAX_ATTEMPTS) return;

      // Number keys (top row + numpad)
      if (/^[0-9]$/.test(e.key)) {
        handlePinPress(e.key);
      }

      // Backspace to delete last digit
      if (e.key === "Backspace") {
        setPin((p) => { setError(""); return p.slice(0, -1); });
      }
    };

    const onUp = (e) => keys.delete(e.key);

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup",   onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup",   onUp);
    };
  }, [mode, attempts]);

  // ── PIN press (button or keyboard)
  const handlePinPress = (digit) => {
    if (attempts >= MAX_ATTEMPTS) return;
    setPin((prev) => {
      if (prev.length >= 4) return prev;
      const newPin = prev + digit;
      setError("");
      // Auto submit when 4 digits entered
      if (newPin.length === 4) {
        setTimeout(() => submitPin(newPin), 100);
      }
      return newPin;
    });
  };

  const submitPin = async (p) => {
    setLoading(true);
    try {
      const result = await window.db.auth.loginPin(p);
      if (result.success) {
        // Block superadmin from PIN login
        if (result.user.role === "superadmin") {
          setPin("");
          setError("Use developer access for this account");
          return;
        }
        onLogin(result.user);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin("");
        if (newAttempts >= MAX_ATTEMPTS) {
          setError("Too many attempts. Please use username & password.");
          setMode("password");
        } else {
          setError(`Invalid PIN. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const submitPassword = async () => {
    if (!username.trim() || !password.trim()) {
      return setError("Please enter username and password");
    }
    setLoading(true);
    try {
      const result = await window.db.auth.login(username, password);
      if (result.success) {
        if (result.user.role === "superadmin") {
          setError("This account requires developer access (Ctrl+Shift+D)");
          return;
        }
        setAttempts(0);
        onLogin(result.user);
      } else {
        setAttempts((a) => a + 1);
        setError(result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showDev && (
        <DevLoginModal
          onLogin={(user) => { onLogin(user); setShowDev(false); }}
          onClose={() => setShowDev(false)}
        />
      )}

      <div style={{
        height: "100vh", display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        fontFamily: "Arial, sans-serif",
      }}>
        <div style={{
          width: 380, background: "white",
          borderRadius: 16, overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}>

          {/* Header */}
          <div style={{
            background: "#1a1a2e", padding: "28px 32px", textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>⚖️</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "white", marginBottom: 4 }}>
              Weighbridge Management
            </div>
            <div style={{ fontSize: 13, color: "#888" }}>Sign in to continue</div>
          </div>

          {/* Mode toggle */}
          <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0" }}>
            {[
              { id: "pin",      label: "🔢 PIN Login"      },
              { id: "password", label: "🔐 Password Login" },
            ].map((m) => (
              <button key={m.id}
                onClick={() => { setMode(m.id); setError(""); setPin(""); }}
                style={{
                  flex: 1, padding: "12px", border: "none", fontSize: 13,
                  fontWeight:   mode === m.id ? 700 : 400,
                  background:   "white",
                  borderBottom: mode === m.id ? "3px solid #e94560" : "3px solid transparent",
                  color:        mode === m.id ? "#e94560" : "#888",
                  cursor:       "pointer", transition: "all 0.2s",
                }}>
                {m.label}
              </button>
            ))}
          </div>

          <div style={{ padding: "28px 32px" }}>

            {/* Error */}
            {error && (
              <div style={{
                background: "#fff0f0", border: "1px solid #fcc",
                borderRadius: 8, padding: "10px 14px",
                fontSize: 13, color: "#cc2244",
                marginBottom: 16, textAlign: "center",
              }}>
                ❌ {error}
              </div>
            )}

            {/* ── PIN Mode ── */}
            {mode === "pin" && (
              <div>
                {/* PIN dots */}
                <div style={{
                  display: "flex", justifyContent: "center",
                  gap: 16, marginBottom: 24,
                }}>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} style={{
                      width: 18, height: 18, borderRadius: "50%",
                      background: pin.length > i ? "#e94560" : "#e0e0e0",
                      transition: "background 0.15s",
                      transform: pin.length === i + 1 ? "scale(1.2)" : "scale(1)",
                    }} />
                  ))}
                </div>

                {/* Numpad */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                }}>
                  {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d, i) => (
                    <button key={i}
                      onClick={() => {
                        if (d === "⌫") {
                          setPin((p) => { setError(""); return p.slice(0, -1); });
                        } else if (d !== "") {
                          handlePinPress(String(d));
                        }
                      }}
                      disabled={loading || d === ""}
                      style={{
                        padding: "16px", borderRadius: 10,
                        border: "1.5px solid #e0e0e0",
                        background: d === "" ? "transparent" : "white",
                        fontSize: d === "⌫" ? 20 : 22,
                        fontWeight: 600, color: "#1a1a2e",
                        cursor: d === "" ? "default" : "pointer",
                        opacity: loading ? 0.5 : 1,
                        transition: "all 0.1s",
                        userSelect: "none",
                      }}
                      onMouseDown={(e) => {
                        if (d !== "") e.currentTarget.style.background = "#f0f0f0";
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.background = d === "" ? "transparent" : "white";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = d === "" ? "transparent" : "white";
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>

                {/* Keyboard hint */}
                <div style={{
                  marginTop: 14, fontSize: 12,
                  color: "#aaa", textAlign: "center",
                }}>
                  Enter 4-digit PIN · Use screen buttons or keyboard
                </div>
              </div>
            )}

            {/* ── Password Mode ── */}
            {mode === "password" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{
                    fontSize: 12, color: "#666",
                    marginBottom: 4, display: "block", fontWeight: 500,
                  }}>
                    Username
                  </label>
                  <input
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && submitPassword()}
                    placeholder="Enter username"
                    autoFocus
                    style={{
                      width: "100%", padding: "10px 14px",
                      borderRadius: 8, border: "1.5px solid #e0e0e0",
                      fontSize: 14, outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label style={{
                    fontSize: 12, color: "#666",
                    marginBottom: 4, display: "block", fontWeight: 500,
                  }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && submitPassword()}
                    placeholder="Enter password"
                    style={{
                      width: "100%", padding: "10px 14px",
                      borderRadius: 8, border: "1.5px solid #e0e0e0",
                      fontSize: 14, outline: "none",
                    }}
                  />
                </div>
                <button onClick={submitPassword} disabled={loading} style={{
                  width: "100%", padding: "12px",
                  background: loading ? "#ccc" : "#e94560",
                  color: "white", border: "none",
                  borderRadius: 8, fontSize: 15,
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  marginTop: 4,
                }}>
                  {loading ? "Signing in..." : "Sign In →"}
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}