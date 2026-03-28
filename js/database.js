// CogniBridge AI - Firestore Query Storage

class QueryDatabase {
    constructor() {
        this.isReady = false;
        this.db = null;
        this.collection = null;
        this.init();
    }

    init() {
        try {
            const config = window.FIREBASE_CONFIG;
            const hasConfig = config && config.projectId && config.apiKey && config.apiKey !== 'YOUR_FIREBASE_API_KEY';
            const hasSdk = window.firebase?.initializeApp && window.firebase?.firestore;

            if (!hasConfig || !hasSdk) {
                return;
            }

            if (!window.firebase.apps.length) {
                window.firebase.initializeApp(config);
            }

            this.db = window.firebase.firestore();
            this.collection = this.db.collection('queries');
            this.isReady = true;
        } catch (error) {
            console.warn('Firestore init skipped:', error);
        }
    }

    async loadQueries() {
        if (!this.isReady) return [];

        const snapshot = await this.collection.orderBy('lastSeenAt', 'desc').get();
        return snapshot.docs.map((doc) => ({
            firestoreId: doc.id,
            ...doc.data()
        }));
    }

    subscribeQueries(onUpdate, onError) {
        if (!this.isReady || !this.collection) {
            return () => {};
        }

        return this.collection
            .orderBy('lastSeenAt', 'desc')
            .onSnapshot(
                (snapshot) => {
                    const queries = snapshot.docs.map((doc) => ({
                        firestoreId: doc.id,
                        ...doc.data()
                    }));
                    onUpdate?.(queries);
                },
                (error) => {
                    console.warn('Firestore subscription error:', error);
                    onError?.(error);
                }
            );
    }

    async createQuery(query) {
        if (!this.isReady) return query;

        const docRef = await this.collection.add(query);
        return {
            ...query,
            firestoreId: docRef.id
        };
    }

    async updateDuplicateQuery(query) {
        if (!this.isReady || !query.firestoreId) return;

        await this.collection.doc(query.firestoreId).update({
            duplicateCount: query.duplicateCount,
            lastSeenAt: query.lastSeenAt,
            requesters: query.requesters,
            status: query.status,
            resolvedAt: query.resolvedAt || null
        });
    }

    async updateQuery(query) {
        if (!this.isReady || !query.firestoreId) return;

        const payload = {
            text: query.text,
            normalizedText: query.normalizedText,
            source: query.source,
            status: query.status,
            priority: query.priority,
            priorityScore: query.priorityScore,
            category: query.category,
            priorityReason: query.priorityReason,
            tags: query.tags,
            createdAt: query.createdAt,
            lastSeenAt: query.lastSeenAt,
            resolvedAt: query.resolvedAt || null,
            duplicateCount: query.duplicateCount,
            requesters: query.requesters,
            sharedAnswer: query.sharedAnswer,
            transcriptSnapshot: query.transcriptSnapshot
        };

        await this.collection.doc(query.firestoreId).set(payload, { merge: true });
    }
}

window.queryDatabase = new QueryDatabase();
