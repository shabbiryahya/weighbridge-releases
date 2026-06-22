import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import LoginScreen from "./modules/auth/LoginScreen";
import WeighingScreen from "./modules/weighing/WeighingScreen";
import MastersScreen from "./modules/masters/MastersScreen";
import ReportsScreen from "./modules/reports/ReportsScreen";
import SettingsScreen from "./modules/settings/SettingsScreen";
import UsersScreen from "./modules/settings/UsersScreen";
import ChangePasswordModal from "./components/ChangePasswordModal";
import LicenseScreen from "./modules/auth/LicenseScreen";
import HelpScreen from "./modules/help/HelpScreen";
import { PlanProvider } from "./hooks/usePlan";
import { usePlan } from "./hooks/usePlan";
import AppTour from "./components/AppTour";

const NAV_ITEMS = [
  {
    id: "weighing",
    label: "Weighing",
    icon: "⚖️",
    roles: ["operator", "admin", "superadmin"],
  },
  {
    id: "masters",
    label: "Masters",
    icon: "📋",
    roles: ["admin", "superadmin"],
  },
  {
    id: "reports",
    label: "Reports",
    icon: "📊",
    roles: ["operator", "admin", "superadmin"],
  },
  {
    id: "settings",
    label: "Settings",
    icon: "⚙️",
    roles: ["admin", "superadmin"],
  },
  { id: "users", label: "Users", icon: "👥", roles: ["superadmin"] },
  {
    id: "help",
    label: "Help",
    icon: "❓",
    roles: ["operator", "admin", "superadmin"],
  },
];

const roleColors = {
  superadmin: "#9c27b0",
  admin: "#e94560",
  operator: "#00d4aa",
};

const roleIcon = (role) =>
  role === "superadmin" ? "👑" : role === "admin" ? "🔑" : "⚖️";

