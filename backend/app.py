import os
import eventlet

# Monkey patch only if running in production environments
if os.environ.get("GUNICORN_VERSION") or os.environ.get("RENDER"):
    eventlet.monkey_patch()

from flask import Flask, request, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS
import json
from datetime import datetime
import random
from database import db
import uuid
import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from groq import Groq

# Configure Groq
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'

# Configure CORS properly for production and local development
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001").split(",")
CORS(app, origins=allowed_origins, 
     supports_credentials=True, methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

socketio = SocketIO(app, 
                   cors_allowed_origins=allowed_origins,
                   async_mode='threading')



class SimpleEmotionDetector:
    def detect_from_text(self, text):
        """Simple keyword-based emotion detection"""
        text_lower = text.lower()
        
        emotion_keywords = {
            'happy': ['happy', 'good', 'great', 'awesome', 'excited', 'joy', 'amazing', 'wonderful', 'fantastic'],
            'sad': ['sad', 'bad', 'terrible', 'depressed', 'unhappy', 'miserable', 'hopeless', 'alone'],
            'angry': ['angry', 'mad', 'frustrated', 'annoyed', 'hate', 'furious', 'upset'],
            'anxious': ['anxious', 'nervous', 'worried', 'stress', 'panic', 'scared', 'afraid', 'overwhelmed']
        }
        
        scores = {emotion: 0 for emotion in emotion_keywords.keys()}
        
        for emotion, keywords in emotion_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    scores[emotion] += 1
        
        if sum(scores.values()) == 0:
            return {'emotion': 'neutral', 'confidence': 0.5}
        
        dominant_emotion = max(scores, key=scores.get)
        confidence = min(scores[dominant_emotion] / 3, 0.9)
        
        return {
            'emotion': dominant_emotion,
            'confidence': confidence,
            'all_scores': scores
        }

# Initialize detector
emotion_detector = SimpleEmotionDetector()

# ==========================================
# 🤖 AI MODEL CONFIGURATION (GROQ)
# ==========================================

def generate_ai_response(message, emotion, history):
    if not GROQ_API_KEY:
        return "Please set your GROQ_API_KEY in the .env file in the backend directory!"

    system_prompt = f"""You are an empathetic, professional AI mental health companion with expertise in clinical screening.
Current User Emotion: {emotion['emotion']} (confidence: {emotion.get('confidence', 0)}).

YOUR RESPONSIBILITIES:
1. EMPATHY: Listen actively, validate the user's feelings, and provide a safe space for expression.
2. SCREENING: If the user asks about their mental state or describes persistent symptoms, perform a gentle diagnostic screening. Look for indicators of:
   - Major Depressive Disorder (low mood, loss of interest, sleep issues, fatigue).
   - Generalized Anxiety (excessive worry, restlessness, tension).
   - Panic Disorder or Social Anxiety.
   - Stress/Burnout.
3. STRUCTURED FEEDBACK: When providing a screening summary, use clear, non-judgmental language. Identify "potential indicators" rather than giving a definitive diagnosis.
4. MANDATORY DISCLAIMER: Every response that discusses potential conditions or screening results MUST end with: 
   "**IMPORTANT DISCLAIMER**: I am an AI companion, not a licensed medical professional. This screening is for educational and support purposes only. Please consult a psychiatrist or therapist for a formal diagnosis and treatment plan."
5. CRISIS SAFETY: If any mention of self-harm or suicide occurs, immediately provide crisis resources and encourage professional help.

CONVERSATION STYLE:
- Keep responses conversational and concise (max 3-4 sentences per turn unless providing a summary).
- Ask clarifying questions about the duration and severity of symptoms."""

    try:
        # Build chat history
        messages = [{"role": "system", "content": system_prompt}]
        for msg in history:
            role = "assistant" if msg['sender'] == 'ai' else "user"
            messages.append({"role": role, "content": msg['message_text']})
            
        messages.append({"role": "user", "content": message})
        
        # Call Groq API
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
        )
        
        return completion.choices[0].message.content
            
    except Exception as e:
        print("Exception during Groq AI call:", str(e))
        return "I encountered an error trying to process that."

@app.route('/')
def home():
    return jsonify({
        "message": "AI Mental Health Companion API", 
        "status": "running",
        "version": "1.0"
    })

