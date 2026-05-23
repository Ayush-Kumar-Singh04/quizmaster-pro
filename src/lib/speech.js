export function speakText(text, onEnd) {
  if (!('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }
  
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Try to find a good English voice
  const voices = window.speechSynthesis.getVoices();
  const enVoice = voices.find(v => v.lang.startsWith('en-US') && v.name.includes('Google')) || voices.find(v => v.lang.startsWith('en'));
  if (enVoice) utterance.voice = enVoice;
  
  utterance.rate = 1.05;
  utterance.onend = () => {
    if (onEnd) onEnd();
  };
  
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function listenForAnswer(onAnswerRecognized) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;
  
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.toLowerCase().trim();
    console.log("Heard:", transcript);
    
    // Very generous keyword matching for A/B/C/D
    if (transcript.match(/\b(a|one|first|1)\b/)) onAnswerRecognized(0);
    else if (transcript.match(/\b(b|two|second|2)\b/)) onAnswerRecognized(1);
    else if (transcript.match(/\b(c|three|third|3|see)\b/)) onAnswerRecognized(2);
    else if (transcript.match(/\b(d|four|fourth|4)\b/)) onAnswerRecognized(3);
    else {
      // Didn't understand, try again
      try { recognition.start(); } catch(e) {}
    }
  };
  
  recognition.onerror = (e) => {
    if (e.error === 'no-speech') {
      try { recognition.start(); } catch(err) {}
    }
  };
  
  try {
    recognition.start();
  } catch (e) {
    console.error("Speech recognition error", e);
  }
  
  return recognition;
}

export function stopListening(recognition) {
  if (recognition) {
    try { recognition.stop(); } catch(e) {}
  }
}
