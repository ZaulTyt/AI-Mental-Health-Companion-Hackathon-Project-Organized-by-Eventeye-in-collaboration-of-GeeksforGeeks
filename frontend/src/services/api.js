import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class APIService {
    constructor() {
        this.client = axios.create({
            baseURL: API_BASE_URL,
            timeout: 10000, // Increased timeout
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        // Enhanced session management
        this.currentSessionId = null;
        this.conversationHistory = [];
        this.userContext = {
            moodPatterns: [],
            recurringIssues: [],
            preferredExercises: [],
            riskLevel: 'low'
        };
        
        // Removed aggressive fallback interceptor so real errors are thrown
    }

    // Enhanced session management
    startNewSession(userId) {
        this.currentSessionId = `session_${Date.now()}_${userId}`;
        this.conversationHistory = [];
        this.userContext = {
            moodPatterns: [],
            recurringIssues: [],
            preferredExercises: [],
            riskLevel: 'low',
            lastMoodCheck: new Date().toISOString()
        };
        return this.currentSessionId;
    }

    getCurrentSessionId() {
        return this.currentSessionId;
    }

    addToHistory(message, sender, emotion = null, metadata = {}) {
        const historyEntry = {
            message,
            sender,
            emotion,
            timestamp: new Date().toISOString(),
            metadata
        };
        
        this.conversationHistory.push(historyEntry);
        
        // Update user context based on conversation
        if (sender === 'user') {
            this.updateUserContext(message, emotion, metadata);
        }
        
        // Keep only last 30 messages for better context management
        if (this.conversationHistory.length > 30) {
            this.conversationHistory = this.conversationHistory.slice(-30);
        }
    }

    updateUserContext(message, emotion, metadata) {
        const messageLower = message.toLowerCase();
        
        // Track mood patterns
        if (emotion && emotion.emotion) {
            this.userContext.moodPatterns.push({
                emotion: emotion.emotion,
                timestamp: new Date().toISOString(),
                confidence: emotion.confidence
            });
            
            // Keep only last 10 mood entries
            if (this.userContext.moodPatterns.length > 10) {
                this.userContext.moodPatterns = this.userContext.moodPatterns.slice(-10);
            }
        }

        // Track recurring topics
        const topics = this.detectTopics(messageLower);
        topics.forEach(topic => {
            if (!this.userContext.recurringIssues.includes(topic)) {
                this.userContext.recurringIssues.push(topic);
            }
        });

        // Update risk level based on content
        this.assessRiskLevel(messageLower, emotion);
    }

    detectTopics(message) {
        const topics = [];
        const topicKeywords = {
            'work': ['work', 'job', 'career', 'boss', 'colleague', 'deadline', 'meeting'],
            'relationships': ['friend', 'partner', 'family', 'parent', 'boyfriend', 'girlfriend', 'wife', 'husband'],
            'academic': ['school', 'college', 'university', 'exam', 'test', 'study', 'homework'],
            'health': ['sick', 'pain', 'doctor', 'hospital', 'medication', 'health'],
            'financial': ['money', 'bill', 'debt', 'financial', 'expensive', 'cost'],
            'sleep': ['sleep', 'insomnia', 'tired', 'exhausted', 'bed', 'night'],
            'trauma': ['abuse', 'trauma', 'ptsd', 'violent', 'assault']
        };

        for (const [topic, keywords] of Object.entries(topicKeywords)) {
            if (keywords.some(keyword => message.includes(keyword))) {
                topics.push(topic);
            }
        }

        return topics;
    }

    assessRiskLevel(message, emotion) {
        const riskKeywords = [
            'suicide', 'kill myself', 'end it all', 'want to die', 'better off dead',
            'harm myself', 'self harm', 'hurt myself', 'no way out'
        ];

        const urgentKeywords = [
            'emergency', 'urgent', 'help now', 'immediate help', 'crisis'
        ];

        if (riskKeywords.some(keyword => message.includes(keyword))) {
            this.userContext.riskLevel = 'high';
        } else if (urgentKeywords.some(keyword => message.includes(keyword)) || 
                  (emotion && emotion.emotion === 'anxious' && emotion.confidence > 0.8)) {
            this.userContext.riskLevel = 'medium';
        } else if (this.userContext.riskLevel === 'high' && 
                  !riskKeywords.some(keyword => message.includes(keyword))) {
            // Gradually lower risk level if no risk keywords detected
            this.userContext.riskLevel = 'medium';
        }
    }

    getEnhancedFallbackResponse(config) {
        const url = config.url;
        const requestData = config.data ? JSON.parse(config.data) : {};
        
        if (url.includes('/chat')) {
            return this.getContextAwareChatResponse(requestData);
        } else if (url.includes('/exercises/breathing')) {
            return this.getPersonalizedBreathingExercise(requestData);
        } else if (url.includes('/emergency/help')) {
            return this.getEnhancedEmergencyResponse(requestData);
        } else {
            return { 
                success: true, 
                message: 'Enhanced demo mode active',
                demo_mode: true
            };
        }
    }

    getContextAwareChatResponse(requestData) {
        const message = requestData.message || '';
        const messageLower = message.toLowerCase();
        const recentHistory = this.conversationHistory.slice(-5);
        
        // Check for immediate risk
        if (this.userContext.riskLevel === 'high') {
            return this.getCrisisResponse(message);
        }

        // Get personalized response
        const response = this.generatePersonalizedResponse(messageLower, recentHistory);
        
        return {
            success: true,
            response: response.text,
            emotion_detected: response.emotion,
            suggest_exercise: response.suggestExercise,
            exercise_type: response.exerciseType,
            follow_up: response.followUp,
            risk_assessment: this.userContext.riskLevel,
            demo_mode: true,
            session_id: this.currentSessionId,
            context_aware: true
        };
    }

    generatePersonalizedResponse(message, recentHistory) {
        // Analyze conversation context
        const context = this.analyzeConversationContext(recentHistory);
        
        // Enhanced response mapping with better context handling
        const responseStrategies = {
            // Crisis situations
            crisis: {
                triggers: ['suicide', 'kill myself', 'end it all', 'want to die', 'harm myself'],
                response: () => this.getCrisisResponse(),
                priority: 100
            },

            // Continuing conversations
            followUp: {
                triggers: [],
                response: () => this.generateFollowUpResponse(context),
                priority: 90,
                condition: () => context.hasRecentExchange && !context.isGreeting
            },

            // Specific emotional states
            emotionalSupport: {
                triggers: ['sad', 'depressed', 'anxious', 'scared', 'angry', 'lonely'],
                response: () => this.getEmotionalSupportResponse(message, context),
                priority: 80
            },

            // Practical help requests
            practicalHelp: {
                triggers: ['help with', 'how to', 'what should', 'advice', 'suggestion'],
                response: () => this.getPracticalAdviceResponse(message, context),
                priority: 70
            },

            // Exercise requests
            exerciseRequest: {
                triggers: ['exercise', 'breathing', 'meditation', 'relax', 'calm'],
                response: () => this.getExerciseSuggestionResponse(message),
                priority: 60
            },

            // General conversation
            general: {
                triggers: [],
                response: () => this.getGeneralResponse(message, context),
                priority: 50
            }
        };

        // Find the highest priority strategy that matches
        const applicableStrategies = Object.values(responseStrategies)
            .filter(strategy => 
                strategy.triggers.some(trigger => message.includes(trigger)) ||
                (strategy.condition && strategy.condition())
            )
            .sort((a, b) => b.priority - a.priority);

        if (applicableStrategies.length > 0) {
            return applicableStrategies[0].response();
        }

        return this.getGeneralResponse(message, context);
    }

    analyzeConversationContext(recentHistory) {
        const userMessages = recentHistory.filter(msg => msg.sender === 'user');
        const aiMessages = recentHistory.filter(msg => msg.sender === 'ai');
        
        const lastUserMessage = userMessages[userMessages.length - 1];
        const lastAiMessage = aiMessages[aiMessages.length - 1];

        return {
            hasRecentExchange: userMessages.length > 0 && aiMessages.length > 0,
            isGreeting: this.isGreeting(lastUserMessage?.message || ''),
            lastTopic: this.extractTopic(lastUserMessage?.message || ''),
            emotionalTone: this.analyzeEmotionalTone(userMessages),
            needsFollowUp: this.needsFollowUp(lastAiMessage),
            conversationLength: recentHistory.length
        };
    }

    isGreeting(message) {
        const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon'];
        return greetings.some(greet => message.toLowerCase().includes(greet));
    }

    extractTopic(message) {
        // Simplified topic extraction
        if (message.includes('work') || message.includes('job')) return 'work';
        if (message.includes('friend') || message.includes('partner')) return 'relationships';
        if (message.includes('school') || message.includes('exam')) return 'academic';
        if (message.includes('anxious') || message.includes('worried')) return 'anxiety';
        if (message.includes('sad') || message.includes('depressed')) return 'depression';
        return 'general';
    }

    analyzeEmotionalTone(messages) {
        if (messages.length === 0) return 'neutral';
        
        const emotions = messages.map(msg => msg.emotion?.emotion).filter(Boolean);
        if (emotions.length === 0) return 'neutral';
        
        // Return the most frequent emotion
        const frequency = {};
        emotions.forEach(emotion => {
            frequency[emotion] = (frequency[emotion] || 0) + 1;
        });
        
        return Object.keys(frequency).reduce((a, b) => 
            frequency[a] > frequency[b] ? a : b
        );
    }

    needsFollowUp(lastAiMessage) {
        if (!lastAiMessage) return false;
        
        const followUpIndicators = [
            'would you like', 'do you want', 'shall we', 'could you tell',
            'what do you think', 'how do you feel about'
        ];
        
        return followUpIndicators.some(indicator => 
            lastAiMessage.message.toLowerCase().includes(indicator)
        );
    }

    getCrisisResponse() {
        return {
            text: "I'm really concerned about what you're sharing. Your safety is the most important thing right now. Please reach out to one of these resources immediately:\n\n• National Suicide Prevention Lifeline: 1-800-273-8255\n• Crisis Text Line: Text HOME to 741741\n• Emergency Services: 911\n\nYou don't have to go through this alone. Professional help is available 24/7, and they're trained to support you through this.",
            emotion: { emotion: 'concerned', confidence: 0.95 },
            suggestExercise: false,
            exerciseType: null,
            followUp: "Please let me know if you've reached out for help, or if there's someone with you right now."
        };
    }

    generateFollowUpResponse(context) {
        const followUps = {
            work: [
                "How is the work situation affecting your overall wellbeing?",
                "What aspects of work feel most manageable right now?",
                "Have you noticed any patterns in what triggers your work stress?"
            ],
            relationships: [
                "How are these relationship dynamics impacting your daily life?",
                "What support do you feel you need in navigating this relationship?",
                "Have you been able to communicate your feelings about this situation?"
            ],
            anxiety: [
                "What helps you feel even slightly more grounded when anxiety arises?",
                "How has your body been responding to these anxious feelings?",
                "What moments of relief have you noticed recently?"
            ],
            depression: [
                "What small activities still bring you moments of comfort?",
                "How has your energy level been throughout the day?",
                "What support feels most accessible to you right now?"
            ],
            general: [
                "How have you been coping with these feelings?",
                "What does support look like for you in this situation?",
                "What small step forward feels possible right now?"
            ]
        };

        const topicFollowUps = followUps[context.lastTopic] || followUps.general;
        const randomFollowUp = topicFollowUps[Math.floor(Math.random() * topicFollowUps.length)];

        return {
            text: randomFollowUp,
            emotion: { emotion: 'empathetic', confidence: 0.8 },
            suggestExercise: context.emotionalTone === 'anxious',
            exerciseType: 'grounding',
            followUp: null
        };
    }

    getEmotionalSupportResponse(message, context) {
        const supportResponses = {
            sad: [
                "It sounds like you're carrying some heavy feelings right now. Thank you for sharing that with me. What's been most challenging about these feelings?",
                "I hear the pain in what you're describing. These emotions can feel overwhelming, but you're not alone in this. What moments have been particularly difficult recently?",
                "Thank you for trusting me with these feelings. It takes courage to acknowledge when we're struggling. What does support look like for you right now?"
            ],
            anxious: [
                "Anxiety can make everything feel so overwhelming. I'm here with you. What's helping you get through these moments?",
                "It sounds like your nervous system is really activated right now. Let's focus on helping you feel a bit more grounded. What's one thing you can see and describe in detail around you?",
                "I understand how consuming anxiety can be. You're safe here, and we can work through this together. What specifically is feeling most worrisome?"
            ],
            angry: [
                "I can feel the intensity in what you're sharing. Anger often points to something that matters deeply to us. What feels most unfair about this situation?",
                "It sounds like you're dealing with some really frustrating circumstances. Your feelings are completely valid. What would help you feel heard or respected in this situation?",
                "Anger can be such a powerful and overwhelming emotion. What space do you need to process these feelings in a way that serves you?"
            ]
        };

        // Determine primary emotion from message
        let primaryEmotion = 'sad';
        if (message.includes('anxious') || message.includes('worried') || message.includes('scared')) {
            primaryEmotion = 'anxious';
        } else if (message.includes('angry') || message.includes('mad') || message.includes('frustrated')) {
            primaryEmotion = 'angry';
        }

        const responses = supportResponses[primaryEmotion] || supportResponses.sad;
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];

        return {
            text: randomResponse,
            emotion: { emotion: primaryEmotion, confidence: 0.85 },
            suggestExercise: true,
            exerciseType: primaryEmotion === 'anxious' ? 'breathing' : 'grounding',
            followUp: "Would you like to explore this further, or try a calming exercise together?"
        };
    }

    getPracticalAdviceResponse(message, context) {
        const adviceResponses = [
            "That's a challenging situation. What approaches have you considered so far?",
            "I understand you're looking for some guidance. What would a positive outcome look like for you in this situation?",
            "That's a thoughtful question. What resources or support systems do you have available to help with this?",
            "I appreciate you seeking input. What's one small step you could take that would move you in a positive direction?",
            "That's an important consideration. What values are most important to you in navigating this situation?"
        ];

        return {
            text: adviceResponses[Math.floor(Math.random() * adviceResponses.length)],
            emotion: { emotion: 'supportive', confidence: 0.8 },
            suggestExercise: false,
            exerciseType: null,
            followUp: "How does that approach resonate with you?"
        };
    }

    getExerciseSuggestionResponse(message) {
        return {
            text: "I'd be happy to guide you through an exercise. Based on what you've shared, I'd recommend starting with a simple breathing exercise to help center yourself. Would you like to try the 4-7-8 breathing technique, or would you prefer a grounding exercise?",
            emotion: { emotion: 'calm', confidence: 0.8 },
            suggestExercise: true,
            exerciseType: 'breathing',
            followUp: "Remember, you can always adjust any exercise to suit your comfort level."
        };
    }

    getGeneralResponse(message, context) {
        const generalResponses = [
            "Thank you for sharing that with me. I'm here to listen and support you. Could you tell me more about what this experience has been like for you?",
            "I appreciate you opening up about this. How has this been affecting your daily routine and overall wellbeing?",
            "Thank you for trusting me with this. What would be most helpful for you right now - someone to listen, practical suggestions, or coping strategies?",
            "I'm listening carefully to what you're sharing. What emotions are coming up for you as we discuss this?",
            "I hear what you're saying. Would you like to explore this further, or would you prefer to shift to something that might help you feel more grounded?",
            "Thank you for being open with me. What aspect of this situation feels most meaningful to focus on right now?"
        ];

        return {
            text: generalResponses[Math.floor(Math.random() * generalResponses.length)],
            emotion: { emotion: 'neutral', confidence: 0.7 },
            suggestExercise: context.emotionalTone === 'anxious',
            exerciseType: 'breathing',
            followUp: "What's coming up for you as you reflect on this?"
        };
    }

    getPersonalizedBreathingExercise(requestData) {
        // Select exercise based on user context and risk level
        let exerciseType = 'box'; // default
        
        if (this.userContext.riskLevel === 'high') {
            exerciseType = 'grounding'; // More immediate relief
        } else if (this.userContext.preferredExercises.length > 0) {
            exerciseType = this.userContext.preferredExercises[0];
        }

        const exercises = {
            '478': {
                name: '4-7-8 Breathing for Calm',
                description: 'Gentle breathing technique to reduce anxiety and promote relaxation',
                instructions: [
                    'Find a comfortable position, either sitting or lying down',
                    'Place one hand on your chest and the other on your belly',
                    'Take a moment to notice your natural breath',
                    'Exhale completely through your mouth',
                    'Close your mouth and inhale quietly through your nose for 4 counts',
                    'Hold your breath for 7 counts',
                    'Exhale slowly through your mouth for 8 counts',
                    'Repeat 3-4 times, noticing the calming effect',
                    'Return to your natural breathing rhythm'
                ],
                duration: 3,
                benefits: ['Reduces anxiety', 'Promotes sleep', 'Calms nervous system', 'Increases mindfulness'],
                bestFor: ['Anxiety', 'Sleep issues', 'Stress']
            },
            'box': {
                name: 'Box Breathing for Focus',
                description: 'Structured breathing to enhance concentration and emotional regulation',
                instructions: [
                    'Sit comfortably with your back straight and shoulders relaxed',
                    'Exhale completely, emptying your lungs',
                    'Inhale through your nose for 4 counts, filling your lungs gradually',
                    'Hold your breath for 4 counts, maintaining comfort',
                    'Exhale through your mouth for 4 counts, releasing tension',
                    'Hold at the bottom for 4 counts before beginning again',
                    'Repeat 5-6 times, maintaining equal timing',
                    'Notice increased mental clarity and calm'
                ],
                duration: 4,
                benefits: ['Improves focus', 'Reduces stress', 'Enhances emotional control', 'Boosts energy'],
                bestFor: ['Stress', 'Focus issues', 'Emotional regulation']
            },
            'grounding': {
                name: '5-4-3-2-1 Grounding Practice',
                description: 'Sensory awareness exercise to anchor in the present moment',
                instructions: [
                    'Take three deep breaths to center yourself',
                    'Look around and name 5 things you can see',
                    'Notice 4 things you can touch or feel',
                    'Listen for 3 things you can hear',
                    'Identify 2 things you can smell',
                    'Name 1 thing you can taste',
                    'Take three more deep breaths',
                    'Notice how you feel more present and connected'
                ],
                duration: 3,
                benefits: ['Reduces anxiety', 'Prevents overwhelm', 'Increases present-moment awareness', 'Grounds in reality'],
                bestFor: ['Panic attacks', 'Anxiety spikes', 'Dissociation']
            }
        };

        const exercise = exercises[exerciseType] || exercises.box;

        return {
            success: true,
            exercise: {
                ...exercise,
                personalized: true,
                risk_level: this.userContext.riskLevel,
                demo_mode: true
            }
        };
    }

    getEnhancedEmergencyResponse(requestData) {
        const crisisLevel = requestData.crisis_level || 'high';
        
        const emergencyResources = {
            high: {
                message: '🚨 Immediate Support Available',
                priority: 'HIGH PRIORITY - Please reach out now',
                actions: [
                    'National Suicide Prevention Lifeline: 1-800-273-8255',
                    'Crisis Text Line: Text HOME to 741741',
                    'Emergency Services: 911',
                    'Online Crisis Chat: suicidepreventionlifeline.org/chat'
                ],
                instructions: 'You are not alone. Professional crisis counselors are available 24/7 and are trained to help. Please reach out to one of these resources right now.'
            },
            medium: {
                message: '📞 Support Resources Available',
                priority: 'Support recommended within 24 hours',
                actions: [
                    'Mental Health America: 1-800-273-TALK',
                    'SAMHSA Helpline: 1-800-662-4357',
                    'Therapy Referrals: psychologytoday.com',
                    'Warm Lines (Peer Support): warmline.org'
                ],
                instructions: 'Connecting with support can help prevent crises from escalating. Consider reaching out to these resources for guidance and support.'
            },
            low: {
                message: '💫 Mental Health Resources',
                priority: 'Proactive support available',
                actions: [
                    'Therapist Directory: psychologytoday.com',
                    'Mental Health Apps: Headspace, Calm, Woebot',
                    'Support Groups: NAMI.org',
                    'Crisis Planning: coping ahead strategies'
                ],
                instructions: 'Building support systems before crises occur is an important part of mental wellness. These resources can help you maintain your wellbeing.'
            }
        };

        const response = emergencyResources[crisisLevel] || emergencyResources.high;

        return {
            success: true,
            emergency_response: response,
            risk_level: this.userContext.riskLevel,
            demo_mode: true,
            timestamp: new Date().toISOString()
        };
    }

    async registerUser(userData) {
        try {
            const response = await this.client.post('/register', userData);
            return response.data;
        } catch (error) {
            if (error.response && error.response.data) return error.response.data;
            return { success: false, error: 'Registration failed' };
        }
    }

    async loginUser(credentials) {
        try {
            const response = await this.client.post('/login', credentials);
            return response.data;
        } catch (error) {
            if (error.response && error.response.data) return error.response.data;
            return { success: false, error: 'Login failed' };
        }
    }

    async chatWithAI(message, userId, emotionContext = {}) {
        if (!this.currentSessionId) {
            this.startNewSession(userId);
        }

        this.addToHistory(message, 'user', emotionContext, {
            wordCount: message.split(' ').length,
            containsQuestion: message.includes('?')
        });

        try {
            const response = await this.client.post('/chat', {
                message,
                user_id: userId,
                emotion_context: emotionContext,
                session_id: this.currentSessionId,
                conversation_history: this.conversationHistory.slice(-8), // Increased context
                user_context: this.userContext
            });

            if (response.data.success) {
                this.addToHistory(response.data.response, 'ai', response.data.emotion_detected, {
                    suggested_exercise: response.data.suggest_exercise,
                    risk_assessment: response.data.risk_assessment
                });
            }

            return response.data;
        } catch (error) {
            console.error('AI chat error, using enhanced fallback:', error);
            const fallbackResponse = this.getContextAwareChatResponse({ message });
            
            this.addToHistory(fallbackResponse.response, 'ai', fallbackResponse.emotion_detected, {
                suggested_exercise: fallbackResponse.suggest_exercise,
                risk_assessment: fallbackResponse.risk_assessment,
                fallback_used: true
            });
            
            return fallbackResponse;
        }
    }

    async getBreathingExercise(type = 'contextual') {
        try {
            const response = await this.client.get('/exercises/breathing', {
                params: { 
                    type,
                    risk_level: this.userContext.riskLevel,
                    user_preferences: this.userContext.preferredExercises
                }
            });
            return response.data;
        } catch (error) {
            console.error('Breathing exercise error, using personalized fallback:', error);
            return this.getPersonalizedBreathingExercise();
        }
    }

    async connectCounselor(userId, preference = 'contextual') {
        try {
            const response = await this.client.post('/emergency/help', {
                user_id: userId,
                crisis_level: this.userContext.riskLevel,
                session_id: this.currentSessionId,
                user_context: this.userContext
            });
            return response.data;
        } catch (error) {
            console.error('Counselor connection error, using enhanced fallback:', error);
            return this.getEnhancedEmergencyResponse({ crisis_level: this.userContext.riskLevel });
        }
    }

    async triggerEmergency(userId, crisisLevel, emotionData = {}) {
        // Update risk level based on manual trigger
        this.userContext.riskLevel = crisisLevel;
        
        try {
            const response = await this.client.post('/emergency/help', {
                user_id: userId,
                crisis_level: crisisLevel,
                emotion_data: emotionData,
                session_id: this.currentSessionId,
                user_context: this.userContext
            });
            return response.data;
        } catch (error) {
            console.error('Emergency trigger error, using enhanced fallback:', error);
            return this.getEnhancedEmergencyResponse({ crisis_level: crisisLevel });
        }
    }

    // Utility methods
    getUserContext() {
        return { ...this.userContext };
    }

    getConversationSummary() {
        const userMessages = this.conversationHistory.filter(msg => msg.sender === 'user');
        const recentEmotions = this.userContext.moodPatterns.slice(-5);
        
        return {
            totalExchanges: this.conversationHistory.length,
            primaryTopics: this.userContext.recurringIssues,
            emotionalPattern: recentEmotions,
            riskLevel: this.userContext.riskLevel,
            lastActivity: this.conversationHistory[this.conversationHistory.length - 1]?.timestamp
        };
    }

    resetUserContext() {
        this.userContext = {
            moodPatterns: [],
            recurringIssues: [],
            preferredExercises: [],
            riskLevel: 'low',
            lastMoodCheck: new Date().toISOString()
        };
    }
}

export default new APIService();