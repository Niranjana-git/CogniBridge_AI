// CogniBridge AI - Speech-to-Sign Translator

class SignTranslator {
    constructor() {
        this.autoTranslate = Utils.loadSetting('autoSigns', true);
        this.history = [];
        this.gifLookup = new Map();
        this.letterLookup = new Set();
        this.maxPhraseLength = 8;
        this.maxResults = 6;
        this.maxHistory = 16;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.renderEmpty('Start a session and speak to see ISL signs and fingerspelling.');
        this.renderHistory();
        await this.loadManifest();
        this.updateStatus('Ready to translate transcript into ISL signs.');
    }

    setupEventListeners() {
        document.getElementById('translate-signs')?.addEventListener('click', () => {
            const transcript = window.cogniBridgeApp?.transcript || '';
            this.translateTranscript(transcript);
        });
    }

    async loadManifest() {
        try {
            const response = await fetch('data/isl-manifest.json');
            if (!response.ok) {
                throw new Error(`Manifest request failed: ${response.status}`);
            }

            const manifest = await response.json();
            (manifest.gifs || []).forEach((name) => {
                this.gifLookup.set(this.normalize(name), name);
            });
            (manifest.letters || []).forEach((letter) => {
                this.letterLookup.add(letter);
            });
        } catch (error) {
            console.error('Failed to load ISL manifest:', error);
            this.updateStatus('Sign assets could not be loaded.');
        }
    }

    translateTranscript(text) {
        if (!text || !text.trim()) {
            this.renderEmpty('Start a session and speak to see ISL signs and fingerspelling.');
            this.updateStatus('Waiting for transcript...');
            return;
        }

        const results = this.buildResults(text);
        this.renderResults(results);
    }

    appendFromTranscript(text) {
        if (!text || !text.trim()) return;
        this.translateTranscript(text);
    }

    buildResults(text) {
        const sanitizedWords = this.tokenize(text);
        const results = [];
        let index = 0;

        while (index < sanitizedWords.length && results.length < this.maxResults) {
            let match = null;

            for (let size = Math.min(this.maxPhraseLength, sanitizedWords.length - index); size > 0; size--) {
                const phraseWords = sanitizedWords.slice(index, index + size);
                const phrase = phraseWords.join(' ');
                const lookupName = this.gifLookup.get(this.normalize(phrase));
                if (lookupName) {
                    match = {
                        type: 'gif',
                        label: lookupName,
                        src: this.getGifPath(lookupName)
                    };
                    index += size;
                    break;
                }
            }

            if (!match) {
                const word = sanitizedWords[index];
                const letters = [...word].filter((letter) => this.letterLookup.has(letter));
                if (letters.length > 0) {
                    match = {
                        type: 'letters',
                        label: word,
                        letters
                    };
                    index += 1;
                } else {
                    index += 1;
                    continue;
                }
            }

            results.push(match);
        }

        if (results.length === 0) {
            return [{
                type: 'empty',
                label: 'No supported ISL matches found for this transcript yet.'
            }];
        }

        this.pushHistory(results);
        return results;
    }

    pushHistory(results) {
        results.forEach((result) => {
            if (result.type === 'empty') return;
            this.history.unshift(`${result.type === 'gif' ? 'Sign' : 'Spell'}: ${result.label}`);
        });
        this.history = this.history.slice(0, this.maxHistory);
        this.renderHistory();
    }

    renderResults(results) {
        const display = document.getElementById('sign-display');
        if (!display) return;

        display.innerHTML = '';

        results.forEach((result) => {
            if (result.type === 'empty') {
                this.renderEmpty(result.label);
                return;
            }

            const card = document.createElement('article');
            card.className = 'sign-result';

            const header = document.createElement('div');
            header.className = 'sign-result-header';

            const label = document.createElement('div');
            label.className = 'sign-label';
            label.textContent = result.label;

            const type = document.createElement('div');
            type.className = 'sign-type';
            type.textContent = result.type === 'gif' ? 'Matched phrase sign' : 'Letter-by-letter fingerspelling';

            header.append(label, type);
            card.appendChild(header);

            if (result.type === 'gif') {
                const img = document.createElement('img');
                img.className = 'sign-visual';
                img.src = result.src;
                img.alt = `ISL sign for ${result.label}`;
                card.appendChild(img);
            } else if (result.type === 'letters') {
                const letterGrid = document.createElement('div');
                letterGrid.className = 'letter-grid';

                result.letters.forEach((letter) => {
                    const letterCard = document.createElement('div');
                    letterCard.className = 'letter-card';

                    const img = document.createElement('img');
                    img.src = this.getLetterPath(letter);
                    img.alt = `ISL letter ${letter.toUpperCase()}`;

                    const caption = document.createElement('span');
                    caption.textContent = letter;

                    letterCard.append(img, caption);
                    letterGrid.appendChild(letterCard);
                });

                card.appendChild(letterGrid);
            }

            display.appendChild(card);
        });

        this.updateStatus(`Showing ${results.filter((item) => item.type !== 'empty').length} translated sign block(s).`);
    }

    renderHistory() {
        const historyEl = document.getElementById('sign-history');
        if (!historyEl) return;

        historyEl.innerHTML = '';
        if (this.history.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'sign-empty';
            empty.textContent = 'Recent sign matches will appear here.';
            historyEl.appendChild(empty);
            return;
        }

        this.history.forEach((item) => {
            const chip = document.createElement('span');
            chip.className = 'history-chip';
            chip.textContent = item;
            historyEl.appendChild(chip);
        });
    }

    renderEmpty(message) {
        const display = document.getElementById('sign-display');
        if (!display) return;

        display.innerHTML = '';
        const empty = document.createElement('p');
        empty.className = 'sign-empty';
        empty.textContent = message;
        display.appendChild(empty);
    }

    clear() {
        this.history = [];
        this.renderEmpty('Start a session and speak to see ISL signs and fingerspelling.');
        this.renderHistory();
        this.updateStatus('Waiting for transcript...');
    }

    updateStatus(message) {
        const status = document.getElementById('sign-status');
        if (status) {
            status.textContent = message;
        }
    }

    tokenize(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z'\s]/g, ' ')
            .split(/\s+/)
            .map((word) => word.trim())
            .filter(Boolean);
    }

    normalize(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z'\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    getGifPath(name) {
        return `ISL_Gifs/${encodeURIComponent(name)}.gif`;
    }

    getLetterPath(letter) {
        return `letters/${encodeURIComponent(letter)}.jpg`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.signTranslator = new SignTranslator();
});
