// CogniBridge AI - AI Tutor Chatbot Module

class ChatbotManager {
    constructor() {
        this.messages = [];
        this.isTyping = false;
        this.speechRecognition = null;
        this.isListening = false;
        this.init();
    }

    init() {
        this.setupSpeechRecognition();
        this.setupEventListeners();
        this.addWelcomeMessage();
    }

    setupEventListeners() {
        document.getElementById('send-chat')?.addEventListener('click', () => this.sendMessage());
        document.getElementById('chat-input-field')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        document.getElementById('voice-chat-toggle')?.addEventListener('click', () => this.toggleVoiceInput());

        // AI control buttons
        document.getElementById('summarize-btn')?.addEventListener('click', () => this.requestSummary());
        document.getElementById('quiz-btn')?.addEventListener('click', () => this.requestQuiz());
        document.getElementById('key-points-btn')?.addEventListener('click', () => this.requestKeyPoints());
    }

    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            this.updateVoiceButton(false, true);
            return;
        }

        this.speechRecognition = new SpeechRecognition();
        this.speechRecognition.lang = 'en-US';
        this.speechRecognition.continuous = false;
        this.speechRecognition.interimResults = true;

        this.speechRecognition.addEventListener('start', () => {
            this.isListening = true;
            this.updateVoiceButton(true);
        });

        this.speechRecognition.addEventListener('result', (event) => {
            const transcript = Array.from(event.results)
                .map((result) => result[0]?.transcript || '')
                .join(' ')
                .trim();

            const inputField = document.getElementById('chat-input-field');
            if (inputField && transcript) {
                inputField.value = transcript;
            }
        });

        this.speechRecognition.addEventListener('end', () => {
            this.isListening = false;
            this.updateVoiceButton(false);
        });

        this.speechRecognition.addEventListener('error', (event) => {
            this.isListening = false;
            this.updateVoiceButton(false);

            if (event.error === 'not-allowed') {
                this.showError('Microphone permission was denied for AI Tutor.');
                return;
            }

            if (event.error === 'no-speech') {
                return;
            }

            this.showError(`Voice input error: ${event.error}`);
        });
    }

    toggleVoiceInput() {
        if (!this.speechRecognition) {
            this.showError('Voice input is not supported in this browser.');
            return;
        }

        if (this.isListening) {
            this.speechRecognition.stop();
            return;
        }

        try {
            this.speechRecognition.start();
        } catch (error) {
            this.showError('Microphone could not start. Please try again.');
        }
    }

    updateVoiceButton(isListening, isDisabled = false) {
        const voiceButton = document.getElementById('voice-chat-toggle');
        if (!voiceButton) return;

        voiceButton.disabled = isDisabled;
        voiceButton.textContent = isListening ? 'Stop Mic' : 'Start Mic';
        voiceButton.setAttribute('aria-pressed', isListening ? 'true' : 'false');
        voiceButton.classList.toggle('is-listening', isListening);
    }

    addWelcomeMessage() {
        const welcomeMessage = {
            role: 'assistant',
            content: 'I can help with class questions, summaries, quizzes, and key points.',
            timestamp: new Date()
        };
        this.messages.push(welcomeMessage);
        this.displayMessage(welcomeMessage);
    }

    sendMessage() {
        const inputField = document.getElementById('chat-input-field');
        if (!inputField) return;

        const message = inputField.value.trim();
        if (!message || this.isTyping) return;

        // Add user message
        const userMessage = {
            role: 'user',
            content: message,
            timestamp: new Date()
        };
        this.messages.push(userMessage);
        this.displayMessage(userMessage);
        window.queryCenter?.addQuery(message, {
            source: 'AI Tutor',
            transcript: window.cogniBridgeApp?.transcript || ''
        });

        // Clear input
        inputField.value = '';

        // Get AI response
        this.getAIResponse(message);
    }

    async getAIResponse(userMessage) {
        if (this.isTyping) return;

        this.isTyping = true;
        this.showTypingIndicator();

        try {
            const transcript = window.cogniBridgeApp?.transcript || '';
            const context = transcript ? `Class transcript:\n${transcript}\n\n` : '';
            const prompt = `${context}User request:\n${userMessage}\n\nAnswer as a class tutor. Keep it clear and concise. Use bullets only if they help.`;

            const response = await this.callGeminiAPI(prompt);

            this.hideTypingIndicator();

            const aiMessage = {
                role: 'assistant',
                content: response,
                timestamp: new Date()
            };
            this.messages.push(aiMessage);
            this.displayMessage(aiMessage);
            window.queryCenter?.attachAnswerToQuery(userMessage, response);

            // Speak the response for visually impaired users
            if (window.ttsManager) {
                window.ttsManager.speakText(response);
            }

        } catch (error) {
            console.error('AI response error:', error);
            this.hideTypingIndicator();
            const transcript = window.cogniBridgeApp?.transcript || '';
            const fallbackResponse = this.buildFallbackResponse(userMessage, transcript, error);

            this.showError(error.message || 'AI service unavailable. Showing local tutor help instead.');

            const aiMessage = {
                role: 'assistant',
                content: fallbackResponse,
                timestamp: new Date()
            };
            this.messages.push(aiMessage);
            this.displayMessage(aiMessage);
            window.queryCenter?.attachAnswerToQuery(userMessage, fallbackResponse);
        } finally {
            this.isTyping = false;
        }
    }

    buildFallbackResponse(userMessage, transcript, error) {
        const request = userMessage.toLowerCase();
        const cleanTranscript = transcript.trim();

        if (!cleanTranscript) {
            return 'There is no live transcript yet. Start a session or add class content, then try again.';
        }

        if (request.includes('summary') || request.includes('summarize')) {
            return this.buildTranscriptSummary(cleanTranscript, true);
        }

        if (request.includes('quiz')) {
            return this.buildTranscriptQuiz(cleanTranscript, true);
        }

        if (request.includes('key point') || request.includes('main point') || request.includes('important point')) {
            return this.buildTranscriptKeyPoints(cleanTranscript, true);
        }

        return this.buildGeneralFallbackResponse(cleanTranscript, error);
    }

    buildTranscriptSummary(transcript, includeNotice = false) {
        const sentences = this.extractSentences(transcript);
        const summarySentences = sentences.slice(0, 3);

        if (!summarySentences.length) {
            return 'I could not make a summary from the current transcript.';
        }

        const prefix = includeNotice ? 'Using local summary mode:\n\n' : '';
        return `${prefix}${summarySentences.join(' ')}`;
    }

    buildTranscriptKeyPoints(transcript, includeNotice = false) {
        const sentences = this.extractSentences(transcript).slice(0, 5);

        if (!sentences.length) {
            return 'I could not pull key points from the current transcript.';
        }

        const bullets = sentences.map((sentence) => `- ${sentence}`);
        const prefix = includeNotice ? 'Using local key points mode:\n\n' : '';
        return `${prefix}${bullets.join('\n')}`;
    }

    buildTranscriptQuiz(transcript, includeNotice = false) {
        const sentences = this.extractSentences(transcript).slice(0, 5);

        if (!sentences.length) {
            return 'I could not create quiz questions from the current transcript.';
        }

        const questions = sentences.map((sentence, index) => `Q${index + 1}. What does this mean: "${sentence}"?`);
        const prefix = includeNotice ? 'Using local quiz mode:\n\n' : '';
        return `${prefix}${questions.join('\n')}`;
    }

    buildGeneralFallbackResponse(transcript, error) {
        const keyPoints = this.extractSentences(transcript).slice(0, 3);
        const errorLine = error?.message ? `API response: ${error.message}` : 'The AI service is unavailable right now.';

        return `${errorLine}\n\nHere is quick help from the current transcript:\n${keyPoints.map((point) => `- ${point}`).join('\n')}`;
    }

    extractSentences(text) {
        return text
            .replace(/\s+/g, ' ')
            .split(/[.!?]+\s+/)
            .map((sentence) => sentence.trim())
            .filter((sentence) => sentence.length > 0);
    }

    async callGeminiAPI(prompt) {
        const apiKey = CONFIG.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
            throw new Error('Gemini API key not configured');
        }

        const requestUrl = `${CONFIG.GEMINI_API_URL}/${CONFIG.GEMINI_MODEL}:generateContent?key=${apiKey}`;
        const body = {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: prompt }]
                }
            ],
            generationConfig: {
                temperature: 0.6,
                maxOutputTokens: 800,
                topP: 0.9,
                topK: 40
            },
            safetySettings: [
                {
                    category: 'HARM_CATEGORY_HARASSMENT',
                    threshold: 'BLOCK_ONLY_HIGH'
                },
                {
                    category: 'HARM_CATEGORY_HATE_SPEECH',
                    threshold: 'BLOCK_ONLY_HIGH'
                },
                {
                    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                    threshold: 'BLOCK_ONLY_HIGH'
                },
                {
                    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                    threshold: 'BLOCK_ONLY_HIGH'
                }
            ]
        };

        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`API request failed: ${response.status} - ${errBody}`);
        }

        const data = await response.json();

        if (data.candidates?.[0]?.content?.parts?.length) {
            const text = data.candidates[0].content.parts
                .map((part) => part.text || '')
                .join('')
                .trim();
            if (text) {
                return text;
            }
        }

        if (data.promptFeedback?.blockReason) {
            throw new Error(`Request blocked: ${data.promptFeedback.blockReason}`);
        }

        throw new Error('Invalid Gemini API response structure');
    }

    requestSummary() {
        const transcript = window.cogniBridgeApp?.transcript || '';
        if (!transcript.trim()) {
            this.showError('No transcript available to summarize. Start a session first.');
            return;
        }

        const summaryRequest = 'Please provide a concise summary of the class transcript.';
        this.simulateUserMessage(summaryRequest);
    }

    requestQuiz() {
        const transcript = window.cogniBridgeApp?.transcript || '';
        if (!transcript.trim()) {
            this.showError('No transcript available to create a quiz from. Start a session first.');
            return;
        }

        const quizRequest = 'Please create 3-5 quiz questions based on the class transcript.';
        this.simulateUserMessage(quizRequest);
    }

    requestKeyPoints() {
        const transcript = window.cogniBridgeApp?.transcript || '';
        if (!transcript.trim()) {
            this.showError('No transcript available to extract key points from. Start a session first.');
            return;
        }

        const keyPointsRequest = 'Please extract the key points from the class transcript.';
        this.simulateUserMessage(keyPointsRequest);
    }

    simulateUserMessage(message) {
        const inputField = document.getElementById('chat-input-field');
        if (inputField) {
            inputField.value = message;
            this.sendMessage();
        }
    }

    displayMessage(message) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.role}`;

        const timeString = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageDiv.innerHTML = `
            <div class="message-content">${this.formatMessage(message.content)}</div>
            <div class="message-time">${timeString}</div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    formatMessage(content) {
        // Basic formatting for AI responses
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    showTypingIndicator() {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        const typingDiv = document.createElement('div');
        typingDiv.className = 'message assistant typing';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;

        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
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

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatbotManager = new ChatbotManager();
});
