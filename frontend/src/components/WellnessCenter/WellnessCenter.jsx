import React, { useState } from 'react';
import APIService from '../../services/api';
import './WellnessCenter.css';

const WellnessCenter = ({ user }) => {
    const [activeExercise, setActiveExercise] = useState(null);
    const [exerciseActive, setExerciseActive] = useState(false);
    const [exerciseType, setExerciseType] = useState('');
    const [breathingPhase, setBreathingPhase] = useState('ready');
    const [breathingTime, setBreathingTime] = useState(0);
    const [meditationTime, setMeditationTime] = useState(0);
    const [meditationActive, setMeditationActive] = useState(false);
    const [videoActive, setVideoActive] = useState(false);
    const [currentVideo, setCurrentVideo] = useState(null);
    const [stretchActive, setStretchActive] = useState(false);
    const [currentStretch, setCurrentStretch] = useState(null);
    const [mindfulnessActive, setMindfulnessActive] = useState(false);
    const [currentMindfulness, setCurrentMindfulness] = useState(null);
    const [userMood, setUserMood] = useState('calm'); // Default mood

    // YouTube videos categorized by mood
    const moodVideos = {
        calm: [
            {
                id: 1,
                title: 'Peaceful Piano & Guitar',
                description: 'Soft instrumental music for relaxation',
                youtubeId: 'yIQd2Ya0Ziw',
                duration: '1 hour',
                category: 'music',
                mood: 'calm'
            },
            {
                id: 2,
                title: 'Gentle Rain Sounds',
                description: 'Soothing rain for meditation and sleep',
                youtubeId: 'q76bMs-NwRk',
                duration: '8 hours',
                category: 'nature',
                mood: 'calm'
            },
            {
                id: 3,
                title: 'Mountain Stream',
                description: 'Calming water sounds for focus',
                youtubeId: 'H7rm1zvlgag',
                duration: '3 hours',
                category: 'nature',
                mood: 'calm'
            }
        ],
        anxious: [
            {
                id: 4,
                title: 'Anxiety Relief Music',
                description: 'Healing frequencies for nervous system',
                youtubeId: 'Z2iZzFQ_qJc',
                duration: '3 hours',
                category: 'therapy',
                mood: 'anxious'
            },
            {
                id: 5,
                title: 'Grounding Meditation',
                description: 'Emergency anxiety relief techniques',
                youtubeId: 'KcQi2w1UES4',
                duration: '15 min',
                category: 'meditation',
                mood: 'anxious'
            },
            {
                id: 6,
                title: 'Calming Ocean Waves',
                description: 'Deep relaxation for anxious moments',
                youtubeId: 'a8MskTwOm4k',
                duration: '8 hours',
                category: 'nature',
                mood: 'anxious'
            }
        ],
        sad: [
            {
                id: 7,
                title: 'Comforting Piano',
                description: 'Gentle music for difficult moments',
                youtubeId: 'hZ_7L-qeX8U',
                duration: '1 hour',
                category: 'music',
                mood: 'sad'
            },
            {
                id: 8,
                title: 'Healing Frequency',
                description: 'Music to uplift and comfort',
                youtubeId: 'Ldpd6eGH1MA',
                duration: '3 hours',
                category: 'therapy',
                mood: 'sad'
            },
            {
                id: 9,
                title: 'Hopeful Instrumental',
                description: 'Inspirational music for tough times',
                youtubeId: 'xNN7sBPqN-c',
                duration: '2 hours',
                category: 'music',
                mood: 'sad'
            }
        ],
        stressed: [
            {
                id: 10,
                title: 'Stress Relief Music',
                description: 'Immediate stress reduction',
                youtubeId: 'Y3DpNr1qQk8',
                duration: '1 hour',
                category: 'therapy',
                mood: 'stressed'
            },
            {
                id: 11,
                title: 'Tibetan Singing Bowls',
                description: 'Deep relaxation and stress relief',
                youtubeId: 'YdraR8D0-S8',
                duration: '3 hours',
                category: 'therapy',
                mood: 'stressed'
            },
            {
                id: 12,
                title: 'Forest Meditation',
                description: 'Nature sounds for stress relief',
                youtubeId: 'W7JGPgLTlY8',
                duration: '8 hours',
                category: 'nature',
                mood: 'stressed'
            }
        ],
        angry: [
            {
                id: 13,
                title: 'Anger Management Music',
                description: 'Calming frequencies for emotional regulation',
                youtubeId: '4RCPpz5-Y8I',
                duration: '1 hour',
                category: 'therapy',
                mood: 'angry'
            },
            {
                id: 14,
                title: 'Waterfall Sounds',
                description: 'Powerful yet calming water sounds',
                youtubeId: 'z3U4nLdSLp0',
                duration: '3 hours',
                category: 'nature',
                mood: 'angry'
            },
            {
                id: 15,
                title: 'Release & Let Go',
                description: 'Music for emotional release',
                youtubeId: '1XUfY1_9NRE',
                duration: '2 hours',
                category: 'therapy',
                mood: 'angry'
            }
        ],
        tired: [
            {
                id: 16,
                title: 'Sleep Meditation',
                description: 'Guided sleep and relaxation',
                youtubeId: 'aEqlQvczMJQ',
                duration: '1 hour',
                category: 'meditation',
                mood: 'tired'
            },
            {
                id: 17,
                title: 'Deep Sleep Music',
                description: 'Delta waves for restful sleep',
                youtubeId: '1ZYbU82GVz4',
                duration: '8 hours',
                category: 'therapy',
                mood: 'tired'
            },
            {
                id: 18,
                title: 'Soft Rain & Thunder',
                description: 'Gentle storm for deep relaxation',
                youtubeId: 'mF0CyeDZ6Lc',
                duration: '10 hours',
                category: 'nature',
                mood: 'tired'
            }
        ],
        focused: [
            {
                id: 19,
                title: 'Study & Focus Music',
                description: 'Concentration enhancing frequencies',
                youtubeId: 'HCWvgoTfUjg',
                duration: '24/7 live',
                category: 'music',
                mood: 'focused'
            },
            {
                id: 20,
                title: 'Deep Work Ambient',
                description: 'Music for productivity and flow',
                youtubeId: 'hHW1oY26kxQ',
                duration: '2 hours',
                category: 'music',
                mood: 'focused'
            },
            {
                id: 21,
                title: 'Coffee Shop Ambience',
                description: 'Background noise for concentration',
                youtubeId: 'rUxyKA_-grg',
                duration: '2 hours',
                category: 'ambience',
                mood: 'focused'
            }
        ]
    };

    // Mood selection options
    const moodOptions = [
        { id: 'calm', name: '😌 Calm', description: 'Relaxed and peaceful' },
        { id: 'anxious', name: '😰 Anxious', description: 'Feeling worried or nervous' },
        { id: 'sad', name: '😔 Sad', description: 'Feeling down or blue' },
        { id: 'stressed', name: '😫 Stressed', description: 'Overwhelmed or pressured' },
        { id: 'angry', name: '😠 Angry', description: 'Frustrated or upset' },
        { id: 'tired', name: '😴 Tired', description: 'Low energy or sleepy' },
        { id: 'focused', name: '🎯 Focused', description: 'Need concentration' }
    ];

    // Breathing Exercise
    const startBreathingExercise = async (type = '478') => {
        try {
            const response = await APIService.getBreathingExercise(type);
            if (response.success) {
                setActiveExercise(response.exercise);
                setExerciseActive(true);
                setExerciseType('breathing');
                startBreathingCycle(response.exercise);
            }
        } catch (error) {
            console.error('Error starting exercise:', error);
            const exercises = {
                '478': {
                    name: '4-7-8 Breathing',
                    description: 'Calming technique for stress and anxiety relief',
                    instructions: [
                        'Sit comfortably with your back straight',
                        'Exhale completely through your mouth',
                        'Close your mouth and inhale quietly through your nose for 4 seconds',
                        'Hold your breath for 7 seconds',
                        'Exhale completely through your mouth for 8 seconds',
                        'Repeat this cycle 4-5 times'
                    ],
                    duration: 5,
                    pattern: [4, 7, 8, 4]
                },
                'box': {
                    name: 'Box Breathing',
                    description: 'Military technique for focus and calm',
                    instructions: [
                        'Sit upright in a comfortable position',
                        'Exhale all air from your lungs',
                        'Inhale slowly through your nose for 4 seconds',
                        'Hold your breath for 4 seconds',
                        'Exhale slowly through your mouth for 4 seconds',
                        'Hold empty for 4 seconds',
                        'Repeat 5-10 times'
                    ],
                    duration: 5,
                    pattern: [4, 4, 4, 4]
                },
                'deep': {
                    name: 'Deep Breathing',
                    description: 'Simple relaxation breathing',
                    instructions: [
                        'Find a comfortable seated position',
                        'Place one hand on your chest, one on your belly',
                        'Inhale deeply through your nose for 5 seconds',
                        'Feel your belly expand',
                        'Exhale slowly through your mouth for 5 seconds',
                        'Repeat 10 times'
                    ],
                    duration: 5,
                    pattern: [5, 0, 5, 0]
                }
            };
            const exercise = exercises[type] || exercises['478'];
            setActiveExercise(exercise);
            setExerciseActive(true);
            setExerciseType('breathing');
            startBreathingCycle(exercise);
        }
    };

    const startBreathingCycle = (exercise) => {
        const phases = ['inhale', 'hold', 'exhale', 'hold'];
        const times = exercise.pattern || [4, 7, 8, 4];
        let phaseIndex = 0;
        
        const updateBreathing = () => {
            setBreathingPhase(phases[phaseIndex]);
            setBreathingTime(times[phaseIndex]);
            
            const timer = setInterval(() => {
                setBreathingTime(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        phaseIndex = (phaseIndex + 1) % phases.length;
                        updateBreathing();
                        return times[phaseIndex];
                    }
                    return prev - 1;
                });
            }, 1000);
        };
        
        updateBreathing();
    };

    // Meditation Exercise
    const startMeditation = async (duration = 5) => {
        const meditation = {
            name: 'Guided Meditation',
            description: 'Mindfulness meditation for stress relief',
            instructions: [
                'Find a quiet, comfortable place to sit',
                'Close your eyes and take a few deep breaths',
                'Focus on your breath moving in and out',
                'When your mind wanders, gently bring it back to your breath',
                'Continue for the duration of the meditation'
            ],
            duration: duration,
            type: 'meditation'
        };

        setActiveExercise(meditation);
        setExerciseActive(true);
        setExerciseType('meditation');
        setMeditationActive(true);
        setMeditationTime(duration * 60); // Convert to seconds

        const timer = setInterval(() => {
            setMeditationTime(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    stopExercise();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // Video Therapy based on mood
    const startVideoTherapy = (video) => {
        setCurrentVideo(video);
        setVideoActive(true);
    };

    // Stretching Exercises
    const startStretching = (stretchType) => {
        const stretches = {
            neck: {
                name: 'Neck and Shoulder Stretch',
                description: 'Release tension in neck and shoulders',
                instructions: [
                    'Sit or stand with good posture',
                    'Slowly tilt your head to the right, bringing ear toward shoulder',
                    'Hold for 15 seconds',
                    'Return to center and repeat on left side',
                    'Gently roll shoulders backward 5 times',
                    'Repeat sequence 3 times'
                ],
                duration: 3,
                icon: '💆'
            },
            back: {
                name: 'Back Twist Stretch',
                description: 'Relieve back tension and improve flexibility',
                instructions: [
                    'Sit on a chair with feet flat on the floor',
                    'Cross one leg over the other',
                    'Gently twist your torso toward the crossed leg',
                    'Hold for 20 seconds',
                    'Repeat on the other side',
                    'Do 3 repetitions each side'
                ],
                duration: 4,
                icon: '🔄'
            },
            full: {
                name: 'Full Body Stretch',
                description: 'Wake up your entire body',
                instructions: [
                    'Stand with feet shoulder-width apart',
                    'Reach arms overhead and stretch upward',
                    'Bend forward and try to touch your toes',
                    'Slowly roll up to standing',
                    'Repeat 5 times',
                    'Take deep breaths throughout'
                ],
                duration: 5,
                icon: '🙆'
            }
        };

        const stretch = stretches[stretchType];
        setActiveExercise(stretch);
        setExerciseActive(true);
        setExerciseType('stretching');
        setStretchActive(true);
        setCurrentStretch(stretch);
    };

    // Mindfulness Exercises
    const startMindfulness = (type) => {
        const mindfulnessExercises = {
            body: {
                name: 'Body Scan Meditation',
                description: 'Bring awareness to different parts of your body',
                instructions: [
                    'Lie down or sit comfortably',
                    'Close your eyes and take a few deep breaths',
                    'Bring attention to your toes, notice any sensations',
                    'Slowly move attention up through your body',
                    'Spend 10-20 seconds on each body part',
                    'Notice without judgment, just observe'
                ],
                duration: 10,
                icon: '👁️'
            },
            senses: {
                name: '5-4-3-2-1 Grounding',
                description: 'Use your senses to stay present',
                instructions: [
                    'Name 5 things you can see around you',
                    'Name 4 things you can touch/feel',
                    'Name 3 things you can hear',
                    'Name 2 things you can smell',
                    'Name 1 thing you can taste',
                    'Take a deep breath and notice how you feel'
                ],
                duration: 3,
                icon: '🎯'
            },
            gratitude: {
                name: 'Gratitude Practice',
                description: 'Cultivate appreciation and positive mindset',
                instructions: [
                    'Take three deep breaths to center yourself',
                    'Think of three things you are grateful for today',
                    'For each, feel the gratitude in your heart',
                    'Write them down or say them aloud',
                    'Notice how this practice makes you feel',
                    'Carry this feeling with you'
                ],
                duration: 5,
                icon: '🙏'
            }
        };

        const exercise = mindfulnessExercises[type];
        setActiveExercise(exercise);
        setExerciseActive(true);
        setExerciseType('mindfulness');
        setMindfulnessActive(true);
        setCurrentMindfulness(exercise);
    };

    const stopExercise = () => {
        setExerciseActive(false);
        setActiveExercise(null);
        setExerciseType('');
        setBreathingPhase('ready');
        setBreathingTime(0);
        setMeditationActive(false);
        setMeditationTime(0);
        setVideoActive(false);
        setCurrentVideo(null);
        setStretchActive(false);
        setCurrentStretch(null);
        setMindfulnessActive(false);
        setCurrentMindfulness(null);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleMoodSelection = (mood) => {
        setUserMood(mood);
    };

    const getVideosForCurrentMood = () => {
        return moodVideos[userMood] || moodVideos.calm;
    };

    const wellnessActivities = [
        {
            id: 1,
            name: 'Breathing Exercises',
            description: 'Calm your mind with guided breathing techniques',
            icon: '🌬️',
            color: '#667eea',
            subOptions: [
                { name: '4-7-8 Breathing', action: () => startBreathingExercise('478') },
                { name: 'Box Breathing', action: () => startBreathingExercise('box') },
                { name: 'Deep Breathing', action: () => startBreathingExercise('deep') }
            ]
        },
        {
            id: 2,
            name: 'Guided Meditation',
            description: 'Find peace through mindfulness meditation',
            icon: '🧘',
            color: '#4ecdc4',
            subOptions: [
                { name: '5 Minute Meditation', action: () => startMeditation(5) },
                { name: '10 Minute Meditation', action: () => startMeditation(10) },
                { name: '15 Minute Meditation', action: () => startMeditation(15) }
            ]
        },
        {
            id: 3,
            name: 'Journal Prompts',
            description: 'Express your thoughts and feelings',
            icon: '📔',
            color: '#45b7d1',
            action: () => {
                const prompts = [
                    "What am I grateful for today?",
                    "What's worrying me right now?",
                    "What would make today better?",
                    "How am I really feeling?",
                    "What did I learn today?",
                    "What made me smile today?"
                ];
                const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
                alert(`📖 Journal Prompt:\n\n"${randomPrompt}"\n\nTake a moment to reflect and write...`);
            }
        },
        {
            id: 4,
            name: 'Mood Videos',
            description: 'Curated videos for your current mood',
            icon: '🎬',
            color: '#96ceb4',
            subOptions: getVideosForCurrentMood().slice(0, 3).map(video => ({
                name: video.title,
                action: () => startVideoTherapy(video)
            }))
        },
        {
            id: 5,
            name: 'Quick Stretches',
            description: 'Release tension with simple stretches',
            icon: '💪',
            color: '#feca57',
            subOptions: [
                { name: 'Neck & Shoulders', action: () => startStretching('neck') },
                { name: 'Back Twist', action: () => startStretching('back') },
                { name: 'Full Body', action: () => startStretching('full') }
            ]
        },
        {
            id: 6,
            name: 'Mindful Moments',
            description: 'Short mindfulness exercises',
            icon: '🌿',
            color: '#ff9ff3',
            subOptions: [
                { name: 'Body Scan', action: () => startMindfulness('body') },
                { name: '5-4-3-2-1 Grounding', action: () => startMindfulness('senses') },
                { name: 'Gratitude Practice', action: () => startMindfulness('gratitude') }
            ]
        }
    ];

    const getBreathingInstructions = () => {
        switch (breathingPhase) {
            case 'inhale':
                return 'Breathe in slowly through your nose...';
            case 'hold':
                return 'Hold your breath...';
            case 'exhale':
                return 'Breathe out slowly through your mouth...';
            default:
                return 'Get ready to begin breathing...';
        }
    };

    const renderActiveExercise = () => {
        switch (exerciseType) {
            case 'breathing':
                return (
                    <div className="active-exercise">
                        <div className="exercise-container">
                            <h3>{activeExercise.name}</h3>
                            <p>{activeExercise.description}</p>
                            
                            <div className="breathing-visualization">
                                <div className={`breathing-circle ${breathingPhase}`}>
                                    <div className="breathing-text">
                                        <div className="phase">{breathingPhase.toUpperCase()}</div>
                                        <div className="timer">{breathingTime}s</div>
                                    </div>
                                </div>
                                <div className="breathing-instruction">
                                    {getBreathingInstructions()}
                                </div>
                            </div>

                            <div className="exercise-instructions">
                                <h4>Full Instructions:</h4>
                                <ol>
                                    {activeExercise.instructions.map((instruction, index) => (
                                        <li key={index}>{instruction}</li>
                                    ))}
                                </ol>
                            </div>
                        </div>
                    </div>
                );

            case 'meditation':
                return (
                    <div className="active-exercise">
                        <div className="exercise-container">
                            <h3>{activeExercise.name}</h3>
                            <p>{activeExercise.description}</p>
                            
                            <div className="meditation-visualization">
                                <div className="meditation-circle">
                                    <div className="meditation-text">
                                        <div className="time-remaining">{formatTime(meditationTime)}</div>
                                        <div className="meditation-state">Meditating...</div>
                                    </div>
                                </div>
                                <div className="meditation-instruction">
                                    Focus on your breath. When your mind wanders, gently bring it back.
                                </div>
                            </div>

                            <div className="exercise-instructions">
                                <h4>Instructions:</h4>
                                <ol>
                                    {activeExercise.instructions.map((instruction, index) => (
                                        <li key={index}>{instruction}</li>
                                    ))}
                                </ol>
                            </div>
                        </div>
                    </div>
                );

            case 'stretching':
                return (
                    <div className="active-exercise">
                        <div className="exercise-container">
                            <h3>{activeExercise.name}</h3>
                            <p>{activeExercise.description}</p>
                            
                            <div className="stretch-visualization">
                                <div className="stretch-icon">{activeExercise.icon}</div>
                                <div className="stretch-instruction">
                                    Follow the instructions below. Move slowly and gently.
                                </div>
                            </div>

                            <div className="exercise-instructions">
                                <h4>Stretch Instructions:</h4>
                                <ol>
                                    {activeExercise.instructions.map((instruction, index) => (
                                        <li key={index}>{instruction}</li>
                                    ))}
                                </ol>
                            </div>
                        </div>
                    </div>
                );

            case 'mindfulness':
                return (
                    <div className="active-exercise">
                        <div className="exercise-container">
                            <h3>{activeExercise.name}</h3>
                            <p>{activeExercise.description}</p>
                            
                            <div className="mindfulness-visualization">
                                <div className="mindfulness-icon">{activeExercise.icon}</div>
                                <div className="mindfulness-instruction">
                                    Be present and observe without judgment.
                                </div>
                            </div>

                            <div className="exercise-instructions">
                                <h4>Practice Instructions:</h4>
                                <ol>
                                    {activeExercise.instructions.map((instruction, index) => (
                                        <li key={index}>{instruction}</li>
                                    ))}
                                </ol>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="wellness-center">
            <div className="wellness-header">
                <h2>🌱 Wellness Center</h2>
                <p>Tools and exercises for your mental wellbeing</p>
            </div>

            {exerciseActive ? (
                <div className="active-exercise-screen">
                    {renderActiveExercise()}
                    <button 
                        className="stop-exercise-btn"
                        onClick={stopExercise}
                    >
                        Stop Exercise
                    </button>
                </div>
            ) : videoActive ? (
                <div className="active-video-screen">
                    <div className="video-container">
                        <h3>{currentVideo.title}</h3>
                        <p>{currentVideo.description}</p>
                        <p className="video-mood">🎭 Recommended for: {moodOptions.find(m => m.id === currentVideo.mood)?.name}</p>
                        
                        <div className="youtube-embed">
                            <iframe
                                width="100%"
                                height="315"
                                src={`https://www.youtube.com/embed/${currentVideo.youtubeId}?autoplay=1&rel=0`}
                                title={currentVideo.title}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        </div>
                        
                        <div className="video-info">
                            <div className="video-duration">⏱️ Duration: {currentVideo.duration}</div>
                            <div className="video-category">📁 Category: {currentVideo.category}</div>
                        </div>
                        
                        <button 
                            className="stop-exercise-btn"
                            onClick={stopExercise}
                        >
                            Close Video
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Mood Selection Section */}
                    <div className="mood-selection-section">
                        <h3>🎭 How are you feeling?</h3>
                        <p>Select your current mood to get personalized content</p>
                        <div className="mood-grid">
                            {moodOptions.map(mood => (
                                <button
                                    key={mood.id}
                                    className={`mood-btn ${userMood === mood.id ? 'active' : ''}`}
                                    onClick={() => handleMoodSelection(mood.id)}
                                >
                                    <div className="mood-icon">{mood.name.split(' ')[0]}</div>
                                    <div className="mood-info">
                                        <div className="mood-name">{mood.name.split(' ').slice(1).join(' ')}</div>
                                        <div className="mood-desc">{mood.description}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="wellness-stats">
                        <div className="stat-card">
                            <div className="stat-icon">😊</div>
                            <div className="stat-info">
                                <h3>Mood Boost</h3>
                                <p>Practice daily for better mood</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">💤</div>
                            <div className="stat-info">
                                <h3>Better Sleep</h3>
                                <p>Relax before bedtime</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">🎯</div>
                            <div className="stat-info">
                                <h3>Focus</h3>
                                <p>Improve concentration</p>
                            </div>
                        </div>
                    </div>

                    <div className="wellness-grid">
                        {wellnessActivities.map(activity => (
                            <div 
                                key={activity.id} 
                                className="wellness-card"
                                style={{ '--card-color': activity.color }}
                            >
                                <div className="card-header">
                                    <div className="card-icon" style={{ backgroundColor: activity.color }}>
                                        {activity.icon}
                                    </div>
                                    <h3>{activity.name}</h3>
                                </div>
                                <p>{activity.description}</p>
                                
                                {activity.subOptions ? (
                                    <div className="sub-options">
                                        {activity.subOptions.map((option, index) => (
                                            <button 
                                                key={index}
                                                onClick={option.action}
                                                style={{ backgroundColor: activity.color }}
                                                className="sub-option-btn"
                                            >
                                                {option.name}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <button 
                                        onClick={activity.action}
                                        style={{ backgroundColor: activity.color }}
                                    >
                                        Start Now
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Additional Video Recommendations */}
                    <div className="video-recommendations">
                        <h3>🎬 More Videos for {moodOptions.find(m => m.id === userMood)?.name}</h3>
                        <div className="video-grid">
                            {getVideosForCurrentMood().map(video => (
                                <div key={video.id} className="video-card">
                                    <div className="video-thumbnail">
                                        <img 
                                            src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
                                            alt={video.title}
                                        />
                                        <div className="play-overlay">▶️</div>
                                    </div>
                                    <div className="video-info">
                                        <h4>{video.title}</h4>
                                        <p>{video.description}</p>
                                        <div className="video-meta">
                                            <span>⏱️ {video.duration}</span>
                                            <span>📁 {video.category}</span>
                                        </div>
                                        <button 
                                            onClick={() => startVideoTherapy(video)}
                                            className="watch-btn"
                                        >
                                            Watch Now
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="wellness-tips">
                        <h3>💡 Wellness Tips</h3>
                        <div className="tips-grid">
                            <div className="tip">
                                <h4>Morning Routine</h4>
                                <p>Start your day with 5 minutes of deep breathing</p>
                            </div>
                            <div className="tip">
                                <h4>Digital Detox</h4>
                                <p>Take regular breaks from screens</p>
                            </div>
                            <div className="tip">
                                <h4>Stay Hydrated</h4>
                                <p>Drink water throughout the day</p>
                            </div>
                            <div className="tip">
                                <h4>Move Your Body</h4>
                                <p>Even short walks can boost mood</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default WellnessCenter;