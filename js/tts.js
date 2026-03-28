// CogniBridge AI - Text-to-Speech Module

class TextToSpeechManager {
    constructor() {
        this.synth = null;
        this.voices = [];
        this.currentVoice = null;
        this.rate = CONFIG.TTS_DEFAULT_RATE;
        this.isSpeaking = false;
        this.init();
    }

    init() {
        if (!('speechSynthesis' in window)) {
            console.error('Text-to-speech not supported');
            this.showError('Text-to-speech is not supported in this browser.');
            return;
        }

        this.synth = window.speechSynthesis;
        this.loadVoices();
        this.setupEventListeners();

        // Voices might not be loaded immediately
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }
    }

    loadVoices() {
        this.voices = this.synth.getVoices();

        // Set default voice
        if (!this.currentVoice && this.voices.length > 0) {
            this.currentVoice = this.getPreferredVoice();
        }

        this.populateVoiceSelect();
    }

    getPreferredVoice() {
        if (!this.voices.length) return null;

        const englishVoices = this.voices.filter((voice) => voice.lang?.toLowerCase().startsWith('en'));
        const preferredPool = englishVoices.length ? englishVoices : this.voices;
        const femaleHints = (CONFIG.TTS_FEMALE_VOICE_HINTS || []).map((hint) => hint.toLowerCase());

        const femaleVoice = preferredPool.find((voice) => {
            const voiceName = `${voice.name} ${voice.voiceURI || ''}`.toLowerCase();
            return femaleHints.some((hint) => voiceName.includes(hint));
        });

        return femaleVoice || preferredPool[0] || this.voices[0];
    }

    populateVoiceSelect() {
        const voiceSelect = document.getElementById('voice-select');
        if (!voiceSelect) return;

        voiceSelect.innerHTML = '';

        this.voices.forEach((voice, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${voice.name} (${voice.lang})`;
            if (voice === this.currentVoice) {
                option.selected = true;
            }
            voiceSelect.appendChild(option);
        });
    }

    setupEventListeners() {
        // TTS controls
        document.getElementById('speak-btn')?.addEventListener('click', () => this.speak());
        document.getElementById('stop-tts-btn')?.addEventListener('click', () => this.stop());

        // Rate slider
        const rateSlider = document.getElementById('rate-slider');
        const rateValue = document.getElementById('rate-value');

        if (rateSlider) {
            rateSlider.addEventListener('input', (e) => {
                this.rate = parseFloat(e.target.value);
                if (rateValue) {
                    rateValue.textContent = `${this.rate}x`;
                }
            });
        }

        // Voice select
        document.getElementById('voice-select')?.addEventListener('change', (e) => {
            const voiceIndex = parseInt(e.target.value);
            this.currentVoice = this.voices[voiceIndex];
        });

        // Speak transcript button (if exists)
        document.getElementById('speak-transcript')?.addEventListener('click', () => {
            const transcript = window.cogniBridgeApp?.transcript || '';
            if (transcript.trim()) {
                this.speakText(transcript);
            }
        });
    }

    speak() {
        const textInput = document.getElementById('tts-input');
        if (!textInput) return;

        const text = textInput.value.trim();
        if (text) {
            this.speakText(text);
        }
    }

    speakText(text) {
        if (!this.synth) return;

        // Stop any current speech
        this.stop();

        const utterance = new SpeechSynthesisUtterance(text);

        if (this.currentVoice) {
            utterance.voice = this.currentVoice;
        }

        utterance.rate = this.rate;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = () => {
            this.isSpeaking = true;
            this.updateUI();

            if (window.speechManager && window.speechManager.isListening) {
                window.speechManager.pauseDuringTTS = true;
                window.speechManager.autoRestartAfterTTS = true;
                window.speechManager.recognition.stop();
            }
        };

        utterance.onend = () => {
            this.isSpeaking = false;
            this.updateUI();

            if (window.speechManager && window.speechManager.autoRestartAfterTTS) {
                window.speechManager.autoRestartAfterTTS = false;
                window.speechManager.pauseDuringTTS = false;
                if (window.cogniBridgeApp?.sessionActive) {
                    setTimeout(() => window.speechManager.start(), 300);
                }
            }
        };

        utterance.onerror = (event) => {
            console.error('TTS error:', event.error);
            this.isSpeaking = false;
            this.updateUI();
        };

        this.synth.speak(utterance);
    }

    stop() {
        if (this.synth && this.isSpeaking) {
            this.synth.cancel();
            this.isSpeaking = false;
            this.updateUI();
        }
    }

    updateUI() {
        const speakBtn = document.getElementById('speak-btn');
        const stopBtn = document.getElementById('stop-tts-btn');

        if (speakBtn) {
            speakBtn.disabled = this.isSpeaking;
            speakBtn.textContent = this.isSpeaking ? 'Speaking...' : 'Speak';
        }

        if (stopBtn) {
            stopBtn.disabled = !this.isSpeaking;
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff6b6b;
            color: white;
            padding: 1rem;
            border-radius: 8px;
            z-index: 1000;
            max-width: 300px;
        `;

        document.body.appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

// Initialize TTS when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ttsManager = new TextToSpeechManager();
});
