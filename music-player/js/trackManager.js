class TrackManager {
    constructor() {
        this.tracks = new Map();
        this.setlists = new Map();
        this.multitracks = new Map();
        this.currentSetlist = null;
        this.nextTrackId = 1;
        this.nextMultitrackId = 1;
    }

    async loadTracks(files) {
        const loadPromises = files.map(async (file) => {
            const trackId = this.nextTrackId++;
            const track = {
                id: trackId,
                name: file.name,
                file: file,
                volume: 1,
                pan: 0,
                muted: false,
                soloed: false
            };

            // Load audio into AudioEngine
            const success = await window.musicPlayerApp.audioEngine.loadTrack(file, trackId);
            
            if (success) {
                this.tracks.set(trackId, track);
                return track;
            } else {
                console.error(`Failed to load track: ${file.name}`);
                return null;
            }
        });

        const results = await Promise.all(loadPromises);
        return results.filter(result => result !== null);
    }

    getTracks() {
        return Array.from(this.tracks.values());
    }

    getTrack(trackId) {
        return this.tracks.get(trackId);
    }

    updateTrackVolume(trackId, volume) {
        const track = this.tracks.get(trackId);
        if (track) {
            track.volume = volume;
            window.musicPlayerApp.audioEngine.setTrackVolume(trackId, volume);
        }
    }

    updateTrackPan(trackId, pan) {
        const track = this.tracks.get(trackId);
        if (track) {
            track.pan = pan;
            window.musicPlayerApp.audioEngine.setTrackPan(trackId, pan);
        }
    }

    toggleTrackMute(trackId) {
        const track = this.tracks.get(trackId);
        if (track) {
            track.muted = !track.muted;
            window.musicPlayerApp.audioEngine.muteTrack(trackId);
            return track.muted;
        }
        return false;
    }

    toggleTrackSolo(trackId) {
        const track = this.tracks.get(trackId);
        if (track) {
            track.soloed = !track.soloed;
            window.musicPlayerApp.audioEngine.soloTrack(trackId);
            return track.soloed;
        }
        return false;
    }

    // Setlist Management
    createSetlist(name) {
        const setlist = {
            id: Date.now(),
            name: name,
            tracks: []
        };
        this.setlists.set(setlist.id, setlist);
        return setlist;
    }

    deleteSetlist(setlistId) {
        return this.setlists.delete(setlistId);
    }

    getSetlists() {
        return Array.from(this.setlists.values());
    }

    addTrackToSetlist(setlistId, trackId) {
        const setlist = this.setlists.get(setlistId);
        const track = this.tracks.get(trackId);
        
        if (setlist && track) {
            setlist.tracks.push(trackId);
            return true;
        }
        return false;
    }

    // Multitrack Management
    createMultitrack(name, trackIds) {
        const multitrack = {
            id: this.nextMultitrackId++,
            name: name,
            tracks: [],
            volume: 1,
            muted: false
        };

        // Validate and add tracks
        const validTracks = trackIds.filter(trackId => this.tracks.has(trackId));
        if (validTracks.length === 0) {
            return null;
        }

        multitrack.tracks = validTracks;
        this.multitracks.set(multitrack.id, multitrack);
        this.saveToLocalStorage();
        return multitrack;
    }

    getMultitracks() {
        return Array.from(this.multitracks.values());
    }

    getMultitrack(multitrackId) {
        return this.multitracks.get(multitrackId);
    }

    deleteMultitrack(multitrackId) {
        return this.multitracks.delete(multitrackId);
    }

    // Modified to work with multitracks
    addToSetlist(setlistId, itemId, type = 'multitrack') {
        const setlist = this.setlists.get(setlistId);
        if (!setlist) {
            console.error('Setlist not found:', setlistId);
            return { success: false, error: 'Setlist not found' };
        }

        // Initialize items array if it doesn't exist
        if (!setlist.items) {
            setlist.items = [];
        }

        // Check if item exists
        const item = type === 'multitrack' ? 
            this.multitracks.get(itemId) : 
            this.tracks.get(itemId);

        if (!item) {
            return { 
                success: false, 
                error: `${type} not found` 
            };
        }

        // Check for duplicates
        const isDuplicate = setlist.items.some(
            existingItem => existingItem.id === itemId && existingItem.type === type
        );

        if (isDuplicate) {
            return { 
                success: false, 
                error: 'Item already in setlist' 
            };
        }

        // Add to setlist
        setlist.items.push({
            id: itemId,
            type: type,
            name: item.name
        });

        this.saveToLocalStorage();
        return { 
            success: true, 
            message: `Added ${type} "${item.name}" to setlist` 
        };
    }

    removeTrackFromSetlist(setlistId, trackId) {
        const setlist = this.setlists.get(setlistId);
        if (setlist) {
            const index = setlist.tracks.indexOf(trackId);
            if (index !== -1) {
                setlist.tracks.splice(index, 1);
                return true;
            }
        }
        return false;
    }

    reorderSetlistTracks(setlistId, oldIndex, newIndex) {
        const setlist = this.setlists.get(setlistId);
        if (setlist && oldIndex >= 0 && newIndex >= 0 && 
            oldIndex < setlist.tracks.length && newIndex < setlist.tracks.length) {
            const [track] = setlist.tracks.splice(oldIndex, 1);
            setlist.tracks.splice(newIndex, 0, track);
            return true;
        }
        return false;
    }

    // Import/Export functionality
    exportSetlist(setlistId) {
        const setlist = this.setlists.get(setlistId);
        if (!setlist) return null;

        const exportData = {
            name: setlist.name,
            tracks: setlist.tracks.map(trackId => {
                const track = this.tracks.get(trackId);
                return {
                    id: track.id,
                    name: track.name,
                    volume: track.volume,
                    pan: track.pan,
                    muted: track.muted,
                    soloed: track.soloed
                };
            })
        };

        return JSON.stringify(exportData, null, 2);
    }

    importSetlist(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            const setlist = this.createSetlist(data.name);
            
            // Only import track references that exist in our current session
            data.tracks.forEach(trackData => {
                if (this.tracks.has(trackData.id)) {
                    setlist.tracks.push(trackData.id);
                    
                    // Update track settings
                    const track = this.tracks.get(trackData.id);
                    track.volume = trackData.volume;
                    track.pan = trackData.pan;
                    track.muted = trackData.muted;
                    track.soloed = trackData.soloed;
                    
                    // Apply settings to audio engine
                    window.musicPlayerApp.audioEngine.setTrackVolume(trackData.id, trackData.volume);
                    window.musicPlayerApp.audioEngine.setTrackPan(trackData.id, trackData.pan);
                    if (trackData.muted) window.musicPlayerApp.audioEngine.muteTrack(trackData.id);
                    if (trackData.soloed) window.musicPlayerApp.audioEngine.soloTrack(trackData.id);
                }
            });

            return setlist;
        } catch (error) {
            console.error('Error importing setlist:', error);
            return null;
        }
    }

    // Local Storage Management
    saveToLocalStorage() {
        try {
            // Save setlists
            const setlistsData = Array.from(this.setlists.entries());
            localStorage.setItem('musicPlayerSetlists', JSON.stringify(setlistsData));
            
            // Save track metadata (excluding audio data)
            const tracksData = Array.from(this.tracks.entries()).map(([id, track]) => {
                return [id, {
                    id: track.id,
                    name: track.name,
                    volume: track.volume,
                    pan: track.pan,
                    muted: track.muted,
                    soloed: track.soloed
                }];
            });
            localStorage.setItem('musicPlayerTracks', JSON.stringify(tracksData));

            // Save multitracks
            const multitracksData = Array.from(this.multitracks.entries());
            localStorage.setItem('musicPlayerMultitracks', JSON.stringify(multitracksData));
            
            // Save next IDs
            localStorage.setItem('musicPlayerNextIds', JSON.stringify({
                trackId: this.nextTrackId,
                multitrackId: this.nextMultitrackId
            }));
            
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    loadFromLocalStorage() {
        try {
            // Load setlists
            const setlistsData = JSON.parse(localStorage.getItem('musicPlayerSetlists') || '[]');
            this.setlists = new Map(setlistsData);

            // Load track metadata
            const tracksData = JSON.parse(localStorage.getItem('musicPlayerTracks') || '[]');
            this.tracks = new Map(tracksData);

            // Load multitracks
            const multitracksData = JSON.parse(localStorage.getItem('musicPlayerMultitracks') || '[]');
            this.multitracks = new Map(multitracksData);

            // Load next IDs
            const nextIds = JSON.parse(localStorage.getItem('musicPlayerNextIds') || '{}');
            this.nextTrackId = nextIds.trackId || 1;
            this.nextMultitrackId = nextIds.multitrackId || 1;

            return true;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return false;
        }
    }
}
