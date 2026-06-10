import { getApiKey } from './storage'

async function getSupportedModel(apiKey) {
  const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
  const modelsData = await modelsRes.json()
  
  if (!modelsRes.ok) {
    throw new Error(modelsData.error?.message || 'Failed to verify API key.')
  }

  const supportedModels = modelsData.models?.filter(m => m.supportedGenerationMethods?.includes('generateContent')) || []
  
  let selectedModel = 'models/gemini-1.5-flash' // fallback
  const preferred = [
    'models/gemini-2.5-flash',
    'models/gemini-flash-latest',
    'models/gemini-2.0-flash-lite',
    'models/gemini-pro-latest'
  ]
  
  for (const pref of preferred) {
    if (supportedModels.some(m => m.name === pref)) {
      selectedModel = pref
      break
    }
  }
  return { selectedModel, supportedModels }
}

export async function generateMCQs({ text, count = 10, difficulty = 'medium', topic = '' }) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('Gemini API key is not configured. Please set the VITE_GEMINI_API_KEY environment variable in your .env or server environment.')

  const prompt = `You are QuizMaster AI, an expert MCQ creator. Based on the following document content, generate exactly ${count} high-quality multiple choice questions.

${topic ? `Focus on the topic: "${topic}"\n` : ''}Difficulty: ${difficulty}

Document content:
"""
${text.slice(0, 15000)}
"""

Return ONLY a valid JSON array (no markdown, no extra text) with this exact structure:
[
  {
    "id": 1,
    "question": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correct": 0,
    "explanation": "Brief explanation why this is correct"
  }
]

Rules:
- Each question must have exactly 4 options (A, B, C, D)
- "correct" is the 0-based index of the correct option
- Make distractors plausible but clearly wrong
- Vary question types: factual, conceptual, application
- No repeated questions
- IMPORTANT: If the document contains multiple sections or files, thoroughly shuffle the questions to cover all topics evenly, rather than asking them sequentially.`

  const { selectedModel, supportedModels } = await getSupportedModel(apiKey)

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${selectedModel}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const available = supportedModels.map(m => m.name.replace('models/', '')).join(', ')
    throw new Error(`Model: ${selectedModel.replace('models/', '')}. Error: ${err.error?.message || 'API error'}. (Available: ${available})`)
  }

  const data = await response.json()
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  
  // Strip markdown fences if present
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  
  try {
    const questions = JSON.parse(cleaned)
    if (!Array.isArray(questions)) throw new Error('Invalid response format')
    return questions.map((q, i) => ({ ...q, id: i + 1 }))
  } catch {
    throw new Error('Failed to parse questions from AI response. Please try again.')
  }
}

export async function chatWithTutor({ question, selectedOption, correctOption, explanation, history, userMessage }) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('Gemini API key is not configured in the server environment.')

  const prompt = `You are QuizMaster AI, an expert Socratic tutor. 
The user is taking a quiz and wants clarification on a question.
Question: "${question}"
Correct Answer: "${correctOption}"
User's Answer: "${selectedOption}"
Provided Explanation: "${explanation}"

Your goal: Guide them to understand WHY their answer was wrong or WHY the correct answer is correct using the Socratic method (ask guiding questions, provide hints). Keep responses short, conversational, and encouraging (max 2-3 sentences). Do NOT act like a robot, act like a friendly human teacher.

Conversation History:
${history.map(m => `${m.role === 'user' ? 'User' : 'Tutor'}: ${m.text}`).join('\n')}
User: ${userMessage}
Tutor:`

  const { selectedModel, supportedModels } = await getSupportedModel(apiKey)

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${selectedModel}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`Tutor failed (Model: ${selectedModel.replace('models/', '')}). Error: ${err.error?.message || 'API error'}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Hmm, I am not sure how to answer that.'
}
