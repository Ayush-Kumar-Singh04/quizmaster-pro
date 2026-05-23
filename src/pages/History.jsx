import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getSoloHistory, clearSoloHistory, getMyArenaMatches } from '../lib/storage'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { ProgressBar, Badge } from '../components/UI'
import { BookOpen, Swords, Inbox, Wrench, Trophy } from 'lucide-react'

function formatTime(seconds) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function HistoryPage() {
  const [soloHistory, setSoloHistory] = useState([])
  const [arenaHistory, setArenaHistory] = useState([])
  const [tab, setTab] = useState('solo')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    setSoloHistory(getSoloHistory())
    if (isSupabaseConfigured() && supabase) {
      const myMatches = getMyArenaMatches()
      if (myMatches.length > 0) {
        supabase.from('arena_history').select('*').in('room_id', myMatches).order('played_at', { ascending: false }).limit(20)
          .then(({ data }) => { if (data) setArenaHistory(data) })
      } else {
        setArenaHistory([])
      }
    }
  }, [])

  const handleClear = () => {
    if (confirm('Clear all solo quiz history?')) {
      clearSoloHistory(); setSoloHistory([])
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-bold">History</h1>
        {tab === 'solo' && soloHistory.length > 0 && (
          <button onClick={handleClear} className="text-red-400 hover:text-red-300 text-sm transition-colors">
            Clear All
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['solo', 'arena'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-xl text-sm font-medium capitalize transition-all
              ${tab === t ? 'bg-brand-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
            {t === 'solo' ? <span className="flex items-center gap-2"><BookOpen size={16} /> Solo Quizzes</span> : <span className="flex items-center gap-2"><Swords size={16} /> Arena Matches</span>}
          </button>
        ))}
      </div>

      {tab === 'solo' && (
        <div>
          {soloHistory.length === 0 ? (
            <div className="text-center py-20 text-white/40">
              <div className="flex justify-center mb-4"><Inbox size={48} className="text-white/20" /></div>
              <div>No quiz history yet. Take your first quiz!</div>
            </div>
          ) : (
            <div className="space-y-3">
              {soloHistory.map((h, i) => {
                const pct = Math.round((h.score / h.total) * 100)
                const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : 'D'
                const gradeColor = pct >= 70 ? 'success' : pct >= 50 ? 'warning' : 'danger'
                return (
                  <motion.div
                    key={h.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="card cursor-pointer hover:border-white/20 transition-all"
                    onClick={() => setExpanded(expanded === h.id ? null : h.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-display font-bold text-xl
                        ${pct >= 70 ? 'bg-green-500/20 text-green-400' : pct >= 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                        {grade}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{h.files?.join(', ') || 'Quiz'}</div>
                        <div className="text-sm text-white/50 mt-0.5">{formatDate(h.savedAt)}</div>
                        <div className="mt-2">
                          <ProgressBar value={h.score} max={h.total} color={pct >= 70 ? 'green' : pct >= 50 ? 'orange' : 'red'} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-display font-bold text-xl">{pct}%</div>
                        <div className="text-xs text-white/40">{h.score}/{h.total}</div>
                        <div className="mt-1 flex gap-1 justify-end">
                          <Badge variant={gradeColor}>{h.mode}</Badge>
                        </div>
                      </div>
                    </div>

                    {expanded === h.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mt-4 pt-4 border-t border-white/10"
                      >
                        <div className="grid grid-cols-3 gap-3 text-center text-sm">
                          <div><div className="text-white/40 text-xs mb-1">Correct</div><div className="text-green-400 font-bold">{h.score}</div></div>
                          <div><div className="text-white/40 text-xs mb-1">Wrong</div><div className="text-red-400 font-bold">{h.total - h.score}</div></div>
                          <div><div className="text-white/40 text-xs mb-1">Time</div><div className="text-brand-400 font-bold">{formatTime(h.elapsed)}</div></div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'arena' && (
        <div>
          {!isSupabaseConfigured() ? (
            <div className="text-center py-20 text-white/40">
              <div className="flex justify-center mb-4"><Wrench size={48} className="text-white/20" /></div>
              <div className="mb-2">Supabase not configured</div>
              <div className="text-sm text-white/50 max-w-xs mx-auto">Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment to enable multiplayer arena history.</div>
            </div>
          ) : arenaHistory.length === 0 ? (
            <div className="text-center py-20 text-white/40">
              <div className="flex justify-center mb-4"><Swords size={48} className="text-white/20" /></div>
              <div>No arena matches yet. Host your first battle!</div>
            </div>
          ) : (
            <div className="space-y-3">
              {arenaHistory.map((m, i) => {
                const winner = [...(m.players || [])].sort((a,b) => b.score - a.score)[0]
                return (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{m.room_id}</div>
                        <div className="text-sm text-white/50 mt-0.5">{formatDate(m.played_at)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-white/50">{m.questions_count} questions · {m.players?.length} players</div>
                        {winner && <div className="text-yellow-400 text-sm mt-1 flex items-center justify-end gap-1"><Trophy size={14} /> {winner.name} ({winner.score} pts)</div>}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
