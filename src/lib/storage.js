// Solo quiz history stored in localStorage
const SOLO_KEY = 'qm_solo_history'
const SETTINGS_KEY = 'qm_settings'
const MAX_SOLO = 50

export function getSoloHistory() {
  try {
    return JSON.parse(localStorage.getItem(SOLO_KEY) || '[]')
  } catch { return [] }
}

export function saveSoloResult(result) {
  const history = getSoloHistory()
  history.unshift({ ...result, id: crypto.randomUUID(), savedAt: new Date().toISOString() })
  localStorage.setItem(SOLO_KEY, JSON.stringify(history.slice(0, MAX_SOLO)))
}

export function clearSoloHistory() {
  localStorage.removeItem(SOLO_KEY)
}

export function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
  } catch { return {} }
}

export function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

export function getApiKey() {
  return import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('qm_api_key') || ''
}
export function saveApiKey(k) {
  localStorage.setItem('qm_api_key', k)
}
