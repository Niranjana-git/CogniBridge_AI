// CogniBridge AI - Query Center Module

class QueryCenterManager {
    constructor() {
        this.storageKey = 'cognibridge_queries';
        this.studentNames = ['Student A', 'Student B', 'Student C', 'Student D'];
        this.queries = Utils.loadSetting('queries', []);
        this.unsubscribeDatabase = null;
        this.filters = {
            status: 'all',
            priority: 'all'
        };
        this.init();
    }

    init() {
        this.reanalyzeStoredQueries();
        this.setupEventListeners();
        this.render();
        this.connectDatabaseSync();
    }

    setupEventListeners() {
        document.getElementById('add-query-btn')?.addEventListener('click', () => this.handleManualQuery());
        document.getElementById('query-input-field')?.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                this.handleManualQuery();
            }
        });

        document.getElementById('query-status-filter')?.addEventListener('change', (event) => {
            this.filters.status = event.target.value;
            this.renderQueryList();
        });

        document.getElementById('query-priority-filter')?.addEventListener('change', (event) => {
            this.filters.priority = event.target.value;
            this.renderQueryList();
        });

        document.getElementById('query-suggestions')?.addEventListener('click', (event) => {
            const button = event.target.closest('[data-suggestion]');
            if (!button) return;

            const suggestion = button.getAttribute('data-suggestion');
            const chatInput = document.getElementById('chat-input-field');
            if (chatInput) {
                chatInput.value = suggestion;
            }

            window.cogniBridgeApp?.navigateToPanel('ai-panel');
        });

        document.getElementById('query-list')?.addEventListener('click', (event) => {
            const actionButton = event.target.closest('[data-query-action]');
            if (!actionButton) return;

            const queryId = actionButton.getAttribute('data-query-id');
            const action = actionButton.getAttribute('data-query-action');
            this.handleQueryAction(queryId, action);
        });
    }

    handleManualQuery() {
        const input = document.getElementById('query-input-field');
        const text = input?.value.trim();
        if (!text) return;

        this.addQuery(text, { source: this.getNextStudentName() });
        input.value = '';
    }

    async addQuery(text, options = {}) {
        if (!text || !text.trim()) return null;

        const normalizedText = this.normalizeText(text);
        const transcript = options.transcript || window.cogniBridgeApp?.transcript || '';
        const requester = options.source || this.getNextStudentName();
        const existingQuery = this.findSimilarQuery(normalizedText);
        if (existingQuery) {
            existingQuery.duplicateCount = (existingQuery.duplicateCount || 1) + 1;
            existingQuery.lastSeenAt = new Date().toISOString();

            const requesters = new Set(existingQuery.requesters || []);
            requesters.add(requester);
            existingQuery.requesters = Array.from(requesters);

            if (existingQuery.status === 'resolved') {
                existingQuery.status = 'new';
                existingQuery.resolvedAt = null;
            }

            this.persist();
            this.render();
            await window.queryDatabase?.updateDuplicateQuery(existingQuery);
            return existingQuery;
        }

        const analysis = this.analyzeQuery(text, transcript);
        const query = {
            id: `query-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            text: text.trim(),
            normalizedText,
            source: requester,
            status: options.status || 'new',
            priority: analysis.priority,
            priorityScore: analysis.priorityScore,
            category: analysis.category,
            priorityReason: analysis.priorityReason,
            tags: analysis.tags,
            createdAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
            resolvedAt: null,
            duplicateCount: 1,
            requesters: [requester],
            sharedAnswer: '',
            transcriptSnapshot: transcript.slice(0, 400)
        };

        let storedQuery = query;
        storedQuery = await window.queryDatabase?.createQuery(query) || query;

        this.queries.unshift(storedQuery);
        this.persist();
        this.render();
        return storedQuery;
    }

    analyzeQuery(text, transcript) {
        const normalized = text.toLowerCase();
        const transcriptLower = transcript.toLowerCase();
        const tags = [];

        const greetingKeywords = ['hello', 'hi', 'good morning', 'good afternoon', 'good evening', 'thank you', 'thanks'];
        const examKeywords = ['exam', 'test', 'derivation', 'step', 'mark', 'important question', 'viva', 'assignment', 'numerical'];
        const urgentKeywords = ['urgent', 'immediately', 'asap', 'help now'];
        const technicalKeywords = ['error', 'issue', 'not working', 'problem', 'mic', 'audio', 'screen', 'voice', 'login'];
        const accessibilityKeywords = ['can\'t hear', 'cannot hear', 'can\'t see', 'cannot see', 'hearing', 'visual', 'blind', 'sign', 'caption', 'speech', 'accessibility'];
        const quizKeywords = ['quiz', 'question paper', 'practice question'];
        const summaryKeywords = ['summary', 'summarize', 'overview', 'recap'];
        const conceptKeywords = ['explain', 'meaning', 'what is', 'why', 'how', 'example', 'difference', 'photosynthesis', 'formula', 'concept'];

        let score = 0;
        let priorityReason = 'General classroom query';

        if (greetingKeywords.some((keyword) => normalized.includes(keyword))) {
            tags.push('casual');
            score -= 2;
            priorityReason = 'Casual message';
        }

        if (examKeywords.some((keyword) => normalized.includes(keyword))) {
            tags.push('exam');
            score += 5;
            priorityReason = 'Exam-related doubt';
        }
        if (urgentKeywords.some((keyword) => normalized.includes(keyword))) {
            tags.push('urgent');
            score += 4;
            priorityReason = 'Urgent support request';
        }
        if (technicalKeywords.some((keyword) => normalized.includes(keyword))) {
            tags.push('technical');
            score += 2;
            priorityReason = priorityReason === 'General classroom query' ? 'Technical issue' : priorityReason;
        }
        if (accessibilityKeywords.some((keyword) => normalized.includes(keyword))) {
            tags.push('accessibility');
            score += 5;
            priorityReason = 'Accessibility-related support request';
        }
        if (quizKeywords.some((keyword) => normalized.includes(keyword))) {
            tags.push('assessment');
            score += 2;
            priorityReason = priorityReason === 'General classroom query' ? 'Assessment request' : priorityReason;
        }
        if (summaryKeywords.some((keyword) => normalized.includes(keyword))) {
            tags.push('summary');
            score += 1;
            priorityReason = priorityReason === 'General classroom query' ? 'Summary request' : priorityReason;
        }
        if (conceptKeywords.some((keyword) => normalized.includes(keyword))) {
            tags.push('concept');
            score += 3;
            priorityReason = priorityReason === 'General classroom query' ? 'Concept clarification request' : priorityReason;
        }

        const matchingKeywords = CONFIG.KEYWORDS.filter((keyword) => normalized.includes(keyword) || transcriptLower.includes(keyword));
        tags.push(...matchingKeywords.slice(0, 3));
        if (matchingKeywords.length) {
            score += 1;
        }

        let priority = 'low';
        if (score >= 5) {
            priority = 'high';
        } else if (score >= 2) {
            priority = 'medium';
        }

        let category = 'general inquiry';
        if (tags.includes('accessibility')) {
            category = 'accessibility support';
        } else if (tags.includes('exam')) {
            category = 'exam doubt';
        } else if (tags.includes('technical')) {
            category = 'technical issue';
        } else if (tags.includes('assessment')) {
            category = 'quiz request';
        } else if (tags.includes('summary')) {
            category = 'summary request';
        } else if (tags.includes('concept')) {
            category = 'concept clarification';
        }

        return {
            priority,
            priorityScore: score,
            category,
            priorityReason,
            tags: Array.from(new Set(tags)).slice(0, 5)
        };
    }

    reanalyzeStoredQueries() {
        this.queries = this.queries.map((query) => {
            const analysis = this.analyzeQuery(query.text, query.transcriptSnapshot || '');
            return {
                ...query,
                normalizedText: query.normalizedText || this.normalizeText(query.text),
                priority: analysis.priority,
                priorityScore: analysis.priorityScore,
                category: analysis.category,
                priorityReason: analysis.priorityReason,
                tags: analysis.tags,
                duplicateCount: query.duplicateCount || 1,
                requesters: Array.isArray(query.requesters)
                    ? query.requesters
                    : [query.source || this.getNextStudentName()],
                sharedAnswer: query.sharedAnswer || '',
                lastSeenAt: query.lastSeenAt || query.createdAt
            };
        });
        this.persist();
    }

    async handleQueryAction(queryId, action) {
        const query = this.queries.find((item) => item.id === queryId);
        if (!query) return;

        if (action === 'resolve') {
            query.status = 'resolved';
            query.resolvedAt = new Date().toISOString();
        }

        if (action === 'progress') {
            query.status = 'in-progress';
            query.resolvedAt = null;
        }

        if (action === 'reopen') {
            query.status = 'new';
            query.resolvedAt = null;
        }

        if (action === 'send-to-tutor') {
            const chatInput = document.getElementById('chat-input-field');
            if (chatInput) {
                chatInput.value = query.text;
            }
            window.cogniBridgeApp?.navigateToPanel('ai-panel');
        }

        this.persist();
        this.render();
        await window.queryDatabase?.updateQuery(query);
    }

    async attachAnswerToQuery(questionText, answerText) {
        if (!questionText || !answerText) return;

        const normalizedText = this.normalizeText(questionText);
        const query = this.findSimilarQuery(normalizedText);
        if (!query) return;

        query.sharedAnswer = answerText;
        query.status = 'resolved';
        query.resolvedAt = new Date().toISOString();
        this.persist();
        this.render();
        await window.queryDatabase?.updateQuery(query);
    }

    connectDatabaseSync() {
        if (!window.queryDatabase?.isReady) {
            return;
        }

        this.unsubscribeDatabase?.();
        this.unsubscribeDatabase = window.queryDatabase.subscribeQueries(
            (remoteQueries) => {
                this.applyRemoteQueries(remoteQueries);
            }
        );
    }

    applyRemoteQueries(remoteQueries) {
        if (!Array.isArray(remoteQueries)) return;

        this.queries = remoteQueries.map((query) => ({
            ...query,
            duplicateCount: query.duplicateCount || 1,
            requesters: Array.isArray(query.requesters) ? query.requesters : [query.source || 'Student A'],
            sharedAnswer: query.sharedAnswer || '',
            lastSeenAt: query.lastSeenAt || query.createdAt,
            normalizedText: query.normalizedText || this.normalizeText(query.text)
        }));

        this.persist();
        this.render();
    }

    getFilteredQueries() {
        const priorityOrder = { high: 3, medium: 2, low: 1 };

        return this.queries
            .filter((query) => {
                const statusMatch = this.filters.status === 'all' || query.status === this.filters.status;
                const priorityMatch = this.filters.priority === 'all' || query.priority === this.filters.priority;
                return statusMatch && priorityMatch;
            })
            .sort((a, b) => {
                const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
                if (priorityDiff !== 0) return priorityDiff;

                const scoreDiff = (b.priorityScore || 0) - (a.priorityScore || 0);
                if (scoreDiff !== 0) return scoreDiff;

                return new Date(b.lastSeenAt || b.createdAt).getTime() - new Date(a.lastSeenAt || a.createdAt).getTime();
            });
    }

    getSuggestions() {
        const transcript = (window.cogniBridgeApp?.transcript || '').trim();
        const suggestions = [];
        const focusKeyword = CONFIG.KEYWORDS.find((keyword) => transcript.toLowerCase().includes(keyword));

        if (transcript) {
            suggestions.push('Summarize the latest class discussion.');
            suggestions.push('List the most important points from this lesson.');
            suggestions.push('Create a short quiz from the current transcript.');
        } else {
            suggestions.push('Explain the topic in simple words.');
            suggestions.push('Create a few practice questions for students.');
        }

        if (focusKeyword) {
            suggestions.push(`Explain ${focusKeyword} with one simple example.`);
        }

        const unresolvedHigh = this.queries.find((query) => query.priority === 'high' && query.status !== 'resolved');
        if (unresolvedHigh) {
            suggestions.push(`Respond to this urgent query: ${unresolvedHigh.text}`);
        }

        return Array.from(new Set(suggestions)).slice(0, 4);
    }

    render() {
        this.renderAnalytics();
        this.renderPerformanceInsights();
        this.renderSuggestions();
        this.renderQueryList();
    }

    renderAnalytics() {
        const total = this.queries.length;
        const pending = this.queries.filter((query) => query.status !== 'resolved').length;
        const highPriority = this.queries.filter((query) => query.priority === 'high' && query.status !== 'resolved').length;
        const resolved = this.queries.filter((query) => query.status === 'resolved' && query.resolvedAt);

        let averageMinutes = 0;
        if (resolved.length) {
            const totalMinutes = resolved.reduce((sum, query) => {
                const created = new Date(query.createdAt).getTime();
                const resolvedAt = new Date(query.resolvedAt).getTime();
                return sum + Math.max(0, resolvedAt - created) / 60000;
            }, 0);
            averageMinutes = Math.round(totalMinutes / resolved.length);
        }

        this.updateText('query-total-count', total);
        this.updateText('query-pending-count', pending);
        this.updateText('query-high-count', highPriority);
        this.updateText('query-resolution-time', `${averageMinutes}m`);
    }

    renderPerformanceInsights() {
        const topicStats = this.getTopicStats();
        const topTopic = topicStats[0];
        const topQuestions = this.getTopQuestions();
        const totalAskEvents = this.queries.reduce((sum, query) => sum + (query.duplicateCount || 1), 0);
        const activeStudents = new Set(this.queries.flatMap((query) => query.requesters || [])).size;
        const resolvedAskEvents = this.queries.reduce((sum, query) => (
            query.status === 'resolved' ? sum + (query.duplicateCount || 1) : sum
        ), 0);
        const resolutionRate = totalAskEvents ? Math.round((resolvedAskEvents / totalAskEvents) * 100) : 0;
        const repeatedDoubts = this.queries.filter((query) => (query.duplicateCount || 1) > 1).length;

        this.updateText('analytics-top-topic', topTopic ? this.toTitleCase(topTopic.topic) : 'No data yet');
        this.updateText(
            'analytics-top-topic-count',
            topTopic ? `${topTopic.count} doubts raised on this topic` : '0 repeated doubts'
        );
        this.updateText(
            'analytics-engagement',
            `${activeStudents} active student${activeStudents === 1 ? '' : 's'}`
        );
        this.updateText(
            'analytics-engagement-detail',
            totalAskEvents
                ? `${totalAskEvents} total doubts logged, ${repeatedDoubts} repeated doubt${repeatedDoubts === 1 ? '' : 's'}`
                : 'No classroom activity yet'
        );
        this.updateText('analytics-resolution-rate', `${resolutionRate}%`);
        this.updateText(
            'analytics-resolution-detail',
            resolvedAskEvents
                ? `${resolvedAskEvents} student doubts already answered`
                : 'No answered doubts yet'
        );

        this.renderList(
            'analytics-weak-topics',
            topicStats.slice(0, 4).map((topic) => `${this.toTitleCase(topic.topic)} - ${topic.count} doubts`)
        );
        this.renderList(
            'analytics-top-questions',
            topQuestions.map((query) => `${query.text} - ${query.duplicateCount || 1} asks`)
        );
    }

    getTopicStats() {
        const excludedTags = new Set([
            'exam', 'urgent', 'technical', 'accessibility', 'assessment',
            'summary', 'concept', 'casual'
        ]);
        const topicCounts = new Map();

        this.queries.forEach((query) => {
            const topicTags = (query.tags || []).filter((tag) => !excludedTags.has(tag));
            const fallbackTopic = topicTags[0] || query.category || 'general';
            const weight = query.duplicateCount || 1;
            topicCounts.set(fallbackTopic, (topicCounts.get(fallbackTopic) || 0) + weight);
        });

        return Array.from(topicCounts.entries())
            .map(([topic, count]) => ({ topic, count }))
            .sort((a, b) => b.count - a.count);
    }

    getTopQuestions() {
        return [...this.queries]
            .sort((a, b) => {
                const duplicateDiff = (b.duplicateCount || 1) - (a.duplicateCount || 1);
                if (duplicateDiff !== 0) return duplicateDiff;
                return new Date(b.lastSeenAt || b.createdAt).getTime() - new Date(a.lastSeenAt || a.createdAt).getTime();
            })
            .slice(0, 4);
    }

    renderSuggestions() {
        const container = document.getElementById('query-suggestions');
        if (!container) return;

        const suggestions = this.getSuggestions();
        container.innerHTML = suggestions.map((suggestion) => `
            <button class="query-suggestion-chip" data-suggestion="${this.escapeAttribute(suggestion)}">
                ${this.escapeHtml(suggestion)}
            </button>
        `).join('');
    }

    renderQueryList() {
        const container = document.getElementById('query-list');
        if (!container) return;

        const filteredQueries = this.getFilteredQueries();
        if (!filteredQueries.length) {
            container.innerHTML = `
                <div class="query-empty-state">
                    <p>No queries match the current filters yet.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredQueries.map((query) => {
            const actionButton = query.status === 'resolved'
                ? `<button class="btn small" data-query-action="reopen" data-query-id="${query.id}">Reopen</button>`
                : `<button class="btn small" data-query-action="${query.status === 'new' ? 'progress' : 'resolve'}" data-query-id="${query.id}">
                        ${query.status === 'new' ? 'Mark In Progress' : 'Mark Resolved'}
                   </button>`;

            return `
                <article class="query-card">
                    <div class="query-card-head">
                        <div>
                            <div class="query-meta-row">
                                <span class="query-badge priority-${query.priority}">${this.escapeHtml(query.priority)} priority</span>
                                <span class="query-badge status-${query.status}">${this.escapeHtml(query.status)}</span>
                                <span class="query-badge query-category">${this.escapeHtml(query.category)}</span>
                            </div>
                            <p class="query-text">${this.escapeHtml(query.text)}</p>
                            <p class="query-reason">${this.escapeHtml(query.priorityReason || 'Auto-prioritized query')}</p>
                            <p class="query-shared-meta">
                                Shared by ${this.escapeHtml(String(query.duplicateCount || 1))} student${(query.duplicateCount || 1) > 1 ? 's' : ''}: ${this.escapeHtml((query.requesters || []).join(', '))}
                            </p>
                        </div>
                        <span class="query-time">${this.formatTimestamp(query.createdAt)}</span>
                    </div>
                    <div class="query-tags">
                        ${query.tags.map((tag) => `<span class="history-chip">${this.escapeHtml(tag)}</span>`).join('')}
                    </div>
                    ${query.sharedAnswer ? `
                        <div class="query-answer-block">
                            <span class="query-answer-label">Shared Answer</span>
                            <p>${this.escapeHtml(query.sharedAnswer)}</p>
                        </div>
                    ` : ''}
                    <div class="query-card-actions">
                        ${actionButton}
                        <button class="btn small" data-query-action="send-to-tutor" data-query-id="${query.id}">Send To Tutor</button>
                    </div>
                </article>
            `;
        }).join('');
    }

    persist() {
        Utils.saveSetting('queries', this.queries);
    }

    updateText(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = String(value);
        }
    }

    renderList(id, items) {
        const element = document.getElementById(id);
        if (!element) return;

        if (!items.length) {
            element.innerHTML = '<p class="analytics-empty">No classroom data yet.</p>';
            return;
        }

        element.innerHTML = items
            .map((item) => `<div class="analytics-list-item">${this.escapeHtml(item)}</div>`)
            .join('');
    }

    formatTimestamp(value) {
        return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    normalizeText(value) {
        return String(value)
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    findSimilarQuery(normalizedText) {
        return this.queries.find((query) => query.normalizedText === normalizedText);
    }

    getNextStudentName() {
        return this.studentNames[this.queries.length % this.studentNames.length];
    }

    toTitleCase(value) {
        return String(value)
            .split(' ')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    escapeAttribute(value) {
        return this.escapeHtml(value);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.queryCenter = new QueryCenterManager();
});
