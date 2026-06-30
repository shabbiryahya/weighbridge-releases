import { useState, useEffect } from "react";

export default function LicenseScreen({ onActivated }) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  // On mount — check if already licensed
  useEffect(() => {
    checkLicense();
  }, []);

  const checkLicense = async () => {
    setChecking(true);
    try {
      const result = await window.db.license.validate();
      if (result.valid) {
        onActivated(result);
      }
    } catch (e) {
      // No license yet
    } finally {
      setChecking(false);
    }
  };

  const handleActivate = async () => {
    if (!key.trim()) return setError("Please enter your license key");
    setLoading(true);
    setError("");
    try {
      const result = await window.db.license.activate(key.trim());

      if (result.valid) {
        onActivated(result);
      } else {
        // Show specific error based on reason
        if (result.reason === "License not found") {
          setError("Invalid license key. Please check and try again.");
        } else if (result.reason === "License expired") {
          setError("Your license has expired. Contact developer to renew.");
        } else if (result.reason === "License bound to different machine") {
          setError(
            "This license is already activated on another machine. Contact developer.",
          );
        } else if (result.reason === "server_error") {
          setError(
            "Cannot reach license server. Check your internet connection.",
          );
        } else if (result.error) {
          setError(result.error);
        } else {
          setError("Activation failed: " + (result.reason || "Unknown error"));
        }
      }
    } catch (e) {
      setError("Something went wrong: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (checking)
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f0f0f0",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", color: "#888" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚖️</div>
          <div>Checking license...</div>
        </div>
      </div>
    );

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f0f0f0",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 16,
          padding: "40px 48px",
          width: 420,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          textAlign: "center",
        }}
      >
        {/* Logo */}
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚖️</div>
        <h2 style={{ margin: "0 0 6px", color: "#1a1a2e", fontSize: 22 }}>
          Weighbridge Management
        </h2>
        <p style={{ margin: "0 0 32px", color: "#888", fontSize: 14 }}>
          Enter your license key to activate this software
        </p>

        {/* Key input */}
        <input
          value={key}
          onChange={(e) => {
            setKey(e.target.value.toUpperCase());
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && handleActivate()}
          placeholder="WB-XXXX-XXXX-XXXX"
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 8,
            fontSize: 15,
            border: `2px solid ${error ? "#e94560" : "#e0e0e0"}`,
            outline: "none",
            textAlign: "center",
            letterSpacing: 2,
            fontFamily: "monospace",
            boxSizing: "border-box",
            marginBottom: 12,
          }}
        />

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
              marginBottom: 16,
            }}
          >
            ❌ {error}
          </div>
        )}

        {/* Activate button */}
        <button
          onClick={handleActivate}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            background: loading ? "#ccc" : "#e94560",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            marginBottom: 24,
          }}
        >
          {loading ? "Activating..." : "🔑 Activate Software"}
        </button>

        {/* Developer contact */}
        <div
          style={{
            borderTop: "1px solid #f0f0f0",
            paddingTop: 20,
            fontSize: 12,
            color: "#aaa",
          }}
        >
          <div>Don't have a license key?</div>
          <div style={{ marginTop: 4, color: "#666" }}>
            Contact: <strong>Shabbir</strong> · +91 9574713452
          </div>
          <div style={{ color: "#666" }}>support@saifteq.com</div>
        </div>
      </div>
    </div>
  );
}
