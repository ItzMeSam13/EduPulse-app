"use client";

import { usePathname } from "next/navigation";
import NavBar from "@/components/NavBar";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { userData } = useAuth();

  // Don't wrap the live dashboard in the shell
  if (pathname === "/dashboard/live") {
    return <>{children}</>;
  }

  // Derive title from pathname
  let pageTitle = "Dashboard";
  if (pathname.startsWith("/analytics")) pageTitle = "Analytics";
  else if (pathname.startsWith("/students")) pageTitle = "Students";
  else if (pathname.startsWith("/settings")) pageTitle = "Settings";

  const initials =
    userData?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "'Inter', sans-serif",
        background: "#f9fafb",
        color: "#111827",
      }}
    >
      {/* ── SIDEBAR ─────────────────────────────── */}
      <NavBar userName={userData?.full_name} teacherId={userData?.teacher_id} />

      {/* ── MAIN CONTENT AREA ───────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        
        {/* ── TOP HEADER ──────────────────────── */}
        <header
          style={{
            height: 72,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 44px",
            background: "#ffffff",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#111827",
              fontFamily: "'Outfit', sans-serif",
              margin: 0,
            }}
          >
            {pageTitle}
          </h2>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {userData?.department && (
              <span
                style={{
                  padding: "6px 12px",
                  background: "#f3f4f6",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#6b7280",
                }}
              >
                {userData.department}
              </span>
            )}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#10b981",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* ── PAGE CONTENT ────────────────────── */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "36px 44px",
            background: "#f9fafb",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
