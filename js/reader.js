// CogniBridge AI - Study Material Reader Module

class ReaderManager {
    constructor() {
        this.pdfDoc = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.isReading = false;
        this.readingRate = 1;
        this.synth = null;
        this.currentUtterance = null;
        this.init();
    }

    init() {
        // Initialize PDF.js
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('upload-btn')?.addEventListener('click', () => this.handleFileUpload());
        document.getElementById('stop-reading')?.addEventListener('click', () => this.stopReading());
        document.getElementById('play-pause')?.addEventListener('click', () => this.toggleReading());

        // Reading rate slider
        const rateSlider = document.getElementById('reading-rate');
        const rateValue = document.getElementById('reading-rate-value');

        if (rateSlider) {
            rateSlider.addEventListener('input', (e) => {
                this.readingRate = parseFloat(e.target.value);
                if (rateValue) {
                    rateValue.textContent = `${this.readingRate}x`;
                }
                if (this.currentUtterance) {
                    this.currentUtterance.rate = this.readingRate;
                }
            });
        }
    }

    async handleFileUpload() {
        const fileInput = document.getElementById('file-input');
        if (!fileInput || !fileInput.files[0]) {
            this.showError('Please select a file to upload.');
            return;
        }

        const file = fileInput.files[0];
        const fileType = file.type;

        try {
            if (fileType === 'application/pdf') {
                await this.loadPDF(file);
            } else if (fileType === 'text/plain') {
                await this.loadTextFile(file);
            } else {
                this.showError('Unsupported file type. Please upload a PDF or text file.');
            }
        } catch (error) {
            console.error('File loading error:', error);
            this.showError('Error loading file. Please try again.');
        }
    }

    async loadPDF(file) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        this.pdfDoc = pdf;
        this.totalPages = pdf.numPages;
        this.currentPage = 1;

        const text = await this.extractTextFromPDF();
        this.displayContent(text);
    }

    async extractTextFromPDF() {
        let fullText = '';

        for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
            const page = await this.pdfDoc.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n\n';
        }

        return fullText;
    }

    async loadTextFile(file) {
        const text = await file.text();
        this.displayContent(text);
    }

    displayContent(content) {
        const readerContent = document.getElementById('reader-content');
        if (readerContent) {
            readerContent.innerHTML = `<pre>${content}</pre>`;
        }
        this.content = content;
    }

    toggleReading() {
        if (this.isReading) {
            this.pauseReading();
        } else {
            this.startReading();
        }
    }

    startReading() {
        if (!this.content || this.isReading) return;

        if (!('speechSynthesis' in window)) {
            this.showError('Text-to-speech is not supported in this browser.');
            return;
        }

        this.synth = window.speechSynthesis;
        this.currentUtterance = new SpeechSynthesisUtterance(this.content);
        this.currentUtterance.rate = this.readingRate;
        this.currentUtterance.pitch = 1;
        this.currentUtterance.volume = 1;

        this.currentUtterance.onstart = () => {
            this.isReading = true;
            this.updateReadingUI();
        };

        this.currentUtterance.onend = () => {
            this.isReading = false;
            this.updateReadingUI();
        };

        this.currentUtterance.onerror = (event) => {
            console.error('TTS error:', event.error);
            this.isReading = false;
            this.updateReadingUI();
        };

        this.synth.speak(this.currentUtterance);
    }

    pauseReading() {
        if (this.synth && this.isReading) {
            this.synth.pause();
            this.isReading = false;
            this.updateReadingUI();
        }
    }

    resumeReading() {
        if (this.synth && !this.isReading && this.currentUtterance) {
            this.synth.resume();
            this.isReading = true;
            this.updateReadingUI();
        }
    }

    stopReading() {
        if (this.synth) {
            this.synth.cancel();
            this.isReading = false;
            this.currentUtterance = null;
            this.updateReadingUI();
        }
    }

    updateReadingUI() {
        const playPauseBtn = document.getElementById('play-pause');
        if (playPauseBtn) {
            playPauseBtn.textContent = this.isReading ? '⏸️ Pause' : '▶️ Play';
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

// Initialize reader when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.readerManager = new ReaderManager();
});