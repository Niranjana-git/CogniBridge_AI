// CogniBridge AI - Speech Recognition Module

class SpeechRecognitionManager {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.transcript = '';
        this.pauseDuringTTS = false;
        this.autoRestartAfterTTS = false;
        this.init();
    }

    init() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.error('Speech recognition not supported');
            this.showError('Speech recognition is not supported in this browser. Please use Google Chrome.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        // Configure recognition
        this.recognition.lang = CONFIG.SPEECH_RECOGNITION.lang;
        this.recognition.continuous = CONFIG.SPEECH_RECOGNITION.continuous;
        this.recognition.interimResults = CONFIG.SPEECH_RECOGNITION.interimResults;
        this.recognition.maxAlternatives = CONFIG.SPEECH_RECOGNITION.maxAlternatives;

        this.setupEventListeners();
    }

    setupEventListeners() {
        if (!this.recognition) return;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateUI();
            window.cogniBridgeApp.startRecording();
            console.log('Speech recognition started');
        };

        this.recognition.onend = () => {
            if (this.pauseDuringTTS) {
                this.pauseDuringTTS = false;
                this.isListening = false;
                this.updateUI();
                console.log('Speech recognition paused during TTS');
                return;
            }

            this.isListening = false;
            this.updateUI();
            window.cogniBridgeApp.stopRecording();
            console.log('Speech recognition ended');

            if (this.autoRestartAfterTTS) {
                this.autoRestartAfterTTS = false;
                if (window.cogniBridgeApp?.sessionActive) {
                    setTimeout(() => this.start(), 300);
                }
            }
        };

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (finalTranscript) {
                this.transcript += finalTranscript + ' ';
                window.cogniBridgeApp.appendTranscript(finalTranscript);
            }

            // Show interim results
            const transcriptEl = document.getElementById('transcript');
            if (transcriptEl && interimTranscript) {
                transcriptEl.innerHTML = Utils.highlightKeywords(`${window.cogniBridgeApp.transcript} ${interimTranscript}`, CONFIG.KEYWORDS);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.showError(`Speech recognition error: ${event.error}`);
            this.stop();
        };

        // UI event listeners
        document.getElementById('start-speech')?.addEventListener('click', () => this.start());
        document.getElementById('stop-speech')?.addEventListener('click', () => this.stop());
        document.getElementById('language-select')?.addEventListener('change', (e) => {
            this.recognition.lang = e.target.value;
        });
    }

    start() {
        if (!window.cogniBridgeApp?.sessionActive) {
            this.showError('Start a session first using the Start Session button.');
            return;
        }

        if (!this.recognition) {
            this.showError('Speech recognition not available');
            return;
        }

        if (this.isListening) return;

        try {
            this.recognition.start();
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            this.showError('Error starting speech recognition');
        }
    }

    stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    updateUI() {
        const startBtn = document.getElementById('start-speech');
        const stopBtn = document.getElementById('stop-speech');

        if (startBtn) {
            startBtn.disabled = this.isListening;
            startBtn.textContent = this.isListening ? 'Listening...' : 'Start Listening';
        }

        if (stopBtn) {
            stopBtn.disabled = !this.isListening;
        }
    }

    updateTranscript() {
        window.cogniBridgeApp.updateTranscript(this.transcript);
    }

    showError(message) {
        // Create a temporary error message
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

// Initialize speech recognition when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.speechManager = new SpeechRecognitionManager();
});