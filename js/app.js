// CogniBridge AI - Main Application Controller

class CogniBridgeApp {
    constructor() {
        this.transcript = '';
        this.startTime = null;
        this.wordCount = 0;
        this.autoSpeech = Utils.loadSetting('autoSpeech', false);
        this.autoSigns = Utils.loadSetting('autoSigns', true);
        this.sessionActive = Utils.loadSetting('sessionActive', false);
        this.currentTheme = Utils.loadSetting('theme', 'dark-theme');
        this.fontSize = Utils.loadSetting('fontSize', 16);
        this.dyslexiaMode = Utils.loadSetting('dyslexiaMode', false);
        this.contrastTheme = Utils.loadSetting('contrastTheme', 0);
        this.dyslexiaOverlay = Utils.loadSetting('dyslexiaOverlay', 'none');

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTabs();
        this.loadSettings();
        this.updateUI();
    }

    setupEventListeners() {
        document.getElementById('session-toggle')?.addEventListener('click', () => this.toggleSession());
        document.getElementById('theme-toggle')?.addEventListener('click', () => this.cycleTheme());
        document.getElementById('contrast-toggle')?.addEventListener('click', () => this.cycleContrast());
        document.getElementById('dyslexia-toggle')?.addEventListener('click', () => this.toggleDyslexia());

        document.getElementById('font-increase')?.addEventListener('click', () => this.changeFontSize(1));
        document.getElementById('font-decrease')?.addEventListener('click', () => this.changeFontSize(-1));

        document.getElementById('clear-transcript')?.addEventListener('click', () => this.clearTranscript());
        document.getElementById('download-transcript')?.addEventListener('click', () => this.downloadTranscript());

        document.getElementById('auto-speech-toggle')?.addEventListener('click', () => this.toggleAutoSpeech());
        document.getElementById('auto-sign-toggle')?.addEventListener('click', () => this.toggleAutoSigns());

        document.querySelectorAll('.nav-shortcut').forEach((button) => {
            button.addEventListener('click', () => this.navigateToPanel(button.getAttribute('data-target')));
        });

        setInterval(() => this.updateStats(), 1000);
    }

    loadSettings() {
        document.body.className = this.currentTheme;
        if (this.dyslexiaMode) {
            document.body.classList.add('dyslexia-mode');
        }
        document.documentElement.style.fontSize = `${this.fontSize}px`;

        if (this.dyslexiaOverlay !== 'none') {
            document.querySelectorAll('.transcript, .reader-content, textarea').forEach((el) => {
                el.classList.add(`dyslexia-overlay-${this.dyslexiaOverlay}`);
            });
        }
    }

    updateUI() {
        this.updateStats();

        const autoSpeechBtn = document.getElementById('auto-speech-toggle');
        if (autoSpeechBtn) {
            autoSpeechBtn.textContent = `Auto Read: ${this.autoSpeech ? 'ON' : 'OFF'}`;
            autoSpeechBtn.classList.toggle('active', this.autoSpeech);
        }

        const autoSignsBtn = document.getElementById('auto-sign-toggle');
        if (autoSignsBtn) {
            autoSignsBtn.textContent = `Auto Signs: ${this.autoSigns ? 'ON' : 'OFF'}`;
            autoSignsBtn.classList.toggle('active', this.autoSigns);
        }

        const sessionBtn = document.getElementById('session-toggle');
        if (sessionBtn) {
            sessionBtn.textContent = this.sessionActive ? 'Stop Session' : 'Start Session';
            sessionBtn.classList.toggle('active', this.sessionActive);
            sessionBtn.style.border = this.sessionActive ? '1px solid #00ff88' : '1px solid var(--border-color)';
            sessionBtn.style.color = this.sessionActive ? '#00ff88' : 'var(--text-color)';
        }

        const homeSessionStatus = document.getElementById('home-session-status');
        if (homeSessionStatus) {
            homeSessionStatus.textContent = this.sessionActive ? 'Running' : 'Ready';
        }

        const homeWordStatus = document.getElementById('home-word-status');
        if (homeWordStatus) {
            homeWordStatus.textContent = `${this.wordCount} words`;
        }
    }

    toggleSession() {
        this.sessionActive = !this.sessionActive;
        Utils.saveSetting('sessionActive', this.sessionActive);

        if (!this.sessionActive) {
            this.clearTranscript();
            if (window.speechManager) window.speechManager.stop();
            if (window.ttsManager) window.ttsManager.stop();
        }

        this.updateUI();
    }

    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach((button) => {
            button.addEventListener('click', () => this.navigateToPanel(button.getAttribute('data-tab')));
        });

