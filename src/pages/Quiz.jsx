import { motion, AnimatePresence } from 'framer-motion'
import { extractText } from '../lib/fileParser'
import { generateMCQs, chatWithTutor } from '../lib/aiGenerator'
import { saveSoloResult } from '../lib/storage'
import { celebrateScore } from '../lib/confetti'
import { getYoutubeTranscript } from '../lib/youtube'
import { speakText, stopSpeaking, listenForAnswer, stopListening } from '../lib/speech'
import { FileDropZone, LoadingSpinner, ProgressBar, ScoreRing, TimerBar, Badge } from '../components/UI'
import { BookOpen, Clock, ClipboardList, CheckCircle2, XCircle, Lightbulb, Rocket, Trophy, FileText, Circle, MessageCircle, Send } from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'

const STEPS = { UPLOAD: 0, CONFIG: 1, QUIZ: 2, RESULTS: 3 }

export default function QuizPage() {
  const [step, setStep] = useState(STEPS.UPLOAD)
  const [files, setFiles] = useState([])
  const [extractedText, setExtractedText] = useState('')
  const [config, setConfig] = useState({ count: 10, mode: 'practice', timePerQ: 30, difficulty: 'medium', handsFree: false })
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error, setError] = useState('')
  const [timerKey, setTimerKey] = useState(0)
  const [startTime] = useState(Date.now())
  const [tutorState, setTutorState] = useState({ open: false, messages: [], loading: false, input: '' })
  const resultSaved = useRef(false)
  const recognitionRef = useRef(null)

  // Cleanup speech on unmount or step change
  useEffect(() => {
    return () => {
      stopSpeaking()
      stopListening(recognitionRef.current)
    }
  }, [step])

  const handleFiles = async (newFiles) => {
    setFiles(newFiles)
    setError('')
    setLoading(true)
    setLoadingMsg('Reading your document…')
    try {
      let combined = ''
      for (const f of newFiles) {
        const txt = await extractText(f)
        combined += `\n\n--- ${f.name} ---\n${txt}`
      }
      setExtractedText(combined)
      setStep(STEPS.CONFIG)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleYoutubeUrl = async (url) => {
    setError('')
    setLoading(true)
    setLoadingMsg('Extracting YouTube transcript…')
    try {
      const txt = await getYoutubeTranscript(url)
      setFiles([{ name: `YouTube Video`, isYoutube: true }])
      setExtractedText(txt)
      setStep(STEPS.CONFIG)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const startQuiz = async () => {
    setError('')
    setLoading(true)
    setLoadingMsg('Nova AI is crafting your questions…')
    try {
      const qs = await generateMCQs({ text: extractedText, count: config.count, difficulty: config.difficulty })
      setQuestions(qs)
      setStep(STEPS.QUIZ)
      setCurrent(0)
      setAnswers({})
      setRevealed(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const selectAnswer = (idx) => {
    if (answers[current] !== undefined && config.mode !== 'practice') return
    setAnswers(prev => ({ ...prev, [current]: idx }))
    if (config.mode === 'practice') setRevealed(true)
  }

  const nextQ = useCallback(() => {
    stopSpeaking()
    stopListening(recognitionRef.current)
    setTutorState({ open: false, messages: [], loading: false, input: '' })
    if (current < questions.length - 1) {
      setCurrent(c => c + 1)
      setRevealed(false)
      setTimerKey(k => k + 1)
    } else {
      finishQuiz()
    }
  }, [current, questions.length])

  // Hands-free logic
  useEffect(() => {
    if (step === STEPS.QUIZ && config.handsFree && questions[current]) {
      stopSpeaking()
      stopListening(recognitionRef.current)
      
      if (!revealed) {
        const q = questions[current]
        const textToSpeak = `Question ${current + 1}. ${q.question}. ` +
          q.options.map((opt, i) => `Option ${String.fromCharCode(65+i)}: ${opt.replace(/^[ABCD]\)\s?/, '')}`).join('. ')
          
        speakText(textToSpeak, () => {
          recognitionRef.current = listenForAnswer((idx) => {
            selectAnswer(idx)
            if (config.mode !== 'practice') {
              speakText(`Selected option ${String.fromCharCode(65+idx)}.`, () => nextQ())
            }
          })
        })
      } else if (config.mode === 'practice') {
        const q = questions[current]
        const correctOpt = q.options[q.correct].replace(/^[ABCD]\)\s?/, '')
        const explanation = `The correct answer is Option ${String.fromCharCode(65+q.correct)}, ${correctOpt}. ${q.explanation}`
        speakText(explanation, () => {
          setTimeout(nextQ, 1000)
        })
      }
    }
  }, [current, step, config.handsFree, revealed])

  const finishQuiz = () => {
    setStep(STEPS.RESULTS)
  }

  const handleTutorChat = async () => {
    if (!tutorState.input.trim() || tutorState.loading) return;
    const msg = tutorState.input;
    setTutorState(s => ({ ...s, input: '', loading: true, messages: [...s.messages, { role: 'user', text: msg }] }))
    
    try {
      const q = questions[current]
      const response = await chatWithTutor({
        question: q.question,
        selectedOption: q.options[answers[current]] || 'None',
        correctOption: q.options[q.correct],
        explanation: q.explanation,
        history: tutorState.messages,
        userMessage: msg
      })
      setTutorState(s => ({ ...s, loading: false, messages: [...s.messages, { role: 'tutor', text: response }] }))
    } catch (e) {
      setTutorState(s => ({ ...s, loading: false, messages: [...s.messages, { role: 'tutor', text: 'Error: ' + e.message }] }))
    }
  }

  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0)

  useEffect(() => {
    if (step === STEPS.RESULTS && !resultSaved.current) {
      resultSaved.current = true
      const elapsed = Math.round((Date.now() - startTime) / 1000)
      saveSoloResult({
        score, total: questions.length,
        mode: config.mode,
        difficulty: config.difficulty,
        files: files.map(f => f.name),
        elapsed,
        answers,
        questions: questions.map(q => ({ question: q.question, correct: q.correct }))
      })
      celebrateScore(score, questions.length)
    }
  }, [step])

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <LoadingSpinner size={48} />
      <div className="text-white/60 animate-pulse">{loadingMsg}</div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {/* STEP 0: UPLOAD */}
        {step === STEPS.UPLOAD && (
          <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <h1 className="font-display text-3xl font-bold mb-2">Solo Quiz</h1>
            <p className="text-white/50 mb-6">Upload your study material or paste a YouTube URL</p>
            <FileDropZone onFiles={handleFiles} onUrl={handleYoutubeUrl} multiple={true} />
            {error && <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-sm">{error}</div>}
          </motion.div>
        )}

        {/* STEP 1: CONFIG */}
        {step === STEPS.CONFIG && (
          <motion.div key="config" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <h1 className="font-display text-3xl font-bold mb-2">Configure Quiz</h1>
            <div className="text-white/50 mb-6 flex items-center gap-2">
              <FileText size={18} className="text-white/40" /> {files.map(f => f.name).join(', ')}
              <button onClick={() => setStep(STEPS.UPLOAD)} className="ml-3 text-brand-400 text-sm hover:underline">Change file</button>
            </div>

            <div className="space-y-6">
              {/* Question count */}
              <div className="card">
                <label className="block text-sm font-medium text-white/70 mb-3">Number of Questions</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range" min="5" max="50" step="5" value={config.count}
                    onChange={e => setConfig(c => ({ ...c, count: +e.target.value }))}
                    className="flex-1 accent-brand-500"
                  />
                  <span className="text-3xl font-display font-bold text-brand-400 w-12 text-right">{config.count}</span>
                </div>
              </div>

              {/* Mode */}
              <div className="card">
                <label className="block text-sm font-medium text-white/70 mb-3">Quiz Mode</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'practice', icon: <BookOpen size={24} />, label: 'Practice', desc: 'See answer after each question' },
                    { id: 'timed', icon: <Clock size={24} />, label: 'Timed', desc: 'Time limit per question' },
                    { id: 'exam', icon: <ClipboardList size={24} />, label: 'Exam', desc: 'No hints, score at the end' },
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setConfig(c => ({ ...c, mode: m.id }))}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        config.mode === m.id ? 'border-brand-500 bg-brand-600/20' : 'border-white/15 hover:border-white/30'
                      }`}
                    >
                      <div className={`mb-2 ${config.mode === m.id ? 'text-brand-400' : 'text-white/50'}`}>{m.icon}</div>
                      <div className="font-medium text-sm">{m.label}</div>
                      <div className="text-white/40 text-xs mt-0.5">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Timed settings */}
              {config.mode === 'timed' && (
                <div className="card">
                  <label className="block text-sm font-medium text-white/70 mb-3">Seconds per Question</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range" min="10" max="120" step="5" value={config.timePerQ}
                      onChange={e => setConfig(c => ({ ...c, timePerQ: +e.target.value }))}
                      className="flex-1 accent-accent-500"
                    />
                    <span className="text-3xl font-display font-bold text-accent-400 w-16 text-right">{config.timePerQ}s</span>
                  </div>
                </div>
              )}

              {/* Difficulty & Hands-Free */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="card">
                  <label className="block text-sm font-medium text-white/70 mb-3">Difficulty</label>
                  <div className="flex flex-wrap sm:flex-nowrap gap-2">
                    {['easy','medium','hard'].map(d => (
                      <button
                        key={d}
                        onClick={() => setConfig(c => ({ ...c, difficulty: d }))}
                        className={`flex-1 min-w-[70px] py-2.5 rounded-xl border capitalize text-sm font-medium transition-all ${
                          config.difficulty === d ? 'border-brand-500 bg-brand-600/20 text-brand-300' : 'border-white/15 text-white/60 hover:border-white/30'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="card flex flex-col justify-center items-center cursor-pointer" onClick={() => setConfig(c => ({ ...c, handsFree: !c.handsFree }))}>
                  <div className="text-3xl mb-2">🎧</div>
                  <div className="font-display font-bold">Podcast Mode</div>
                  <div className="text-white/50 text-xs mt-1 text-center">Hands-free voice control</div>
                  <div className={`mt-3 w-12 h-6 rounded-full p-1 transition-colors ${config.handsFree ? 'bg-green-500' : 'bg-white/20'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${config.handsFree ? 'translate-x-6' : ''}`} />
                  </div>
                </div>
              </div>

              {error && <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-sm">{error}</div>}
              <button onClick={startQuiz} className="btn-primary w-full text-lg py-4 flex items-center justify-center gap-2">
                <Rocket size={20} /> Generate Quiz
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: QUIZ */}
        {step === STEPS.QUIZ && questions.length > 0 && (
          <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Badge variant={config.mode === 'practice' ? 'success' : config.mode === 'timed' ? 'warning' : 'info'} className="flex items-center gap-1">
                  {config.mode === 'practice' ? <><BookOpen size={14}/> Practice</> : config.mode === 'timed' ? <><Clock size={14}/> Timed</> : <><ClipboardList size={14}/> Exam</>}
                </Badge>
                <span className="text-white/50 text-sm">{current + 1} / {questions.length}</span>
              </div>
              <button onClick={finishQuiz} className="text-white/40 hover:text-white text-sm transition-colors">
                End Quiz
              </button>
            </div>

            <ProgressBar value={current + 1} max={questions.length} />

            {config.mode === 'timed' && (
              <div className="mt-3">
                <TimerBar key={timerKey} duration={config.timePerQ} onExpire={nextQ} />
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
                className="mt-6"
              >
                <div className="card mb-4">
                  <div className="text-white/40 text-xs font-medium mb-2">QUESTION {current + 1}</div>
                  <p className="text-lg font-medium leading-relaxed">{questions[current].question}</p>
                </div>

                <div className="space-y-3">
                  {questions[current].options.map((opt, idx) => {
                    const selected = answers[current] === idx
                    const correct = questions[current].correct === idx
                    const showResult = revealed || (answers[current] !== undefined && config.mode === 'exam' && step === STEPS.RESULTS)
                    let cls = 'option-btn'
                    if (showResult && correct) cls += ' correct'
                    else if (showResult && selected && !correct) cls += ' incorrect'
                    else if (!showResult && selected) cls += ' selected'
                    else if (showResult && !correct && !selected) cls += ' reveal'
                    return (
                      <motion.button
                        key={idx}
                        className={cls}
                        onClick={() => selectAnswer(idx)}
                        whileTap={{ scale: 0.98 }}
                        animate={selected && !showResult ? { scale: [1, 1.02, 1] } : {}}
                      >
                        <span className="font-mono text-white/40 mr-3">{String.fromCharCode(65 + idx)})</span>
                        {opt.replace(/^[ABCD]\)\s?/, '')}
                      </motion.button>
                    )
                  })}
                </div>

                {/* Practice mode explanation */}
                {revealed && config.mode === 'practice' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 p-4 bg-brand-600/10 border border-brand-500/30 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-medium text-brand-400 flex items-center gap-1"><Lightbulb size={14} /> Explanation</div>
                      <button onClick={() => setTutorState(s => ({ ...s, open: !s.open }))} className="text-xs text-brand-300 hover:underline flex items-center gap-1">
                        <MessageCircle size={14} /> Ask Tutor
                      </button>
                    </div>
                    <p className="text-white/70 text-sm">{questions[current].explanation}</p>
                    
                    {/* Tutor Chat */}
                    {tutorState.open && (
                      <div className="mt-4 border-t border-brand-500/30 pt-4">
                        <div className="space-y-3 mb-3 max-h-48 overflow-y-auto pr-2">
                          {tutorState.messages.length === 0 && <div className="text-xs text-white/40 italic">Ask Nova AI for clarification on this question...</div>}
                          {tutorState.messages.map((m, i) => (
                            <div key={i} className={`text-sm p-2 rounded-lg ${m.role === 'user' ? 'bg-white/10 ml-8 text-right' : 'bg-brand-600/30 mr-8'}`}>
                              {m.text}
                            </div>
                          ))}
                          {tutorState.loading && <div className="text-xs text-brand-400 animate-pulse">Nova is typing...</div>}
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            className="input flex-1 text-sm py-2" 
                            placeholder="Why isn't B correct?"
                            value={tutorState.input}
                            onChange={e => setTutorState(s => ({...s, input: e.target.value}))}
                            onKeyDown={e => e.key === 'Enter' && handleTutorChat()}
                          />
                          <button onClick={handleTutorChat} className="btn-primary px-3 py-2" disabled={tutorState.loading || !tutorState.input}>
                            <Send size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                <div className="flex gap-3 mt-6">
                  {(config.mode === 'practice' || answers[current] !== undefined) && (
                    <button onClick={nextQ} className="btn-primary flex-1">
                      {current < questions.length - 1 ? 'Next Question →' : <span className="flex items-center justify-center gap-2">See Results <Trophy size={18} /></span>}
                    </button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}

        {/* STEP 3: RESULTS */}
        {step === STEPS.RESULTS && (
          <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="text-center mb-8">
              <h1 className="font-display text-3xl font-bold mb-2">Results</h1>
              <p className="text-white/50">{files.map(f => f.name).join(', ')}</p>
            </div>

            <div className="flex justify-center mb-8">
              <ScoreRing score={score} total={questions.length} />
            </div>

            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="card text-center">
                <div className="text-2xl font-display font-bold text-green-400">{score}</div>
                <div className="text-xs text-white/50 mt-1">Correct</div>
              </div>
              <div className="card text-center">
                <div className="text-2xl font-display font-bold text-red-400">{questions.length - score}</div>
                <div className="text-xs text-white/50 mt-1">Wrong</div>
              </div>
              <div className="card text-center">
                <div className="text-2xl font-display font-bold text-brand-400">{Math.round((score / questions.length) * 100)}%</div>
                <div className="text-xs text-white/50 mt-1">Score</div>
              </div>
            </div>

            {/* Answer review */}
            <div className="space-y-3 mb-8">
              <h2 className="font-display font-semibold text-lg">Review Answers</h2>
              {questions.map((q, i) => {
                const correct = answers[i] === q.correct
                return (
                  <div key={i} className={`card border ${correct ? 'border-green-500/30' : 'border-red-500/30'}`}>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5">{correct ? <CheckCircle2 size={20} className="text-green-400" /> : <XCircle size={20} className="text-red-400" />}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium mb-2 text-white/90">{q.question}</p>
                        {!correct && (
                          <p className="text-xs text-red-300 mb-1">Your answer: {q.options[answers[i]] || 'Skipped'}</p>
                        )}
                        <p className="text-xs text-green-300 mb-2">Correct: {q.options[q.correct]}</p>
                        <p className="text-xs text-white/50">{q.explanation}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setStep(STEPS.CONFIG); resultSaved.current = false }} className="btn-secondary flex-1">
                Try Again
              </button>
              <button onClick={() => { setStep(STEPS.UPLOAD); setFiles([]); resultSaved.current = false }} className="btn-primary flex-1">
                New Quiz
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
