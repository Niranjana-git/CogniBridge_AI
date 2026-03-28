// CogniBridge AI - Configuration

const CONFIG = {
    // Google Gemini API Configuration
    GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE',
    GEMINI_MODEL: 'gemini-2.5-flash',
    GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models',

    // Speech Recognition Settings
    SPEECH_RECOGNITION: {
        lang: 'en-US',
        continuous: true,
        interimResults: true,
        maxAlternatives: 1
    },

    // Text-to-Speech Settings
    TTS_DEFAULT_RATE: 1,
    TTS_DEFAULT_VOICE: 'female',
    TTS_FEMALE_VOICE_HINTS: [
        'female', 'woman', 'girl', 'zira', 'hazel', 'susan', 'samantha',
        'victoria', 'karen', 'moira', 'tessa', 'veena', 'raveena', 'fiona',
        'ava', 'aria', 'serena', 'alice', 'allison', 'jenny', 'siri'
    ],

    // Keywords to highlight
    KEYWORDS: [
        'science', 'math', 'physics', 'chemistry', 'biology', 'algebra', 'geometry',
        'calculus', 'theorem', 'hypothesis', 'experiment', 'theory', 'formula',
        'equation', 'function', 'variable', 'constant', 'vector', 'matrix',
        'atom', 'molecule', 'cell', 'tissue', 'organ', 'system', 'ecosystem',
        'evolution', 'photosynthesis', 'respiration', 'mitosis', 'meiosis'
    ],

    // Accessibility Settings
    FONT_SIZE_MIN: 12,
    FONT_SIZE_MAX: 32,
    FONT_SIZE_STEP: 2,

    // Themes
    THEMES: ['dark-theme', 'light-theme', 'high-contrast-1', 'high-contrast-2', 'high-contrast-3'],

    // Dyslexia overlays
    DYSLEXIA_OVERLAYS: ['none', 'yellow', 'blue', 'green', 'red']
};

// Utility functions
const Utils = {
    // Save to localStorage
    saveSetting: (key, value) => {
        try {
            localStorage.setItem(`cognibridge_${key}`, JSON.stringify(value));
        } catch (e) {
            console.warn('Failed to save setting:', e);
        }
    },

    // Load from localStorage
    loadSetting: (key, defaultValue = null) => {
        try {
            const value = localStorage.getItem(`cognibridge_${key}`);
            return value ? JSON.parse(value) : defaultValue;
        } catch (e) {
            console.warn('Failed to load setting:', e);
            return defaultValue;
        }
    },

    // Format time
    formatTime: (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    // Count words
    countWords: (text) => {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    },

    // Download text as file
    downloadText: (text, filename) => {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Highlight keywords in text
    highlightKeywords: (text, keywords) => {
        let highlightedText = text;
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            highlightedText = highlightedText.replace(regex, `<span class="keyword-highlight">$&</span>`);
        });
        return highlightedText;
    }
};
