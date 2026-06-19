import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import ChangePasswordModal from "../../components/ChangePasswordModal";

const ROLES = [
  { value: "operator", label: "⚖️ Operator", color: "#00d4aa" },
  { value: "admin", label: "🔑 Admin", color: "#e94560" },
  { value: "superadmin", label: "👑 Super Admin", color: "#9c27b0" },
];

const S = {
  card: {
    background: "white",
    borderRadius: 10,
    padding: "20px 24px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#aaa",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    display: "block",
    fontWeight: 500,
  },
  input: {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 6,
    border: "1.5px solid #e0e0e0",
    fontSize: 14,
    outline: "none",
    background: "white",
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  select: {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 6,
    border: "1.5px solid #e0e0e0",
    fontSize: 14,
    outline: "none",
    background: "white",
    cursor: "pointer",
  },
};

export default function UsersScreen() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    password: "",
    pin: "",
    role: "operator",
  });
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showReset, setShowReset] = useState(null); // stores user to reset

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const data = await window.db.users.getAll();
    setUsers(data);
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (!form.username.trim()) return showToast("Username required", "error");
    if (!form.password.trim()) return showToast("Password required", "error");
    if (form.pin.length !== 4)
      return showToast("PIN must be exactly 4 digits", "error");
    if (!/^\d{4}$/.test(form.pin))
      return showToast("PIN must be 4 numbers only", "error");

    setSaving(true);
    try {
      let result;
      if (editing) {
        result = await window.db.users.update(editing, form);
      } else {
        result = await window.db.users.add(form);
      }
      if (result.success) {
        showToast(editing ? "User updated!" : "User added!");
        setForm({
          full_name: "",
          username: "",
          password: "",
          pin: "",
          role: "operator",
        });
        setEditing(null);
        loadUsers();
      } else {
        showToast(
          result.error?.includes("UNIQUE")
            ? "Username already exists!"
            : result.error,
          "error",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (u) => {
    setEditing(u.id);
    setForm({
      full_name: u.full_name || "",
      username: u.username,
      password: u.password || "",
      pin: u.pin || "",
      role: u.role,
      is_active: u.is_active,
    });
  };

  const handleDelete = async (u) => {
    if (u.id === currentUser?.id)
      return showToast("Cannot delete yourself!", "error");
    if (!window.confirm(`Delete user "${u.username}"?`)) return;
    await window.db.users.delete(u.id);
    showToast("User deleted");
    loadUsers();
  };

  const roleBadge = (role) => {
    const r = ROLES.find((x) => x.value === role);
    return (
      <span
        style={{
          background: (r?.color || "#888") + "20",
          color: r?.color || "#888",
          padding: "2px 10px",
          borderRadius: 99,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {r?.label || role}
      </span>
    );
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 9999,
            background: toast.type === "success" ? "#00d4aa" : "#e94560",
            color: "white",
            padding: "10px 20px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {toast.type === "success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      <div
        style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}
      >
        {/* Add / Edit Form */}
        <div style={S.card}>
          <div style={S.cardTitle}>
            {editing ? "Edit User" : "Add New User"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={S.label}>Full Name</label>
              <input
                style={S.input}
                placeholder="e.g. Rahul Patel"
                value={form.full_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, full_name: e.target.value }))
                }
              />
            </div>

            <div>
              <label style={S.label}>Username *</label>
              <input
                style={S.input}
                placeholder="e.g. rahul"
                value={form.username}
                disabled={!!editing}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    username: e.target.value.toLowerCase(),
                  }))
                }
              />
            </div>

            <div>
              <label style={S.label}>Password *</label>
              <input
                style={S.input}
                type="password"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
              />
            </div>

            <div>
              <label style={S.label}>PIN * (4 digits)</label>
              <input
                style={S.input}
                placeholder="e.g. 1234"
                maxLength={4}
                value={form.pin}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setForm((f) => ({ ...f, pin: v }));
                }}
              />
              <p style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>
                Used for quick PIN login
              </p>
            </div>

            <div>
              <label style={S.label}>Role *</label>
              <select
                style={S.select}
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value }))
                }
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {editing && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.is_active === 1 || form.is_active === true}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      is_active: e.target.checked ? 1 : 0,
                    }))
                  }
                  style={{ width: 16, height: 16 }}
                />
                <label style={{ fontSize: 13 }}>Active user</label>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              {editing && (
                <button
                  onClick={() => {
                    setEditing(null);
                    setForm({
                      full_name: "",
                      username: "",
                      password: "",
                      pin: "",
                      role: "operator",
                    });
                  }}
                  style={{
                    padding: "9px 16px",
                    borderRadius: 8,
                    border: "1.5px solid #e0e0e0",
                    background: "white",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: saving ? "#ccc" : "#e94560",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving..." : editing ? "Update User" : "+ Add User"}
              </button>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div style={S.card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div style={S.cardTitle}>{users.length} Users</div>
          </div>

          {users.length === 0 ? (
            <p style={{ color: "#ccc", textAlign: "center", padding: 40 }}>
              No users found
            </p>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: "1px solid #f5f5f5",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background:
                        ROLES.find((r) => r.value === u.role)?.color + "20" ||
                        "#f0f0f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                    }}
                  >
                    {ROLES.find((r) => r.value === u.role)?.label.split(" ")[0]}
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: "#1a1a2e",
                      }}
                    >
                      {u.full_name || u.username}
                      {u.id === currentUser?.id && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "#00d4aa",
                            marginLeft: 6,
                            fontWeight: 400,
                          }}
                        >
                          (you)
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>
                      @{u.username} · PIN: {u.pin || "—"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {roleBadge(u.role)}

                  {!u.is_active && (
                    <span
                      style={{
                        background: "#f5f5f5",
                        color: "#aaa",
                        padding: "2px 8px",
                        borderRadius: 99,
                        fontSize: 11,
                      }}
                    >
                      Inactive
                    </span>
                  )}

                  <button
                    onClick={() => handleEdit(u)}
                    style={{
                      background: "#f0f0f0",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: 6,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    ✏️ Edit
                  </button>

                  <button
                    onClick={() => setShowReset(u)}
                    style={{
                      background: "#f0f4ff",
                      color: "#2196f3",
                      border: "1px solid #bbdefb",
                      padding: "6px 12px",
                      borderRadius: 6,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    🔑 Reset
                  </button>

                  {u.role !== "superadmin" && u.id !== currentUser?.id && (
                    <button
                      onClick={() => handleDelete(u)}
                      style={{
                        background: "#fff0f0",
                        color: "#e94560",
                        border: "1px solid #fcc",
                        padding: "6px 12px",
                        borderRadius: 6,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Role permissions table */}
      <div style={S.card}>
        <div style={S.cardTitle}>Role Permissions</div>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead>
            <tr style={{ background: "#fafafa" }}>
              {["Feature", "⚖️ Operator", "🔑 Admin", "👑 Super Admin"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      borderBottom: "2px solid #f0f0f0",
                      color: "#888",
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {[
              ["Weighing", "✅", "✅", "✅"],
              ["Masters", "❌", "✅", "✅"],
              ["Reports", "✅ View", "✅ Full", "✅ Full"],
              ["Settings", "❌", "✅", "✅"],
              ["User Management", "❌", "❌", "✅"],
              ["Delete Tickets", "❌", "✅", "✅"],
              ["Reset Ticket No.", "❌", "❌", "✅"],
              ["Developer Info", "❌", "❌", "✅"],
            ].map(([feat, op, ad, sa], i) => (
              <tr
                key={feat}
                style={{ background: i % 2 === 0 ? "white" : "#fafafa" }}
              >
                <td
                  style={{
                    padding: "9px 12px",
                    fontWeight: 500,
                    color: "#333",
                  }}
                >
                  {feat}
                </td>
                <td
                  style={{
                    padding: "9px 12px",
                    color: op.includes("❌") ? "#ccc" : "#00a37a",
                  }}
                >
                  {op}
                </td>
                <td
                  style={{
                    padding: "9px 12px",
                    color: ad.includes("❌") ? "#ccc" : "#00a37a",
                  }}
                >
                  {ad}
                </td>
                <td
                  style={{
                    padding: "9px 12px",
                    color: sa.includes("❌") ? "#ccc" : "#00a37a",
                  }}
                >
                  {sa}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showReset && (
        <ChangePasswordModal
          targetUser={showReset}
          onClose={(changed) => {
            setShowReset(null);
            if (changed) showToast(`Password reset for ${showReset.username}`);
          }}
        />
      )}
    </div>
  );
}
