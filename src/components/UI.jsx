import { motion } from 'framer-motion'
import { useState } from 'react'
import { FolderUp } from 'lucide-react'

export function Logo({ size = 'md' }) {
  const sz = size === 'sm' ? 'text-xl' : size === 'lg' ? 'text-4xl' : 'text-2xl'
  return (
    <div className={`font-display font-bold ${sz} flex items-center gap-2`}>
      <span className="text-brand-400">Quiz</span>
      <span className="text-accent-400">Master</span>
      <span className="text-white/40 font-light text-sm align-top mt-1">PRO</span>
    </div>
  )
}

export function LoadingSpinner({ size = 24, color = 'text-brand-400' }) {
  return (
    <svg className={`animate-spin ${color}`} width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

export function ProgressBar({ value, max, color = 'brand' }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
      <motion.div
        className={`h-full rounded-full bg-${color}-500`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ background: color === 'brand' ? '#6366f1' : color === 'green' ? '#22c55e' : '#f97316' }}
      />
    </div>
  )
}

export function Badge({ children, variant = 'default' }) {
  const variants = {
    default: 'bg-white/10 text-white/70',
    success: 'bg-green-500/20 text-green-400',
    danger: 'bg-red-500/20 text-red-400',
    warning: 'bg-yellow-500/20 text-yellow-400',
    info: 'bg-brand-500/20 text-brand-300',
    accent: 'bg-accent-500/20 text-accent-400',
  }
  return (
    <span className={`badge ${variants[variant]}`}>{children}</span>
  )
}

export function ScoreRing({ score, total }) {
  const pct = total > 0 ? score / total : 0
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const dash = circumference * (1 - pct)
  const color = pct >= 0.8 ? '#22c55e' : pct >= 0.6 ? '#f97316' : '#ef4444'
  const grade = pct >= 0.9 ? 'A+' : pct >= 0.8 ? 'A' : pct >= 0.7 ? 'B' : pct >= 0.6 ? 'C' : pct >= 0.4 ? 'D' : 'F'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10"/>
        <motion.circle
          cx="70" cy="70" r={radius}
          fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dash }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          style={{ transformOrigin: '70px 70px', transform: 'rotate(-90deg)' }}
        />
      </svg>
      <div className="absolute text-center">
        <motion.div
          className="text-3xl font-display font-bold"
          style={{ color }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.8, type: 'spring' }}
        >
          {grade}
        </motion.div>
        <div className="text-sm text-white/50">{score}/{total}</div>
      </div>
    </div>
  )
}

export function FileDropZone({ onFiles, onUrl, multiple = false, accept = '.pdf,.docx,.pptx,.txt' }) {
  const [dragging, setDragging] = useState(false)
  const [url, setUrl] = useState('')

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const files = [...e.dataTransfer.files].filter(f => {
      const ext = f.name.split('.').pop().toLowerCase()
      return ['pdf','docx','pptx','txt'].includes(ext)
    })
    if (files.length) onFiles(files)
  }

  return (
    <div className="space-y-4">
      <label
        className={`block border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200
          ${dragging ? 'border-brand-400 bg-brand-500/10' : 'border-white/20 hover:border-brand-400/60 hover:bg-white/5'}`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file" className="hidden"
          accept={accept} multiple={multiple}
          onChange={e => onFiles([...e.target.files])}
        />
        <div className="flex justify-center mb-3"><FolderUp size={36} className="text-white/40" /></div>
        <div className="text-white/70 font-medium">
          Drop your {multiple ? 'files' : 'file'} here or <span className="text-brand-400">browse</span>
        </div>
        <div className="text-white/40 text-sm mt-1">PDF, DOCX, PPTX, TXT supported</div>
      </label>

      {onUrl && (
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
          <div className="text-white/40 text-sm font-medium w-8 text-center">OR</div>
          <div className="flex-1 flex gap-2 w-full">
            <input 
              type="text" 
              placeholder="Paste a YouTube video URL..." 
              className="input flex-1 min-w-0"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && url && onUrl(url)}
            />
            <button 
              type="button"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText()
                  if (text) setUrl(text)
                } catch (err) {
                  console.warn("Clipboard access denied or not supported:", err)
                }
              }}
              className="btn-secondary px-4 py-3 text-sm"
              title="Paste from clipboard"
            >
              Paste
            </button>
          </div>
          <button 
            type="button" 
            onClick={() => url && onUrl(url)}
            className="btn-accent px-6 w-full sm:w-auto"
          >
            Extract
          </button>
        </div>
      )}
    </div>
  )
}

export function StatCard({ label, value, icon, color = 'brand' }) {
  return (
    <div className="card text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-display font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-white/50">{label}</div>
    </div>
  )
}

export function TimerBar({ duration, onExpire, paused = false }) {
  return (
    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div
        className="h-full bg-accent-500 rounded-full"
        style={{
          animation: paused ? 'none' : `timerShrink ${duration}s linear forwards`
        }}
        onAnimationEnd={onExpire}
      />
    </div>
  )
}
