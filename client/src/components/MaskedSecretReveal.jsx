import { useState, useEffect } from "react";

const OTP_WINDOW_SECONDS = 30;
const REVEAL_SECONDS = 10;

function maskSecret(value) {
  if (!value) return "—";
  return `${value.slice(0, 7)}-****-****`;
}

export default function MaskedSecretReveal({ value, monoFontSize = 11 }) {
  const [revealing, setRevealing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [otpSeconds, setOtpSeconds] = useState(OTP_WINDOW_SECONDS);
  const [revealSeconds, setRevealSeconds] = useState(REVEAL_SECONDS);

  // Countdown while the OTP input is open — cancels entry if it expires
  useEffect(() => {
    if (!revealing) return;
    setOtpSeconds(OTP_WINDOW_SECONDS);
    const t = setInterval(() => {
      setOtpSeconds((s) => {
        if (s <= 1) {
          setRevealing(false);
          setOtp("");
          setError("");
          return OTP_WINDOW_SECONDS;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [revealing]);

  // Countdown while the value is revealed — auto re-masks when it hits 0
  useEffect(() => {
    if (!revealed) return;
    setRevealSeconds(REVEAL_SECONDS);
    const t = setInterval(() => {
      setRevealSeconds((s) => {
        if (s <= 1) {
          setRevealed(false);
          return REVEAL_SECONDS;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [revealed]);

  const verify = async (code) => {
    setVerifying(true);
    setError("");
    try {
      const result = await window.db.auth.verifyOtp(code);
      if (result.valid) {
        setRevealing(false);
        setOtp("");
        setRevealed(true);
      } else {
        setError("Invalid or expired code");
        setOtp("");
      }
    } catch (e) {
      setError("Cannot reach server");
      setOtp("");
    } finally {
      setVerifying(false);
    }
  };

  const handleOtpChange = (e) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(v);
    setError("");
    if (v.length === 6) verify(v);
  };

  if (revealed) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <code style={{ fontSize: monoFontSize }}>{value}</code>
        <span style={{ fontSize: 11, color: "#00a37a" }}>
          hides in {revealSeconds}s
        </span>
      </span>
    );
  }

  if (revealing) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <input
          autoFocus
          value={otp}
          onChange={handleOtpChange}
          placeholder="000000"
          maxLength={6}
          disabled={verifying}
          style={{
            width: 90,
            padding: "4px 8px",
            textAlign: "center",
            fontSize: 13,
            letterSpacing: 3,
            fontFamily: "monospace",
            fontWeight: 700,
            borderRadius: 6,
            border: `1.5px solid ${error ? "#e94560" : "#e0e0e0"}`,
            outline: "none",
            background: error ? "#fff5f5" : "white",
          }}
        />
        <span
          style={{
            fontSize: 11,
            color: otpSeconds <= 5 ? "#e94560" : "#aaa",
            minWidth: 24,
          }}
        >
          {verifying ? "⏳" : `${otpSeconds}s`}
        </span>
        {error && (
          <span style={{ fontSize: 11, color: "#e94560" }}>{error}</span>
        )}
        <button
          onClick={() => {
            setRevealing(false);
            setOtp("");
            setError("");
          }}
          title="Cancel"
          style={{
            background: "none",
            border: "none",
            color: "#aaa",
            fontSize: 12,
            cursor: "pointer",
            padding: 0,
          }}
        >
          ✕
        </button>
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <code style={{ fontSize: monoFontSize }}>{maskSecret(value)}</code>
      <button
        onClick={() => setRevealing(true)}
        style={{
          background: "none",
          border: "none",
          color: "#888",
          fontSize: 11,
          cursor: "pointer",
          padding: 0,
        }}
      >
        👁️ Show
      </button>
    </span>
  );
}
