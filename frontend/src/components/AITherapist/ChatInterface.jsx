import React, { useState, useRef, useEffect } from 'react';
import APIService from '../../services/api';
import './ChatInterface.css';

const ChatInterface = ({ user, currentEmotions }) => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [currentSession, setCurrentSession] = useState(null);
    const [isMobile, setIsMobile] = useState(false);
    const [showQuickReplies, setShowQuickReplies] = useState(true);
    const [showHistoryPanel, setShowHistoryPanel] = useState(false);
    const [chatSessions, setChatSessions] = useState([]);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    // Detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ 
            behavior: "smooth",
            block: "nearest"
        });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [inputMessage]);

    // Initialize session and load chat history
    useEffect(() => {
        const initializeChat = async () => {
            const sessionId = APIService.startNewSession(user.id);
            setCurrentSession(sessionId);
            
            const chatHistory = await loadChatHistory(user.id, sessionId);
            
            if (chatHistory && chatHistory.length > 0) {
                setMessages(chatHistory);
                setShowQuickReplies(false);
            } else {
                setMessages([{
                    id: 1,
                    text: "Hello! I'm your AI mental health companion. I'm here to listen, support, and help you navigate whatever you're going through. How are you feeling today?",
                    sender: 'ai',
                    timestamp: new Date().toISOString(),
                    isDemo: false,
                    sessionId: sessionId
                }]);
            }
        };

        initializeChat();
    }, [user.id]);

    // Load all chat sessions when component mounts or when messages change
    useEffect(() => {
        const sessions = getUserChatSessions();
        setChatSessions(sessions);
    }, [messages, user.id]);

    // Save messages to localStorage whenever messages change
    useEffect(() => {
        if (messages.length > 0 && user.id) {
            saveChatHistory(user.id, currentSession, messages);
            
            // Hide quick replies after first user message
            if (messages.some(msg => msg.sender === 'user')) {
                setShowQuickReplies(false);
            }
        }
    }, [messages, user.id, currentSession]);

    const loadChatHistory = async (userId, sessionId) => {
        try {
            const storageKey = `chat_history_${userId}_${sessionId}`;
            const savedHistory = localStorage.getItem(storageKey);
            return savedHistory ? JSON.parse(savedHistory) : [];
        } catch (error) {
            console.error('Error loading chat history:', error);
            return [];
        }
    };

    const saveChatHistory = (userId, sessionId, messages) => {
        try {
            const storageKey = `chat_history_${userId}_${sessionId}`;
            localStorage.setItem(storageKey, JSON.stringify(messages));
        } catch (error) {
            console.error('Error saving chat history:', error);
        }
    };

    // Enhanced function to get all chat sessions with questions
    const getUserChatSessions = () => {
        try {
            const sessions = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(`chat_history_${user.id}_`)) {
                    const sessionId = key.split('_').pop();
                    const sessionData = localStorage.getItem(key);
                    const messages = JSON.parse(sessionData || '[]');
                    
                    // Extract user questions from this session
                    const userQuestions = messages
                        .filter(msg => msg.sender === 'user')
                        .map(msg => ({
                            text: msg.text,
                            timestamp: msg.timestamp,
                            type: msg.type || 'user_message'
                        }));
                    
                    // Get AI responses
                    const aiResponses = messages
                        .filter(msg => msg.sender === 'ai')
                        .map(msg => ({
                            text: msg.text,
                            timestamp: msg.timestamp,
                            type: msg.type || 'ai_response'
                        }));

                    sessions.push({
                        sessionId,
                        messageCount: messages.length,
                        userQuestionsCount: userQuestions.length,
                        aiResponsesCount: aiResponses.length,
                        lastMessage: messages[messages.length - 1]?.timestamp,
                        startTime: messages[0]?.timestamp,
                        userQuestions: userQuestions,
                        aiResponses: aiResponses,
                        preview: messages.slice(-2).map(msg => ({
                            text: msg.text.substring(0, 50) + (msg.text.length > 50 ? '...' : ''),
                            sender: msg.sender,
                            timestamp: msg.timestamp
                        }))
                    });
                }
            }
            
            // Sort sessions by last message timestamp (newest first)
            return sessions.sort((a, b) => new Date(b.lastMessage) - new Date(a.lastMessage));
        } catch (error) {
            console.error('Error getting user sessions:', error);
            return [];
        }
    };

    const sendMessage = async () => {
        if (!inputMessage.trim()) return;

        const userMessage = {
            id: Date.now(),
            text: inputMessage,
            sender: 'user',
            timestamp: new Date().toISOString(),
            isDemo: false,
            sessionId: currentSession,
            type: 'user_message'
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);
        setShowQuickReplies(false);

        try {
            const response = await APIService.chatWithAI(inputMessage, user.id, currentEmotions);
            
            if (response.demo_mode && !isDemoMode) {
                setIsDemoMode(true);
            }
            
            if (response.success) {
                const aiMessage = {
                    id: Date.now() + 1,
                    text: response.response,
                    sender: 'ai',
                    timestamp: new Date().toISOString(),
                    suggestExercise: response.suggest_exercise,
                    emotionDetected: response.emotion_detected,
                    followUp: response.follow_up,
                    exerciseType: response.exercise_type,
                    isDemo: response.demo_mode || false,
                    sessionId: response.session_id || currentSession,
                    type: 'ai_response'
                };
                
                setMessages(prev => [...prev, aiMessage]);
            } else {
                const errorMessage = {
                    id: Date.now() + 1,
                    text: response.response || "I'm here to listen. Please tell me more about how you're feeling.",
                    sender: 'ai',
                    timestamp: new Date().toISOString(),
                    isDemo: true,
                    sessionId: currentSession,
                    type: 'ai_response'
                };
                setMessages(prev => [...prev, errorMessage]);
                setIsDemoMode(true);
            }
        } catch (error) {
            console.error('Chat error:', error);
            const fallbackResponse = APIService.getEnhancedFallbackChatResponse({ message: inputMessage });
            const fallbackMessage = {
                id: Date.now() + 1,
                text: fallbackResponse.response,
                sender: 'ai',
                timestamp: new Date().toISOString(),
                suggestExercise: fallbackResponse.suggest_exercise,
                emotionDetected: fallbackResponse.emotion_detected,
                followUp: fallbackResponse.follow_up,
                exerciseType: fallbackResponse.exercise_type,
                isDemo: true,
                sessionId: currentSession,
                type: 'ai_response'
            };
            setMessages(prev => [...prev, fallbackMessage]);
            setIsDemoMode(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleInputChange = (e) => {
        setInputMessage(e.target.value);
    };

    const startExercise = async (exerciseType = 'breathing') => {
        try {
            const response = await APIService.getBreathingExercise(exerciseType);
            if (response.success) {
                const exerciseMessage = {
                    id: Date.now(),
                    text: `Let's try the "${response.exercise.name}" exercise. ${response.exercise.description}`,
                    sender: 'ai',
                    timestamp: new Date().toISOString(),
                    exerciseDetails: response.exercise,
                    isDemo: response.demo_mode || false,
                    sessionId: currentSession,
                    type: 'exercise_suggestion'
                };
                setMessages(prev => [...prev, exerciseMessage]);
                
                const instructionMessage = {
                    id: Date.now() + 1,
                    text: "Follow these steps:\n• " + response.exercise.instructions.join('\n• '),
                    sender: 'ai',
                    timestamp: new Date().toISOString(),
                    isDemo: response.demo_mode || false,
                    sessionId: currentSession,
                    type: 'exercise_instructions'
                };
                setMessages(prev => [...prev, instructionMessage]);

                const benefitsMessage = {
                    id: Date.now() + 2,
                    text: `Benefits: ${response.exercise.benefits.join(', ')}. Duration: ${response.exercise.duration} minutes.`,
                    sender: 'ai',
                    timestamp: new Date().toISOString(),
                    isDemo: response.demo_mode || false,
                    sessionId: currentSession,
                    type: 'exercise_benefits'
                };
                setMessages(prev => [...prev, benefitsMessage]);
            }
        } catch (error) {
            console.error('Exercise error:', error);
        }
    };

    const handleFollowUp = (followUpText) => {
        const followUpMessage = {
            id: Date.now(),
            text: followUpText,
            sender: 'user',
            timestamp: new Date().toISOString(),
            isDemo: false,
            sessionId: currentSession,
            type: 'follow_up_response'
        };
        setMessages(prev => [...prev, followUpMessage]);
        setTimeout(() => {
            sendFollowUpMessage(followUpText);
        }, 500);
    };

    const sendFollowUpMessage = async (messageText) => {
        setIsLoading(true);
        try {
            const response = await APIService.chatWithAI(messageText, user.id, currentEmotions);
            
            if (response.demo_mode && !isDemoMode) {
                setIsDemoMode(true);
            }
            
            if (response.success) {
                const aiMessage = {
                    id: Date.now() + 1,
                    text: response.response,
                    sender: 'ai',
                    timestamp: new Date().toISOString(),
                    suggestExercise: response.suggest_exercise,
                    emotionDetected: response.emotion_detected,
                    followUp: response.follow_up,
                    exerciseType: response.exercise_type,
                    isDemo: response.demo_mode || false,
                    sessionId: response.session_id || currentSession,
                    type: 'ai_response'
                };
                
                setMessages(prev => [...prev, aiMessage]);
            }
        } catch (error) {
            console.error('Follow-up chat error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const clearChat = () => {
        const newSessionId = APIService.startNewSession(user.id);
        setCurrentSession(newSessionId);
        setMessages([{
            id: 1,
            text: "Hello! I've started a new conversation. I'm here to listen and support you. What would you like to talk about today?",
            sender: 'ai',
            timestamp: new Date().toISOString(),
            isDemo: false,
            sessionId: newSessionId,
            type: 'welcome_message'
        }]);
        setIsDemoMode(false);
        setShowQuickReplies(true);
        setShowHistoryPanel(false);
    };

    const exportChatHistory = () => {
        try {
            const chatData = {
                userId: user.id,
                sessionId: currentSession,
                exportDate: new Date().toISOString(),
                messageCount: messages.length,
                userQuestions: getUserQuestions(),
                messages: messages
            };
            
            const dataStr = JSON.stringify(chatData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `chat_history_${user.id}_${currentSession}_${Date.now()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting chat history:', error);
        }
    };

    const viewAllSessions = () => {
        const sessions = getUserChatSessions();
        setChatSessions(sessions);
        setShowHistoryPanel(true);
    };

    const closeHistoryPanel = () => {
        setShowHistoryPanel(false);
    };

    const loadSession = async (sessionId) => {
        const sessionHistory = await loadChatHistory(user.id, sessionId);
        if (sessionHistory && sessionHistory.length > 0) {
            setMessages(sessionHistory);
            setCurrentSession(sessionId);
            setShowHistoryPanel(false);
            setShowQuickReplies(false);
        }
    };

    const deleteSession = (sessionId) => {
        if (window.confirm('Are you sure you want to delete this chat session?')) {
            const storageKey = `chat_history_${user.id}_${sessionId}`;
            localStorage.removeItem(storageKey);
            
            // Update sessions list
            const updatedSessions = getUserChatSessions();
            setChatSessions(updatedSessions);
            
            // If current session is deleted, create new one
            if (sessionId === currentSession) {
                clearChat();
            }
        }
    };

    const getEmotionColor = (emotion) => {
        const colors = {
            happy: '#4ecdc4',
            sad: '#45b7d1',
            angry: '#ff6b6b',
            anxious: '#feca57',
            neutral: '#95a5a6',
            fearful: '#ff9ff3',
            surprised: '#a29bfe'
        };
        return colors[emotion] || '#95a5a6';
    };

    const getQuickReplies = () => {
        const mobileReplies = [
            "Feeling anxious",
            "Rough day",
            "Can't sleep",
            "Feeling lonely",
            "Work stress",
            "Need help"
        ];

        const desktopReplies = [
            "I'm feeling anxious",
            "I'm having a rough day",
            "I can't sleep well",
            "I'm feeling lonely",
            "Work is stressing me out",
            "I need coping strategies"
        ];

        return isMobile ? mobileReplies : desktopReplies;
    };

    const handleQuickReply = (reply) => {
        setInputMessage(reply);
        setTimeout(() => {
            sendMessage();
        }, 100);
    };

    const getUserQuestions = () => {
        return messages.filter(msg => msg.sender === 'user');
    };

    const formatSessionId = (sessionId) => {
        if (!sessionId) return '';
        return isMobile ? sessionId.substring(0, 6) + '...' : sessionId.substring(0, 8);
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleDateString() + ' ' + 
               new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleTouchStart = (e) => {
        e.currentTarget.style.transform = 'scale(0.98)';
    };

    const handleTouchEnd = (e) => {
        e.currentTarget.style.transform = 'scale(1)';
    };

    // History Panel Component
    const HistoryPanel = () => (
        <div className="history-panel-overlay">
            <div className="history-panel">
                <div className="history-panel-header">
                    <h3>Chat History</h3>
                    <button 
                        className="close-history-btn"
                        onClick={closeHistoryPanel}
                    >
                        ✕
                    </button>
                </div>
                <div className="history-panel-content">
                    {chatSessions.length === 0 ? (
                        <div className="no-history">No chat history found</div>
                    ) : (
                        chatSessions.map((session, index) => (
                            <div key={session.sessionId} className="session-card">
                                <div className="session-header">
                                    <div className="session-info">
                                        <strong>Session {index + 1}</strong>
                                        <span className="session-id">ID: {formatSessionId(session.sessionId)}</span>
                                    </div>
                                    <div className="session-actions">
                                        <button 
                                            className="load-session-btn"
                                            onClick={() => loadSession(session.sessionId)}
                                        >
                                            Load
                                        </button>
                                        <button 
                                            className="delete-session-btn"
                                            onClick={() => deleteSession(session.sessionId)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="session-stats">
                                    <span>📝 {session.userQuestionsCount} questions</span>
                                    <span>💬 {session.aiResponsesCount} responses</span>
                                    <span>⏱️ {formatDate(session.lastMessage)}</span>
                                </div>
                                
                                <div className="session-questions">
                                    <strong>Questions Asked:</strong>
                                    {session.userQuestions.length > 0 ? (
                                        <div className="questions-list">
                                            {session.userQuestions.slice(0, 3).map((question, qIndex) => (
                                                <div key={qIndex} className="question-item">
                                                    <span className="question-bullet">•</span>
                                                    <span className="question-text">
                                                        {question.text.length > 60 
                                                            ? question.text.substring(0, 60) + '...' 
                                                            : question.text
                                                        }
                                                    </span>
                                                </div>
                                            ))}
                                            {session.userQuestions.length > 3 && (
                                                <div className="more-questions">
                                                    +{session.userQuestions.length - 3} more questions
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="no-questions">No questions asked in this session</div>
                                    )}
                                </div>
                                
                                <div className="session-preview">
                                    <strong>Last Activity:</strong>
                                    <div className="preview-messages">
                                        {session.preview.map((msg, msgIndex) => (
                                            <div key={msgIndex} className={`preview-message ${msg.sender}`}>
                                                <span className="preview-sender">
                                                    {msg.sender === 'user' ? 'You: ' : 'AI: '}
                                                </span>
                                                <span className="preview-text">
                                                    {msg.text}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="chat-interface">
            {/* Header */}
            <div className="chat-header">
                <div className="header-content">
                    <h2>{isMobile ? 'AI Companion' : 'AI Mental Health Companion'}</h2>
                    <p>
                        {isMobile ? 'Support • ' : 'Your compassionate support system • '}
                        Session: {formatSessionId(currentSession)} • 
                        {!isMobile && ` Messages: ${messages.length}`}
                    </p>
                    {isDemoMode && (
                        <div className="demo-mode-indicator">
                            🎭 {isMobile ? 'Demo Mode' : 'Demo Mode - Enhanced responses active'}
                        </div>
                    )}
                </div>
                <div className="header-actions">
                    <button 
                        className="history-btn"
                        onClick={viewAllSessions}
                        title="View chat history"
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                    >
                        📋 {isMobile ? 'History' : 'History'}
                    </button>
                    {!isMobile && (
                        <button 
                            className="export-btn"
                            onClick={exportChatHistory}
                            title="Export chat history"
                            onTouchStart={handleTouchStart}
                            onTouchEnd={handleTouchEnd}
                        >
                            💾 Export
                        </button>
                    )}
                    <button 
                        className="clear-chat-btn"
                        onClick={clearChat}
                        title="Start new conversation"
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                    >
                        {isMobile ? '🔄 New' : '🗑️ New Chat'}
                    </button>
                </div>
            </div>

            {/* Chat History Summary */}
            {!isMobile && (
                <div className="chat-history-summary">
                    <div className="history-stats">
                        <span>📝 {getUserQuestions().length} questions asked</span>
                        <span>💬 {messages.filter(msg => msg.sender === 'ai').length} responses</span>
                        <span>⏱️ Started: {new Date(messages[0]?.timestamp).toLocaleDateString()}</span>
                        {getUserQuestions().length > 0 && (
                            <span>❓ Last: {getUserQuestions()[getUserQuestions().length - 1]?.text.substring(0, 30)}...</span>
                        )}
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="chat-messages">
                {messages.map(message => (
                    <div key={message.id} className={`message ${message.sender}`}>
                        <div className={`message-bubble ${message.isDemo ? 'demo-message' : ''}`}>
                            <div className="message-content">
                                <p>{message.text}</p>
                                {message.isDemo && (
                                    <div className="demo-badge">Demo Response</div>
                                )}
                            </div>
                            <span className="timestamp">
                                {new Date(message.timestamp).toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                })}
                            </span>
                        </div>
                        
                        {message.emotionDetected && (
                            <div 
                                className="emotion-badge"
                                style={{ 
                                    borderColor: getEmotionColor(message.emotionDetected.emotion),
                                    backgroundColor: getEmotionColor(message.emotionDetected.emotion) + '20'
                                }}
                            >
                                <span className="emotion-label">
                                    {message.emotionDetected.emotion}
                                </span>
                                <span className="confidence">
                                    {(message.emotionDetected.confidence * 100).toFixed(0)}% confidence
                                </span>
                            </div>
                        )}
                        
                        {message.suggestExercise && (
                            <div className="exercise-suggestion">
                                <div className="suggestion-content">
                                    <span className="suggestion-icon">💡</span>
                                    <span className="suggestion-text">
                                        Try a {message.exerciseType || 'breathing'} exercise?
                                    </span>
                                    <button 
                                        className="try-exercise-btn"
                                        onClick={() => startExercise(message.exerciseType)}
                                        onTouchStart={handleTouchStart}
                                        onTouchEnd={handleTouchEnd}
                                    >
                                        {isMobile ? 'Try' : 'Try Exercise'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {message.followUp && (
                            <div className="follow-up-suggestion">
                                <div className="follow-up-content">
                                    <span className="follow-up-text">{message.followUp}</span>
                                    <div className="follow-up-buttons">
                                        <button 
                                            className="follow-up-btn"
                                            onClick={() => handleFollowUp("Yes, let's explore that")}
                                            onTouchStart={handleTouchStart}
                                            onTouchEnd={handleTouchEnd}
                                        >
                                            Yes
                                        </button>
                                        <button 
                                            className="follow-up-btn secondary"
                                            onClick={() => handleFollowUp("Not right now, thanks")}
                                            onTouchStart={handleTouchStart}
                                            onTouchEnd={handleTouchEnd}
                                        >
                                            No
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {message.exerciseDetails && (
                            <div className="exercise-details">
                                <div className="exercise-header">
                                    <strong>{message.exerciseDetails.name}</strong>
                                    <span className="exercise-duration">
                                        {message.exerciseDetails.duration} min
                                    </span>
                                </div>
                                <div className="exercise-benefits">
                                    <strong>Benefits:</strong> {message.exerciseDetails.benefits?.join(', ')}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                
                {isLoading && (
                    <div className="message ai">
                        <div className="message-bubble loading">
                            <div className="typing-indicator">
                                <span>{isMobile ? 'Thinking...' : 'AI companion is thinking'}</span>
                                <div className="typing-dots">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                <div ref={messagesEndRef} className="scroll-anchor" />
            </div>

            {/* Quick Replies */}
            {showQuickReplies && messages.length <= 2 && (
                <div className="quick-replies">
                    <div className="quick-replies-label">
                        {isMobile ? 'Quick start:' : 'Quick starters:'}
                    </div>
                    <div className="quick-replies-buttons">
                        {getQuickReplies().map((reply, index) => (
                            <button
                                key={index}
                                className="quick-reply-btn"
                                onClick={() => handleQuickReply(reply)}
                                onTouchStart={handleTouchStart}
                                onTouchEnd={handleTouchEnd}
                                disabled={isLoading}
                            >
                                {reply}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="chat-input-container">
                <div className="chat-input-wrapper">
                    <textarea
                        ref={textareaRef}
                        value={inputMessage}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        placeholder={
                            isMobile 
                                ? "Share your thoughts... (Enter to send)"
                                : "Share your thoughts, feelings, or concerns... (Press Enter to send)"
                        }
                        rows="1"
                        disabled={isLoading}
                        className="chat-textarea"
                    />
                    <button 
                        onClick={sendMessage} 
                        disabled={!inputMessage.trim() || isLoading}
                        className={`send-button ${isLoading ? 'loading' : ''}`}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                    >
                        {isLoading ? (
                            <div className="send-button-loading">
                                <div className="loading-spinner"></div>
                            </div>
                        ) : isMobile ? (
                            '➤'
                        ) : (
                            'Send'
                        )}
                    </button>
                </div>
                {!isMobile && (
                    <div className="input-hint">
                        💡 You can talk about emotions, stress, relationships, sleep, work, or anything on your mind
                    </div>
                )}
            </div>

            {/* History Panel */}
            {showHistoryPanel && <HistoryPanel />}
        </div>
    );
};

export default ChatInterface;