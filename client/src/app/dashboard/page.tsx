"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { db } from "@/utils/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  BarChart3,
  GraduationCap,
  TrendingUp,
  Clock,
  Play,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/* ════════════════════ types ════════════════════ */

interface SessionDoc {
  id: string;
  teacher_uid: string;
  subject: string;
  date: Date;
  duration_minutes: number;
  average_score: number;
  peak_score: number;
}

/* ════════════════ chart tooltip ════════════════ */

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>{payload[0].value}%</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════ */

export default function Dashboard() {
  const { user, userData } = useAuth();
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  /* ── fetch sessions once we have a uid ──────── */
  useEffect(() => {
    if (!user?.uid) return;

    (async () => {
      setSessionsLoading(true);
      try {
        const q = query(
          collection(db, "sessions"),
          where("teacher_uid", "==", user.uid),
        );
        const snap = await getDocs(q);
        const docs: SessionDoc[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            teacher_uid: data.teacher_uid,
            subject: data.subject ?? "General",
            date: data.date?.toDate?.() ?? new Date(),
            duration_minutes: data.duration_minutes ?? 0,
            average_score: data.average_score ?? 0,
            peak_score: data.peak_score ?? 0,
          };
        });
        docs.sort((a, b) => a.date.getTime() - b.date.getTime());
        setSessions(docs);
      } catch (err) {
        console.error("[Dashboard] Failed to fetch sessions:", err);
      } finally {
        setSessionsLoading(false);
      }
    })();
  }, [user?.uid]);

  /* ── computed KPIs ──────────────────────────── */
  const kpis = useMemo(() => {
    if (sessions.length === 0) return null;
    const totalClasses = sessions.length;
    const overallAvg =
      Math.round(
        (sessions.reduce((s, d) => s + d.average_score, 0) / totalClasses) * 10,
      ) / 10;
    const totalMinutes = Math.round(
      sessions.reduce((s, d) => s + d.duration_minutes, 0),
    );
    return { totalClasses, overallAvg, totalMinutes };
  }, [sessions]);

  /* ── chart data ─────────────────────────────── */
  const chartData = useMemo(
    () =>
      sessions.map((s) => ({
        label: s.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        score: s.average_score,
      })),
    [sessions],
  );

  /* ── derived ────────────────────────────────── */
  const firstName = userData?.full_name?.split(" ")[0] ?? "Teacher";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827", fontFamily: "'Outfit', sans-serif", textTransform: "none", letterSpacing: "-0.01em", lineHeight: 1.2, margin: 0 }}>
            {greeting}, {firstName} 👋
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", marginTop: 6, maxWidth: 520, lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>
            Track your classroom engagement, analyze attention trends, and review past lectures.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/dashboard/live"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", background: "#10b981", color: "#fff", borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 14px rgba(16,185,129,0.25)", transition: "all 0.2s" }}
          >
            <Play size={15} /> Launch Live Monitor
          </Link>
        </div>
      </div>

      {/* Content */}
      {sessionsLoading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
          <Loader2 style={{ width: 32, height: 32, color: "#10b981", animation: "spin 1s linear infinite" }} />
        </div>
      ) : sessions.length === 0 ? (
        /* ═══════════ ZERO STATE ═══════════ */
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "60px 20px" }}>
          <div style={{ width: 120, height: 120, borderRadius: 28, border: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 32 }}>
            <BarChart3 style={{ width: 56, height: 56, color: "#d1d5db" }} strokeWidth={1.2} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111827", fontFamily: "'Outfit', sans-serif", textTransform: "none", margin: "0 0 12px", letterSpacing: "-0.01em" }}>
            Your Analytics Hub is Waiting
          </h2>
          <p style={{ fontSize: 14, color: "#9ca3af", maxWidth: 420, lineHeight: 1.7, margin: "0 0 40px" }}>
            You haven&apos;t recorded any classes yet. Start a live session to begin generating engagement insights and AI recommendations.
          </p>
          <Link
            href="/dashboard/live"
            style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "16px 40px", background: "#10b981", color: "#ffffff", borderRadius: 16, fontSize: 17, fontWeight: 700, textDecoration: "none", boxShadow: "0 8px 24px rgba(16,185,129,0.25)", transition: "all 0.2s" }}
          >
            <Play size={22} /> Launch Live Monitor
          </Link>
        </div>
      ) : (
        /* ═══════════ ANALYTICS VIEW ═══════════ */
        <>
          {/* KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            <KpiCard icon={GraduationCap} label="Total Classes Conducted" value={String(kpis!.totalClasses)} color="#10b981" bg="#ecfdf5" />
            <KpiCard icon={TrendingUp} label="Overall Average Attention" value={`${kpis!.overallAvg}%`} color="#3b82f6" bg="#eff6ff" />
            <KpiCard icon={Clock} label="Total Minutes Taught" value={String(kpis!.totalMinutes)} color="#8b5cf6" bg="#f5f3ff" />
          </div>

          {/* Chart */}
          <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 28, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0, textTransform: "none" }}>Engagement History</h3>
                <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 4, margin: "4px 0 0" }}>Average attention scores across your recent sessions.</p>
              </div>
              <span style={{ padding: "6px 14px", background: "#f3f4f6", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "#6b7280" }}>
                {sessions.length} sessions
              </span>
            </div>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#e5e7eb" }} />
                  <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6, fill: "#10b981" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ══════════════════ KPI CARD ══════════════════ */

function KpiCard({ icon: Icon, label, value, color, bg }: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", transition: "box-shadow 0.2s" }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Icon size={22} style={{ color }} />
      </div>
      <p style={{ fontSize: 32, fontWeight: 800, color: "#111827", fontFamily: "'Outfit', sans-serif", textTransform: "none", lineHeight: 1, margin: 0 }}>{value}</p>
      <p style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 6, margin: "6px 0 0" }}>{label}</p>
    </div>
  );
}
