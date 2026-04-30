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
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f9fafb' }}>
      <div style={{ width:44, height:44, border:'3px solid #e5e7eb', borderTopColor:'#10b981', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
    </div>
  )

  return (
    <div className="ob">
      {/* LEFT */}
      <motion.div className="ob-left" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
        <div className="ob-left-content">
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
        </div>
      </motion.div>

      {/* RIGHT */}
      <motion.div className="ob-right" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        <div className="ob-right-content">
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

            <motion.button
              whileHover={isValid ? { scale: 1.01 } : {}}
              whileTap={isValid ? { scale: 0.99 } : {}}
              type="submit"
              className={`submit ${isValid ? 'ready' : ''}`}
              disabled={submitting || !isValid}
            >
              {submitting ? 'Creating your dashboard...' : 'Launch Dashboard →'}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}