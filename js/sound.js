// Sound manager for the Snake game

const SoundManager = (() => {
    // Sound enabled state
    let soundEnabled = true;
    let initialized = false;
    
    // Audio context
    let audioContext = null;
    
    // Gain node for master volume
    let masterGain = null;
    
    // Sound cache
    const sounds = {};
    
    // Sound definitions using Web Audio API
    const soundDefs = {
        // Basic food collection sound
        eat: {
            type: 'simple',
            frequency: 440,
            duration: 0.1,
            gain: 0.2,
            type: 'sine',
            ramp: { frequency: 880, time: 0.1 }
        },
        
        // Special food collection sound
        eatSpecial: {
            type: 'simple',
            frequency: 660,
            duration: 0.15,
            gain: 0.3,
            type: 'triangle',
            ramp: { frequency: 1320, time: 0.15 }
        },
        
        // Power-up collection sound
        powerUp: {
            type: 'complex',
            notes: [
                { frequency: 523.25, duration: 0.08, type: 'sine' },
                { frequency: 659.25, duration: 0.08, type: 'sine' },
                { frequency: 783.99, duration: 0.16, type: 'sine' }
            ],
            gain: 0.3
        },
        
        // Level up fanfare
        levelUp: {
            type: 'complex',
            notes: [
                { frequency: 523.25, duration: 0.1, type: 'triangle' },
                { frequency: 659.25, duration: 0.1, type: 'triangle' },
                { frequency: 783.99, duration: 0.1, type: 'triangle' },
                { frequency: 1046.50, duration: 0.3, type: 'triangle' }
            ],
            gain: 0.4
        },
        
        // Death sound
        death: {
            type: 'complex',
            notes: [
                { frequency: 830, duration: 0.08, type: 'sawtooth' },
                { frequency: 784, duration: 0.08, type: 'sawtooth' },
                { frequency: 740, duration: 0.08, type: 'sawtooth' },
                { frequency: 698, duration: 0.08, type: 'sawtooth' },
                { frequency: 622, duration: 0.08, type: 'sawtooth' },
                { frequency: 440, duration: 0.3, type: 'sawtooth' }
            ],
            gain: 0.2
        }
    };
    
    // Initialize the audio context
    function init() {
        if (initialized) return;
        
        // Don't automatically create the AudioContext on init
        // It will be created on first user interaction (play or toggleSound)
        initialized = true;
    }
    
    // Create audio context - separate from init to follow browser policies
    function createAudioContext() {
        if (audioContext) return; // Already created
        
        try {
            // Create audio context
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContext();
            
            // Create master gain node
            masterGain = audioContext.createGain();
            masterGain.gain.value = 0.5; // 50% volume by default
            masterGain.connect(audioContext.destination);
            
            // Initialize sounds
            createSounds();
        } catch (e) {
            console.error('Web Audio API not supported or error initializing:', e);
        }
    }
    
    // Create and cache all sound effects
    function createSounds() {
        for (const [name, def] of Object.entries(soundDefs)) {
            createSound(name, def);
        }
    }
    
    // Create a specific sound effect
    function createSound(name, def) {
        if (def.type === 'simple') {
            // Simple sound with optional frequency ramp
            sounds[name] = () => {
                if (!audioContext || !soundEnabled) return;
                
                // Ensure context is running (needed for Chrome's autoplay policy)
                if (audioContext.state === 'suspended') {
                    audioContext.resume();
                }
                
                const oscillator = audioContext.createOscillator();
                const gain = audioContext.createGain();
                
                // Configure oscillator
                oscillator.type = def.type || 'sine';
                oscillator.frequency.value = def.frequency;
                
                // Configure gain
                gain.gain.value = def.gain || 0.2;
                gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + def.duration);
                
                // Connect nodes
                oscillator.connect(gain);
                gain.connect(masterGain);
                
                // Start sound
                oscillator.start();
                
                // Apply frequency ramp if specified
                if (def.ramp) {
                    oscillator.frequency.exponentialRampToValueAtTime(
                        def.ramp.frequency, 
                        audioContext.currentTime + def.ramp.time
                    );
                }
                
                // Stop after duration
                oscillator.stop(audioContext.currentTime + def.duration);
            };
        } else if (def.type === 'complex') {
            // Complex sound with multiple notes
            sounds[name] = () => {
                if (!audioContext || !soundEnabled) return;
                
                // Ensure context is running
                if (audioContext.state === 'suspended') {
                    audioContext.resume();
                }
                
                // Create master gain for this sound
                const soundGain = audioContext.createGain();
                soundGain.gain.value = def.gain || 0.3;
                soundGain.connect(masterGain);
                
                // Schedule each note
                let startTime = audioContext.currentTime;
                def.notes.forEach(note => {
                    const oscillator = audioContext.createOscillator();
                    const noteGain = audioContext.createGain();
                    
                    // Configure oscillator
                    oscillator.type = note.type || 'sine';
                    oscillator.frequency.value = note.frequency;
                    
                    // Configure gain
                    noteGain.gain.value = note.gain || 1.0;
                    noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + note.duration);
                    
                    // Connect nodes
                    oscillator.connect(noteGain);
                    noteGain.connect(soundGain);
                    
                    // Schedule start and stop
                    oscillator.start(startTime);
                    oscillator.stop(startTime + note.duration);
                    
                    // Move to next note time
                    startTime += note.duration;
                });
            };
        }
    }
    
    // Play a sound by name
    function play(name) {
        if (!initialized) {
            init();
        }
        
        // Only create AudioContext after user interaction
        if (soundEnabled && !audioContext) {
            try {
                createAudioContext();
                
                // If context is in suspended state, resume it
                if (audioContext && audioContext.state === 'suspended') {
                    audioContext.resume().then(() => {
                        if (sounds[name]) sounds[name]();
                    }).catch(err => console.error('Failed to resume audio context:', err));
                    return; // Return early, the sound will play after resuming
                }
            } catch (e) {
                console.error('Failed to create or resume AudioContext:', e);
                return;
            }
        }
        
        // Play the sound if everything is ready
        if (sounds[name] && soundEnabled && audioContext) {
            try {
                sounds[name]();
            } catch (e) {
                console.error('Error playing sound:', e);
            }
        }
    }
    
    // Toggle sound on/off
    function toggleSound() {
        soundEnabled = !soundEnabled;
        
        if (!initialized) {
            init();
        }
        
        // Create AudioContext when user toggles sound on
        if (soundEnabled && !audioContext) {
            createAudioContext();
        }
        
        return soundEnabled;
    }
    
    // Set master volume (0.0 to 1.0)
    function setVolume(volume) {
        if (!initialized) {
            init();
        }
        
        if (masterGain) {
            masterGain.gain.value = Math.max(0, Math.min(1, volume));
        }
    }
    
    // Public API
    return {
        init,
        play,
        toggleSound,
        setVolume,
        isSoundEnabled: () => soundEnabled
    };
})();
