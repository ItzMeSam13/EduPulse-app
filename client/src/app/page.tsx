'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { auth, googleProvider, db } from '@/utils/firebase'
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

const features = [
  { icon: '👁️', title: 'Attention Detection', desc: 'Track where student focus drifts in real-time using AI gaze analysis.' },
  { icon: '📊', title: 'Engagement Scoring', desc: 'Get a live score for every session so you know how your class is doing.' },
  { icon: '💡', title: 'Teaching Insights', desc: 'Receive AI-generated suggestions to improve delivery and attention.' },
  { icon: '🔒', title: 'Privacy First', desc: 'Zero personal data stored. All analysis happens locally and anonymously.' },
  { icon: '📈', title: 'Session Comparison', desc: 'Compare engagement across sessions to find what methods work best.' },
  { icon: '🎯', title: 'Smart Suggestions', desc: 'Get actionable tips based on patterns in your engagement data.' }
]

const stats = [
  { value: '94%', label: 'Engagement Accuracy' },
  { value: '3s', label: 'Detection Latency' },
  { value: '0', label: 'Personal IDs Stored' },
  { value: '12K+', label: 'Sessions Analyzed' },
]

const steps = [
  { num: '01', title: 'Sign in with Google', desc: 'One-click authentication. No passwords, no friction.' },
  { num: '02', title: 'Start a class session', desc: 'Choose your subject and begin recording engagement.' },
  { num: '03', title: 'Get real-time insights', desc: 'See exactly when and where attention drops off.' },
]

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u))
    return () => unsubscribe()
  }, [])

  const handleGoogleAuth = async () => {
    setLoading(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const u = result.user
      if (u) {
        const userDoc = await getDoc(doc(db, 'users', u.uid))
        if (userDoc.exists()) { router.push('/dashboard') }
        else { router.push('/onboarding') }
      }
    } catch (error: any) {
      console.error(error)
      alert(error.message || 'Authentication failed')
      setLoading(false)
    }
  }

  return (
    <div className="lp">
      {/* NAV */}
      <nav className="nav">
        <div className="nav-logo">⚡ Edu<span>Pulse</span></div>
        <div className="nav-links">
          <a href="#how">How It Works</a>
          <a href="#features">Features</a>
          <a href="#stats">Stats</a>
        </div>
        <div className="nav-right">
          {user ? (
            <Link href="/dashboard"><button className="nav-btn filled">Open Dashboard →</button></Link>
          ) : (
            <button className="nav-btn outline" onClick={handleGoogleAuth} disabled={loading}>
              {loading ? '...' : 'Sign In'}
            </button>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg"></div>
        <motion.div className="hero-content" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="hero-pill">
            <span className="pill-dot"></span>
            AI-POWERED CLASSROOM ANALYTICS
          </div>
          <h1>Know if your class is<br/><span>actually listening.</span></h1>
          <p>EduPulse uses AI to measure student engagement in real-time during classroom sessions — helping teachers adapt, improve, and connect.</p>
          <div className="hero-actions">
            <button className="cta-main" onClick={handleGoogleAuth} disabled={loading}>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" />
              {loading ? 'Connecting...' : 'Get Started Free'}
            </button>
            <a href="#how" className="cta-ghost">See how it works ↓</a>
          </div>
          <div className="hero-trust">
            <span>🔒 Privacy-first</span>
            <span>⚡ Real-time</span>
            <span>🎯 94% accuracy</span>
          </div>
        </motion.div>
      </section>

      {/* STATS */}
      <section className="stats" id="stats">
        {stats.map(s => (
          <div className="stat" key={s.label}>
            <div className="stat-val">{s.value}</div>
            <div className="stat-lbl">{s.label}</div>
          </div>
        ))}
      </section>

      {/* HOW IT WORKS */}
      <section className="how" id="how">
        <span className="sec-tag">HOW IT WORKS</span>
        <h2>Three steps to smarter teaching</h2>
        <div className="steps">
          {steps.map((s, i) => (
            <motion.div className="step-card" key={s.num} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <div className="step-num">{s.num}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="feats" id="features">
        <span className="sec-tag">CAPABILITIES</span>
        <h2>Everything a teacher needs</h2>
        <p className="feats-sub">Powerful tools built for the modern classroom experience</p>
        <div className="feat-grid">
          {features.map((f, i) => (
            <motion.div className="feat" key={f.title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
              <div className="feat-icon">{f.icon}</div>
              <div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="bottom-cta">
        <h2>Ready to transform your classroom?</h2>
        <p>Join thousands of educators already using EduPulse.</p>
        <button className="cta-main" onClick={handleGoogleAuth} disabled={loading}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" />
          {loading ? 'Connecting...' : 'Start Free — No Setup Required'}
        </button>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <span>⚡ EduPulse</span>
        <span>© 2026 · All rights reserved</span>
      </footer>

      <style jsx>{`
        .lp { background:#fff; color:#0f172a; font-family:'Inter',sans-serif; }

        /* NAV */
        .nav { display:flex; align-items:center; justify-content:space-between; padding:16px 48px; position:sticky; top:0; z-index:100; background:rgba(255,255,255,0.92); backdrop-filter:blur(10px); border-bottom:1px solid #f1f5f9; }
        .nav-logo { font-family:'Outfit',sans-serif; font-size:22px; font-weight:900; text-transform:uppercase; letter-spacing:-.5px; }
        .nav-logo span { color:#00B2FF; }
        .nav-links { display:flex; gap:24px; }
        .nav-links a { font-size:13px; font-weight:500; color:#64748b; text-decoration:none; transition:color .15s; }
        .nav-links a:hover { color:#0f172a; }
        .nav-btn { padding:9px 20px; border-radius:9px; font-size:13px; font-weight:600; font-family:inherit; cursor:pointer; transition:all .15s; }
        .nav-btn.outline { background:none; border:1.5px solid #e2e8f0; color:#334155; }
        .nav-btn.outline:hover { border-color:#00B2FF; color:#00B2FF; }
        .nav-btn.filled { background:#00B2FF; border:none; color:#fff; }

        /* HERO */
        .hero { position:relative; text-align:center; padding:80px 20px 60px; overflow:hidden; }
        .hero-bg { position:absolute; inset:0; background:radial-gradient(ellipse at 50% 0%,rgba(0,178,255,0.06) 0%,transparent 60%); pointer-events:none; }
        .hero-content { position:relative; max-width:680px; margin:0 auto; }
        .hero-pill { display:inline-flex; align-items:center; gap:8px; padding:6px 16px; border-radius:100px; border:1px solid rgba(0,178,255,0.2); background:rgba(0,178,255,0.04); color:#00B2FF; font-size:11px; font-weight:700; letter-spacing:.1em; margin-bottom:32px; }
        .pill-dot { width:6px; height:6px; background:#00B2FF; border-radius:50%; animation:pulse 2s ease infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .hero h1 { font-family:'Outfit',sans-serif; font-size:64px; font-weight:900; line-height:1.05; letter-spacing:-2px; margin-bottom:20px; text-transform:none; }
        .hero h1 span { color:#00B2FF; }
        .hero > .hero-content > p { color:#64748b; font-size:17px; line-height:1.7; max-width:520px; margin:0 auto 36px; }
        .hero-actions { display:flex; align-items:center; justify-content:center; gap:20px; margin-bottom:32px; }
        .cta-main { display:inline-flex; align-items:center; gap:10px; padding:14px 28px; background:#00B2FF; color:#fff; border:none; border-radius:12px; font-size:16px; font-weight:700; font-family:inherit; cursor:pointer; transition:all .2s; box-shadow:0 4px 16px rgba(0,178,255,0.2); }
        .cta-main:hover { transform:translateY(-1px); box-shadow:0 8px 24px rgba(0,178,255,0.3); }
        .cta-main:disabled { opacity:.7; cursor:wait; }
        .cta-main img { width:20px; }
        .cta-ghost { font-size:14px; font-weight:600; color:#64748b; text-decoration:none; transition:color .15s; }
        .cta-ghost:hover { color:#00B2FF; }
        .hero-trust { display:flex; justify-content:center; gap:24px; }
        .hero-trust span { font-size:12px; font-weight:600; color:#94a3b8; }

        /* STATS */
        .stats { display:grid; grid-template-columns:repeat(4,1fr); border-top:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9; }
        .stat { padding:44px 20px; text-align:center; border-right:1px solid #f1f5f9; }
        .stat:last-child { border-right:none; }
        .stat-val { font-family:'Outfit',sans-serif; font-size:48px; font-weight:900; color:#00B2FF; line-height:1; margin-bottom:6px; }
        .stat-lbl { font-size:11px; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:.1em; }

        /* HOW */
        .how { padding:80px 48px; text-align:center; }
        .sec-tag { display:inline-block; font-size:11px; font-weight:700; letter-spacing:.15em; color:#00B2FF; background:rgba(0,178,255,0.05); padding:5px 14px; border-radius:100px; margin-bottom:16px; }
        .how h2, .feats h2 { font-family:'Outfit',sans-serif; font-size:38px; font-weight:800; text-transform:none; letter-spacing:-.5px; margin-bottom:48px; }
        .steps { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; text-align:left; }
        .step-card { padding:32px 28px; border:1px solid #e2e8f0; border-radius:16px; background:#fff; transition:all .2s; }
        .step-card:hover { border-color:#00B2FF; box-shadow:0 4px 16px rgba(0,0,0,0.03); }
        .step-num { font-family:'Outfit',sans-serif; font-size:36px; font-weight:900; color:#00B2FF; margin-bottom:14px; }
        .step-card h3 { font-size:16px; font-weight:700; margin-bottom:8px; }
        .step-card p { font-size:14px; color:#64748b; line-height:1.6; }

        /* FEATURES */
        .feats { padding:80px 48px; text-align:center; background:#fafbfc; }
        .feats-sub { color:#64748b; font-size:16px; margin-bottom:48px; margin-top:-34px; }
        .feat-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; text-align:left; max-width:900px; margin:0 auto; }
        .feat { display:flex; gap:16px; padding:24px; border:1px solid #e2e8f0; border-radius:14px; background:#fff; transition:all .2s; }
        .feat:hover { border-color:rgba(0,178,255,0.3); box-shadow:0 4px 12px rgba(0,0,0,0.03); }
        .feat-icon { font-size:26px; flex-shrink:0; width:44px; height:44px; display:flex; align-items:center; justify-content:center; background:rgba(0,178,255,0.06); border-radius:10px; }
        .feat h3 { font-size:15px; font-weight:700; margin-bottom:4px; }
        .feat p { font-size:13px; color:#64748b; line-height:1.5; }

        /* BOTTOM CTA */
        .bottom-cta { text-align:center; padding:80px 20px; }
        .bottom-cta h2 { font-family:'Outfit',sans-serif; font-size:34px; font-weight:800; margin-bottom:8px; text-transform:none; }
        .bottom-cta p { color:#64748b; font-size:16px; margin-bottom:28px; }

        /* FOOTER */
        .lp-footer { display:flex; justify-content:space-between; padding:24px 48px; border-top:1px solid #f1f5f9; font-size:12px; color:#94a3b8; font-weight:500; }

        @media(max-width:900px) {
          .nav { padding:14px 20px; }
          .nav-links { display:none; }
          .hero h1 { font-size:40px; }
          .hero-actions { flex-direction:column; }
          .stats { grid-template-columns:repeat(2,1fr); }
          .stat { border-bottom:1px solid #f1f5f9; }
          .how, .feats { padding:60px 20px; }
          .steps { grid-template-columns:1fr; }
          .feat-grid { grid-template-columns:1fr; }
          .how h2, .feats h2 { font-size:28px; }
        }
      `}</style>
    </div>
  )
}