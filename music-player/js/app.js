// Main application logic
class MusicPlayerApp {
    constructor() {
        this.audioEngine = null;
        this.trackManager = null;
        this.ui = null;
        this.isPlaying = false;
        this.currentBPM = 120;
        this.isMetronomeActive = false;
    }

    async init() {
        try {
            // Initialize components
            this.audioEngine = new AudioEngine();
            this.trackManager = new TrackManager();
            this.ui = new UI(this);

            await this.audioEngine.init();
            this.setupEventListeners();
            console.log('Music Player Pro initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Music Player Pro:', error);
        }
    }

    setupEventListeners() {
        // Play/Pause button
        document.querySelector('.fa-play').parentElement.addEventListener('click', () => {
            this.togglePlayback();
        });

        // Metronome button
        document.querySelector('.fa-metronome').parentElement.addEventListener('click', () => {
            this.toggleMetronome();
        });

        // File open button
        document.querySelector('.fa-folder-open').parentElement.addEventListener('click', () => {
            this.openFileDialog();
        });
    }

    togglePlayback() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        this.isPlaying = true;
        this.audioEngine.play();
        this.ui.updatePlayButton(true);
    }

    pause() {
        this.isPlaying = false;
        this.audioEngine.pause();
        this.ui.updatePlayButton(false);
    }

    toggleMetronome() {
        this.isMetronomeActive = !this.isMetronomeActive;
        if (this.isMetronomeActive) {
            this.audioEngine.startMetronome(this.currentBPM);
        } else {
            this.audioEngine.stopMetronome();
        }
        this.ui.updateMetronomeButton(this.isMetronomeActive);
    }

    async openFileDialog() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'audio/*,.zip,application/zip';
            input.multiple = true;

            input.onchange = async (e) => {
                const files = Array.from(e.target.files);
                const tracksToLoad = [];

                this.ui.showLoading('Processing files...');

                try {
                    for (const file of files) {
                        if (file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip') {
                            // Process ZIP file
                            const zip = new JSZip();
                            const zipContent = await zip.loadAsync(file);
                            
                            // Extract audio files from ZIP
                            const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
                            const extractionPromises = [];

                            zipContent.forEach((relativePath, entry) => {
                                if (!entry.dir && audioExtensions.some(ext => relativePath.toLowerCase().endsWith(ext))) {
                                    const promise = entry.async('blob').then(blob => {
                                        // Create a new File object from the blob
                                        return new File([blob], entry.name, {
                                            type: blob.type || 'audio/mpeg'
                                        });
                                    });
                                    extractionPromises.push(promise);
                                }
                            });

                            const extractedFiles = await Promise.all(extractionPromises);
                            tracksToLoad.push(...extractedFiles);
                        } else {
                            // Regular audio file
                            tracksToLoad.push(file);
                        }
                    }

                    if (tracksToLoad.length > 0) {
                        const loadedTracks = await this.trackManager.loadTracks(tracksToLoad);
                        if (loadedTracks && loadedTracks.length > 0) {
                            // Create a default multitrack for the loaded tracks if needed
                            const multitrackName = loadedTracks.length === 1 ? 
                                loadedTracks[0].name : 
                                `Multitrack ${new Date().toLocaleTimeString()}`;
                            
                            const multitrack = this.trackManager.createMultitrack(
                                multitrackName,
                                loadedTracks.map(track => track.id)
                            );

                            if (multitrack) {
                                this.ui.showSuccess(`Created multitrack: ${multitrackName}`);
                            }

                            // Refresh the UI
                            this.ui.refreshMainSetlistDropdown();
                            this.ui.showSuccess(`Loaded ${tracksToLoad.length} tracks successfully`);
                        }
                    } else {
                        this.ui.showError('No valid audio files found');
                    }
                } catch (error) {
                    console.error('Error processing files:', error);
                    this.ui.showError('Failed to process files: ' + error.message);
                } finally {
                    this.ui.hideLoading();
                }
            };

            input.click();
        } catch (error) {
            console.error('Error opening files:', error);
            this.ui.showError('Failed to open file dialog');
        }
    }

    setBPM(value) {
        this.currentBPM = value;
        if (this.isMetronomeActive) {
            this.audioEngine.updateMetronomeBPM(value);
        }
        this.ui.updateBPMDisplay(value);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.musicPlayerApp = new MusicPlayerApp();
    window.musicPlayerApp.init();
});
