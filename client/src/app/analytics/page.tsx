"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ResponsiveContainer, AreaChart, Area, YAxis } from "recharts";
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
  attention_timeline: number[];
  final_state_counts: {
    attentive: number;
    distracted: number;
    side_convo: number;
    sleeping: number;
    yawning: number;
  };
}

/* ═══════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════ */

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
            attention_timeline: data.attention_timeline ?? [],
            final_state_counts: data.final_state_counts ?? {
              attentive: 0, distracted: 0, side_convo: 0, sleeping: 0, yawning: 0
            }
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
          {sessions.map((s) => {
            const isExpanded = expandedId === s.id;
            const chartData = s.attention_timeline.map((score, i) => ({ i, score }));
            
            return (
            <div key={s.id} style={{ display: "flex", flexDirection: "column", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", transition: "all 0.2s", boxShadow: isExpanded ? "0 4px 12px rgba(0,0,0,0.05)" : "0 1px 2px rgba(0,0,0,0.03)" }}>
              <div
                onClick={() => setExpandedId(isExpanded ? null : s.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 140px 120px 160px 32px",
                  gap: 16,
                  padding: "18px 24px",
                  cursor: "pointer",
                  alignItems: "center",
                  background: isExpanded ? "#f9fafb" : "#ffffff",
                }}
                onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = "#f9fafb"; }}
                onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = "#ffffff"; }}
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
                <ChevronRight size={16} style={{ color: "#d1d5db", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div style={{ padding: "24px", borderTop: "1px solid #e5e7eb", background: "#fafafa", display: "flex", gap: 32, flexWrap: "wrap" }}>
                  
                  {/* Left: Stats & Counts */}
                  <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div style={{ background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #e5e7eb" }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Average Score</p>
                        <p style={{ fontSize: 24, fontWeight: 800, color: scoreColorHex(s.average_score), margin: 0 }}>{s.average_score}%</p>
                      </div>
                      <div style={{ background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #e5e7eb" }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Peak Score</p>
                        <p style={{ fontSize: 24, fontWeight: 800, color: "#10b981", margin: 0 }}>{s.peak_score}%</p>
                      </div>
                    </div>

                    <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e5e7eb" }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", margin: "0 0 16px" }}>Engagement Breakdown</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 13, color: "#6b7280" }}>✅ Attentive</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{s.final_state_counts.attentive}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 13, color: "#6b7280" }}>😵 Distracted</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{s.final_state_counts.distracted}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 13, color: "#6b7280" }}>😴 Sleeping</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{s.final_state_counts.sleeping}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 13, color: "#6b7280" }}>🥱 Yawning</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{s.final_state_counts.yawning}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 13, color: "#6b7280" }}>💬 Side Convo</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{s.final_state_counts.side_convo}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Attention Timeline Chart */}
                  <div style={{ flex: "2 1 400px", background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e5e7eb", display: "flex", flexDirection: "column" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", margin: "0 0 16px" }}>Attention Timeline</p>
                    <div style={{ flex: 1, minHeight: 180, width: "100%" }}>
                      {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <YAxis domain={[0, 100]} hide />
                            <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" isAnimationActive={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 13 }}>
                          No timeline data available
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>
            );
          })}

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
