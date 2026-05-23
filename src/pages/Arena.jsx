import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { extractText } from '../lib/fileParser'
import { generateMCQs } from '../lib/aiGenerator'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { celebrateWinner } from '../lib/confetti'
import { saveMyArenaMatch } from '../lib/storage'
import { FileDropZone, LoadingSpinner, TimerBar, ProgressBar, Badge, ScoreRing } from '../components/UI'
import { Swords, AlertTriangle, Home as HomeIcon, DoorOpen, Rocket, Play, Trophy, Medal, User, Crown, CheckCircle2, Clock, Loader2, Sparkles, ChevronRight } from 'lucide-react'

const STEPS = { LOBBY: 0, WAITING: 1, QUIZ: 2, RESULTS: 3 }
const COLORS = ['bg-brand-500','bg-accent-500','bg-green-500','bg-pink-500','bg-yellow-500','bg-cyan-500']

function genRoomCode() {
  return Math.random().toString(36).slice(2,7).toUpperCase()
}

export default function ArenaPage() {
  const [mode, setMode] = useState(null) // 'host' | 'join'
  const [step, setStep] = useState(STEPS.LOBBY)
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error, setError] = useState('')
  const [room, setRoom] = useState(null)
  const [players, setPlayers] = useState([])
  const [myPlayerId, setMyPlayerId] = useState(null)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timerKey, setTimerKey] = useState(0)
  const subscriptions = useRef([])
  const [files, setFiles] = useState([])
  const [quizConfig, setQuizConfig] = useState({ count: 10, timePerQ: 20 })

  // Demo mode when Supabase not configured
  const demoMode = !isSupabaseConfigured()

  const cleanup = () => {
    subscriptions.current.forEach(s => s.unsubscribe?.())
    subscriptions.current = []
  }

  useEffect(() => () => cleanup(), [])

  // Sync current question index with room.current_q from Supabase
  useEffect(() => {
    if (room && room.current_q !== undefined && room.current_q !== current) {
      setCurrent(room.current_q)
      setTimerKey(k => k + 1)
    }
  }, [room?.current_q])

  // Restore and sync local answers from the database for active player
  useEffect(() => {
    if (myPlayerId && players.length > 0) {
      const me = players.find(p => p.id === myPlayerId)
      if (me && me.answers) {
        const dbAnswers = Array.isArray(me.answers)
          ? me.answers.reduce((acc, val, idx) => { if (val !== null && val !== undefined) acc[idx] = val; return acc; }, {})
          : me.answers
        if (JSON.stringify(dbAnswers) !== JSON.stringify(answers)) {
          setAnswers(dbAnswers || {})
        }
      }
    }
  }, [players, myPlayerId])

  // Trigger celebration and history recording upon entering RESULTS step
  useEffect(() => {
    if (step === STEPS.RESULTS && room?.questions) {
      const myScore = Object.keys(answers).filter(k => room?.questions?.[+k] && answers[k] === room.questions[+k].correct).length
      celebrateWinner(myScore >= (room.questions.length * 0.8))

      // Save match to local device history
      saveMyArenaMatch(roomCode)

      // Host saves the match history to avoid duplicate entries
      if (!demoMode && supabase && room?.host_name === name) {
        supabase.from('arena_history').insert({
          room_id: roomCode,
          players: players,
          questions_count: room.questions.length
        }).then(({ error }) => {
          if (error) console.error('Failed to save arena history:', error)
        })
      }
    }
  }, [step])

  const hostRoom = async () => {
    if (!name.trim()) return setError('Enter your name')
    setLoading(true); setLoadingMsg('Reading files…'); setError('')
    try {
      let text = ''
      for (const f of files) text += '\n' + await extractText(f)
      setLoadingMsg('Generating questions with Nova AI…')
      const questions = await generateMCQs({ text, count: quizConfig.count, difficulty: 'medium' })
      
      const code = genRoomCode()
      if (!demoMode) {
        await supabase.from('arena_rooms').insert({
          id: code, host_name: name,
          questions: questions,
          status: 'waiting',
          time_per_q: quizConfig.timePerQ
        })
        const { data: p } = await supabase.from('arena_players').insert({ room_id: code, name, score: 0, answers: [] }).select().single()
        setMyPlayerId(p.id)
        subscribeRoom(code)
      }
      setRoomCode(code)
      setRoom({ id: code, host_name: name, questions, status: 'waiting', time_per_q: quizConfig.timePerQ })
      setPlayers([{ id: 'local', name, score: 0 }])
      setStep(STEPS.WAITING)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const joinRoom = async () => {
    if (!name.trim()) return setError('Enter your name')
    if (!roomCode.trim()) return setError('Enter room code')
    setLoading(true); setError('')
    try {
      if (!demoMode) {
        const { data: r } = await supabase.from('arena_rooms').select('*').eq('id', roomCode.toUpperCase()).single()
        if (!r) throw new Error('Room not found')
        const { data: p } = await supabase.from('arena_players').insert({ room_id: r.id, name, score: 0, answers: [] }).select().single()
        setMyPlayerId(p.id)
        setRoom(r)
        subscribeRoom(r.id)
      } else {
        throw new Error('Supabase not configured. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env or environment variables.')
      }
      setStep(STEPS.WAITING)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const subscribeRoom = (code) => {
    if (!supabase) return
    const roomSub = supabase.channel(`room-${code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'arena_rooms', filter: `id=eq.${code}` }, ({ new: r }) => {
        setRoom(prev => {
          const updated = { ...prev, ...r }
          if (!r.questions && prev?.questions) updated.questions = prev.questions
          return updated
        })
        if (r.status === 'playing') { 
          setStep(s => (s === STEPS.WAITING ? STEPS.QUIZ : s))
        } else if (r.status === 'results') {
          setStep(STEPS.RESULTS)
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'arena_players', filter: `room_id=eq.${code}` }, async () => {
        const { data } = await supabase.from('arena_players').select('*').eq('room_id', code).order('score', { ascending: false })
        if (data) setPlayers(data)
      })
      .subscribe()
    subscriptions.current.push(roomSub)
  }

  const startGame = async () => {
    if (!demoMode && supabase) {
      const { error } = await supabase.from('arena_rooms').update({ status: 'playing', current_q: 0 }).eq('id', roomCode)
      if (error) alert('Error starting game: ' + error.message)
    }
    setCurrent(0)
    setStep(STEPS.QUIZ)
  }

  const submitAnswer = async (idx) => {
    if (answers[current] !== undefined) return
    const newAnswers = { ...answers, [current]: idx }
    setAnswers(newAnswers)
    
    const correct = idx !== null && room?.questions?.[current] && idx === room.questions[current].correct
    const newScore = (players.find(p => p.id === myPlayerId)?.score || 0) + (correct ? 1 : 0)
    
    if (!demoMode && supabase && myPlayerId) {
      await supabase.from('arena_players').update({ score: newScore, answers: newAnswers }).eq('id', myPlayerId)
    }
  }

  const handleTimeout = async () => {
    if (answers[current] === undefined) {
      await submitAnswer(null)
    }
  }

  const forceRevealResults = async () => {
    if (demoMode || !supabase) return
    const promises = players
      .filter(p => !p.answers || p.answers[current] === undefined)
      .map(p => {
        const updatedAnswers = { ...(p.answers || {}), [current]: null }
        return supabase.from('arena_players').update({ answers: updatedAnswers }).eq('id', p.id)
      })
    await Promise.all(promises)
  }

  const nextQ = async () => {
    const next = current + 1
    if (next < room.questions.length) {
      if (!demoMode && supabase) {
        const { error } = await supabase.from('arena_rooms').update({ current_q: next }).eq('id', roomCode)
        if (error) console.error('Error going to next question:', error)
      } else {
        setCurrent(next)
        setTimerKey(k => k + 1)
      }
    } else {
      if (!demoMode && supabase) {
        const { error } = await supabase.from('arena_rooms').update({ status: 'results' }).eq('id', roomCode)
        if (error) console.error('Error ending game:', error)
      } else {
        setStep(STEPS.RESULTS)
      }
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <LoadingSpinner size={48} />
      <div className="text-white/60 animate-pulse">{loadingMsg}</div>
    </div>
  )

  const q = room?.questions?.[current]
  const myScore = q ? Object.keys(answers).filter(k => room?.questions?.[+k] && answers[k] === room.questions[+k].correct).length : 0

  const isPlayerDone = (p) => {
    if (!p.answers) return false
    if (Array.isArray(p.answers)) {
      return p.answers[current] !== undefined && p.answers[current] !== null
    }
    return p.answers[current] !== undefined
  }

  const allAnswered = demoMode || players.length <= 1 || players.every(isPlayerDone)
  const hasAnswered = answers[current] !== undefined

  return (
    <div className="max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {/* LOBBY */}
        {step === STEPS.LOBBY && (
          <motion.div key="lobby" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display text-3xl font-bold mb-2 flex items-center gap-2"><Swords size={28} className="text-brand-400" /> Arena Mode</h1>
            <p className="text-white/50 mb-6">Challenge friends in real-time MCQ battles</p>

            {demoMode && (
              <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-200 text-sm flex items-start gap-2">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <strong>Supabase not configured.</strong> Arena multiplayer requires a Supabase project. 
                  Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your <code className="bg-yellow-950/45 px-1 py-0.5 rounded font-mono text-xs text-yellow-300">.env</code> file or deployment settings. 
                  You can still host a solo arena to preview.
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-white/70 mb-2">Your Name</label>
              <input
                className="input w-full" placeholder="Enter your name…"
                value={name} onChange={e => setName(e.target.value)}
              />
            </div>

            {!mode && (
              <div className="grid grid-cols-2 gap-4">
                <motion.button onClick={() => setMode('host')} className="card glass-hover text-center cursor-pointer hover:border-brand-400" whileHover={{ scale: 1.02, y: -2 }}>
                  <div className="mb-3 text-brand-400 flex justify-center"><HomeIcon size={36} /></div>
                  <div className="font-display font-bold text-lg">Host Room</div>
                  <div className="text-white/50 text-sm mt-1">Upload files & create room</div>
                </motion.button>
                <motion.button onClick={() => setMode('join')} className="card glass-hover text-center cursor-pointer hover:border-accent-400" whileHover={{ scale: 1.02, y: -2 }}>
                  <div className="mb-3 text-accent-400 flex justify-center"><DoorOpen size={36} /></div>
                  <div className="font-display font-bold text-lg">Join Room</div>
                  <div className="text-white/50 text-sm mt-1">Enter a room code to join</div>
                </motion.button>
              </div>
            )}

            {mode === 'host' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 mt-4">
                <FileDropZone onFiles={setFiles} multiple />
                {files.length > 0 && (
                  <div className="text-sm text-white/60">
                    {files.length} file(s): {files.map(f => f.name).join(', ')}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Questions</label>
                    <input type="number" min="5" max="30" value={quizConfig.count}
                      onChange={e => setQuizConfig(c => ({ ...c, count: +e.target.value }))}
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Seconds/Question</label>
                    <input type="number" min="10" max="60" value={quizConfig.timePerQ}
                      onChange={e => setQuizConfig(c => ({ ...c, timePerQ: +e.target.value }))}
                      className="input w-full" />
                  </div>
                </div>
                {error && <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-sm">{error}</div>}
                <button onClick={hostRoom} className="btn-primary w-full flex items-center justify-center gap-2" disabled={!name || !files.length}>
                  <Rocket size={18} /> Create Room
                </button>
                <button onClick={() => setMode(null)} className="btn-secondary w-full">Back</button>
              </motion.div>
            )}

            {mode === 'join' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Room Code</label>
                  <input
                    className="input w-full font-mono text-xl tracking-widest uppercase"
                    placeholder="XXXXX"
                    value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={5}
                  />
                </div>
                {error && <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-sm">{error}</div>}
                <button onClick={joinRoom} className="btn-accent w-full flex items-center justify-center gap-2" disabled={!name || roomCode.length < 4}>
                  <DoorOpen size={18} /> Join Room
                </button>
                <button onClick={() => setMode(null)} className="btn-secondary w-full">Back</button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* WAITING */}
        {step === STEPS.WAITING && (
          <motion.div key="waiting" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <h2 className="font-display text-2xl font-bold mb-2">Room Created!</h2>
            <div className="card inline-block mb-6">
              <div className="text-sm text-white/50 mb-1">Room Code</div>
              <div className="font-mono text-5xl font-bold tracking-widest text-brand-400">{roomCode}</div>
              <div className="text-sm text-white/50 mt-1">Share this with friends</div>
            </div>

            <div className="card mb-6 text-left">
              <div className="text-sm font-medium text-white/70 mb-3">Players ({players.length})</div>
              {players.map((p, i) => (
                <div key={p.id} className={`flex items-center gap-3 py-2 ${i > 0 ? 'border-t border-white/10' : ''}`}>
                  <div className={`w-8 h-8 rounded-full ${COLORS[i % COLORS.length]} flex items-center justify-center text-sm font-bold`}>
                    {p.name[0].toUpperCase()}
                  </div>
                  <span className="font-medium">{p.name}</span>
                  {p.name === room?.host_name && <Badge variant="info">Host</Badge>}
                </div>
              ))}
            </div>

            {(room?.host_name === name || demoMode) && (
              <div className="flex justify-center">
                <button onClick={startGame} className="btn-primary px-12 py-4 text-lg flex items-center justify-center gap-2">
                  <Play size={20} /> Start Game ({room?.questions?.length} questions)
                </button>
              </div>
            )}
            {room?.host_name !== name && (
              <div className="text-white/50 animate-pulse">Waiting for host to start…</div>
            )}
          </motion.div>
        )}

        {/* QUIZ */}
        {step === STEPS.QUIZ && q && (
          <motion.div key={`quiz-${current}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="w-full">
            {/* Phase 1: Answering (Local Player has not submitted answer yet) */}
            {!hasAnswered && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="accent" className="flex items-center gap-1"><Swords size={14} /> Arena</Badge>
                  <span className="text-white/50 text-sm">{current + 1} / {room.questions.length}</span>
                </div>
                <ProgressBar value={current + 1} max={room.questions.length} />
                <div className="mt-2">
                  <TimerBar key={timerKey} duration={room.time_per_q || 20} onExpire={handleTimeout} />
                </div>

                {/* Live scoreboard mini */}
                {players.length > 1 && (
                  <div className="flex gap-2 mt-3 mb-4 flex-wrap">
                    {[...players].sort((a,b) => b.score - a.score).map((p, i) => (
                      <div key={p.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${p.name === name ? 'bg-brand-600/40 text-brand-300' : 'bg-white/10 text-white/60'}`}>
                        <span>{i===0?<Crown size={12} className="inline mr-1 text-yellow-400"/>:''}{p.name}</span>
                        <span className="font-mono">{p.score}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="card mt-4 mb-4 border border-white/5 bg-white/5">
                  <div className="text-white/40 text-xs font-medium mb-2">QUESTION {current + 1}</div>
                  <p className="text-lg font-medium">{q.question}</p>
                </div>

                <div className="space-y-3">
                  {q.options.map((opt, idx) => {
                    const selected = answers[current] === idx
                    const reveal = answers[current] !== undefined
                    const correct = q.correct === idx
                    let cls = 'option-btn'
                    if (reveal && correct) cls += ' correct'
                    else if (reveal && selected && !correct) cls += ' incorrect'
                    else if (reveal && !correct) cls += ' reveal'
                    else if (selected) cls += ' selected'
                    return (
                      <motion.button key={idx} className={cls} onClick={() => submitAnswer(idx)} whileTap={{ scale: 0.98 }}>
                        <span className="font-mono text-white/40 mr-3">{String.fromCharCode(65+idx)})</span>
                        {opt.replace(/^[ABCD]\)\s?/, '')}
                      </motion.button>
                    )
                  })}
                </div>
              </>
            )}

            {/* Phase 2: Waiting (Answer submitted, waiting for other players) */}
            {hasAnswered && !allAnswered && (
              <motion.div key="waiting-players" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-brand-500/10 border-2 border-brand-500 flex items-center justify-center animate-pulse">
                      <Loader2 size={36} className="text-brand-400 animate-spin" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-bg-900">
                      <CheckCircle2 size={16} className="text-white" />
                    </div>
                  </div>
                </div>

                <h2 className="font-display text-2xl font-bold text-white mb-2">Answer Submitted!</h2>
                <p className="text-white/60 mb-8">Waiting for other players to finish this question...</p>

                <div className="card text-left max-w-md mx-auto mb-8 border border-white/5 bg-white/5 backdrop-blur-md">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                    <span className="text-sm font-semibold text-white/80">Players in Arena</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-mono">
                      {players.filter(isPlayerDone).length} / {players.length} Done
                    </span>
                  </div>
                  <div className="space-y-3">
                    {players.map((p, i) => {
                      const done = isPlayerDone(p)
                      return (
                        <div key={p.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${COLORS[i % COLORS.length]} flex items-center justify-center text-sm font-bold text-white`}>
                              {p.name[0].toUpperCase()}
                            </div>
                            <span className="font-medium text-white/80">{p.name} {p.id === myPlayerId && <span className="text-white/40 text-xs font-normal">(You)</span>}</span>
                          </div>
                          {done ? (
                            <span className="flex items-center gap-1 text-xs text-green-400 font-semibold bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
                              <CheckCircle2 size={12} /> Ready
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-amber-400 font-semibold bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20 animate-pulse">
                              <Clock size={12} /> Thinking...
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Force Reveal/Skip button */}
                {!demoMode && supabase && (
                  <motion.button 
                    onClick={forceRevealResults}
                    className="btn-secondary text-sm px-6 py-2.5 flex items-center justify-center gap-2 mx-auto"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Sparkles size={16} className="text-brand-400 animate-pulse" /> Force Reveal Results ⚡
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* Phase 3: Combined Results (All players finished or forced) */}
            {hasAnswered && allAnswered && (
              <motion.div key="question-results" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <Badge variant="accent" className="mb-1.5 flex items-center gap-1.5 w-fit">
                      <CheckCircle2 size={12} /> Question {current + 1} Results
                    </Badge>
                    <h2 className="text-white/60 text-xs uppercase tracking-widest font-mono">Answers breakdown</h2>
                  </div>
                  <span className="text-white/40 text-sm font-semibold">{current + 1} / {room.questions.length}</span>
                </div>

                {/* Question Text */}
                <div className="card border border-white/10 bg-white/5 p-6 rounded-2xl shadow-xl">
                  <p className="text-xl font-medium text-white leading-relaxed">{q.question}</p>
                </div>

                {/* Options breakdown */}
                <div className="space-y-4">
                  {q.options.map((opt, idx) => {
                    const isCorrect = q.correct === idx
                    const myAnswer = answers[current]
                    const wasSelectedByMe = myAnswer === idx
                    
                    // Compute stats
                    const optionPlayers = players.filter(p => p.answers && p.answers[current] === idx)
                    const optionCount = optionPlayers.length
                    const totalAnswers = players.filter(p => p.answers && p.answers[current] !== undefined && p.answers[current] !== null).length || 1
                    const pct = Math.round((optionCount / totalAnswers) * 100)

                    // Styling classes based on answer status
                    let borderCls = 'border-white/10 bg-white/5 hover:border-white/20'
                    let badge = null
                    if (isCorrect) {
                      borderCls = 'border-green-500/50 bg-green-500/10 shadow-lg shadow-green-500/5'
                      badge = <span className="text-[10px] font-bold tracking-wider text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full border border-green-500/30 uppercase">Correct</span>
                    } else if (wasSelectedByMe) {
                      borderCls = 'border-red-500/50 bg-red-500/10 shadow-lg shadow-red-500/5'
                      badge = <span className="text-[10px] font-bold tracking-wider text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full border border-red-500/30 uppercase">Your Pick</span>
                    }

                    return (
                      <div key={idx} className={`relative border rounded-xl p-4 overflow-hidden transition-all duration-300 ${borderCls}`}>
                        {/* Animated Progress Bar fill */}
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${pct}%` }} 
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`absolute top-0 left-0 bottom-0 z-0 ${isCorrect ? 'bg-green-500/10' : wasSelectedByMe ? 'bg-red-500/10' : 'bg-white/5'}`} 
                        />

                        <div className="relative z-10 flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-mono text-sm font-bold text-white/50">{String.fromCharCode(65+idx)})</span>
                              <span className="text-white font-medium">{opt.replace(/^[ABCD]\)\s?/, '')}</span>
                              {badge}
                            </div>

                            {/* Avatars of players who selected this */}
                            {optionPlayers.length > 0 && (
                              <div className="flex -space-x-1.5 mt-2 flex-wrap items-center gap-y-1">
                                {optionPlayers.map((p, pIdx) => {
                                  const playerIndexInLobby = players.findIndex(lobbyPlayer => lobbyPlayer.id === p.id)
                                  return (
                                    <div 
                                      key={p.id}
                                      title={p.name} 
                                      className={`w-6 h-6 rounded-full ring-2 ring-bg-900 flex items-center justify-center text-[10px] font-bold text-white ${COLORS[playerIndexInLobby % COLORS.length]}`}
                                    >
                                      {p.name[0].toUpperCase()}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          <span className="text-xs text-white/40 font-mono font-semibold relative z-10">{pct}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* User correctness notice */}
                <div className="flex justify-between items-center bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${answers[current] === q.correct ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {answers[current] === q.correct ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{answers[current] === q.correct ? 'Brilliant! You got it right.' : answers[current] === null ? 'Time limit reached' : 'Nice try, but not quite correct.'}</h4>
                      <p className="text-white/50 text-xs">Score: {myScore} pts / {room.questions.length}</p>
                    </div>
                  </div>
                </div>

                {/* Next button */}
                <motion.button 
                  onClick={nextQ} 
                  className="btn-primary w-full mt-6 flex items-center justify-center gap-2 py-4 font-bold text-lg rounded-xl shadow-lg shadow-brand-500/20"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {current < room.questions.length - 1 ? (
                    <>Next Question <ChevronRight size={20} /></>
                  ) : (
                    <>See Final Results <Trophy size={20} /></>
                  )}
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* RESULTS */}
        {step === STEPS.RESULTS && (
          <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display text-3xl font-bold text-center mb-6 flex items-center justify-center gap-3"><Trophy size={32} className="text-yellow-400" /> Arena Results</h1>
            <div className="space-y-3 mb-8">
              {[...players].sort((a,b) => b.score - a.score).map((p, i) => (
                <motion.div
                  key={p.id}
                  className={`card flex items-center gap-4 ${i === 0 ? 'border-yellow-400/40 bg-yellow-500/5' : ''}`}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                >
                  <div className="flex justify-center w-8">
                    {i===0 ? <Trophy size={24} className="text-yellow-400" /> : i===1 ? <Medal size={24} className="text-gray-300" /> : i===2 ? <Medal size={24} className="text-amber-600" /> : <User size={24} className="text-white/40" />}
                  </div>
                  <div className={`w-10 h-10 rounded-full ${COLORS[i % COLORS.length]} flex items-center justify-center font-bold`}>
                    {p.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-display font-semibold">{p.name}</div>
                    <div className="text-sm text-white/50">#{i + 1} place</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-display font-bold text-brand-400">{p.score}</div>
                    <div className="text-xs text-white/40">pts</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* My score */}
            <div className="flex justify-center mb-8">
              <ScoreRing score={myScore} total={room?.questions?.length || 0} />
            </div>

            <div className="flex gap-3">
              <button onClick={() => { cleanup(); setStep(STEPS.LOBBY); setMode(null); setRoom(null); setAnswers({}) }} className="btn-primary flex-1">
                Play Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
