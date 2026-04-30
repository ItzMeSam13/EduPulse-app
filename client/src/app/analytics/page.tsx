"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/utils/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  Loader2,
  Calendar,
  Clock,
  TrendingUp,
  ChevronRight,
  FileBarChart,
  Play,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/* ════════════════════ types ════════════════════ */

interface SessionDoc {
  id: string;
  subject: string;
  date: Date;
  duration_minutes: number;
  average_score: number;
  peak_score: number;
}

/* ═══════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════ */

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  /* ── fetch sessions ──────────────────────────── */
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
            subject: data.subject ?? "General",
            date: data.date?.toDate?.() ?? new Date(),
            duration_minutes: data.duration_minutes ?? 0,
            average_score: data.average_score ?? 0,
            peak_score: data.peak_score ?? 0,
          };
        });
        // Sort by date descending (most recent first)
        docs.sort((a, b) => b.date.getTime() - a.date.getTime());
        setSessions(docs);
      } catch (err) {
        console.error("[Analytics] Failed to fetch sessions:", err);
      } finally {
        setSessionsLoading(false);
      }
    })();
  }, [user?.uid]);

  /* ── helpers ─────────────────────────────────── */
  function scoreColorHex(score: number) {
    if (score >= 70) return "#10b981";
    if (score >= 40) return "#f59e0b";
    return "#ef4444";
  }

  function scoreBgHex(score: number) {
    if (score >= 70) return "#ecfdf5";
    if (score >= 40) return "#fffbeb";
    return "#fef2f2";
  }

  function scoreLabel(score: number) {
    if (score >= 70) return "Good";
    if (score >= 40) return "Moderate";
    return "Low";
  }

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827", fontFamily: "'Outfit', sans-serif", textTransform: "none", letterSpacing: "-0.01em", lineHeight: 1.2, margin: 0 }}>
            Session History
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", marginTop: 6, maxWidth: 520, lineHeight: 1.6 }}>
            Browse past lectures, review engagement data, and dive into detailed analytics.
          </p>
        </div>
        <Link
          href="/dashboard/live"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", background: "#10b981", color: "#fff", borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 14px rgba(16,185,129,0.25)", transition: "all 0.2s" }}
        >
          <Play size={15} /> New Session
        </Link>
      </div>

      {/* Content */}
      {sessionsLoading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
          <Loader2 style={{ width: 32, height: 32, color: "#10b981", animation: "spin 1s linear infinite" }} />
        </div>
      ) : sessions.length === 0 ? (
        /* ═══════ ZERO STATE ═══════ */
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "60px 20px" }}>
          <div style={{ width: 120, height: 120, borderRadius: 28, border: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 32 }}>
            <FileBarChart style={{ width: 56, height: 56, color: "#d1d5db" }} strokeWidth={1.2} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111827", fontFamily: "'Outfit', sans-serif", textTransform: "none", margin: "0 0 12px" }}>
            No Sessions Yet
          </h2>
          <p style={{ fontSize: 14, color: "#9ca3af", maxWidth: 420, lineHeight: 1.7, margin: "0 0 40px" }}>
            Once you run your first live session, it will appear here with full analytics.
          </p>
          <Link
            href="/dashboard/live"
            style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "16px 40px", background: "#10b981", color: "#ffffff", borderRadius: 16, fontSize: 17, fontWeight: 700, textDecoration: "none", boxShadow: "0 8px 24px rgba(16,185,129,0.25)" }}
          >
            <Play size={22} /> Launch Live Monitor
          </Link>
        </div>
      ) : (
        /* ═══════ SESSION LIST ═══════ */
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 120px 160px 32px", gap: 16, padding: "0 24px 8px", alignItems: "center" }}>
            {["Session", "Date", "Duration", "Avg Attention", ""].map((h) => (
              <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {h}
              </span>
            ))}
          </div>

          {/* Session rows */}
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/analytics/${s.id}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 140px 120px 160px 32px",
                gap: 16,
                padding: "18px 24px",
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                textDecoration: "none",
                color: "inherit",
                alignItems: "center",
                transition: "all 0.15s",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f9fafb";
                e.currentTarget.style.borderColor = "#d1d5db";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#ffffff";
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.03)";
              }}
            >
              {/* Subject */}
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#1f2937", margin: 0 }}>{s.subject}</p>
                <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>Session ID: {s.id.slice(0, 8)}…</p>
              </div>

              {/* Date */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Calendar size={13} style={{ color: "#9ca3af", flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#6b7280" }}>
                  {s.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>

              {/* Duration */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Clock size={13} style={{ color: "#9ca3af", flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#6b7280" }}>
                  {s.duration_minutes} min
                </span>
              </div>

              {/* Avg Score */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <TrendingUp size={14} style={{ color: scoreColorHex(s.average_score), flexShrink: 0 }} />
                <div style={{ width: 60, height: 6, borderRadius: 99, background: "#f3f4f6", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 99, width: `${s.average_score}%`, background: scoreColorHex(s.average_score), transition: "width 0.3s" }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: scoreColorHex(s.average_score) }}>
                  {s.average_score}%
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: scoreBgHex(s.average_score), color: scoreColorHex(s.average_score) }}>
                  {scoreLabel(s.average_score)}
                </span>
              </div>

              {/* Chevron */}
              <ChevronRight size={16} style={{ color: "#d1d5db" }} />
            </Link>
          ))}

          {/* Summary footer */}
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 16 }}>
            <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>
              Showing {sessions.length} session{sessions.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