function AppContent() {
  const { user, logout } = useAuth();
  const [activePage, setActivePage] = useState("weighing");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [updateToast, setUpdateToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showTour, setShowTour] = useState(
    !localStorage.getItem("wb_tour_done"),
  );

  const { plan } = usePlan();
  const { can } = usePlan();

  const visibleNav = NAV_ITEMS.filter((n) => n.roles.includes(user.role));
  const currentPage = visibleNav.find((n) => n.id === activePage)
    ? activePage
    : visibleNav[0]?.id;

  useEffect(() => {
    window.db.update.onAvailable(() => {
      setUpdateToast({
        msg: "⬇️ New update downloading in background...",
        canInstall: false,
      });
    });
    window.db.update.onDownloaded(() => {
      setUpdateToast({ msg: "✅ Update ready!", canInstall: true });
    });
  }, []);

  useEffect(() => {
    if (!can("sync")) return; // only Pro/Enterprise plans sync

    const doSync = () => {
      window.db.sync.push().then((result) => {
        if (result.success && result.synced > 0) {
          console.log(`Synced ${result.synced} tickets`);
        }
      });
    };

    // Sync immediately on app start, then every 3 minutes
    doSync();
    const interval = setInterval(doSync, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [can]);

  useEffect(() => {
    if (!can('sync')) return

    const checkPlan = async () => {
      try {
        const currentPlan = await window.db.settings.get('license_plan')
        const result = await window.db.license.validate()
        if (result?.valid && result?.plan && result.plan !== currentPlan) {
          console.log(`Plan changed: ${currentPlan} → ${result.plan}`)
          await window.db.settings.update('license_plan', result.plan)
          window.location.reload()
        }
      } catch (e) {
        // Server unreachable — skip silently
      }
    }

    // Check immediately on mount, then every 5 minutes
    checkPlan()
    const interval = setInterval(checkPlan, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [can])

  const renderPage = () => {
    switch (currentPage) {
      case "weighing":
        return <WeighingScreen />;
      case "masters":
        return <MastersScreen />;
      case "reports":
        return <ReportsScreen />;
      case "settings":
        return <SettingsScreen />;
      case "users":
        return <UsersScreen />;
      case "help":
        return <HelpScreen />;
      default:
        return <WeighingScreen />;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "Arial, sans-serif",
        background: "#f0f0f0",
      }}
    >
      {showTour && <AppTour onComplete={() => setShowTour(false)} />}
      {updateToast && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            zIndex: 9999,
            background: "#1a1a2e",
            color: "white",
            padding: "14px 20px",
            borderRadius: 10,
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <span>{updateToast.msg}</span>
          {updateToast.canInstall && (
            <button
              onClick={() => window.db.update.install()}
              style={{
                background: "#e94560",
                color: "white",
                border: "none",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Restart & Install
            </button>
          )}
          <button
            onClick={() => setUpdateToast(null)}
            style={{
              background: "none",
              border: "none",
              color: "#888",
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>
      )}
      {/* ── Sidebar ── */}
      <div
        style={{
          width: sidebarOpen ? 200 : 60,
          minWidth: sidebarOpen ? 200 : 60,
          background: "#1a1a2e",
          color: "white",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.2s ease",
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: "14px 12px",
            borderBottom: "1px solid #333",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {sidebarOpen && (
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 10,
                  color: "#888",
                  letterSpacing: 1,
                }}
              >
                WEIGHBRIDGE
              </p>
              <h2 style={{ margin: "3px 0 0", fontSize: 15, fontWeight: 700 }}>
                Management
              </h2>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            style={{
              background: "none",
              border: "none",
              color: "#888",
              cursor: "pointer",
              fontSize: 18,
              padding: "4px",
              marginLeft: sidebarOpen ? 0 : "auto",
              marginRight: sidebarOpen ? 0 : "auto",
            }}
            title={sidebarOpen ? "Collapse menu" : "Expand menu"}
          >
            {sidebarOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, paddingTop: 8 }}>
          {visibleNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              title={item.label}
              style={{
                width: "100%",
                background: currentPage === item.id ? "#16213e" : "transparent",
                color: currentPage === item.id ? "#e94560" : "#ccc",
                border: "none",
                padding: sidebarOpen ? "11px 20px" : "11px 0",
                textAlign: sidebarOpen ? "left" : "center",
                cursor: "pointer",
                fontSize: sidebarOpen ? 14 : 20,
                borderLeft:
                  currentPage === item.id
                    ? "3px solid #e94560"
                    : "3px solid transparent",
                transition: "all 0.2s",
              }}
            >
              {item.icon}
              {sidebarOpen ? ` ${item.label}` : ""}
            </button>
          ))}
        </nav>

        {/* ── User section (SINGLE block) ── */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #333" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
              justifyContent: sidebarOpen ? "flex-start" : "center",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: roleColors[user.role] + "30",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {roleIcon(user.role)}
            </div>
            {sidebarOpen && (
              <div style={{ overflow: "hidden" }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "white",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user.full_name || user.username}
                </div>
                <div style={{ fontSize: 11, color: roleColors[user.role] }}>
                  {user.role}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    background:
                      plan === "enterprise"
                        ? "#9c27b0"
                        : plan === "pro"
                          ? "#2196f3"
                          : "#888",
                    color: "white",
                    padding: "2px 6px",
                    borderRadius: 99,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    marginTop: 2,
                    display: "inline-block",
                  }}
                >
                  {plan}
                </div>
              </div>
            )}
          </div>

          {sidebarOpen ? (
            <>
              <button
                onClick={() => setShowChangePassword(true)}
                style={{
                  width: "100%",
                  padding: "6px",
                  background: "transparent",
                  color: "#888",
                  border: "1px solid #333",
                  borderRadius: 6,
                  fontSize: 11,
                  cursor: "pointer",
                  marginBottom: 6,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#16213e";
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#888";
                }}
              >
                🔑 Change Password
              </button>
              <button
                onClick={logout}
                style={{
                  width: "100%",
                  padding: "7px",
                  background: "transparent",
                  color: "#888",
                  border: "1px solid #333",
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#e94560";
                  e.currentTarget.style.color = "white";
                  e.currentTarget.style.borderColor = "#e94560";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#888";
                  e.currentTarget.style.borderColor = "#333";
                }}
              >
                🚪 Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={logout}
              title="Sign Out"
              style={{
                width: "100%",
                padding: "7px",
                background: "transparent",
                color: "#888",
                border: "none",
                fontSize: 18,
                cursor: "pointer",
              }}
            >
              🚪
            </button>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            background: "white",
            padding: "14px 24px",
            borderBottom: "1px solid #e0e0e0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 18,
              color: "#1a1a2e",
              fontWeight: 700,
            }}
          >
            {visibleNav.find((i) => i.id === currentPage)?.icon}{" "}
            {visibleNav.find((i) => i.id === currentPage)?.label}
          </h1>
          <div style={{ fontSize: 13, color: "#888" }}>
            {new Date().toLocaleDateString("en-IN", {
              weekday: "short",
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
          {renderPage()}
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal
          onClose={(changed) => {
            setShowChangePassword(false);
            if (changed) logout();
          }}
        />
      )}
    </div>
  );
}

function AppInner() {
  const { user, login } = useAuth();
  const [licensed, setLicensed] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    window.db.session.get().then((restoredUser) => {
      if (restoredUser) login(restoredUser);
      setSessionChecked(true);
    });
  }, []);

  if (!licensed) return <LicenseScreen onActivated={() => setLicensed(true)} />;
  if (!sessionChecked) return null;
  if (!user) return <LoginScreen onLogin={login} />;
  return <AppContent />;
}

export default function App() {
  return (
    <AuthProvider>
      <PlanProvider>
        <AppInner />
      </PlanProvider>
    </AuthProvider>
  );
}
