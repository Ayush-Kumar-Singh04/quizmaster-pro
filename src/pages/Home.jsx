import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { Logo, FileDropZone, LoadingSpinner } from '../components/UI'
import { extractText } from '../lib/fileParser'
import { generateMCQs } from '../lib/aiGenerator'
import { exportToWord } from '../lib/exportUtils'
import { FileText, Target, Clock, Swords, BarChart, Gift, UploadCloud, SlidersHorizontal, BrainCircuit, Trophy, Rocket, Video, Mic, MessageCircle, Mail, Download } from 'lucide-react'

const features = [
  { icon: <Video size={32} className="text-brand-400" />, title: 'YouTube to Quiz', desc: 'Paste a video link and instantly generate study questions.' },
  { icon: <Mic size={32} className="text-accent-400" />, title: 'Podcast Mode', desc: 'Hands-free learning. Listen and speak your answers aloud.' },
  { icon: <MessageCircle size={32} className="text-brand-400" />, title: 'Socratic Tutor', desc: 'Chat with QuizMaster to debate answers and understand concepts.' },
  { icon: <Swords size={32} className="text-accent-400" />, title: 'Arena Mode', desc: 'Compete live with friends in real-time multiplayer rooms.' },
  { icon: <FileText size={32} className="text-brand-400" />, title: 'Any Document', desc: 'Upload PDF, PowerPoint, Word, or plain text files.' },
]

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

export default function Home() {
  const [exportLoading, setExportLoading] = useState(false)
  const [exportError, setExportError] = useState('')
  const [exportCount, setExportCount] = useState(10)

  const handleQuickExport = async (files) => {
    if (!files.length) return
    setExportError('')
    setExportLoading(true)
    try {
      let combined = ''
      for (const f of files) {
        const txt = await extractText(f)
        combined += `\n\n--- ${f.name} ---\n${txt}`
      }
      const qs = await generateMCQs({ text: combined, count: exportCount, difficulty: 'medium' })
      exportToWord(qs, 'QuizMaster Pro - Export')
    } catch (e) {
      setExportError(e.message)
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <div>
      {/* Hero */}
      <div className="text-center py-16 relative">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
          <h1 className="font-display text-5xl md:text-7xl font-bold mt-6 mb-4 leading-tight">
            Turn any doc into
            <br />
            <span className="text-brand-400">an instant quiz</span>
          </h1>
          <p className="text-white/60 text-xl max-w-xl mx-auto mb-10">
            Upload your study material. Set the number of questions. Choose your mode. 
            Compete alone or challenge friends in the Arena.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/quiz" className="btn-primary text-lg px-8 py-4 flex items-center justify-center gap-2">
              <Rocket size={20} /> Start Solo Quiz
            </Link>
            <Link to="/arena" className="btn-secondary text-lg px-8 py-4 flex items-center justify-center gap-2">
              <Swords size={20} /> Enter Arena
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Quick Export Section */}
      <div className="max-w-2xl mx-auto py-8">
        <div className="card glass relative overflow-hidden border-brand-500/30">
          <div className="absolute inset-0 bg-brand-500/5 z-0" />
          <div className="relative z-10">
            <h2 className="font-display text-2xl font-bold mb-2 flex items-center gap-2">
              <Download className="text-brand-400" size={24} /> Quick Word Export
            </h2>
            <p className="text-white/60 mb-6 text-sm">Need to print questions for a class or assignment? Set your question count and drop your documents to instantly download a generated MS Word doc.</p>
            
            <div className="mb-6 bg-white/5 p-4 rounded-xl border border-white/10">
              <label className="block text-sm font-medium text-white/70 mb-3">Number of Questions</label>
              <div className="flex items-center gap-4">
                <input
                  type="range" min="5" max="50" step="5" value={exportCount}
                  onChange={e => setExportCount(+e.target.value)}
                  className="flex-1 accent-brand-500"
                />
                <span className="text-2xl font-display font-bold text-brand-400 w-12 text-right">{exportCount}</span>
              </div>
            </div>

            {exportLoading ? (
               <div className="flex flex-col items-center justify-center py-10">
                 <LoadingSpinner size={36} />
                 <div className="text-brand-300 mt-4 animate-pulse text-sm">Reading docs and crafting questions...</div>
               </div>
            ) : (
               <>
                 <FileDropZone onFiles={handleQuickExport} multiple={true} accept=".pdf,.docx,.pptx,.txt" />
                 {exportError && <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-sm">{exportError}</div>}
               </>
            )}
          </div>
        </div>
      </div>

      {/* Features */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-8"
        variants={container} initial="hidden" animate="show"
      >
        {features.map(f => (
          <motion.div key={f.title} variants={item} className="card glass-hover" whileHover={{ scale: 1.02, y: -2 }}>
            <div className="mb-4">{f.icon}</div>
            <h3 className="font-display font-semibold text-white mb-1">{f.title}</h3>
            <p className="text-white/50 text-sm">{f.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* How it works */}
      <div className="py-12 text-center">
        <h2 className="font-display text-3xl font-bold mb-8">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { n: '1', icon: <UploadCloud size={32} className="mx-auto text-brand-300" />, t: 'Upload', d: 'Drop your PDF, DOCX, or PPTX files' },
            { n: '2', icon: <SlidersHorizontal size={32} className="mx-auto text-brand-300" />, t: 'Configure', d: 'Set questions count & quiz mode' },
            { n: '3', icon: <BrainCircuit size={32} className="mx-auto text-brand-300" />, t: 'Generate', d: 'QuizMaster creates smart MCQs instantly' },
            { n: '4', icon: <Trophy size={32} className="mx-auto text-brand-300" />, t: 'Results', d: 'See your score with explanations' },
          ].map(s => (
            <motion.div key={s.n} className="card text-center" whileHover={{ scale: 1.02, y: -2 }}>
              <div className="w-8 h-8 rounded-full bg-brand-600 text-white text-sm font-bold flex items-center justify-center mx-auto mb-4">
                {s.n}
              </div>
              <div className="mb-3">{s.icon}</div>
              <div className="font-medium mb-1 text-lg">{s.t}</div>
              <div className="text-white/50 text-sm">{s.d}</div>
            </motion.div>
          ))}
        </div>
      </div>
      {/* Contact Section */}
      <div className="py-16 border-t border-white/5 mt-8 text-center max-w-2xl mx-auto">
        <h2 className="font-display text-3xl font-bold mb-4">Have feedback or need help?</h2>
        <p className="text-white/60 text-lg mb-8">
          We are constantly improving QuizMaster Pro. Drop us an email if you have any feature requests, issues, or just want to say hi!
        </p>
        <a href="mailto:anshsingh1762@gmail.com" className="btn-secondary inline-flex items-center justify-center gap-2">
          <Mail size={20} /> anshsingh1762@gmail.com
        </a>
      </div>
    </div>
  )
}
