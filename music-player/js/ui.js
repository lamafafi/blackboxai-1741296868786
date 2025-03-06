class UI {
    constructor(app) {
        this.app = app;
        this.setupEventListeners();
        this.initializeUIState();
        this.currentSetlistId = null;
        this.currentMultitrackId = null;
    }

    initializeUIState() {
        // Initialize UI elements with default states
        this.updatePlayButton(false);
        this.updateMetronomeButton(false);
        this.updateBPMDisplay(this.app.currentBPM);
        this.refreshMainSetlistDropdown();
    }

    refreshMainSetlistDropdown() {
        const setlistSelect = document.querySelector('#main-setlist-select');
        const multitrackSelect = document.querySelector('#main-multitrack-select');
        
        if (!setlistSelect || !multitrackSelect) return;

        // Refresh setlist dropdown
        const setlists = this.app.trackManager.getSetlists();
        setlistSelect.innerHTML = '<option value="">Choose a setlist...</option>';
        setlists.forEach(setlist => {
            const option = document.createElement('option');
            option.value = setlist.id;
            option.textContent = setlist.name;
            setlistSelect.appendChild(option);
        });

        // Reset multitrack dropdown
        multitrackSelect.innerHTML = '<option value="">Choose a multitrack...</option>';
        multitrackSelect.disabled = true;
        multitrackSelect.classList.add('opacity-50');

        // Restore previous selection if it exists
        if (this.currentSetlistId) {
            setlistSelect.value = this.currentSetlistId;
            this.updateMultitrackDropdown(this.currentSetlistId);
        }
    }

    updateMultitrackDropdown(setlistId) {
        const multitrackSelect = document.querySelector('#main-multitrack-select');
        if (!multitrackSelect) return;

        const setlist = this.app.trackManager.setlists.get(parseInt(setlistId));
        if (!setlist || !setlist.items) {
            multitrackSelect.innerHTML = '<option value="">No multitracks available</option>';
            multitrackSelect.disabled = true;
            multitrackSelect.classList.add('opacity-50');
            return;
        }

        multitrackSelect.innerHTML = '<option value="">Choose a multitrack...</option>';
        const multitracks = setlist.items.filter(item => item.type === 'multitrack');
        
        if (multitracks.length === 0) {
            multitrackSelect.innerHTML = '<option value="">No multitracks in setlist</option>';
            multitrackSelect.disabled = true;
            multitrackSelect.classList.add('opacity-50');
        } else {
            multitrackSelect.disabled = false;
            multitrackSelect.classList.remove('opacity-50');
            
            multitracks.forEach(item => {
                const multitrack = this.app.trackManager.getMultitrack(item.id);
                if (multitrack) {
                    const option = document.createElement('option');
                    option.value = multitrack.id;
                    option.textContent = multitrack.name;
                    multitrackSelect.appendChild(option);
                }
            });

            // Restore previous selection if it exists
            if (this.currentMultitrackId) {
                multitrackSelect.value = this.currentMultitrackId;
                this.updateTrackList(this.currentMultitrackId);
            }
        }
    }

    setupEventListeners() {
        // Settings button
        const settingsBtn = document.querySelector('.fa-cog').parentElement;
        settingsBtn.addEventListener('click', () => this.toggleSettingsPanel());

        // Main setlist selection
        const mainSetlistSelect = document.querySelector('#main-setlist-select');
        if (mainSetlistSelect) {
            mainSetlistSelect.addEventListener('change', (e) => {
                this.currentSetlistId = e.target.value;
                this.currentMultitrackId = null;
                this.updateMultitrackDropdown(this.currentSetlistId);
            });
        }

        // Main multitrack selection
        const mainMultitrackSelect = document.querySelector('#main-multitrack-select');
        if (mainMultitrackSelect) {
            mainMultitrackSelect.addEventListener('change', (e) => {
                this.currentMultitrackId = e.target.value;
                if (this.currentMultitrackId) {
                    this.updateTrackList(parseInt(this.currentMultitrackId));
                } else {
                    // Clear track list if no multitrack is selected
                    const trackList = document.querySelector('#track-list');
                    if (trackList) {
                        trackList.innerHTML = '<div class="text-center text-gray-500">Select a multitrack to view tracks</div>';
                    }
                }
            });
        }
    }

    updatePlayButton(isPlaying) {
        const playButton = document.querySelector('.fa-play').parentElement;
        const icon = playButton.querySelector('i');
        
        if (isPlaying) {
            icon.classList.remove('fa-play');
            icon.classList.add('fa-pause');
        } else {
            icon.classList.remove('fa-pause');
            icon.classList.add('fa-play');
        }
    }

    updateMetronomeButton(isActive) {
        const metronomeButton = document.querySelector('.fa-metronome').parentElement;
        metronomeButton.classList.toggle('bg-primary', isActive);
        metronomeButton.classList.toggle('text-white', isActive);
    }

    updateBPMDisplay(bpm) {
        const bpmDisplay = document.querySelector('.text-sm.text-gray-400');
        bpmDisplay.textContent = `${bpm} BPM`;
    }

    updateTrackList(multitrackId) {
        const trackListContainer = document.querySelector('#track-list');
        if (!trackListContainer) return;

        const multitrack = this.app.trackManager.getMultitrack(multitrackId);
        if (!multitrack) {
            trackListContainer.innerHTML = '<div class="text-center text-gray-500">Multitrack not found</div>';
            return;
        }

        trackListContainer.innerHTML = ''; // Clear existing tracks

        // Get and display all tracks in the multitrack
        multitrack.tracks.forEach(trackId => {
            const track = this.app.trackManager.getTrack(trackId);
            if (track) {
                const trackElement = this.createTrackElement(track);
                trackListContainer.appendChild(trackElement);
            }
        });

        if (multitrack.tracks.length === 0) {
            trackListContainer.innerHTML = '<div class="text-center text-gray-500">No tracks in this multitrack</div>';
        }
    }

    createTrackElement(track) {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'flex items-center justify-between p-3 bg-gray-700 rounded';
        trackDiv.dataset.trackId = track.id;

        trackDiv.innerHTML = `
            <div class="flex items-center">
                <button class="p-2 rounded hover:bg-gray-600">
                    <i class="fas fa-play text-sm"></i>
                </button>
                <span class="ml-3">${this.sanitizeHTML(track.name)}</span>
            </div>
            <div class="flex items-center space-x-4">
                <!-- Volume Control -->
                <div class="flex items-center space-x-2">
                    <i class="fas fa-volume-high text-sm"></i>
                    <input type="range" 
                           class="track-volume w-24" 
                           min="0" 
                           max="100" 
                           value="${track.volume * 100}"
                           data-track-id="${track.id}">
                </div>
                <!-- Pan Control -->
                <div class="flex items-center space-x-2">
                    <i class="fas fa-arrows-left-right text-sm"></i>
                    <input type="range" 
                           class="track-pan w-24" 
                           min="-100" 
                           max="100" 
                           value="${Math.max(-100, Math.min(100, track.pan * 100))}"
                           data-track-id="${track.id}">
                </div>
                <!-- Mute/Solo Buttons -->
                <button class="p-2 rounded hover:bg-gray-600 ${track.muted ? 'bg-red-500' : ''}" 
                        title="Mute"
                        onclick="window.musicPlayerApp.trackManager.toggleTrackMute(${track.id})">
                    <i class="fas fa-volume-xmark text-sm"></i>
                </button>
                <button class="p-2 rounded hover:bg-gray-600 ${track.soloed ? 'bg-green-500' : ''}" 
                        title="Solo"
                        onclick="window.musicPlayerApp.trackManager.toggleTrackSolo(${track.id})">
                    <i class="fas fa-headphones text-sm"></i>
                </button>
            </div>
        `;

        // Add event listeners for track-specific controls
        this.setupTrackEventListeners(trackDiv, track);

        return trackDiv;
    }

    setupTrackEventListeners(trackElement, track) {
        // Track play button
        const playButton = trackElement.querySelector('.fa-play').parentElement;
        playButton.addEventListener('click', () => {
            // Toggle individual track playback
            const icon = playButton.querySelector('i');
            if (icon.classList.contains('fa-play')) {
                icon.classList.replace('fa-play', 'fa-pause');
                this.app.audioEngine.playTrack(track.id);
            } else {
                icon.classList.replace('fa-pause', 'fa-play');
                this.app.audioEngine.pauseTrack(track.id);
            }
        });

        // Volume control
        const volumeSlider = trackElement.querySelector('.track-volume');
        volumeSlider.addEventListener('input', (e) => {
            const volume = parseFloat(e.target.value) / 100;
            this.app.trackManager.updateTrackVolume(track.id, volume);
        });

        // Pan control
        const panSlider = trackElement.querySelector('.track-pan');
        panSlider.addEventListener('input', (e) => {
            // Convert from -100 to 100 range to -1 to 1 range
            const pan = parseFloat(e.target.value) / 100;
            this.app.trackManager.updateTrackPan(track.id, Math.max(-1, Math.min(1, pan)));
        });
    }

    toggleSettingsPanel() {
        // Create settings panel if it doesn't exist
        let settingsPanel = document.querySelector('#settings-panel');
        
        if (!settingsPanel) {
            settingsPanel = document.createElement('div');
            settingsPanel.id = 'settings-panel';
            settingsPanel.className = 'fixed top-0 right-0 h-full w-80 bg-gray-800 shadow-lg transform translate-x-full transition-transform duration-300 ease-in-out p-6';
            
            settingsPanel.innerHTML = `
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-semibold">Settings</h2>
                    <button class="p-2 rounded hover:bg-gray-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <!-- BPM Setting -->
                <div class="mb-6">
                    <label class="block text-sm font-medium mb-2">Tempo (BPM)</label>
                    <div class="flex items-center space-x-4">
                        <input type="range" 
                               class="flex-1" 
                               min="40" 
                               max="240" 
                               value="${this.app.currentBPM}"
                               id="bpm-slider">
                        <input type="number" 
                               class="w-20 px-2 py-1 bg-gray-700 rounded" 
                               value="${this.app.currentBPM}"
                               id="bpm-input">
                    </div>
                </div>

                <!-- Metronome Settings -->
                <div class="mb-6">
                    <h3 class="text-sm font-medium mb-2">Metronome</h3>
                    <div class="space-y-2">
                        <label class="flex items-center">
                            <input type="checkbox" class="mr-2" id="metronome-enabled">
                            Enable Metronome
                        </label>
                        <div class="flex items-center space-x-2">
                            <span class="text-sm">Volume</span>
                            <input type="range" 
                                   class="flex-1" 
                                   min="0" 
                                   max="100" 
                                   value="50"
                                   id="metronome-volume">
                        </div>
                    </div>
                </div>

                <!-- Multitrack Management -->
                <div class="mb-6">
                    <h3 class="text-sm font-medium mb-4">Create Multitrack</h3>
                    
                    <!-- Create New Multitrack -->
                    <div class="mb-4">
                        <div class="flex space-x-2">
                            <input type="text" 
                                   id="new-multitrack-name"
                                   placeholder="New multitrack name" 
                                   class="flex-1 px-3 py-2 bg-gray-700 rounded text-sm">
                            <button id="create-multitrack-btn" 
                                    class="px-4 py-2 bg-primary hover:bg-primary/90 rounded text-sm opacity-50 cursor-not-allowed"
                                    disabled>
                                Create
                            </button>
                        </div>
                    </div>

                    <!-- Track Selection for Multitrack -->
                    <div class="mb-4">
                        <label class="block text-sm mb-2">Select Instrument Tracks</label>
                        <div id="multitrack-track-selection" 
                             class="max-h-48 overflow-y-auto bg-gray-700 rounded p-2 space-y-2">
                        </div>
                    </div>
                </div>

                <!-- Setlist Management -->
                <div class="mb-6">
                    <h3 class="text-sm font-medium mb-4">Manage Setlists</h3>
                    
                    <!-- Create New Setlist -->
                    <div class="mb-4">
                        <div class="flex space-x-2">
                            <input type="text" 
                                   id="new-setlist-name"
                                   placeholder="New setlist name" 
                                   class="flex-1 px-3 py-2 bg-gray-700 rounded text-sm">
                            <button id="create-setlist-btn" 
                                    class="px-4 py-2 bg-primary hover:bg-primary/90 rounded text-sm">
                                Create
                            </button>
                        </div>
                    </div>

                    <!-- Select Setlist -->
                    <div class="mb-4">
                        <label class="block text-sm mb-2">Select Setlist</label>
                        <select id="setlist-select" 
                                class="w-full px-3 py-2 bg-gray-700 rounded text-sm">
                            <option value="">Choose a setlist...</option>
                        </select>
                    </div>

                    <!-- Multitrack Selection -->
                    <div class="mb-4">
                        <label class="block text-sm mb-2">Select Multitrack</label>
                        <select id="multitrack-select" 
                                class="w-full px-3 py-2 bg-gray-700 rounded text-sm">
                            <option value="">Choose a multitrack...</option>
                        </select>
                    </div>

                    <!-- Add to Setlist Button -->
                    <button id="add-to-setlist-btn" 
                            class="w-full px-4 py-2 bg-primary hover:bg-primary/90 rounded text-sm opacity-50 cursor-not-allowed"
                            disabled>
                        Add Multitrack to Setlist
                    </button>
                </div>

                <!-- Export/Import -->
                <div class="space-y-4">
                    <button class="w-full px-4 py-2 bg-primary hover:bg-primary/90 rounded">
                        Export Setlist
                    </button>
                    <button class="w-full px-4 py-2 border border-gray-600 hover:bg-gray-700 rounded">
                        Import Setlist
                    </button>
                </div>
            `;

            document.body.appendChild(settingsPanel);

            // Setup settings panel event listeners
            this.setupSettingsPanelListeners(settingsPanel);
        }

        // Toggle panel visibility
        requestAnimationFrame(() => {
            settingsPanel.classList.toggle('translate-x-0');
        });
    }

    setupSettingsPanelListeners(panel) {
        // Close button
        const closeBtn = panel.querySelector('.fa-times').parentElement;
        closeBtn.addEventListener('click', () => {
            panel.classList.remove('translate-x-0');
            setTimeout(() => panel.remove(), 300); // Remove after animation
        });

        // Setlist Management
        this.setupSetlistManagement(panel);

        // BPM controls
        const bpmSlider = panel.querySelector('#bpm-slider');
        const bpmInput = panel.querySelector('#bpm-input');

        const updateBPM = (value) => {
            value = Math.min(Math.max(parseInt(value) || 120, 40), 240);
            bpmInput.value = value;
            bpmSlider.value = value;
            this.app.setBPM(value);
            this.updateBPMDisplay(value);
        };

        bpmSlider.addEventListener('input', (e) => updateBPM(e.target.value));
        bpmInput.addEventListener('change', (e) => updateBPM(e.target.value));

        // Metronome controls
        const metronomeCheckbox = panel.querySelector('#metronome-enabled');
        const metronomeVolume = panel.querySelector('#metronome-volume');

        metronomeCheckbox.addEventListener('change', (e) => {
            const isEnabled = e.target.checked;
            if (isEnabled) {
                this.app.audioEngine.startMetronome(this.app.currentBPM);
            } else {
                this.app.audioEngine.stopMetronome();
            }
            this.updateMetronomeButton(isEnabled);
            
            // Show/hide volume control based on metronome state
            metronomeVolume.parentElement.style.opacity = isEnabled ? '1' : '0.5';
            metronomeVolume.disabled = !isEnabled;
        });

        metronomeVolume.addEventListener('input', (e) => {
            const volume = parseFloat(e.target.value) / 100;
            this.app.audioEngine.setMetronomeVolume(volume);
        });

        // Export/Import buttons
        const exportBtn = panel.querySelector('button:nth-of-type(1)');
        const importBtn = panel.querySelector('button:nth-of-type(2)');

        exportBtn.addEventListener('click', () => {
            const setlist = this.app.trackManager.exportCurrentSetlist();
            if (setlist) {
                const blob = new Blob([setlist], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'setlist.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                this.showSuccess('Setlist exported successfully');
            } else {
                this.showError('No setlist to export');
            }
        });

        importBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const result = this.app.trackManager.importSetlist(event.target.result);
                            if (result) {
                                this.showSuccess('Setlist imported successfully');
                                this.updateTrackList(this.app.trackManager.getTracks());
                            } else {
                                this.showError('Failed to import setlist');
                            }
                        } catch (error) {
                            this.showError('Invalid setlist file');
                        }
                    };
                    reader.readAsText(file);
                }
            };
            
            input.click();
        });
    }

    // Helper function to sanitize HTML strings
    sanitizeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Show loading overlay
    showLoading(message = 'Loading tracks...') {
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50';
        
        overlay.innerHTML = `
            <div class="text-center">
                <div class="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                <div class="text-white text-lg">${this.sanitizeHTML(message)}</div>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }

    // Hide loading overlay
    hideLoading() {
        const overlay = document.querySelector('#loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    // Show error message to user
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-6 py-4 rounded shadow-lg';
        errorDiv.textContent = message;

        document.body.appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    // Show success message to user
    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-4 rounded shadow-lg';
        successDiv.textContent = message;

        document.body.appendChild(successDiv);

        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    setupSetlistManagement(panel) {
        // Get DOM elements
        const createMultitrackBtn = panel.querySelector('#create-multitrack-btn');
        const newMultitrackInput = panel.querySelector('#new-multitrack-name');
        const multitrackTrackSelection = panel.querySelector('#multitrack-track-selection');
        const createSetlistBtn = panel.querySelector('#create-setlist-btn');
        const newSetlistInput = panel.querySelector('#new-setlist-name');
        const setlistSelect = panel.querySelector('#setlist-select');
        const multitrackSelect = panel.querySelector('#multitrack-select');
        const addToSetlistBtn = panel.querySelector('#add-to-setlist-btn');

        // Refresh functions
        const refreshSetlistDropdown = () => {
            const setlists = this.app.trackManager.getSetlists();
            setlistSelect.innerHTML = '<option value="">Choose a setlist...</option>';
            setlists.forEach(setlist => {
                const option = document.createElement('option');
                option.value = setlist.id;
                option.textContent = setlist.name;
                setlistSelect.appendChild(option);
            });
        };

        const refreshMultitrackDropdown = () => {
            const multitracks = this.app.trackManager.getMultitracks();
            multitrackSelect.innerHTML = '<option value="">Choose a multitrack...</option>';
            multitracks.forEach(multitrack => {
                const option = document.createElement('option');
                option.value = multitrack.id;
                option.textContent = multitrack.name;
                multitrackSelect.appendChild(option);
            });
        };

        const refreshTrackSelection = () => {
            const tracks = this.app.trackManager.getTracks();
            multitrackTrackSelection.innerHTML = '';
            tracks.forEach(track => {
                const trackDiv = document.createElement('div');
                trackDiv.className = 'flex items-center space-x-2 p-2 hover:bg-gray-600 rounded';
                trackDiv.innerHTML = `
                    <input type="checkbox" 
                           id="track-${track.id}" 
                           value="${track.id}"
                           class="rounded border-gray-500">
                    <label for="track-${track.id}" class="text-sm flex-1 cursor-pointer">
                        ${this.sanitizeHTML(track.name)}
                    </label>
                `;
                multitrackTrackSelection.appendChild(trackDiv);
            });
        };

        // Initial refresh
        refreshSetlistDropdown();
        refreshMultitrackDropdown();
        refreshTrackSelection();

        // Create new multitrack
        const updateCreateMultitrackButton = () => {
            const hasName = newMultitrackInput.value.trim() !== '';
            const hasSelectedTracks = multitrackTrackSelection.querySelector('input[type="checkbox"]:checked');
            createMultitrackBtn.disabled = !(hasName && hasSelectedTracks);
            createMultitrackBtn.classList.toggle('opacity-50', createMultitrackBtn.disabled);
            createMultitrackBtn.classList.toggle('cursor-not-allowed', createMultitrackBtn.disabled);
        };

        newMultitrackInput.addEventListener('input', updateCreateMultitrackButton);
        multitrackTrackSelection.addEventListener('change', updateCreateMultitrackButton);

        createMultitrackBtn.addEventListener('click', () => {
            const name = newMultitrackInput.value.trim();
            const selectedTracks = Array.from(multitrackTrackSelection.querySelectorAll('input[type="checkbox"]:checked'))
                .map(checkbox => parseInt(checkbox.value));

            if (name && selectedTracks.length > 0) {
                const multitrack = this.app.trackManager.createMultitrack(name, selectedTracks);
                if (multitrack) {
                    this.showSuccess(`Created multitrack: ${name}`);
                    newMultitrackInput.value = '';
                    multitrackTrackSelection.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
                    refreshMultitrackDropdown();
                    updateCreateMultitrackButton();
                } else {
                    this.showError('Failed to create multitrack');
                }
            }
        });

        // Create new setlist
        createSetlistBtn.addEventListener('click', () => {
            const name = newSetlistInput.value.trim();
            if (name) {
                const setlist = this.app.trackManager.createSetlist(name);
                if (setlist) {
                    this.showSuccess(`Created setlist: ${name}`);
                    newSetlistInput.value = '';
                    refreshSetlistDropdown();
                    setlistSelect.value = setlist.id;
                }
            } else {
                this.showError('Please enter a setlist name');
            }
        });

        // Enable/disable add to setlist button
        const updateAddToSetlistButton = () => {
            const hasSetlist = setlistSelect.value !== '';
            const hasMultitrack = multitrackSelect.value !== '';
            addToSetlistBtn.disabled = !(hasSetlist && hasMultitrack);
            addToSetlistBtn.classList.toggle('opacity-50', addToSetlistBtn.disabled);
            addToSetlistBtn.classList.toggle('cursor-not-allowed', addToSetlistBtn.disabled);
        };

        setlistSelect.addEventListener('change', updateAddToSetlistButton);
        multitrackSelect.addEventListener('change', updateAddToSetlistButton);

        // Add multitrack to setlist
        addToSetlistBtn.addEventListener('click', () => {
            const setlistId = setlistSelect.value;
            const multitrackId = multitrackSelect.value;

            if (setlistId && multitrackId) {
                const result = this.app.trackManager.addToSetlist(setlistId, parseInt(multitrackId), 'multitrack');
                
                if (result.success) {
                    this.showSuccess(result.message);
                    multitrackSelect.value = '';
                    updateAddToSetlistButton();
                } else {
                    this.showError(result.error || 'Failed to add multitrack to setlist');
                }
            }
        });
    }
}
