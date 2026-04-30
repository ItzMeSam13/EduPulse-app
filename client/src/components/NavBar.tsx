"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { auth } from "@/utils/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Settings,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard",  icon: LayoutDashboard, label: "Dashboard",  section: "MAIN" },
  { href: "/analytics",  icon: BarChart3,       label: "Analytics",  section: "MAIN" },
  { href: "#",           icon: Users,           label: "Students",   section: "MANAGE" },
  { href: "#",           icon: Settings,        label: "Settings",   section: "MANAGE" },
];

interface NavBarProps {
  userName?: string;
  teacherId?: string;
}

export default function NavBar({ userName, teacherId }: NavBarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const initials =
    userName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch {
      router.push("/");
    }
  };

  return (
    <aside
      style={{
        width: 260,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #e5e7eb",
        background: "#ffffff",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Brand */}
      <div style={{ padding: "24px 24px 20px" }}>
        <Link href="/dashboard" style={{ textDecoration: "none" }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 900,
              fontFamily: "'Outfit', sans-serif",
              textTransform: "none",
              letterSpacing: "-0.02em",
              color: "#111827",
            }}
          >
            ⚡ <span style={{ color: "#10b981" }}>EduPulse</span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0 12px", overflowY: "auto" }}>
        {(["MAIN", "MANAGE"] as const).map((section) => (
          <div key={section}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "#9ca3af",
                padding: "20px 12px 8px",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {section}
            </p>
            {NAV_ITEMS.filter((n) => n.section === section).map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 500,
                    fontFamily: "'Inter', sans-serif",
                    textTransform: "none",
                    textDecoration: "none",
                    color: isActive ? "#059669" : "#6b7280",
                    background: isActive ? "#ecfdf5" : "transparent",
                    transition: "all 0.15s",
                  }}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Profile */}
      <div style={{ padding: 16, borderTop: "1px solid #f3f4f6" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#10b981",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#1f2937",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 150,
                textTransform: "none",
                fontFamily: "'Inter', sans-serif",
                margin: 0,
              }}
            >
              {userName ?? "Teacher"}
            </p>
            <p style={{ fontSize: 11, color: "#9ca3af", fontFamily: "'Inter', sans-serif", margin: 0 }}>
              {teacherId}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            padding: "8px 0",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            background: "transparent",
            fontSize: 12,
            fontWeight: 600,
            color: "#9ca3af",
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            textTransform: "none",
            transition: "all 0.15s",
          }}
        >
          <LogOut size={13} /> Log out
        </button>
      </div>
    </aside>
  );
}
