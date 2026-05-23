import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getApiKey, saveApiKey } from '../lib/storage'

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => { 
    const key = getApiKey()
    setApiKey(key)
    if (!key) setIsEditing(true)
  }, [])

  const saveKey = () => {
    saveApiKey(apiKey.trim())
    setSaved(true)
    setIsEditing(false)
    setTimeout(() => setSaved(false), 2500)
  }

  const hasKey = apiKey.trim().length > 0 && !isEditing

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-3xl font-bold mb-6">Settings</h1>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div className="card">
          <h2 className="font-display font-semibold text-lg mb-4">Gemini API Key</h2>
          <p className="text-white/60 text-sm mb-4">
            QuizMaster uses Nova AI (powered by Gemini) to generate questions. Your key is stored only in your browser — never sent anywhere except the Google API.
          </p>
          
          {hasKey ? (
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
              <div className="flex-1">
                <div className="text-sm text-white/50 mb-1">Current API Key</div>
                <div className="font-mono text-white/80">••••••••••••••••••••••••••••••••</div>
              </div>
              <button onClick={() => setIsEditing(true)} className="btn-secondary px-4 py-2 text-sm">
                Change Key
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  type="password"
                  className="input flex-1"
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                />
                <button onClick={saveKey} className={`btn-primary px-5 ${saved ? 'bg-green-600' : ''}`}>
                  {saved ? '✓ Saved' : 'Save'}
                </button>
              </div>
              {apiKey && (
                <button onClick={() => setIsEditing(false)} className="text-white/40 hover:text-white text-sm mt-3 inline-block">
                  Cancel
                </button>
              )}
            </>
          )}

          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
            className="text-brand-400 text-sm hover:underline mt-4 inline-block block">
            Get your free Gemini API key →
          </a>
        </div>

        <div className="card">
          <h3 className="font-medium mb-3">Free tier limits</h3>
          <div className="space-y-2 text-sm">
            {[
              ['Model', 'Gemini 1.5 Flash'],
              ['Pricing', 'Generous free tier available'],
              ['Context Window', '1M tokens — handles huge documents'],
              ['Questions/day', 'Thousands of questions free'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-white/10 last:border-0">
                <span className="text-white/60">{k}</span>
                <span className="text-white/90 text-right">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
