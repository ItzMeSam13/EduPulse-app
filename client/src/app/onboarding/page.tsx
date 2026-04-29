'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/utils/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { motion } from 'framer-motion'

export default function Onboarding() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    teacher_id: '',
    department: '',
    subjects: ''
  })
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          setUser(u)
          const userDoc = await getDoc(doc(db, 'users', u.uid))
          if (userDoc.exists()) { router.push('/dashboard') }
          else {
            setFormData(prev => ({ ...prev, email: u.email || '', full_name: u.displayName || '' }))
            setLoading(false)
          }
        } else { router.push('/') }
      } catch (error) {
        console.error("Onboarding auth check error:", error)
        router.push('/')
      }
    })
    return () => unsubscribe()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.full_name || !formData.email || !formData.teacher_id || !formData.department || !formData.subjects) return
    setSubmitting(true)
    try {
      await setDoc(doc(db, 'users', user.uid), { ...formData, onboarded: true, createdAt: new Date().toISOString(), uid: user.uid })
      router.push('/dashboard')
    } catch (error: any) {
      console.error("Save profile error:", error)
      alert('Error saving profile. Please try again.')
      setSubmitting(false)
    }
  }

  const isValid = formData.full_name && formData.email && formData.teacher_id && formData.department && formData.subjects

  if (loading) return (
    <div className="ob-loader">
      <div className="spinner"></div>
      <style jsx>{`
        .ob-loader { min-height:100vh; display:flex; align-items:center; justify-content:center; background:#fff; }
        .spinner { width:44px; height:44px; border:3px solid #e2e8f0; border-top-color:#00B2FF; border-radius:50%; animation:spin .7s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  )

  return (
    <div className="ob">
      {/* LEFT */}
      <motion.div className="ob-left" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
        <div>
          <div className="ob-icon">⚡</div>
          <h1 className="ob-brand">Edu<span>Pulse</span></h1>
          <p className="ob-tagline">AI-Powered Classroom Intelligence</p>
        </div>
        <div className="ob-features">
          <div className="ob-feat"><span className="feat-dot"></span>Real-time engagement tracking</div>
          <div className="ob-feat"><span className="feat-dot"></span>AI-driven teaching insights</div>
          <div className="ob-feat"><span className="feat-dot"></span>Privacy-first analytics</div>
          <div className="ob-feat"><span className="feat-dot"></span>Session comparison tools</div>
        </div>
        <div className="ob-trust">🔒 Your data stays private & secure</div>
      </motion.div>

      {/* RIGHT */}
      <motion.div className="ob-right" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <div className="ob-steps">
          <div className="step on"></div>
          <div className="step-line"></div>
          <div className={`step ${isValid ? 'on' : ''}`}></div>
        </div>
        <h2>Complete Your Profile</h2>
        <p className="ob-desc">Just a few details to personalize your dashboard.</p>

        <form onSubmit={handleSubmit} className="ob-form">
          <div className="row">
            <div className="field">
              <label>Full Name</label>
              <input type="text" placeholder="Dr. Jane Smith" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} required />
            </div>
            <div className="field">
              <label>Teacher ID</label>
              <input type="text" placeholder="EDU-12345" value={formData.teacher_id} onChange={e => setFormData({...formData, teacher_id: e.target.value})} required />
            </div>
          </div>

          <div className="field">
            <label>Email Address</label>
            <div className="email-wrap">
              <input type="email" value={formData.email} readOnly className="email-input" />
              <span className="verified">✓ Verified</span>
            </div>
          </div>

          <div className="field">
            <label>Department</label>
            <input type="text" placeholder="e.g. Computer Science & Engineering" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} required />
          </div>

          <div className="field">
            <label>Subjects You Teach</label>
            <input type="text" placeholder="e.g. AI, OS, Data Science" value={formData.subjects} onChange={e => setFormData({...formData, subjects: e.target.value})} required />
            <span className="hint">Separate multiple subjects with commas</span>
          </div>

          <motion.button whileHover={isValid ? { scale: 1.01 } : {}} whileTap={isValid ? { scale: 0.99 } : {}} type="submit" className={`submit ${isValid ? 'ready' : ''}`} disabled={submitting || !isValid}>
            {submitting ? 'Creating your dashboard...' : 'Launch Dashboard →'}
          </motion.button>
        </form>
      </motion.div>

      <style jsx>{`
        .ob { display:flex; min-height:100vh; font-family:'Inter',sans-serif; }

        .ob-left { flex:0 0 400px; padding:60px 44px; display:flex; flex-direction:column; justify-content:center; gap:48px; background:#fafbfc; border-right:1px solid #f1f5f9; }
        .ob-icon { width:52px; height:52px; background:#00B2FF; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:24px; margin-bottom:24px; box-shadow:0 6px 20px rgba(0,178,255,0.2); }
        .ob-brand { font-family:'Outfit',sans-serif; font-size:38px; font-weight:900; text-transform:uppercase; letter-spacing:-1px; color:#0F172A; margin-bottom:6px; }
        .ob-brand span { color:#00B2FF; }
        .ob-tagline { color:#94a3b8; font-size:14px; font-weight:500; }
        .ob-features { display:flex; flex-direction:column; gap:16px; }
        .ob-feat { display:flex; align-items:center; gap:12px; color:#64748b; font-size:14px; font-weight:500; }
        .feat-dot { width:8px; height:8px; border-radius:50%; background:#00B2FF; flex-shrink:0; }
        .ob-trust { display:inline-flex; align-items:center; gap:8px; padding:10px 16px; border-radius:100px; background:#fff; border:1px solid #f1f5f9; color:#94a3b8; font-size:13px; font-weight:500; width:fit-content; }

        .ob-right { flex:1; padding:60px 64px; display:flex; flex-direction:column; justify-content:center; background:#fff; }
        .ob-steps { display:flex; align-items:center; margin-bottom:28px; }
        .step { width:12px; height:12px; border-radius:50%; background:#e2e8f0; transition:all .3s; }
        .step.on { background:#00B2FF; box-shadow:0 0 10px rgba(0,178,255,0.3); }
        .step-line { width:36px; height:2px; background:#e2e8f0; }
        .ob-right h2 { font-family:'Outfit',sans-serif; font-size:30px; font-weight:800; color:#0F172A; text-transform:none; letter-spacing:-.4px; margin-bottom:8px; }
        .ob-desc { font-size:15px; color:#94a3b8; margin-bottom:36px; }

        .ob-form { display:flex; flex-direction:column; gap:20px; }
        .row { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .field label { display:block; font-size:13px; font-weight:600; color:#475569; margin-bottom:8px; }
        .field input { width:100%; padding:13px 16px; font-size:15px; font-family:inherit; color:#0F172A; background:#fafbfc; border:1.5px solid #e2e8f0; border-radius:11px; outline:none; transition:all .2s; }
        .field input::placeholder { color:#94a3b8; }
        .field input:focus { border-color:#00B2FF; background:#fff; box-shadow:0 0 0 3px rgba(0,178,255,0.08); }
        .email-wrap { position:relative; }
        .email-input { background:#f1f5f9 !important; color:#64748b !important; cursor:not-allowed; }
        .verified { position:absolute; right:14px; top:50%; transform:translateY(-50%); font-size:12px; font-weight:600; color:#10B981; background:#ecfdf5; padding:3px 10px; border-radius:100px; }
        .hint { display:block; font-size:12px; color:#94a3b8; margin-top:6px; }

        .submit { width:100%; padding:15px; font-size:16px; font-weight:700; font-family:inherit; border:none; border-radius:12px; cursor:pointer; transition:all .25s; margin-top:8px; background:#e2e8f0; color:#94a3b8; }
        .submit.ready { background:#00B2FF; color:#fff; box-shadow:0 6px 20px rgba(0,178,255,0.2); cursor:pointer; }
        .submit.ready:hover { box-shadow:0 10px 28px rgba(0,178,255,0.3); transform:translateY(-1px); }
        .submit:disabled:not(.ready) { cursor:not-allowed; }

        @media(max-width:900px) {
          .ob { flex-direction:column; }
          .ob-left { flex:none; padding:36px 28px; }
          .ob-features { display:none; }
          .ob-trust { display:none; }
          .ob-right { padding:36px 24px; }
          .row { grid-template-columns:1fr; }
        }
      `}</style>
    </div>
  )
}
