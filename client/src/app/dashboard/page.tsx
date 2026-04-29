'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/utils/firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { motion } from 'framer-motion'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeNav, setActiveNav] = useState('dashboard')
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          setUser(u)
          const userDoc = await getDoc(doc(db, 'users', u.uid))
          if (userDoc.exists()) { setUserData(userDoc.data()); setLoading(false) }
          else { router.push('/onboarding') }
        } else { router.push('/') }
      } catch (error) { console.error(error); router.push('/') }
    })
    return () => unsubscribe()
  }, [router])

  const handleLogout = async () => {
    try { await signOut(auth); router.push('/') } catch { router.push('/') }
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc' }}>
      <div style={{ width:40, height:40, border:'3px solid #e2e8f0', borderTopColor:'#00B2FF', borderRadius:'50%', animation:'spin .7s linear infinite' }}></div>
      <style jsx>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  )

  const initials = userData?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  const firstName = userData?.full_name?.split(' ')[0] || 'Teacher'
  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  const navItems = [
    { id: 'dashboard', icon: '◻️', label: 'Dashboard' },
    { id: 'sessions', icon: '🎥', label: 'Sessions' },
    { id: 'analytics', icon: '📈', label: 'Analytics' },
    { id: 'students', icon: '👥', label: 'Students' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ]

  const recentSessions = [
    { subject: 'Artificial Intelligence', date: 'Today, 10:30 AM', engagement: 92, students: 45 },
    { subject: 'Operating Systems', date: 'Yesterday, 2:00 PM', engagement: 78, students: 38 },
    { subject: 'Data Science', date: 'Apr 27, 11:00 AM', engagement: 85, students: 42 },
  ]

  return (
    <div className="db">
      {/* SIDEBAR */}
      <aside className="sb">
        <div className="sb-top">
          <div className="sb-brand">⚡ <span>EduPulse</span></div>
        </div>

        <nav className="sb-menu">
          <div className="sb-section-label">MAIN</div>
          {navItems.slice(0, 3).map(item => (
            <button 
              key={item.id} 
              className={`sb-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              <span className="sb-item-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
          <div className="sb-section-label">MANAGE</div>
          {navItems.slice(3).map(item => (
            <button 
              key={item.id} 
              className={`sb-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              <span className="sb-item-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sb-bottom">
          <div className="sb-profile">
            <div className="sb-avatar">{initials}</div>
            <div className="sb-info">
              <div className="sb-name">{userData?.full_name}</div>
              <div className="sb-dept">{userData?.teacher_id}</div>
            </div>
          </div>
          <button className="sb-logout" onClick={handleLogout}>↗ Log out</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="db-main">
        {/* HEADER */}
        <header className="db-header">
          <div>
            <h1>{greeting}, {firstName}</h1>
            <p>Track and improve your classroom engagement</p>
          </div>
          <div className="header-right">
            <div className="header-dept">{userData?.department}</div>
            <button className="new-session-btn" onClick={() => alert('Starting session...')}>
              + New Session
            </button>
          </div>
        </header>

        {/* METRIC CARDS */}
        <motion.div className="metrics" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <div className="mc">
            <div className="mc-top">
              <span className="mc-label">Avg. Engagement</span>
              <div className="mc-badge up">↑ 12%</div>
            </div>
            <div className="mc-val">88<span className="mc-unit">%</span></div>
            <div className="mc-bar"><div className="mc-fill" style={{ width: '88%' }}></div></div>
          </div>
          <div className="mc">
            <div className="mc-top">
              <span className="mc-label">Total Sessions</span>
              <div className="mc-badge up">↑ 3</div>
            </div>
            <div className="mc-val">42</div>
            <div className="mc-bar"><div className="mc-fill purple" style={{ width: '70%' }}></div></div>
          </div>
          <div className="mc">
            <div className="mc-top">
              <span className="mc-label">Active Students</span>
              <div className="mc-badge neutral">→ 0</div>
            </div>
            <div className="mc-val">156</div>
            <div className="mc-bar"><div className="mc-fill green" style={{ width: '65%' }}></div></div>
          </div>
          <div className="mc">
            <div className="mc-top">
              <span className="mc-label">Focus Score</span>
              <div className="mc-badge up">↑ 5%</div>
            </div>
            <div className="mc-val">76<span className="mc-unit">%</span></div>
            <div className="mc-bar"><div className="mc-fill amber" style={{ width: '76%' }}></div></div>
          </div>
        </motion.div>

        {/* TWO COLUMN */}
        <motion.div className="two-col" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          {/* CHART */}
          <div className="card">
            <div className="card-head">
              <div>
                <h3>Weekly Engagement</h3>
                <p className="card-sub">Your class performance this week</p>
              </div>
              <div className="card-tabs">
                <button className="tab active">Week</button>
                <button className="tab">Month</button>
              </div>
            </div>
            <div className="chart">
              {[
                { day: 'Mon', val: 65 },
                { day: 'Tue', val: 72 },
                { day: 'Wed', val: 58 },
                { day: 'Thu', val: 88 },
                { day: 'Fri', val: 79 },
                { day: 'Sat', val: 92 },
                { day: 'Sun', val: 85 },
              ].map((d, i) => (
                <div key={i} className="chart-col">
                  <div className="chart-bar-wrap">
                    <div className="chart-bar" style={{ height: `${d.val}%` }}>
                      <span className="chart-tooltip">{d.val}%</span>
                    </div>
                  </div>
                  <span className="chart-label">{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SUBJECTS & CTA */}
          <div className="card cta-card">
            <h3>Your Subjects</h3>
            <p className="card-sub" style={{ marginBottom: 20 }}>Quick access to start a session</p>
            <div className="subject-list">
              {userData?.subjects?.split(',').map((s: string, i: number) => (
                <button key={i} className="subject-row">
                  <span className="subject-dot" style={{ background: ['#00B2FF','#6366F1','#10B981','#F59E0B','#EF4444'][i % 5] }}></span>
                  <span className="subject-name">{s.trim()}</span>
                  <span className="subject-arrow">→</span>
                </button>
              ))}
            </div>
            <button className="start-btn" onClick={() => alert('Starting session...')}>
              🎥 Start New Session
            </button>
          </div>
        </motion.div>

        {/* RECENT SESSIONS TABLE */}
        <motion.div className="card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
          <div className="card-head">
            <div>
              <h3>Recent Sessions</h3>
              <p className="card-sub">Your latest classroom recordings</p>
            </div>
            <button className="view-all">View All →</button>
          </div>
          <table className="sessions-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Date</th>
                <th>Students</th>
                <th>Engagement</th>
              </tr>
            </thead>
            <tbody>
              {recentSessions.map((s, i) => (
                <tr key={i}>
                  <td className="td-subject">{s.subject}</td>
                  <td className="td-date">{s.date}</td>
                  <td>{s.students}</td>
                  <td>
                    <div className="eng-wrap">
                      <div className="eng-bar"><div className="eng-fill" style={{ width: `${s.engagement}%`, background: s.engagement > 85 ? '#10B981' : s.engagement > 70 ? '#00B2FF' : '#F59E0B' }}></div></div>
                      <span className="eng-val">{s.engagement}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </main>

      <style jsx>{`
        .db { display:flex; min-height:100vh; background:#f8fafc; font-family:'Inter',sans-serif; color:#0f172a; }

        /* ──── SIDEBAR ──── */
        .sb { width:260px; background:#fff; border-right:1px solid #e2e8f0; display:flex; flex-direction:column; position:sticky; top:0; height:100vh; flex-shrink:0; }
        .sb-top { padding:24px 24px 20px; }
        .sb-brand { font-family:'Outfit',sans-serif; font-size:20px; font-weight:800; display:flex; align-items:center; gap:10px; }
        .sb-brand span { color:#00B2FF; }
        .sb-menu { flex:1; padding:0 12px; overflow-y:auto; }
        .sb-section-label { font-size:10px; font-weight:700; color:#94a3b8; letter-spacing:.12em; padding:20px 12px 8px; }
        .sb-item { display:flex; align-items:center; gap:12px; width:100%; padding:11px 14px; border:none; background:none; border-radius:10px; font-size:14px; font-weight:500; color:#64748b; cursor:pointer; transition:all .15s; font-family:inherit; text-align:left; }
        .sb-item:hover { background:#f1f5f9; color:#0f172a; }
        .sb-item.active { background:rgba(0,178,255,0.08); color:#00B2FF; font-weight:600; }
        .sb-item-icon { font-size:17px; width:22px; text-align:center; }
        .sb-bottom { padding:16px; border-top:1px solid #f1f5f9; }
        .sb-profile { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
        .sb-avatar { width:36px; height:36px; border-radius:10px; background:#00B2FF; color:#fff; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; flex-shrink:0; }
        .sb-name { font-size:13px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:150px; }
        .sb-dept { font-size:11px; color:#94a3b8; }
        .sb-logout { width:100%; padding:9px; border:1px solid #f1f5f9; background:none; border-radius:8px; font-size:12px; font-weight:600; color:#94a3b8; cursor:pointer; font-family:inherit; transition:all .15s; }
        .sb-logout:hover { border-color:#e2e8f0; color:#ef4444; }

        /* ──── MAIN ──── */
        .db-main { flex:1; padding:28px 36px; overflow-y:auto; max-height:100vh; }

        /* HEADER */
        .db-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; }
        .db-header h1 { font-family:'Outfit',sans-serif; font-size:26px; font-weight:800; text-transform:none; letter-spacing:-.3px; margin-bottom:2px; }
        .db-header p { font-size:14px; color:#94a3b8; }
        .header-right { display:flex; align-items:center; gap:14px; }
        .header-dept { font-size:12px; font-weight:600; color:#64748b; background:#f1f5f9; padding:8px 16px; border-radius:8px; }
        .new-session-btn { padding:10px 20px; background:#00B2FF; color:#fff; border:none; border-radius:10px; font-size:14px; font-weight:600; font-family:inherit; cursor:pointer; transition:all .2s; box-shadow:0 2px 8px rgba(0,178,255,0.2); }
        .new-session-btn:hover { box-shadow:0 4px 16px rgba(0,178,255,0.3); transform:translateY(-1px); }

        /* METRICS */
        .metrics { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:22px; }
        .mc { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:20px; }
        .mc-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
        .mc-label { font-size:12px; font-weight:600; color:#94a3b8; }
        .mc-badge { font-size:11px; font-weight:700; padding:2px 8px; border-radius:6px; }
        .mc-badge.up { color:#10B981; background:#ecfdf5; }
        .mc-badge.neutral { color:#94a3b8; background:#f8fafc; }
        .mc-val { font-family:'Outfit',sans-serif; font-size:32px; font-weight:800; margin-bottom:12px; }
        .mc-unit { font-size:20px; font-weight:700; color:#94a3b8; }
        .mc-bar { height:4px; background:#f1f5f9; border-radius:4px; overflow:hidden; }
        .mc-fill { height:100%; border-radius:4px; background:#00B2FF; transition:width .6s ease; }
        .mc-fill.purple { background:#6366F1; }
        .mc-fill.green { background:#10B981; }
        .mc-fill.amber { background:#F59E0B; }

        /* CARD BASE */
        .card { background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:24px; margin-bottom:18px; }
        .card-head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; }
        .card-head h3 { font-size:16px; font-weight:700; margin-bottom:2px; }
        .card-sub { font-size:13px; color:#94a3b8; }
        .card-tabs { display:flex; gap:4px; background:#f8fafc; border-radius:8px; padding:3px; }
        .tab { padding:6px 14px; border:none; background:none; border-radius:6px; font-size:12px; font-weight:600; color:#94a3b8; cursor:pointer; font-family:inherit; transition:all .15s; }
        .tab.active { background:#fff; color:#0f172a; box-shadow:0 1px 3px rgba(0,0,0,0.06); }
        .view-all { border:none; background:none; color:#00B2FF; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; }

        /* CHART */
        .two-col { display:grid; grid-template-columns:1.6fr 1fr; gap:18px; }
        .chart { display:flex; gap:8px; height:200px; align-items:flex-end; padding-top:12px; }
        .chart-col { flex:1; display:flex; flex-direction:column; align-items:center; height:100%; }
        .chart-bar-wrap { flex:1; width:100%; display:flex; align-items:flex-end; justify-content:center; }
        .chart-bar { width:70%; background:linear-gradient(180deg,#00B2FF 0%,#93c5fd 100%); border-radius:6px 6px 3px 3px; position:relative; transition:height .5s ease; cursor:pointer; min-height:4px; }
        .chart-bar:hover { opacity:.85; }
        .chart-tooltip { position:absolute; top:-24px; left:50%; transform:translateX(-50%); font-size:11px; font-weight:700; color:#0f172a; background:#fff; border:1px solid #e2e8f0; padding:2px 7px; border-radius:5px; opacity:0; transition:opacity .15s; pointer-events:none; white-space:nowrap; }
        .chart-bar:hover .chart-tooltip { opacity:1; }
        .chart-label { font-size:11px; color:#94a3b8; font-weight:600; margin-top:10px; }

        /* CTA CARD */
        .cta-card { display:flex; flex-direction:column; }
        .subject-list { display:flex; flex-direction:column; gap:6px; flex:1; margin-bottom:16px; }
        .subject-row { display:flex; align-items:center; gap:12px; padding:12px 14px; border:1px solid #f1f5f9; border-radius:10px; background:#fafbfc; cursor:pointer; transition:all .15s; font-family:inherit; font-size:14px; font-weight:500; color:#334155; width:100%; text-align:left; }
        .subject-row:hover { border-color:#00B2FF; background:#fff; }
        .subject-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .subject-name { flex:1; }
        .subject-arrow { color:#94a3b8; font-size:14px; transition:transform .15s; }
        .subject-row:hover .subject-arrow { transform:translateX(3px); color:#00B2FF; }
        .start-btn { padding:13px; background:#00B2FF; color:#fff; border:none; border-radius:10px; font-size:14px; font-weight:700; font-family:inherit; cursor:pointer; transition:all .2s; }
        .start-btn:hover { box-shadow:0 4px 16px rgba(0,178,255,0.25); }

        /* TABLE */
        .sessions-table { width:100%; border-collapse:collapse; }
        .sessions-table th { font-size:11px; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:.05em; text-align:left; padding:0 12px 14px; border-bottom:1px solid #f1f5f9; }
        .sessions-table td { padding:16px 12px; border-bottom:1px solid #f8fafc; font-size:14px; }
        .sessions-table tr:last-child td { border-bottom:none; }
        .sessions-table tr:hover td { background:#fafbfc; }
        .td-subject { font-weight:600; color:#0f172a; }
        .td-date { color:#64748b; font-size:13px; }
        .eng-wrap { display:flex; align-items:center; gap:10px; }
        .eng-bar { width:80px; height:6px; background:#f1f5f9; border-radius:4px; overflow:hidden; }
        .eng-fill { height:100%; border-radius:4px; }
        .eng-val { font-size:13px; font-weight:700; color:#0f172a; }

        @media(max-width:1100px) {
          .sb { display:none; }
          .metrics { grid-template-columns:repeat(2,1fr); }
          .two-col { grid-template-columns:1fr; }
        }
        @media(max-width:600px) {
          .db-main { padding:20px 14px; }
          .metrics { grid-template-columns:1fr; }
          .db-header { flex-direction:column; gap:16px; }
          .header-right { width:100%; }
        }
      `}</style>
    </div>
  )
}
