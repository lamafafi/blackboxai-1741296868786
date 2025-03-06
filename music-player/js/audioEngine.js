class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.tracks = new Map(); // Map of track id to track audio nodes
        this.masterGainNode = null;
        this.metronomeOscillator = null;
        this.metronomeGainNode = null;
        this.metronomePlaying = false;
        this.currentBPM = 120;
    }

    async init() {
        try {
            // Create audio context on user interaction to comply with browser policies
            const initContext = () => {
                if (!this.audioContext) {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    this.masterGainNode = this.audioContext.createGain();
                    this.masterGainNode.connect(this.audioContext.destination);
                    
                    // Initialize metronome nodes
                    this.metronomeGainNode = this.audioContext.createGain();
                    this.metronomeGainNode.gain.value = 0.5; // Set default metronome volume
                    this.metronomeGainNode.connect(this.masterGainNode);

                    // Remove initialization listeners
                    document.removeEventListener('click', initContext);
                    document.removeEventListener('keydown', initContext);
                    
                    console.log('Audio engine initialized successfully');
                }
            };

            // Add initialization listeners
            document.addEventListener('click', initContext);
            document.addEventListener('keydown', initContext);

        } catch (error) {
            console.error('Failed to initialize audio engine:', error);
            throw error;
        }
    }

    async loadTrack(file, trackId) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            const track = {
                buffer: audioBuffer,
                source: null,
                gainNode: this.audioContext.createGain(),
                panNode: this.audioContext.createStereoPanner(),
                startTime: 0,
                pauseTime: 0,
                isPlaying: false,
                isMuted: false,
                isSolo: false
            };

            // Connect nodes
            track.gainNode.connect(track.panNode);
            track.panNode.connect(this.masterGainNode);
            
            this.tracks.set(trackId, track);
            return true;
        } catch (error) {
            console.error('Error loading track:', error);
            return false;
        }
    }

    play() {
        const currentTime = this.audioContext.currentTime;

        this.tracks.forEach((track, trackId) => {
            if (!track.isPlaying && !track.isMuted) {
                // Create and configure new source node
                track.source = this.audioContext.createBufferSource();
                track.source.buffer = track.buffer;
                track.source.connect(track.gainNode);

                // Calculate start position
                const offset = track.pauseTime;
                track.source.start(0, offset);
                track.startTime = currentTime - offset;
                track.isPlaying = true;
            }
        });

        if (this.metronomePlaying) {
            this.startMetronome(this.currentBPM);
        }
    }

    pause() {
        const currentTime = this.audioContext.currentTime;

        this.tracks.forEach((track, trackId) => {
            if (track.isPlaying) {
                track.source.stop();
                track.source.disconnect();
                track.pauseTime = currentTime - track.startTime;
                track.isPlaying = false;
            }
        });

        if (this.metronomePlaying) {
            this.stopMetronome();
        }
    }

    setTrackVolume(trackId, volume) {
        const track = this.tracks.get(trackId);
        if (track) {
            track.gainNode.gain.value = volume;
        }
    }

    setTrackPan(trackId, pan) {
        const track = this.tracks.get(trackId);
        if (track) {
            track.panNode.pan.value = pan;
        }
    }

    muteTrack(trackId) {
        const track = this.tracks.get(trackId);
        if (track) {
            track.isMuted = !track.isMuted;
            track.gainNode.gain.value = track.isMuted ? 0 : 1;
        }
    }

    soloTrack(trackId) {
        const track = this.tracks.get(trackId);
        if (track) {
            track.isSolo = !track.isSolo;
            
            // If any track is soloed, mute all non-soloed tracks
            const hasSoloedTrack = Array.from(this.tracks.values()).some(t => t.isSolo);
            
            this.tracks.forEach((t, id) => {
                const shouldPlay = !hasSoloedTrack || t.isSolo;
                t.gainNode.gain.value = shouldPlay && !t.isMuted ? 1 : 0;
            });
        }
    }

    startMetronome(bpm) {
        if (!this.audioContext) return;
        
        this.currentBPM = bpm;
        this.metronomePlaying = true;

        if (this.metronomeOscillator) {
            this.stopMetronome();
        }

        const beatDuration = 60 / bpm;

        // Create click sound using multiple oscillators for a more pleasant sound
        const scheduleClick = (time) => {
            // High frequency click
            const highOsc = this.audioContext.createOscillator();
            highOsc.frequency.value = 1600;
            const highGain = this.audioContext.createGain();
            highGain.gain.value = 0.5;
            highOsc.connect(highGain);
            highGain.connect(this.metronomeGainNode);

            // Low frequency body
            const lowOsc = this.audioContext.createOscillator();
            lowOsc.frequency.value = 800;
            const lowGain = this.audioContext.createGain();
            lowGain.gain.value = 0.5;
            lowOsc.connect(lowGain);
            lowGain.connect(this.metronomeGainNode);

            // Envelope
            highGain.gain.setValueAtTime(0.5, time);
            highGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
            lowGain.gain.setValueAtTime(0.5, time);
            lowGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

            highOsc.start(time);
            lowOsc.start(time);
            highOsc.stop(time + 0.05);
            lowOsc.stop(time + 0.05);
        };

        // Schedule initial clicks
        const currentTime = this.audioContext.currentTime;
        this.scheduleMetronomeClicks(currentTime, beatDuration, scheduleClick);
    }

    scheduleMetronomeClicks(startTime, beatDuration, scheduleClick) {
        const scheduleAheadTime = 0.1; // Schedule 100ms ahead
        let nextClickTime = startTime;

        const schedule = () => {
            while (nextClickTime < this.audioContext.currentTime + scheduleAheadTime) {
                scheduleClick(nextClickTime);
                nextClickTime += beatDuration;
            }

            if (this.metronomePlaying) {
                requestAnimationFrame(schedule);
            }
        };

        schedule();
    }

    stopMetronome() {
        this.metronomePlaying = false;
    }

    setMetronomeVolume(volume) {
        if (this.metronomeGainNode) {
            this.metronomeGainNode.gain.value = volume;
        }
    }

    updateMetronomeBPM(bpm) {
        if (this.metronomePlaying) {
            this.startMetronome(bpm);
        }
    }
}