@app.route('/api/register', methods=['POST', 'OPTIONS'])
def register_user():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response
        
    try:
        data = request.get_json()
        
        # Check if email exists
        conn = __import__('sqlite3').connect(db.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM users WHERE email = ?', (data.get('email'),))
        existing_user = cursor.fetchone()
        conn.close()
        
        if existing_user:
            return jsonify({'success': False, 'error': 'Email already registered'}), 400
            
        user_id = 'user_' + str(uuid.uuid4())
        
        user_data = {
            'id': user_id,
            'name': data.get('name'),
            'email': data.get('email'),
            'student_id': data.get('studentId'),
            'age': data.get('age'),
            'emergency_contact_name': data.get('emergencyContactName'),
            'emergency_contact_phone': data.get('emergencyContactPhone')
        }
        
        db.add_user(user_data)
        
        response = jsonify({
            'success': True,
            'user': user_data
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
        
    except Exception as e:
        error_response = jsonify({'success': False, 'error': str(e)})
        error_response.headers.add('Access-Control-Allow-Origin', '*')
        return error_response, 500

@app.route('/api/login', methods=['POST', 'OPTIONS'])
def login_user():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response
        
    try:
        data = request.get_json()
        email = data.get('email')
        
        # Simple login - just check email
        conn = __import__('sqlite3').connect(db.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()
        conn.close()
        
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
            
        user_data = {
            'id': user[0],
            'name': user[1],
            'email': user[2],
            'student_id': user[3]
        }
        
        response = jsonify({
            'success': True,
            'user': user_data
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
        
    except Exception as e:
        error_response = jsonify({'success': False, 'error': str(e)})
        error_response.headers.add('Access-Control-Allow-Origin', '*')
        return error_response, 500


# Handle CORS preflight requests
@app.route('/api/chat', methods=['OPTIONS'])
def handle_chat_options():
    response = jsonify({'status': 'success'})
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@app.route('/api/chat', methods=['POST'])
def chat_with_ai():
    try:
        data = request.get_json()
        message = data.get('message', '')
        user_id = data.get('user_id', 'anonymous')
        session_id = data.get('session_id')
        
        if not message:
            return jsonify({'success': False, 'error': 'No message provided'}), 400
            
        if session_id and user_id != 'anonymous':
            db.start_session(user_id, session_id)
        
        # Analyze emotion first
        emotion_result = emotion_detector.detect_from_text(message)
        emotion = emotion_result['emotion']
        
        # Get conversation history from DB for context
        history = []
        if session_id and user_id != 'anonymous':
            conn = __import__('sqlite3').connect(db.db_path)
            cursor = conn.cursor()
            cursor.execute('SELECT message_text, sender FROM chat_messages WHERE session_id = ? ORDER BY timestamp ASC LIMIT 10', (session_id,))
            for row in cursor.fetchall():
                history.append({'message_text': row[0], 'sender': row[1]})
            conn.close()

        # Generate response using the AI model
        ai_response = generate_ai_response(message, emotion_result, history)
        
        if session_id and user_id != 'anonymous':
            db.add_chat_message(user_id, session_id, message, 'user', emotion_result)
            db.add_chat_message(user_id, session_id, ai_response, 'ai', None)
        
        # Determine if we should suggest an exercise
        suggest_exercise = emotion in ['sad', 'angry', 'anxious']
        
        response_data = {
            'success': True,
            'response': ai_response,
            'emotion_detected': emotion_result,
            'suggest_exercise': suggest_exercise,
            'exercise_type': 'breathing' if suggest_exercise else None
        }
        
        response = jsonify(response_data)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
        
    except Exception as e:
        error_response = jsonify({'success': False, 'error': str(e)})
        error_response.headers.add('Access-Control-Allow-Origin', '*')
        return error_response, 500

@app.route('/api/exercises/breathing', methods=['GET', 'OPTIONS'])
def get_breathing_exercise():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response
        
    try:
        exercise_type = request.args.get('type', '478')
        
        exercises = {
            '478': {
                'name': '4-7-8 Breathing',
                'description': 'Calming technique for stress and anxiety relief',
                'instructions': [
                    'Sit comfortably with your back straight',
                    'Place the tip of your tongue against the roof of your mouth',
                    'Exhale completely through your mouth',
                    'Close your mouth and inhale quietly through your nose for 4 seconds',
                    'Hold your breath for 7 seconds',
                    'Exhale completely through your mouth for 8 seconds',
                    'Repeat this cycle 4-5 times'
                ],
                'duration': 5,
                'benefits': ['Reduces anxiety', 'Helps with sleep', 'Calms the nervous system']
            },
            'box': {
                'name': 'Box Breathing',
                'description': 'Military technique for focus and calm',
                'instructions': [
                    'Sit upright in a comfortable position',
                    'Slowly exhale all your air',
                    'Inhale through your nose for 4 seconds',
                    'Hold your breath for 4 seconds',
                    'Exhale through your mouth for 4 seconds',
                    'Hold at the bottom for 4 seconds',
                    'Repeat 5-10 times'
                ],
                'duration': 7,
                'benefits': ['Improves focus', 'Reduces stress', 'Increases alertness']
            }
        }
        
        exercise = exercises.get(exercise_type, exercises['478'])
        
        response = jsonify({
            'success': True,
            'exercise': exercise
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
        
    except Exception as e:
        error_response = jsonify({'success': False, 'error': str(e)})
        error_response.headers.add('Access-Control-Allow-Origin', '*')
        return error_response, 500

@app.route('/api/emergency/help', methods=['POST', 'OPTIONS'])
def emergency_help():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response
        
    try:
        data = request.get_json()
        user_id = data.get('user_id', 'anonymous')
        crisis_level = data.get('crisis_level', 'moderate')
        
        emergency_resources = {
            'immediate': {
                'message': '🚨 IMMEDIATE HELP IS AVAILABLE',
                'actions': [
                    'Call Emergency Services: 911',
                    'National Suicide Prevention Lifeline: 1-800-273-8255',
                    'Crisis Text Line: Text HOME to 741741'
                ],
                'instructions': 'Please stay on the line. Help is coming.'
            },
            'high': {
                'message': 'You are not alone. Professional help is available.',
                'actions': [
                    'National Suicide Prevention Lifeline: 1-800-273-8255',
                    'Crisis Text Line: Text HOME to 741741',
                    'Emergency Services: 911'
                ],
                'instructions': 'Reach out to one of these resources immediately.'
            },
            'moderate': {
                'message': 'Support is available when you need it.',
                'actions': [
                    'Talk to a trusted friend or family member',
                    'Contact a mental health professional',
                    'Use calming exercises in the app'
                ],
                'instructions': 'You are not alone in this.'
            }
        }
        
        resource = emergency_resources.get(crisis_level, emergency_resources['moderate'])
        
        # Log emergency request
        print(f"EMERGENCY: User {user_id} requested help at level {crisis_level}")
        
        response = jsonify({
            'success': True,
            'emergency_response': resource,
            'timestamp': datetime.now().isoformat()
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
        
    except Exception as e:
        error_response = jsonify({'success': False, 'error': str(e)})
        error_response.headers.add('Access-Control-Allow-Origin', '*')
        return error_response, 500

@app.route('/api/user/session/<user_id>', methods=['GET', 'OPTIONS'])
def get_user_session(user_id):
    """Get user's emotion history"""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response
        
    try:
        session_data = db.get_user_sessions(user_id)
        emotion_data = db.get_user_emotions(user_id)
        response = jsonify({
            'success': True,
            'user_id': user_id,
            'session_count': len(session_data),
            'recent_emotions': emotion_data[-10:] if emotion_data else []
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
    except Exception as e:
        error_response = jsonify({'success': False, 'error': str(e)})
        error_response.headers.add('Access-Control-Allow-Origin', '*')
        return error_response, 500

# WebSocket events for real-time features
@socketio.on('connect')
def handle_connect():
    print('Client connected')
    socketio.emit('connected', {'message': 'Connected to Mental Health Companion', 'status': 'active'})

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('start_emotion_tracking')
def handle_start_tracking(data):
    user_id = data.get('user_id')
    print(f'Starting emotion tracking for user: {user_id}')
    socketio.emit('tracking_started', {'user_id': user_id, 'status': 'active'})

@socketio.on('user_message')
def handle_user_message(data):
    user_id = data.get('user_id')
    message = data.get('message')
    
    # Process message and send AI response via WebSocket
    emotion_result = emotion_detector.detect_from_text(message)
    
    socketio.emit('ai_response', {
        'user_id': user_id,
        'message': message,
        'emotion': emotion_result,
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    # Debug mode should be False in production
    debug_mode = os.environ.get("FLASK_DEBUG", "False").lower() == "true"
    
    print(f"Starting AI Mental Health Companion Server on port {port}...")
    print("WebSocket server active")
    socketio.run(app, debug=debug_mode, host='0.0.0.0', port=port, allow_unsafe_werkzeug=True)