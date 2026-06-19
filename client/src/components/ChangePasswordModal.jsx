import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function ChangePasswordModal({ targetUser, onClose }) {
  const { user: currentUser } = useAuth();
  const isSelf     = !targetUser || targetUser.id === currentUser.id;
  const isAdminReset = !isSelf;  // admin resetting someone else

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPin,          setNewPin]          = useState("");
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState("");
  const [success,         setSuccess]         = useState(false);

  const validate = () => {
    if (isSelf && !currentPassword) return "Enter your current password";
    if (!newPassword)               return "Enter a new password";
    if (newPassword.length < 6)     return "Password must be at least 6 characters";
    if (newPassword !== confirmPassword) return "Passwords do not match";
    if (newPin && !/^\d{4}$/.test(newPin)) return "PIN must be exactly 4 digits";
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) return setError(err);

    setLoading(true);
    setError("");
    try {
      let result;
      if (isAdminReset) {
        // Admin resetting another user
        result = await window.db.auth.resetPassword(
          targetUser.id, newPassword, newPin || targetUser.pin
        );
      } else {
        // User changing own password
        result = await window.db.auth.changePassword(
          currentUser.id, currentPassword, newPassword, newPin
        );
      }

      if (result.success) {
        setSuccess(true);
        setTimeout(() => onClose(true), 1500);
      } else {
        setError(result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 9999,
    }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose(false); }}>

      <div style={{
        background: "white", borderRadius: 14,
        width: 400, overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>

        {/* Header */}
        <div style={{
          background: "#1a1a2e", padding: "18px 24px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "white" }}>
              🔑 {isAdminReset ? `Reset Password — ${targetUser.full_name || targetUser.username}` : "Change My Password"}
            </div>
            {isAdminReset && (
              <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                Admin reset — current password not required
              </div>
            )}
          </div>
          <button onClick={() => onClose(false)} style={{
            background: "transparent", border: "none",
            color: "#888", fontSize: 18, cursor: "pointer",
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px" }}>

          {/* Success */}
          {success && (
            <div style={{
              background: "#f0fdf9", border: "1px solid #00d4aa",
              borderRadius: 8, padding: "14px",
              fontSize: 14, color: "#00a37a",
              textAlign: "center", marginBottom: 16,
            }}>
              ✅ Password changed successfully!
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              background: "#fff0f0", border: "1px solid #fcc",
              borderRadius: 8, padding: "10px 14px",
              fontSize: 13, color: "#cc2244", marginBottom: 16,
            }}>
              ❌ {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Current password — only for self */}
            {isSelf && (
              <div>
                <label style={{
                  fontSize: 12, color: "#666",
                  marginBottom: 4, display: "block", fontWeight: 500,
                }}>
                  Current Password *
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setError(""); }}
                  placeholder="Enter current password"
                  style={{
                    width: "100%", padding: "9px 12px",
                    borderRadius: 6, border: "1.5px solid #e0e0e0",
                    fontSize: 14, outline: "none",
                  }}
                />
              </div>
            )}

            {/* New password */}
            <div>
              <label style={{
                fontSize: 12, color: "#666",
                marginBottom: 4, display: "block", fontWeight: 500,
              }}>
                New Password * (min 6 characters)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                placeholder="Enter new password"
                style={{
                  width: "100%", padding: "9px 12px",
                  borderRadius: 6, border: "1.5px solid #e0e0e0",
                  fontSize: 14, outline: "none",
                }}
              />
            </div>

            {/* Confirm password */}
            <div>
              <label style={{
                fontSize: 12, color: "#666",
                marginBottom: 4, display: "block", fontWeight: 500,
              }}>
                Confirm New Password *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                placeholder="Re-enter new password"
                style={{
                  width: "100%", padding: "9px 12px",
                  borderRadius: 6,
                  border: `1.5px solid ${
                    confirmPassword && confirmPassword !== newPassword
                      ? "#e94560" : "#e0e0e0"
                  }`,
                  fontSize: 14, outline: "none",
                }}
              />
              {confirmPassword && confirmPassword !== newPassword && (
                <p style={{ fontSize: 11, color: "#e94560", marginTop: 3 }}>
                  Passwords do not match
                </p>
              )}
            </div>

            {/* New PIN */}
            <div>
              <label style={{
                fontSize: 12, color: "#666",
                marginBottom: 4, display: "block", fontWeight: 500,
              }}>
                New PIN (4 digits) — leave blank to keep current
              </label>
              <input
                type="password"
                value={newPin}
                maxLength={4}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setNewPin(v);
                  setError("");
                }}
                placeholder="e.g. 1234"
                style={{
                  width: "100%", padding: "9px 12px",
                  borderRadius: 6, border: "1.5px solid #e0e0e0",
                  fontSize: 14, outline: "none",
                  fontFamily: "monospace", letterSpacing: 4,
                }}
              />
              {/* PIN strength dots */}
              {newPin && (
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  {[0,1,2,3].map((i) => (
                    <div key={i} style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: newPin.length > i ? "#e94560" : "#e0e0e0",
                      transition: "background 0.2s",
                    }} />
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={() => onClose(false)} style={{
              flex: 1, padding: "10px",
              background: "#f0f0f0", color: "#333",
              border: "none", borderRadius: 8,
              fontSize: 14, cursor: "pointer",
            }}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || success}
              style={{
                flex: 2, padding: "10px",
                background: loading || success ? "#ccc" : "#e94560",
                color: "white", border: "none",
                borderRadius: 8, fontSize: 14,
                fontWeight: 700,
                cursor: loading || success ? "not-allowed" : "pointer",
              }}>
              {loading ? "Saving..." : "🔑 Change Password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}