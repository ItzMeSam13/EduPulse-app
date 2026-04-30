"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/utils/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// ── Types ──────────────────────────────────────────────────────────
interface Metrics {
  class_score: number;
  class_state: string;
  students: number;
  attentive: number;
  distracted: number;
  head_down: number;
  sleeping: number;
  yawning: number;
  phone_detected: boolean;
  side_convo: boolean;
  distraction_pct: number;
  timestamp: number;
}

interface HistoryPoint {
  t: string;
  score: number;
  attentive: number;
  distracted: number;
  sleeping: number;
  yawning: number;
}

interface CopilotMsg {
  role: "user" | "copilot" | "nudge";
  content: string;
  time: string;
  trigger?: string;
}

const API = "http://localhost:8000";
const WS  = "ws://localhost:8000/ws/metrics";

const nowStr = () =>
  new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const scoreCol = (s: number) =>
  s >= 75 ? "#10b981" : s >= 50 ? "#f59e0b" : "#ef4444";

const scoreBg = (s: number) =>
  s >= 75 ? "#ecfdf5" : s >= 50 ? "#fffbeb" : "#fef2f2";

const scoreBorder = (s: number) =>
  s >= 75 ? "#6ee7b7" : s >= 50 ? "#fcd34d" : "#fca5a5";

const stateLabel = (s: number) =>
  s >= 75 ? "GOOD" : s >= 50 ? "MODERATE" : "LOW";

// ── Ring Gauge ─────────────────────────────────────────────────────
function RingGauge({ score, color }: { score: number; color: string }) {
  const r = 64;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={160} height={160}>
      <circle cx={80} cy={80} r={r} fill="none" stroke="#f1f5f9" strokeWidth={12} />
      <circle cx={80} cy={80} r={r} fill="none" stroke={color} strokeWidth={12}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 80 80)"
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1), stroke 0.4s" }}
      />
      <text x={80} y={74} textAnchor="middle" fill={color}
        fontSize={30} fontWeight={800} fontFamily="'DM Sans',sans-serif">
        {score}
      </text>
      <text x={80} y={92} textAnchor="middle" fill="#94a3b8"
        fontSize={10} fontFamily="'DM Sans',sans-serif" letterSpacing={2}>
        SCORE
      </text>
    </svg>
  );
}

// ── Sparkline ──────────────────────────────────────────────────────
function Spark({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <div style={{ height: 24 }} />;
  const w = 100, h = 24;
  const mn = Math.min(...data), mx = Math.max(...data);
  const rng = mx - mn || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - mn) / rng) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const last = data[data.length - 1];
  const lx = w;
  const ly = h - ((last - mn) / rng) * (h - 4) - 2;
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5}
        strokeLinejoin="round" strokeLinecap="round" opacity={0.7} />
      <circle cx={lx} cy={ly} r={2.5} fill={color} />
    </svg>
  );
}

