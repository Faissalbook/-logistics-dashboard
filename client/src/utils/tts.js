let currentUtterance = null;

export function speakChinese(text, { rate = 0.85, pitch = 1.0, volume = 1.0 } = {}) {
  if (!('speechSynthesis' in window)) {
    console.warn('Text-to-speech not supported in this browser');
    return Promise.resolve(false);
  }

  stopSpeaking();

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    // Prefer a Chinese voice if available
    const voices = window.speechSynthesis.getVoices();
    const chineseVoice = voices.find(
      (v) => v.lang === 'zh-CN' || v.lang === 'zh-TW' || v.name.toLowerCase().includes('chinese')
    );
    if (chineseVoice) utterance.voice = chineseVoice;

    utterance.onend = () => {
      currentUtterance = null;
      resolve(true);
    };
    utterance.onerror = () => {
      currentUtterance = null;
      resolve(false);
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
}

export function isSpeaking() {
  return 'speechSynthesis' in window && window.speechSynthesis.speaking;
}

export function isSupported() {
  return 'speechSynthesis' in window;
}

// Load voices (needed on some browsers)
if ('speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    window.speechSynthesis.getVoices();
  });
}
