import { io } from 'socket.io-client';

class WebSocketService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.eventCallbacks = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    connect() {
        if (this.socket) return;
        
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const url = API_BASE_URL.replace(/\/api$/, '');

        console.log('Connecting to WebSocket server:', url);
        this.socket = io(url, {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: this.maxReconnectAttempts
        });

        this.socket.on('connect', () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            console.log('WebSocket connected');
        });

        this.socket.on('disconnect', () => {
            this.isConnected = false;
            console.log('WebSocket disconnected');
        });

        // Forward backend events to frontend listeners
        this.socket.on('connected', (data) => this.emitEvent('connected', data));
        this.socket.on('tracking_started', (data) => this.emitEvent('tracking_started', data));
        this.socket.on('ai_response', (data) => this.emitEvent('ai_response', data));
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.reconnectAttempts = 0;
        console.log('WebSocket disconnected');
    }

    // Event handling
    on(event, callback) {
        if (!this.eventCallbacks.has(event)) {
            this.eventCallbacks.set(event, []);
        }
        this.eventCallbacks.get(event).push(callback);
    }

    off(event, callback) {
        if (this.eventCallbacks.has(event)) {
            const callbacks = this.eventCallbacks.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emitEvent(event, data) {
        if (this.eventCallbacks.has(event)) {
            this.eventCallbacks.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in WebSocket event handler for ${event}:`, error);
                }
            });
        }
    }

    // Emit events to server
    emit(event, data) {
        console.log(`WebSocket: Emitting ${event}`, data);
        if (this.socket && this.isConnected) {
            this.socket.emit(event, data);
        } else {
            console.warn('Cannot emit, socket not connected');
        }
    }

    // Demo method to simulate real-time emotion updates (can be replaced by real FaceAPI logic later)
    startDemoEmotionStream(userId, callback) {
        console.log('Starting demo emotion stream for user:', userId);
        
        const emotions = ['happy', 'sad', 'neutral', 'angry', 'surprised'];
        let interval;
        
        const sendEmotion = () => {
            const emotion = emotions[Math.floor(Math.random() * emotions.length)];
            const intensity = 0.3 + Math.random() * 0.5; // 0.3 to 0.8
            
            const emotionData = {
                emotion: emotion,
                intensity: intensity,
                confidence: 0.7 + Math.random() * 0.3, // 0.7 to 1.0
                timestamp: new Date().toISOString(),
                userId: userId
            };
            
            callback(emotionData);
        };
        
        // Send emotion every 3 seconds
        interval = setInterval(sendEmotion, 3000);
        
        // Return function to stop the stream
        return () => {
            clearInterval(interval);
            console.log('Demo emotion stream stopped');
        };
    }
}

export default new WebSocketService();