// ── Timeline Chart ─────────────────────────────────────────────────
function TimelineChart({ history }: { history: HistoryPoint[] }) {
  const last = history.slice(-40);
  if (!last.length) return (
    <div style={{ height: 90, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "#cbd5e1", fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>
        Waiting for data…
      </span>
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 90 }}>
      {last.map((p, i) => {
        const col = scoreCol(p.score);
        const bg = scoreBg(p.score);
        return (
          <div key={i} title={`${p.t}: ${p.score}%`}
            style={{ flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
            <div style={{
              width: "100%", borderRadius: "3px 3px 0 0",
              background: col, opacity: 0.75,
              height: `${Math.max(p.score, 3)}%`,
              transition: "height 0.4s ease",
            }} />
            {i % 10 === 0 && (
              <span style={{ fontSize: 7, color: "#94a3b8",
                fontFamily: "'DM Sans',sans-serif", marginTop: 2, whiteSpace: "nowrap" }}>
                {p.t}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, spark, icon, bg }: {
  label: string; value: string | number; sub?: string;
  color: string; bg: string; spark?: number[]; icon: string;
}) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 16, padding: "20px 22px",
      display: "flex", flexDirection: "column", gap: 6,
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      transition: "box-shadow 0.2s, transform 0.2s",
      cursor: "default",
    }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "'DM Sans',sans-serif",
          letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>
          {label}
        </span>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: bg,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
          {icon}
        </div>
      </div>
      <span style={{ fontSize: 32, fontWeight: 800, color,
        fontFamily: "'DM Sans',sans-serif", lineHeight: 1.1 }}>
        {value}
      </span>
      {sub && <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'DM Sans',sans-serif" }}>{sub}</span>}
      {spark && spark.length > 1 && <Spark data={spark} color={color} />}
    </div>
  );
}

// ── Flag Card ──────────────────────────────────────────────────────
function FlagCard({ emoji, label, active, color, bg, border, value }: {
  emoji: string; label: string; active: boolean;
  color: string; bg: string; border: string; value: string;
}) {
  return (
    <div style={{
      background: active ? bg : "#fff",
      border: `1px solid ${active ? border : "#e2e8f0"}`,
      borderRadius: 14, padding: "14px 18px",
      display: "flex", alignItems: "center", gap: 12,
      transition: "all 0.3s",
      boxShadow: active ? `0 4px 16px ${color}22` : "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <span style={{ fontSize: 22 }}>{emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 9, color: "#94a3b8", fontFamily: "'DM Sans',sans-serif",
          letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: active ? color : "#cbd5e1",
          fontFamily: "'DM Sans',sans-serif" }}>{value}</div>
      </div>
      {active && (
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: color,
          boxShadow: `0 0 8px ${color}`, animation: "pulse 1.4s infinite" }} />
      )}
    </div>
  );
}

// ── Copilot Bubble ─────────────────────────────────────────────────
function CopilotBubble({ msg }: { msg: CopilotMsg }) {
  const isUser  = msg.role === "user";
  const isNudge = msg.role === "nudge";
  return (
    <div style={{
      display: "flex", flexDirection: isUser ? "row-reverse" : "row",
      gap: 8, alignItems: "flex-start", animation: "fadeUp 0.25s ease"
    }}>
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
          background: isNudge ? "#fef2f2" : "#f0f9ff",
          border: `1px solid ${isNudge ? "#fca5a5" : "#bae6fd"}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13
        }}>
          {isNudge ? "⚠️" : "🤖"}
        </div>
      )}
      <div style={{
        maxWidth: "80%",
        background: isUser ? "#10b981" : isNudge ? "#fef2f2" : "#f8fafc",
        border: `1px solid ${isUser ? "#10b981" : isNudge ? "#fecaca" : "#e2e8f0"}`,
        borderRadius: isUser ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
        padding: "10px 13px",
      }}>
        <p style={{
          fontSize: 12.5, lineHeight: 1.6, margin: 0,
          color: isUser ? "#fff" : isNudge ? "#991b1b" : "#334155",
          fontFamily: "'DM Sans',sans-serif",
        }}>{msg.content}</p>
        {msg.time && (
          <span style={{ fontSize: 9, color: isUser ? "rgba(255,255,255,0.8)" : "#94a3b8",
            fontFamily: "'DM Sans',sans-serif", marginTop: 4, display: "block" }}>
            {msg.time}
          </span>
        )}
      </div>
    </div>
  );
}

// ── MAIN ───────────────────────────────────────────────────────────
export default function EduPulseDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [source, setSource]         = useState<"video" | "webcam">("video");
  const [running, setRunning]       = useState(false);
  const [connected, setConnected]   = useState(false);
  const [metrics, setMetrics]       = useState<Metrics | null>(null);
  const [history, setHistory]       = useState<HistoryPoint[]>([]);
  const [elapsed, setElapsed]       = useState("00:00");
  const [sessionStart, setSessionStart] = useState<Date | null>(null);

  const [copilotOpen, setCopilotOpen]     = useState(false);
  const [copilotMsgs, setCopilotMsgs]     = useState<CopilotMsg[]>([
    { role: "copilot", content: "Hi! I'm EduPulse Copilot 👋  Start a session and I'll watch engagement in real time — I'll only alert you when something genuinely needs your attention.", time: "" }
  ]);
  const [copilotInput, setCopilotInput]   = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [isListening, setIsListening]     = useState(false);

  const wsRef          = useRef<WebSocket | null>(null);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatBottomRef  = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const lastAlertRef   = useRef<Record<string, number>>({});
  // Sustained-low tracking
  const lowSinceRef    = useRef<number | null>(null);

  // Set initial message timestamp client-side only (avoids hydration mismatch)
  useEffect(() => {
    setCopilotMsgs(msgs => msgs.map((m, i) => i === 0 ? { ...m, time: nowStr() } : m));
  }, []);

  const scoreHistory = history.map(h => h.score);
  const avgScore  = history.length ? Math.round(history.reduce((a, b) => a + b.score, 0) / history.length) : 0;
  const peakScore = history.length ? Math.max(...scoreHistory) : 0;
  const color     = metrics ? scoreCol(metrics.class_score) : "#94a3b8";
  const nudgeCount = copilotMsgs.filter(m => m.role === "nudge").length;

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [copilotMsgs]);

  // Timer
  useEffect(() => {
    if (running && sessionStart) {
      timerRef.current = setInterval(() => {
        const diff = Math.floor((Date.now() - sessionStart.getTime()) / 1000);
        setElapsed(`${String(Math.floor(diff / 60)).padStart(2, "0")}:${String(diff % 60).padStart(2, "0")}`);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running, sessionStart]);

  // ── Proactive alerts — batched, 2-min cooldown per trigger ────────
  const sendLiveAlert = useCallback(async (trigger: string, snap: Metrics, prev: Metrics | null) => {
    const now = Date.now();
    // 2-minute cooldown per trigger type — prevents spamming Gemini
    if ((now - (lastAlertRef.current[trigger] ?? 0)) < 120_000) return;
    lastAlertRef.current[trigger] = now;

    const triggerData: Record<string, any> = {
      change:    prev ? Math.abs(snap.class_score - prev.class_score) : 0,
      students:  snap.students,
      states:    [snap.sleeping > 0 ? "sleeping" : "", snap.distracted > 0 ? "distracted" : ""].filter(Boolean).join(", ") || "disengaged",
      attentive: snap.attentive,
      total:     snap.students,
      count:     snap.sleeping || snap.yawning || 1,
      prev:      prev?.class_score ?? snap.class_score,
      current:   snap.class_score,
    };

    setCopilotMsgs(m => [...m, {
      role: "nudge", content: "⏳ Analysing classroom…", time: nowStr(), trigger
    }]);

    try {
      const res = await fetch(`${API}/copilot/live/alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger, session_snapshot: snap, trigger_data: triggerData })
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const txt = decoder.decode(value);
        for (const line of txt.split("\n").filter(l => l.startsWith("data:"))) {
          const d = line.replace("data: ", "").trim();
          if (d === "[DONE]") break;
          try { full += JSON.parse(d).text; } catch {}
        }
      }
      setCopilotMsgs(m => [...m.slice(0, -1), { role: "nudge", content: full, time: nowStr(), trigger }]);
      if (!copilotOpen) setCopilotOpen(true);
    } catch {
      setCopilotMsgs(m => [...m.slice(0, -1), {
        role: "nudge", content: "Copilot API unreachable — check server.", time: nowStr()
      }]);
    }
  }, [copilotOpen]);

  const checkNudges = useCallback((cur: Metrics, prev: Metrics | null) => {
    if (cur.students < 1) return;

    // Sudden drop ≥ 20 points
    if (prev && (prev.class_score - cur.class_score) >= 20 && cur.students >= 2)
      return sendLiveAlert("sudden_drop", cur, prev);

    // Sleeping student appeared
    if (cur.sleeping > 0 && (!prev || prev.sleeping === 0))
      return sendLiveAlert("sleeping", cur, prev);

    // Phone detected
    if (cur.phone_detected && (!prev || !prev.phone_detected))
      return sendLiveAlert("phone", cur, prev);

    // 2+ yawning
    if (cur.yawning >= 2 && (!prev || prev.yawning < 2))
      return sendLiveAlert("yawning", cur, prev);

    // Side convo
    if (cur.side_convo && (!prev || !prev.side_convo))
      return sendLiveAlert("side_convo", cur, prev);

    // Recovery
    if (prev && prev.class_score < 50 && cur.class_score >= 65)
      return sendLiveAlert("recovery", cur, prev);

    // Sustained low — only fire after 90 continuous seconds below 50
    if (cur.class_score < 50) {
      if (!lowSinceRef.current) lowSinceRef.current = Date.now();
      else if (Date.now() - lowSinceRef.current > 90_000)
        sendLiveAlert("sustained_low", cur, prev);
    } else {
      lowSinceRef.current = null;
    }
  }, [sendLiveAlert]);

  // ── WebSocket ──────────────────────────────────────────────────────
  const connectWS = useCallback(() => {
    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(WS);
    wsRef.current = ws;
    ws.onopen  = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (e) => {
      try {
        const data: Metrics = JSON.parse(e.data);
        setMetrics(cur => { checkNudges(data, cur); return data; });
        setHistory(prev => {
          const d = new Date(data.timestamp * 1000);
          const t = `${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
          return [...prev, {
            t, score: data.class_score, attentive: data.attentive,
            distracted: data.distracted, sleeping: data.sleeping, yawning: data.yawning
          }].slice(-80);
        });
      } catch {}
    };
  }, [checkNudges]);

  // ── Session control ────────────────────────────────────────────────
  const handleStart = async () => {
    try {
      const res  = await fetch(`${API}/session/start?source=${source}`, { method: "POST" });
      const data = await res.json();
      if (data.status === "started" || data.status === "already_running") {
        setRunning(true); setSessionStart(new Date());
        setHistory([]); setMetrics(null); setElapsed("00:00");
        lowSinceRef.current = null;
        Object.keys(lastAlertRef.current).forEach(k => delete lastAlertRef.current[k]);
        connectWS();
        setCopilotMsgs(m => [...m, {
          role: "copilot",
          content: `Session started using ${source === "webcam" ? "📷 Webcam" : "🎬 Video File"}. I'll only alert you when something meaningful happens — no noise.`,
          time: nowStr()
        }]);
        setCopilotOpen(true);
      }
    } catch {
      alert("Cannot reach backend at localhost:8000 — make sure uvicorn is running.");
    }
  };

  const handleStop = async () => {
    try { await fetch(`${API}/session/stop`, { method: "POST" }); } catch {}
    setRunning(false);
    wsRef.current?.close();
    setConnected(false);
    lowSinceRef.current = null;
    setCopilotMsgs(m => [...m, {
      role: "copilot",
      content: `Session ended. Duration: ${elapsed} · Avg: ${avgScore}% · Peak: ${peakScore}%. Ask me anything about this session!`,
      time: nowStr()
    }]);

    // ── Save to Firestore ──
    try {
      const parts = elapsed.split(":");
      const duration_minutes = parseInt(parts[0]) + parseInt(parts[1])/60;
      
      await addDoc(collection(db, "sessions"), {
        teacher_uid: user?.uid ?? "UNKNOWN",
        subject: "General",
        date: serverTimestamp(),
        duration_minutes: Math.round(duration_minutes * 10) / 10,
        average_score: avgScore,
        peak_score: peakScore,
        final_state_counts: {
          attentive: metrics?.attentive ?? 0,
          distracted: metrics?.distracted ?? 0,
          sleeping: metrics?.sleeping ?? 0,
          yawning: metrics?.yawning ?? 0,
          side_convo: metrics?.side_convo ? 1 : 0,
        },
        attention_timeline: scoreHistory,
      });

      router.push("/dashboard");
    } catch (err) {
      console.error("Firebase save error:", err);
    }
  };

  // ── Chat ───────────────────────────────────────────────────────────
  const handleCopilotSend = async (msg?: string) => {
    const text = (msg ?? copilotInput).trim();
    if (!text || copilotLoading) return;
    setCopilotInput("");

    const sessionData = {
      duration: elapsed, avg_score: avgScore, peak_score: peakScore,
      peak_minute: 0,
      worst_score: history.length ? Math.min(...scoreHistory) : 0,
      worst_minute: 0,
      attentive_pct: metrics ? Math.round((metrics.attentive / Math.max(metrics.students, 1)) * 100) : 0,
      distracted_pct: metrics?.distraction_pct ?? 0,
      phone_count: 0, sleeping_count: metrics?.sleeping ?? 0,
      yawning_count: metrics?.yawning ?? 0, drop_events: 0,
      timeline: scoreHistory.slice(-30),
    };

    const history_msgs = copilotMsgs
      .filter(m => m.role === "user" || m.role === "copilot")
      .map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.content }));

    setCopilotMsgs(m => [
      ...m,
      { role: "user", content: text, time: nowStr() },
      { role: "copilot", content: "▋", time: nowStr() }
    ]);
    setCopilotLoading(true);

    try {
      const res = await fetch(`${API}/copilot/analytics/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, session_data: sessionData, history: history_msgs })
      });
      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const txt = decoder.decode(value);
        for (const line of txt.split("\n").filter(l => l.startsWith("data:"))) {
          const d = line.replace("data: ", "").trim();
          if (d === "[DONE]") break;
          try {
            full += JSON.parse(d).text;
            setCopilotMsgs(m => [...m.slice(0, -1), { role: "copilot", content: full + "▋", time: nowStr() }]);
          } catch {}
        }
      }
      setCopilotMsgs(m => [...m.slice(0, -1), { role: "copilot", content: full, time: nowStr() }]);
    } catch {
      setCopilotMsgs(m => [...m.slice(0, -1), { role: "copilot", content: "API error — check backend.", time: nowStr() }]);
    }
    setCopilotLoading(false);
  };

  // ── Voice ──────────────────────────────────────────────────────────
  const toggleVoice = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Speech recognition not supported. Use Chrome."); return;
    }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const SR  = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "en-US"; rec.continuous = false; rec.interimResults = false;
    rec.onresult = (e: any) => { setCopilotInput(e.results[0][0].transcript); setIsListening(false); };
    rec.onerror  = () => setIsListening(false);
    rec.onend    = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start(); setIsListening(true);
  };

  const chips = ["📊 Summarise session", "⚠️ Worst moments", "✅ What went well", "💡 Suggestions", "🔄 Improve next"];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #f8fafc; min-height: 100vh; font-family: 'DM Sans', sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }

        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(0.8)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }

        .card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
          transition: box-shadow 0.2s;
        }
        .card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }

        .btn-primary {
          background: #10b981;
          border: none; border-radius: 12px; padding: 11px 24px;
          color: #fff; font-weight: 700; font-size: 13px;
          font-family: 'DM Sans',sans-serif; cursor: pointer;
          transition: background 0.2s, transform 0.15s;
          letter-spacing: 0.01em;
          box-shadow: 0 4px 14px rgba(16,185,129,0.25);
        }
        .btn-primary:hover { background: #059669; transform: translateY(-1px); }

        .btn-danger {
          background: #fff;
          border: 1px solid #fca5a5; border-radius: 12px; padding: 11px 24px;
          color: #dc2626; font-weight: 700; font-size: 13px;
          font-family: 'DM Sans',sans-serif; cursor: pointer;
          transition: all 0.2s;
        }
        .btn-danger:hover { background: #fef2f2; transform: translateY(-1px); }

        .source-toggle {
          display: flex; align-items: center;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 10px; padding: 3px; gap: 2px;
        }
        .source-btn {
          border: none; border-radius: 8px; padding: 6px 14px;
          font-family: 'DM Sans',sans-serif; font-size: 12px; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .source-btn.active { background: #fff; color: #10b981; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
        .source-btn.inactive { background: transparent; color: #94a3b8; }

        .copilot-panel {
          position: fixed; right: 0; top: 0; bottom: 0;
          width: 360px; z-index: 100;
          background: #fff;
          border-left: 1px solid #e2e8f0;
          box-shadow: -4px 0 24px rgba(0,0,0,0.06);
          display: flex; flex-direction: column;
          transform: translateX(100%);
          transition: transform 0.3s cubic-bezier(.4,0,.2,1);
        }
        .copilot-panel.open {
          transform: translateX(0);
          animation: slideIn 0.3s cubic-bezier(.4,0,.2,1);
        }

        .chip {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 999px; padding: 5px 12px;
          color: #475569; font-size: 11px; font-weight: 600;
          font-family: 'DM Sans',sans-serif;
          cursor: pointer; white-space: nowrap;
          transition: all 0.15s;
        }
        .chip:hover { background: #e2e8f0; color: #1e293b; }
        .chip:disabled { opacity: 0.4; cursor: default; }

        .voice-btn {
          width: 34px; height: 34px; border-radius: 50%; border: 1px solid #e2e8f0;
          background: #f8fafc; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; transition: all 0.2s; flex-shrink: 0;
        }
        .voice-btn.listening { background: #fef2f2; border-color: #fca5a5; animation: pulse 1s infinite; }
        .voice-btn:hover { background: #f1f5f9; }

        .badge-online {
          display: flex; align-items: center; gap: 6px;
          background: #f0fdf4; border: 1px solid #bbf7d0;
          border-radius: 999px; padding: 4px 10px;
        }
        .badge-offline {
          display: flex; align-items: center; gap: 6px;
          background: #f8fafc; border: 1px solid #e2e8f0;
          border-radius: 999px; padding: 4px 10px;
        }
      `}</style>

      {/* ── PAGE BG ─────────────────────────────────────────────── */}
      <div style={{ minHeight: "100vh", background: "#f8fafc" }}>

        {/* ── NAVBAR ──────────────────────────────────────────────── */}
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 32px",
          background: "#fff",
          borderBottom: "1px solid #e2e8f0",
          position: "sticky", top: 0, zIndex: 50,
          boxShadow: "0 1px 8px rgba(0,0,0,0.04)"
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "#10b981",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17
            }}>🎓</div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: 20,
                  fontWeight: 400, color: "#0f172a", letterSpacing: "-0.01em" }}>
                  EduPulse
                </span>
                <span style={{
                  background: "#f0fdf4", border: "1px solid #bbf7d0",
                  borderRadius: 5, padding: "1px 7px",
                  fontSize: 9, color: "#16a34a", fontWeight: 700, letterSpacing: "0.12em"
                }}>LIVE</span>
              </div>
              <p style={{ color: "#94a3b8", fontSize: 10, fontFamily: "'DM Sans',sans-serif", marginTop: 1 }}>
                AI Classroom Engagement System
              </p>
            </div>
          </div>

          {/* Center */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {!running && (
              <div className="source-toggle">
                <button className={`source-btn ${source === "video" ? "active" : "inactive"}`}
                  onClick={() => setSource("video")}>🎬 Video</button>
                <button className={`source-btn ${source === "webcam" ? "active" : "inactive"}`}
                  onClick={() => setSource("webcam")}>📷 Webcam</button>
              </div>
            )}
            {connected ? (
              <div className="badge-online">
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a",
                  animation: "pulse 2s infinite" }} />
                <span style={{ fontSize: 10, color: "#16a34a", fontWeight: 700, letterSpacing: "0.08em" }}>
                  STREAMING
                </span>
              </div>
            ) : (
              <div className="badge-offline">
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#cbd5e1" }} />
                <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, letterSpacing: "0.08em" }}>
                  OFFLINE
                </span>
              </div>
            )}
            {running && (
              <div style={{
                background: "#fffbeb", border: "1px solid #fcd34d",
                borderRadius: 8, padding: "4px 10px",
                fontSize: 12, color: "#92400e", fontWeight: 700
              }}>
                ⏱ {elapsed}
              </div>
            )}
          </div>

          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setCopilotOpen(o => !o)} style={{
              background: copilotOpen ? "#ecfdf5" : "#f8fafc",
              border: `1px solid ${copilotOpen ? "#a7f3d0" : "#e2e8f0"}`,
              borderRadius: 10, padding: "8px 16px",
              color: copilotOpen ? "#065f46" : "#64748b",
              fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans',sans-serif",
              cursor: "pointer", transition: "all 0.2s",
              display: "flex", alignItems: "center", gap: 6
            }}>
              🤖 Copilot
              {nudgeCount > 0 && (
                <span style={{
                  background: "#dc2626", color: "#fff", borderRadius: "50%",
                  width: 16, height: 16, fontSize: 9,
                  display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800
                }}>{nudgeCount}</span>
              )}
            </button>

            {!running
              ? <button className="btn-primary" onClick={handleStart}>▶ Start Session</button>
              : <button className="btn-danger" onClick={handleStop}>■ Stop Session</button>
            }
          </div>
        </header>

        {/* ── CONTENT ─────────────────────────────────────────────── */}
        <div style={{
          paddingRight: copilotOpen ? 360 : 0,
          transition: "padding-right 0.3s cubic-bezier(.4,0,.2,1)"
        }}>
          <main style={{ padding: "24px 32px 48px", maxWidth: 1380, margin: "0 auto" }}>

            {/* ── IDLE ───────────────────────────────────────────── */}
            {!running && !metrics && (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", minHeight: "65vh", gap: 24, textAlign: "center"
              }}>
                <div style={{
                  width: 80, height: 80, borderRadius: 22,
                  background: "#10b981",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36
                }}>🎓</div>

                <div>
                  <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 32,
                    color: "#0f172a", fontWeight: 400, marginBottom: 8 }}>
                    Ready to Monitor
                  </h2>
                  <p style={{ color: "#64748b", fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>
                    Select your source, then press Start Session
                  </p>
                </div>

                <div style={{ display: "flex", gap: 20 }}>
                  {[
                    { icon: "🎬", title: "Video File", desc: "Analyse classvideo.mp4", key: "video" as const },
                    { icon: "📷", title: "Webcam", desc: "Monitor live camera feed", key: "webcam" as const },
                  ].map(opt => (
                    <div key={opt.key} onClick={() => setSource(opt.key)} style={{
                      background: source === opt.key ? "#f0fdf4" : "#fff",
                      border: `1.5px solid ${source === opt.key ? "#6ee7b7" : "#e2e8f0"}`,
                      borderRadius: 18, padding: "28px 36px",
                      cursor: "pointer", transition: "all 0.2s",
                      textAlign: "center", minWidth: 170,
                      boxShadow: source === opt.key ? "0 0 0 3px #d1fae5" : "0 1px 4px rgba(0,0,0,0.04)"
                    }}>
                      <div style={{ fontSize: 34, marginBottom: 10 }}>{opt.icon}</div>
                      <div style={{ color: source === opt.key ? "#059669" : "#1e293b",
                        fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{opt.title}</div>
                      <div style={{ color: "#94a3b8", fontSize: 11 }}>{opt.desc}</div>
                    </div>
                  ))}
                </div>

                <button className="btn-primary" onClick={handleStart}
                  style={{ padding: "13px 36px", fontSize: 14 }}>
                  ▶ Start Session
                </button>
              </div>
            )}

            {/* ── LIVE DASHBOARD ──────────────────────────────────── */}
            {(running || metrics) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Row 1 — Ring + 4 stats */}
                <div style={{ display: "grid", gridTemplateColumns: "180px repeat(4,1fr)", gap: 14, alignItems: "stretch" }}>

                  {/* Ring card */}
                  <div className="card" style={{
                    padding: 20, display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 8,
                    borderColor: scoreBorder(metrics?.class_score ?? 0),
                    background: scoreBg(metrics?.class_score ?? 50),
                    transition: "all 0.5s"
                  }}>
                    <span style={{ fontSize: 9, color: "#94a3b8", letterSpacing: "0.14em",
                      textTransform: "uppercase", fontWeight: 700 }}>
                      CLASS ATTENTION
                    </span>
                    <RingGauge score={metrics?.class_score ?? 0} color={color} />
                    <span style={{
                      fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 800,
                      color, letterSpacing: "0.08em",
                      background: "#fff", borderRadius: 8, padding: "3px 10px",
                      border: `1px solid ${scoreBorder(metrics?.class_score ?? 0)}`
                    }}>
                      {stateLabel(metrics?.class_score ?? 0)}
                    </span>
                    <Spark data={scoreHistory.slice(-20)} color={color} />
                  </div>

                  <StatCard icon="👥" label="Students" value={metrics?.students ?? 0}
                    sub="detected in frame" color="#4f46e5" bg="#eef2ff"
                    spark={history.map(h => h.attentive + h.distracted + h.sleeping + h.yawning)} />
                  <StatCard icon="✅" label="Attentive" value={metrics?.attentive ?? 0}
                    sub={metrics ? `${Math.round((metrics.attentive / Math.max(metrics.students, 1)) * 100)}% of class` : "—"}
                    color="#10b981" bg="#ecfdf5"
                    spark={history.map(h => h.attentive)} />
                  <StatCard icon="😵" label="Distracted" value={metrics?.distracted ?? 0}
                    sub={metrics ? `${Math.round((metrics.distracted / Math.max(metrics.students, 1)) * 100)}% of class` : "—"}
                    color="#d97706" bg="#fffbeb"
                    spark={history.map(h => h.distracted)} />
                  <StatCard icon="📊" label="Session Avg" value={`${avgScore}%`}
                    sub={`Peak: ${peakScore}%`}
                    color={scoreCol(avgScore)} bg={scoreBg(avgScore)}
                    spark={scoreHistory} />
                </div>

                {/* Row 2 — Breakdown + Timeline */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: 14 }}>

                  {/* Breakdown */}
                  <div className="card" style={{ padding: 24 }}>
                    <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: "0.14em",
                      textTransform: "uppercase", fontWeight: 700, marginBottom: 16 }}>
                      STUDENT BREAKDOWN
                    </div>

                    {/* Stacked bar */}
                    <div style={{ display: "flex", height: 6, borderRadius: 999,
                      overflow: "hidden", gap: 1, marginBottom: 18 }}>
                      {[
                        { val: metrics?.attentive ?? 0, color: "#10b981" },
                        { val: metrics?.distracted ?? 0, color: "#d97706" },
                        { val: metrics?.head_down ?? 0, color: "#4f46e5" },
                        { val: metrics?.yawning ?? 0, color: "#ea580c" },
                        { val: metrics?.sleeping ?? 0, color: "#dc2626" },
                      ].map((s, i) => s.val > 0 && (
                        <div key={i} style={{
                          flex: s.val / Math.max(metrics?.students ?? 1, 1),
                          background: s.color,
                          transition: "flex 0.5s ease"
                        }} />
                      ))}
                    </div>

                    {[
                      { label: "Attentive", val: metrics?.attentive ?? 0, color: "#10b981", bg: "#ecfdf5", icon: "✅" },
                      { label: "Distracted", val: metrics?.distracted ?? 0, color: "#d97706", bg: "#fffbeb", icon: "😵" },
                      { label: "Head Down", val: metrics?.head_down ?? 0, color: "#4f46e5", bg: "#eef2ff", icon: "👇" },
                      { label: "Yawning", val: metrics?.yawning ?? 0, color: "#ea580c", bg: "#fff7ed", icon: "🥱" },
                      { label: "Sleeping", val: metrics?.sleeping ?? 0, color: "#dc2626", bg: "#fef2f2", icon: "😴" },
                    ].map(({ label, val, color: c, bg, icon }) => {
                      const pct = metrics && metrics.students > 0 ? (val / metrics.students) * 100 : 0;
                      return (
                        <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                          <span style={{ fontSize: 13 }}>{icon}</span>
                          <span style={{ width: 70, fontSize: 11, color: "#64748b", fontWeight: 500 }}>{label}</span>
                          <div style={{ flex: 1, height: 4, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: 999,
                              width: `${pct}%`, background: c,
                              transition: "width 0.5s ease"
                            }} />
                          </div>
                          <span style={{ width: 18, fontSize: 12, color: c, fontWeight: 800, textAlign: "right" }}>
                            {val}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Timeline */}
                  <div className="card" style={{ padding: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: 16 }}>
                      <span style={{ fontSize: 9, color: "#94a3b8", letterSpacing: "0.14em",
                        textTransform: "uppercase", fontWeight: 700 }}>
                        ATTENTION TIMELINE
                      </span>
                      <div style={{ display: "flex", gap: 14 }}>
                        {[["avg", avgScore + "%", scoreCol(avgScore)],
                          ["peak", peakScore + "%", "#d97706"],
                          ["pts", String(history.length), "#94a3b8"]
                        ].map(([k, v, c]) => (
                          <span key={k} style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>
                            {k} <span style={{ color: c, fontWeight: 700 }}>{v}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <TimelineChart history={history} />
                    <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                      {[["#10b981", "≥75% Good"], ["#d97706", "50–74% Moderate"], ["#dc2626", "<50% Low"]].map(([c, l]) => (
                        <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                          <span style={{ fontSize: 10, color: "#94a3b8" }}>{l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Row 3 — Flags + Summary */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 12 }}>
                  <FlagCard emoji="📱" label="PHONE USE"
                    active={metrics?.phone_detected ?? false}
                    color="#dc2626" bg="#fef2f2" border="#fca5a5"
                    value={metrics?.phone_detected ? "DETECTED" : "Clear"} />
                  <FlagCard emoji="💬" label="SIDE CONVO"
                    active={metrics?.side_convo ?? false}
                    color="#d97706" bg="#fffbeb" border="#fcd34d"
                    value={metrics?.side_convo ? "DETECTED" : "Clear"} />
                  <FlagCard emoji="😴" label="SLEEPING"
                    active={(metrics?.sleeping ?? 0) > 0}
                    color="#dc2626" bg="#fef2f2" border="#fca5a5"
                    value={(metrics?.sleeping ?? 0) > 0 ? `${metrics!.sleeping} student(s)` : "None"} />
                  <FlagCard emoji="🥱" label="YAWNING"
                    active={(metrics?.yawning ?? 0) >= 2}
                    color="#ea580c" bg="#fff7ed" border="#fdba74"
                    value={(metrics?.yawning ?? 0) > 0 ? `${metrics!.yawning} student(s)` : "None"} />

                  {/* Summary */}
                  <div className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 9 }}>
                    <span style={{ fontSize: 9, color: "#94a3b8", letterSpacing: "0.14em",
                      textTransform: "uppercase", fontWeight: 700 }}>SESSION SUMMARY</span>
                    {[
                      ["Duration", elapsed, "#1e293b"],
                      ["Avg Score", `${avgScore}%`, scoreCol(avgScore)],
                      ["Peak Score", `${peakScore}%`, "#d97706"],
                      ["Data Points", String(history.length), "#94a3b8"],
                      ["Source", source === "webcam" ? "📷 Webcam" : "🎬 Video", "#64748b"],
                    ].map(([k, v, c]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: "#94a3b8" }}>{k}</span>
                        <span style={{ fontSize: 11, color: c, fontWeight: 700 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ── COPILOT PANEL ───────────────────────────────────────────── */}
      <div className={`copilot-panel ${copilotOpen ? "open" : ""}`}>

        {/* Header */}
        <div style={{
          padding: "16px 18px",
          borderBottom: "1px solid #f1f5f9",
          display: "flex", alignItems: "center", gap: 10, flexShrink: 0
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "#ecfdf5", border: "1px solid #a7f3d0",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17
          }}>🤖</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 15,
              fontWeight: 400, color: "#0f172a" }}>
              EduPulse Copilot
            </div>
            <div style={{ fontSize: 10, color: running ? "#16a34a" : "#94a3b8" }}>
              {running ? "🔴 Monitoring live session" : "Ready to answer questions"}
            </div>
          </div>
          <button onClick={() => setCopilotOpen(false)} style={{
            background: "#f8fafc", border: "1px solid #e2e8f0",
            borderRadius: 8, width: 28, height: 28,
            cursor: "pointer", color: "#94a3b8", fontSize: 13,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>✕</button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "14px 14px 8px",
          display: "flex", flexDirection: "column", gap: 10
        }}>
          {copilotMsgs.map((msg, i) => <CopilotBubble key={i} msg={msg} />)}
          <div ref={chatBottomRef} />
        </div>

        {/* Chips */}
        <div style={{
          padding: "8px 14px",
          display: "flex", gap: 5, overflowX: "auto", flexShrink: 0,
          borderTop: "1px solid #f1f5f9"
        }}>
          {chips.map(chip => (
            <button key={chip} className="chip"
              onClick={() => handleCopilotSend(chip)}
              disabled={copilotLoading}>
              {chip}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: "10px 14px 18px", flexShrink: 0, borderTop: "1px solid #f1f5f9" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#f8fafc", border: "1px solid #e2e8f0",
            borderRadius: 12, padding: "7px 7px 7px 12px"
          }}>
            <input
              value={copilotInput}
              onChange={e => setCopilotInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleCopilotSend()}
              placeholder={running ? "Ask about live session…" : "Ask anything…"}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "#1e293b", fontSize: 13, fontFamily: "'DM Sans',sans-serif",
              }}
              disabled={copilotLoading}
            />
            <button className={`voice-btn ${isListening ? "listening" : ""}`}
              onClick={toggleVoice}
              title={isListening ? "Listening… click to stop" : "Click to speak"}>
              {isListening ? "🔴" : "🎙️"}
            </button>
            <button onClick={() => handleCopilotSend()}
              disabled={copilotLoading || !copilotInput.trim()}
              style={{
                background: copilotInput.trim() && !copilotLoading ? "#10b981" : "#f1f5f9",
                border: "none", borderRadius: 9, width: 32, height: 32,
                cursor: copilotInput.trim() ? "pointer" : "default",
                color: copilotInput.trim() ? "#fff" : "#94a3b8",
                fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s", flexShrink: 0
              }}>
              {copilotLoading ? "⏳" : "↑"}
            </button>
          </div>
          <p style={{ fontSize: 9, color: "#cbd5e1", marginTop: 6,
            textAlign: "center", fontFamily: "'DM Sans',sans-serif" }}>
            🎙 Voice · ⌨️ Type · Powered by Gemini via LangChain
          </p>
        </div>
      </div>
    </>
  );
}