        const initialTab = document.querySelector('.tab-btn.active');
        if (initialTab) {
            this.navigateToPanel(initialTab.getAttribute('data-tab'));
        }
    }

    navigateToPanel(tabName) {
        if (!tabName) return;

        document.querySelectorAll('.tab-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
        });

        document.querySelectorAll('.panel').forEach((panel) => {
            panel.classList.toggle('active', panel.classList.contains(tabName));
        });
    }

    toggleAutoSpeech() {
        this.autoSpeech = !this.autoSpeech;
        Utils.saveSetting('autoSpeech', this.autoSpeech);
        this.updateUI();
    }

    toggleAutoSigns() {
        this.autoSigns = !this.autoSigns;
        Utils.saveSetting('autoSigns', this.autoSigns);
        this.updateUI();
    }

    cycleTheme() {
        const themes = CONFIG.THEMES;
        this.contrastTheme = (this.contrastTheme + 1) % themes.length;
        this.currentTheme = themes[this.contrastTheme];
        document.body.className = this.currentTheme;
        if (this.dyslexiaMode) {
            document.body.classList.add('dyslexia-mode');
        }
        Utils.saveSetting('theme', this.currentTheme);
        Utils.saveSetting('contrastTheme', this.contrastTheme);
    }

    cycleContrast() {
        const contrastThemes = ['high-contrast-1', 'high-contrast-2', 'high-contrast-3'];
        this.contrastTheme = (this.contrastTheme + 1) % contrastThemes.length;
        this.currentTheme = contrastThemes[this.contrastTheme];
        document.body.className = this.currentTheme;
        if (this.dyslexiaMode) {
            document.body.classList.add('dyslexia-mode');
        }
        Utils.saveSetting('theme', this.currentTheme);
        Utils.saveSetting('contrastTheme', this.contrastTheme);
    }

    toggleDyslexia() {
        this.dyslexiaMode = !this.dyslexiaMode;
        if (this.dyslexiaMode) {
            document.body.classList.add('dyslexia-mode');
        } else {
            document.body.classList.remove('dyslexia-mode');
        }
        Utils.saveSetting('dyslexiaMode', this.dyslexiaMode);
    }

    changeFontSize(delta) {
        this.fontSize = Math.max(
            CONFIG.FONT_SIZE_MIN,
            Math.min(CONFIG.FONT_SIZE_MAX, this.fontSize + delta * CONFIG.FONT_SIZE_STEP)
        );
        document.documentElement.style.fontSize = `${this.fontSize}px`;
        Utils.saveSetting('fontSize', this.fontSize);
    }

    updateTranscript(text) {
        this.transcript = text;
        const transcriptEl = document.getElementById('transcript');
        if (transcriptEl) {
            transcriptEl.innerHTML = Utils.highlightKeywords(text, CONFIG.KEYWORDS);
        }

        this.updateStats();
        window.queryCenter?.renderSuggestions();
    }

    appendTranscript(chunk) {
        if (!chunk || !chunk.trim()) return;

        this.transcript = `${this.transcript} ${chunk}`.trim();
        const transcriptEl = document.getElementById('transcript');
        if (transcriptEl) {
            transcriptEl.innerHTML = Utils.highlightKeywords(this.transcript, CONFIG.KEYWORDS);
        }

        if (window.ttsManager && this.autoSpeech) {
            window.ttsManager.speakText(chunk);
        }
        if (window.signTranslator && this.autoSigns) {
            window.signTranslator.appendFromTranscript(chunk);
        }

        this.updateStats();
        window.queryCenter?.renderSuggestions();
    }

    clearTranscript() {
        this.transcript = '';
        this.startTime = null;
        this.wordCount = 0;

        const transcriptEl = document.getElementById('transcript');
        if (transcriptEl) {
            transcriptEl.innerHTML = '';
        }

        if (window.speechManager) {
            window.speechManager.transcript = '';
        }
        if (window.signTranslator) {
            window.signTranslator.clear();
        }

        this.updateStats();
        window.queryCenter?.renderSuggestions();
    }

    downloadTranscript() {
        const filename = `cognibridge-transcript-${new Date().toISOString().split('T')[0]}.txt`;
        Utils.downloadText(this.transcript, filename);
    }

    updateStats() {
        const wordCountEl = document.getElementById('word-count');
        const timeEl = document.getElementById('time-elapsed');

        this.wordCount = Utils.countWords(this.transcript);

        if (wordCountEl) {
            wordCountEl.textContent = `Words: ${this.wordCount}`;
        }

        if (timeEl) {
            if (this.startTime) {
                const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
                timeEl.textContent = `Time: ${Utils.formatTime(elapsed)}`;
            } else {
                timeEl.textContent = 'Time: 00:00';
            }
        }

        const homeWordStatus = document.getElementById('home-word-status');
        if (homeWordStatus) {
            homeWordStatus.textContent = `${this.wordCount} words`;
        }
    }

    startRecording() {
        if (!this.startTime) {
            this.startTime = Date.now();
        }
    }

    stopRecording() {
        // Keep startTime for time tracking
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.cogniBridgeApp = new CogniBridgeApp();
});
