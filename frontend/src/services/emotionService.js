import * as faceapi from 'face-api.js';

class EmotionService {
    constructor() {
        this.isModelsLoaded = false;
        this.modelsLoaded = false;
        this.loadError = null;
    }

    async loadModels() {
        try {
            console.log('Loading FaceAPI models...');
            const MODEL_URL = '/models';
            
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
            ]);
            
            this.modelsLoaded = true;
            this.isModelsLoaded = true;
            console.log('FaceAPI models loaded successfully');
            return true;
            
        } catch (error) {
            console.error('Error loading FaceAPI models:', error);
            this.loadError = error;
            this.modelsLoaded = false;
            this.isModelsLoaded = false;
            return false;
        }
    }

    async detectEmotionsFromImage(imageElement) {
        if (!this.modelsLoaded) {
            console.warn("Models not loaded yet. Returning null.");
            return null;
        }
        
        try {
            return await this.realFaceDetection(imageElement);
        } catch (error) {
            console.error('Face detection error:', error);
            return null;
        }
    }

    async realFaceDetection(imageElement) {
        // Run face-api.js detection
        const detections = await faceapi.detectSingleFace(
            imageElement, 
            new faceapi.TinyFaceDetectorOptions()
        ).withFaceExpressions();
        
        if (!detections) return null;
        
        const expressions = detections.expressions;
        
        // Find dominant emotion
        const dominantEmotion = Object.keys(expressions).reduce((a, b) => 
            expressions[a] > expressions[b] ? a : b
        );
        
        return {
            expressions: expressions,
            dominantEmotion: dominantEmotion,
            confidence: expressions[dominantEmotion],
            timestamp: new Date().toISOString()
        };
    }

    calculateCrisisLevel(emotionHistory) {
        if (!emotionHistory || emotionHistory.length === 0) return 'LOW';
        
        const recentEmotions = emotionHistory.slice(-5);
        const negativeEmotions = ['sad', 'angry', 'fearful'];
        
        const negativeCount = recentEmotions.filter(emotion => 
            emotion && emotion.dominantEmotion && negativeEmotions.includes(emotion.dominantEmotion)
        ).length;

        const averageIntensity = recentEmotions.reduce((sum, emotion) => 
            sum + (emotion ? emotion.confidence : 0), 0) / (recentEmotions.length || 1);

        if (negativeCount >= 4 && averageIntensity > 0.7) return 'SEVERE';
        if (negativeCount >= 3 && averageIntensity > 0.5) return 'HIGH';
        if (negativeCount >= 2 && averageIntensity > 0.3) return 'MODERATE';
        
        return 'LOW';
    }
}

export default new EmotionService();