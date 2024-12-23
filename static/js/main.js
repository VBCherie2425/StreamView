document.addEventListener('DOMContentLoaded', function() {
    // Initialize HLS.js if supported
    const video = document.getElementById('player');
    const hls = new Hls();
    
    // Initialize UI components
    const toast = new bootstrap.Toast(document.getElementById('toast'));
    const mediaSearch = document.getElementById('mediaSearch');
    const playlistForm = document.getElementById('playlistUploadForm');
    const player = document.getElementById('player');
    
    // Initialize recently watched
    let recentlyWatched = JSON.parse(localStorage.getItem('recentlyWatched') || '[]');
    
    // Load initial data
    loadChannels();
    updateChannelStats();
    updateRecentlyWatched();

    // Setup navigation
    document.querySelectorAll('.nav-link, [data-section]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            if (section) {
                switchSection(section);
            }
        });
    });

    // Setup playlist upload
    playlistForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const fileInput = document.getElementById('playlistFile');
        const file = fileInput.files[0];
        
        if (!file) {
            showToast('Please select a playlist file', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        fetch('/api/playlist', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            showToast(`Loaded ${data.channels} channels`);
            loadChannels();
            updateChannelStats();
            // Switch to live TV section after successful upload
            switchSection('live');
        })
        .catch(error => {
            showToast(error.message, 'error');
        });
    });

    // Setup media search
    if (mediaSearch) {
        mediaSearch.addEventListener('input', function(e) {
            filterMedia(e.target.value);
        });
    }

    // Setup player settings
    const volumeSlider = document.getElementById('defaultVolume');
    const autoplayCheckbox = document.getElementById('autoplayEnabled');

    volumeSlider.addEventListener('input', function(e) {
        player.volume = this.value / 100;
        localStorage.setItem('defaultVolume', this.value);
    });

    autoplayCheckbox.addEventListener('change', function(e) {
        localStorage.setItem('autoplayEnabled', this.checked);
    });

    // Load saved settings
    const savedVolume = localStorage.getItem('defaultVolume');
    if (savedVolume !== null) {
        volumeSlider.value = savedVolume;
        player.volume = savedVolume / 100;
    }

    const savedAutoplay = localStorage.getItem('autoplayEnabled');
    if (savedAutoplay !== null) {
        autoplayCheckbox.checked = savedAutoplay === 'true';
    }

    // Settings Management
    function loadSettings() {
        // Load all settings from localStorage
        const settings = {
            // Player Settings
            defaultVolume: localStorage.getItem('defaultVolume') || 100,
            videoQuality: localStorage.getItem('videoQuality') || 'auto',
            bufferSize: localStorage.getItem('bufferSize') || 5,
            aspectRatio: localStorage.getItem('aspectRatio') || '16:9',
            autoplayEnabled: localStorage.getItem('autoplayEnabled') === 'true',
            hardwareAcceleration: localStorage.getItem('hardwareAcceleration') === 'true',
            lowLatencyMode: localStorage.getItem('lowLatencyMode') === 'true',
            rememberLastChannel: localStorage.getItem('rememberLastChannel') === 'true',

            // Playlist Settings
            remotePlaylistUrl: localStorage.getItem('remotePlaylistUrl') || '',
            playlistUpdateInterval: localStorage.getItem('playlistUpdateInterval') || 0,

            // EPG Settings
            epgUrl: localStorage.getItem('epgUrl') || '',
            epgUpdateInterval: localStorage.getItem('epgUpdateInterval') || 0,
            epgTimeOffset: localStorage.getItem('epgTimeOffset') || 'auto',
            showEpgInGuide: localStorage.getItem('showEpgInGuide') === 'true',

            // Interface Settings
            interfaceTheme: localStorage.getItem('interfaceTheme') || 'dark',
            interfaceLanguage: localStorage.getItem('interfaceLanguage') || 'en',
            channelListView: localStorage.getItem('channelListView') || 'list',
            showChannelNumbers: localStorage.getItem('showChannelNumbers') === 'true',
            showChannelLogos: localStorage.getItem('showChannelLogos') === 'true',
            enableNotifications: localStorage.getItem('enableNotifications') === 'true',
            showClock: localStorage.getItem('showClock') === 'true',

            // Advanced Settings
            cacheSize: localStorage.getItem('cacheSize') || 500,
            networkBuffer: localStorage.getItem('networkBuffer') || 'auto',
            connectionTimeout: localStorage.getItem('connectionTimeout') || 10,
            debugLevel: localStorage.getItem('debugLevel') || 'none',
            useProxy: localStorage.getItem('useProxy') === 'true',
            enableMetrics: localStorage.getItem('enableMetrics') === 'true',
            proxyUrl: localStorage.getItem('proxyUrl') || '',
            proxyUsername: localStorage.getItem('proxyUsername') || '',
            proxyPassword: localStorage.getItem('proxyPassword') || ''
        };

        // Apply settings to UI elements
        Object.keys(settings).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = settings[key];
                } else if (element.type === 'range' || element.type === 'select-one' || element.type === 'url' || element.type === 'number' || element.type === 'password') {
                    element.value = settings[key];
                }
            }
        });

        // Apply theme
        document.body.setAttribute('data-theme', settings.interfaceTheme);
        
        // Update range value displays
        updateRangeValues();
        
        // Show/hide proxy settings
        document.getElementById('proxySettings').style.display = settings.useProxy ? 'block' : 'none';
        
        return settings;
    }

    function saveSettings() {
        const elements = document.querySelectorAll('#settings input, #settings select');
        elements.forEach(element => {
            const value = element.type === 'checkbox' ? element.checked : element.value;
            localStorage.setItem(element.id, value);
        });
        
        showToast('Settings saved successfully');
        applySettings();
    }

    function applySettings() {
        const settings = loadSettings();
        
        // Apply player settings
        const player = document.getElementById('player');
        if (player) {
            player.volume = settings.defaultVolume / 100;
            // Apply other player settings as needed
        }
        
        // Apply interface settings
        document.body.setAttribute('data-theme', settings.interfaceTheme);
        updateChannelListView();
        
        // Start update intervals if enabled
        setupUpdateIntervals();
    }

    function updateRangeValues() {
        // Buffer size
        const bufferSize = document.getElementById('bufferSize');
        const bufferSizeValue = document.getElementById('bufferSizeValue');
        if (bufferSize && bufferSizeValue) {
            bufferSizeValue.textContent = `${bufferSize.value} seconds`;
            bufferSize.addEventListener('input', () => {
                bufferSizeValue.textContent = `${bufferSize.value} seconds`;
            });
        }
        
        // Cache size
        const cacheSize = document.getElementById('cacheSize');
        const cacheSizeValue = document.getElementById('cacheSizeValue');
        if (cacheSize && cacheSizeValue) {
            cacheSizeValue.textContent = `${cacheSize.value} MB`;
            cacheSize.addEventListener('input', () => {
                cacheSizeValue.textContent = `${cacheSize.value} MB`;
            });
        }
    }

    function setupUpdateIntervals() {
        const settings = loadSettings();
        
        // Clear existing intervals
        clearInterval(window.playlistUpdateInterval);
        clearInterval(window.epgUpdateInterval);
        
        // Setup playlist update interval
        if (settings.playlistUpdateInterval > 0) {
            window.playlistUpdateInterval = setInterval(() => {
                refreshPlaylist();
            }, settings.playlistUpdateInterval * 1000);
        }
        
        // Setup EPG update interval
        if (settings.epgUpdateInterval > 0) {
            window.epgUpdateInterval = setInterval(() => {
                updateEPG();
            }, settings.epgUpdateInterval * 1000);
        }
    }

    function updateChannelListView() {
        const settings = loadSettings();
        const channelList = document.getElementById('channelList');
        if (channelList) {
            channelList.className = `list-group list-group-flush view-${settings.channelListView}`;
        }
    }

    function refreshPlaylist() {
        const settings = loadSettings();
        if (settings.remotePlaylistUrl) {
            // Implement remote playlist refresh
            showToast('Refreshing playlist...');
        } else {
            showToast('No remote playlist URL configured');
        }
    }

    function loadRemotePlaylist() {
        const settings = loadSettings();
        const url = settings.remotePlaylistUrl;
        
        if (!url) {
            showToast('Please enter a remote playlist URL', 'error');
            return;
        }
        
        showToast('Loading remote playlist...');
        // Implement remote playlist loading
    }

    function updateEPG() {
        const settings = loadSettings();
        const url = settings.epgUrl;
        
        if (!url) {
            showToast('Please configure EPG URL first', 'error');
            return;
        }
        
        showToast('Updating EPG...');
        // Implement EPG update
    }

    function checkForUpdates() {
        showToast('Checking for updates...');
        // Implement update check
    }

    // Codec Settings Management
    function loadCodecSettings() {
        const codecSettings = {
            // Video Settings
            videoCodec: localStorage.getItem('videoCodec') || 'h264',
            videoProfile: localStorage.getItem('videoProfile') || 'main',
            videoBitrate: localStorage.getItem('videoBitrate') || 'auto',
            videoResolution: localStorage.getItem('videoResolution') || 'auto',
            videoFrameRate: localStorage.getItem('videoFrameRate') || 'auto',
            videoColorSpace: localStorage.getItem('videoColorSpace') || 'auto',
            videoHDR: localStorage.getItem('videoHDR') || 'auto',
            videoBFrames: localStorage.getItem('videoBFrames') === 'true',
            videoDeinterlacing: localStorage.getItem('videoDeinterlacing') === 'true',
            videoFilmGrain: localStorage.getItem('videoFilmGrain') === 'true',
            videoNoiseReduction: localStorage.getItem('videoNoiseReduction') === 'true',

            // Audio Settings
            audioCodec: localStorage.getItem('audioCodec') || 'auto',
            audioBitrate: localStorage.getItem('audioBitrate') || 'auto',
            audioChannels: localStorage.getItem('audioChannels') || 'auto',
            audioSampleRate: localStorage.getItem('audioSampleRate') || 'auto',
            audioMode: localStorage.getItem('audioMode') || 'auto',
            audioNormalization: localStorage.getItem('audioNormalization') === 'true',
            audioPassthrough: localStorage.getItem('audioPassthrough') === 'true',
            audioSurroundLock: localStorage.getItem('audioSurroundLock') === 'true',
            audioAutomatic: localStorage.getItem('audioAutomatic') === 'true'
        };

        // Apply settings to UI elements
        Object.keys(codecSettings).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = codecSettings[key];
                } else if (element.type === 'select-one') {
                    element.value = codecSettings[key];
                }
            }
        });

        return codecSettings;
    }

    function saveCodecSettings() {
        const elements = document.querySelectorAll('#settings select[id^="video"], #settings select[id^="audio"], #settings input[id^="video"], #settings input[id^="audio"]');
        elements.forEach(element => {
            const value = element.type === 'checkbox' ? element.checked : element.value;
            localStorage.setItem(element.id, value);
        });
        
        applyCodecSettings();
        showToast('Codec settings saved successfully');
    }

    function applyCodecSettings() {
        const settings = loadCodecSettings();
        const player = document.getElementById('player');
        
        if (player) {
            // Apply video settings if supported
            if (player.canPlayType) {
                // Set video quality constraints
                const constraints = {};
                
                if (settings.videoResolution !== 'auto') {
                    const [width, height] = settings.videoResolution.split('x').map(Number);
                    constraints.width = width;
                    constraints.height = height;
                }
                
                if (settings.videoFrameRate !== 'auto') {
                    constraints.frameRate = parseFloat(settings.videoFrameRate);
                }
                
                // Apply constraints if any are set
                if (Object.keys(constraints).length > 0) {
                    try {
                        player.setAttribute('playsinline', '');
                        // Note: Some settings may require additional player API support
                    } catch (error) {
                        console.warn('Failed to apply video constraints:', error);
                    }
                }
            }
            
            // Apply audio settings
            if (settings.audioChannels !== 'auto') {
                // Note: Audio channel configuration may require specific player support
                player.setAttribute('data-audio-channels', settings.audioChannels);
            }
            
            // Apply audio normalization if enabled
            if (settings.audioNormalization) {
                player.setAttribute('data-audio-normalization', 'true');
            }
        }
        
        // Update player source with new codec preferences if playing
        if (player.src) {
            const currentTime = player.currentTime;
            const wasPlaying = !player.paused;
            
            // Reload with new settings
            player.load();
            player.currentTime = currentTime;
            
            if (wasPlaying) {
                player.play().catch(error => {
                    console.warn('Failed to resume playback:', error);
                });
            }
        }
    }

    // Quality Presets
    const qualityPresets = {
        maximum: {
            videoCodec: 'h265',
            videoProfile: 'high',
            videoBitrate: '16000',
            videoResolution: '3840x2160',
            videoFrameRate: 'auto',
            videoColorSpace: 'bt2020',
            videoHDR: 'hdr10',
            videoRefFrames: 16,
            videoGopSize: 120,
            videoSceneChange: 60,
            videoMotionEstimation: 'umh',
            videoEntropyCoding: 'cabac',
            videoTrellis: true,
            videoMBTree: true,
            videoWeightedP: true,
            videoMixedRefs: true,
            videoSharpness: 70,
            videoNoiseLevel: 10,
            videoDeinterlacingMethod: 'motion',
            videoFilmDetection: 'auto',
            videoEdgeEnhancement: true,
            videoColorCorrection: true,
            audioCodec: 'truehd',
            audioBitrate: '1536',
            audioChannels: '12',
            audioSampleRate: '192000',
            audioMode: 'theater',
            audioDRC: 30,
            audioDelay: 0,
            audioDownmix: 'auto',
            audioBoost: 100,
            audioNightMode: false,
            audioDialogEnhancement: true,
            audioEqualizer: 'movie'
        },
        balanced: {
            videoCodec: 'h264',
            videoProfile: 'high',
            videoBitrate: '4000',
            videoResolution: '1920x1080',
            videoFrameRate: 'auto',
            videoColorSpace: 'bt709',
            videoHDR: 'auto',
            videoRefFrames: 8,
            videoGopSize: 60,
            videoSceneChange: 40,
            videoMotionEstimation: 'hex',
            videoEntropyCoding: 'cabac',
            videoTrellis: true,
            videoMBTree: true,
            videoWeightedP: true,
            videoMixedRefs: false,
            videoSharpness: 50,
            videoNoiseLevel: 20,
            videoDeinterlacingMethod: 'auto',
            videoFilmDetection: 'auto',
            videoEdgeEnhancement: true,
            videoColorCorrection: true,
            audioCodec: 'ac3',
            audioBitrate: '384',
            audioChannels: '6',
            audioSampleRate: '48000',
            audioMode: 'auto',
            audioDRC: 50,
            audioDelay: 0,
            audioDownmix: 'auto',
            audioBoost: 100,
            audioNightMode: false,
            audioDialogEnhancement: true,
            audioEqualizer: 'flat'
        },
        performance: {
            videoCodec: 'h264',
            videoProfile: 'main',
            videoBitrate: '2000',
            videoResolution: '1280x720',
            videoFrameRate: '30',
            videoColorSpace: 'bt709',
            videoHDR: 'none',
            videoRefFrames: 4,
            videoGopSize: 30,
            videoSceneChange: 30,
            videoMotionEstimation: 'dia',
            videoEntropyCoding: 'cavlc',
            videoTrellis: false,
            videoMBTree: false,
            videoWeightedP: false,
            videoMixedRefs: false,
            videoSharpness: 40,
            videoNoiseLevel: 30,
            videoDeinterlacingMethod: 'bob',
            videoFilmDetection: 'off',
            videoEdgeEnhancement: false,
            videoColorCorrection: false,
            audioCodec: 'aac',
            audioBitrate: '128',
            audioChannels: '2',
            audioSampleRate: '44100',
            audioMode: 'auto',
            audioDRC: 70,
            audioDelay: 0,
            audioDownmix: 'loro',
            audioBoost: 100,
            audioNightMode: false,
            audioDialogEnhancement: false,
            audioEqualizer: 'flat'
        }
    };

    // Apply quality preset
    function applyPreset(presetName) {
        const preset = qualityPresets[presetName];
        if (!preset) return;

        Object.keys(preset).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = preset[key];
                } else if (element.type === 'range') {
                    element.value = preset[key];
                    updateRangeValue(key);
                } else {
                    element.value = preset[key];
                }
            }
        });

        saveCodecSettings();
        showToast(`Applied ${presetName} quality preset`);
    }

    // Update range value displays
    function updateRangeValue(elementId) {
        const element = document.getElementById(elementId);
        const valueElement = document.getElementById(elementId + 'Value');
        if (element && valueElement) {
            let suffix = '';
            switch (elementId) {
                case 'videoRefFrames':
                    suffix = ' frames';
                    break;
                case 'videoGopSize':
                    suffix = ' frames';
                    break;
                case 'videoSceneChange':
                case 'videoSharpness':
                case 'videoNoiseLevel':
                case 'audioDRC':
                case 'audioBoost':
                    suffix = '%';
                    break;
                case 'audioDelay':
                    suffix = ' ms';
                    break;
            }
            valueElement.textContent = element.value + suffix;
        }
    }

    // Save codec preset
    function saveCodecPreset() {
        const presetName = prompt('Enter a name for this preset:');
        if (!presetName) return;

        const preset = {};
        const elements = document.querySelectorAll('#settings [id^="video"], #settings [id^="audio"], #settings [id^="eq"]');
        elements.forEach(element => {
            preset[element.id] = element.type === 'checkbox' ? element.checked : element.value;
        });

        const savedPresets = JSON.parse(localStorage.getItem('codecPresets') || '{}');
        savedPresets[presetName] = preset;
        localStorage.setItem('codecPresets', JSON.stringify(savedPresets));
        
        showToast(`Saved codec preset: ${presetName}`);
    }

    // Load codec preset
    function loadCodecPreset() {
        const savedPresets = JSON.parse(localStorage.getItem('codecPresets') || '{}');
        const presetNames = Object.keys(savedPresets);
        
        if (presetNames.length === 0) {
            showToast('No saved presets found');
            return;
        }

        const presetName = prompt('Enter preset name to load:\n\nAvailable presets:\n' + presetNames.join('\n'));
        if (!presetName || !savedPresets[presetName]) {
            showToast('Invalid preset name');
            return;
        }

        const preset = savedPresets[presetName];
        Object.keys(preset).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = preset[key];
                } else if (element.type === 'range') {
                    element.value = preset[key];
                    updateRangeValue(key);
                } else {
                    element.value = preset[key];
                }
            }
        });

        saveCodecSettings();
        showToast(`Loaded codec preset: ${presetName}`);
    }

    // Initialize range value displays
    document.addEventListener('DOMContentLoaded', function() {
        // Setup range value displays
        const rangeElements = document.querySelectorAll('input[type="range"]');
        rangeElements.forEach(element => {
            updateRangeValue(element.id);
            element.addEventListener('input', () => updateRangeValue(element.id));
        });

        // Setup equalizer visibility
        const equalizerSelect = document.getElementById('audioEqualizer');
        const customEqualizer = document.getElementById('customEqualizer');
        if (equalizerSelect && customEqualizer) {
            equalizerSelect.addEventListener('change', function() {
                customEqualizer.style.display = this.value === 'custom' ? 'block' : 'none';
            });
        }
    });

    // Event Listeners
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize settings
        loadSettings();
        
        // Setup event listeners for settings changes
        const settingsElements = document.querySelectorAll('#settings input, #settings select');
        settingsElements.forEach(element => {
            element.addEventListener('change', saveSettings);
        });
        
        // Setup proxy toggle
        const useProxy = document.getElementById('useProxy');
        if (useProxy) {
            useProxy.addEventListener('change', function() {
                document.getElementById('proxySettings').style.display = this.checked ? 'block' : 'none';
            });
        }
        
        // Setup keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            const player = document.getElementById('player');
            if (!player) return;
            
            switch(e.key) {
                case ' ':
                    e.preventDefault();
                    player.paused ? player.play() : player.pause();
                    break;
                case 'm':
                case 'M':
                    player.muted = !player.muted;
                    break;
                case 'f':
                case 'F':
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else {
                        player.requestFullscreen();
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    player.volume = Math.min(1, player.volume + 0.1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    player.volume = Math.max(0, player.volume - 0.1);
                    break;
            }
        });
        
        // Update network stats periodically
        setInterval(updateNetworkStats, 1000);
        
        // Load initial codec settings
        loadCodecSettings();
        
        // Setup event listeners for codec setting changes
        const codecElements = document.querySelectorAll('#settings select[id^="video"], #settings select[id^="audio"], #settings input[id^="video"], #settings input[id^="audio"]');
        codecElements.forEach(element => {
            element.addEventListener('change', saveCodecSettings);
        });
        
        // Load stream list in settings
        fetch('/api/channels')
            .then(response => response.json())
            .then(channels => {
                const streamList = document.getElementById('streamList');
                streamList.innerHTML = channels.map(channel => `
                    <tr>
                        <td>${channel.name}</td>
                        <td>${channel.category}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary me-1" onclick="editStream('${channel.name}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteStream('${channel.name}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            });
    });

    function updateNetworkStats() {
        const player = document.getElementById('player');
        const bitrateEl = document.getElementById('currentBitrate');
        const bufferEl = document.getElementById('currentBuffer');
        
        if (player && player.readyState > 0) {
            // Update bitrate (example values)
            if (bitrateEl) bitrateEl.textContent = '2.5 Mbps';
            
            // Update buffer
            if (bufferEl) {
                const buffer = player.buffered;
                if (buffer.length > 0) {
                    const bufferedSeconds = buffer.end(buffer.length - 1) - player.currentTime;
                    bufferEl.textContent = `${bufferedSeconds.toFixed(1)} sec`;
                }
            }
        }
    }

    function switchSection(sectionId) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === sectionId) {
                link.classList.add('active');
            }
        });

        // Update content sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionId).classList.add('active');

        // Special handling for video player
        const player = document.getElementById('player');
        if (sectionId !== 'live' && player) {
            player.pause();
        }
    }

    async function loadChannels() {
        try {
            const response = await fetch('/api/channels');
            const channels = await response.json();
            const channelList = document.getElementById('channelList');
            
            if (channels.length === 0) {
                channelList.innerHTML = '';
                return;
            }
            
            channelList.innerHTML = channels.map(channel => `
                <a href="#" class="list-group-item list-group-item-action d-flex align-items-center" 
                   data-channel-url="${channel.url}">
                    ${channel.logo ? `<img src="${channel.logo}" class="me-2" style="width: 24px; height: 24px;">` : ''}
                    <div class="text-truncate">${channel.name}</div>
                </a>
            `).join('');

            // Add click handlers to channel items
            document.querySelectorAll('#channelList a').forEach(item => {
                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    const channelName = this.querySelector('.text-truncate').textContent;
                    const channelUrl = this.dataset.channelUrl;
                    
                    playChannel(channelUrl, channelName);
                    addToRecentlyWatched({
                        type: 'channel',
                        name: channelName,
                        url: channelUrl,
                        logo: this.querySelector('img')?.src
                    });
                    
                    // Update active state
                    document.querySelectorAll('#channelList a').forEach(el => 
                        el.classList.remove('active'));
                    this.classList.add('active');
                });
            });
        } catch (error) {
            showToast('Error loading channels: ' + error.message, 'error');
        }
    }

    function updateChannelStats() {
        const channels = document.querySelectorAll('#channelList a');
        const statsEl = document.getElementById('channelStats');
        const playlistInfoEl = document.getElementById('playlistInfo');
        
        if (statsEl) {
            if (channels.length > 0) {
                statsEl.innerHTML = `
                    <i class="bi bi-broadcast me-1"></i>${channels.length} channels available
                `;
            } else {
                statsEl.innerHTML = `
                    <i class="bi bi-exclamation-circle me-1"></i>No channels loaded
                `;
            }
        }

        if (playlistInfoEl) {
            if (channels.length > 0) {
                playlistInfoEl.innerHTML = `
                    <div class="mb-1"><i class="bi bi-check-circle text-success me-1"></i>Playlist loaded</div>
                    <div>${channels.length} channels available</div>
                    <div class="mt-1">Last updated: ${new Date().toLocaleString()}</div>
                `;
            } else {
                playlistInfoEl.innerHTML = `
                    <div><i class="bi bi-exclamation-circle me-1"></i>No playlist loaded</div>
                    <div class="mt-1">Upload a playlist to get started</div>
                `;
            }
        }
    }

    function updateRecentlyWatched() {
        const recentlyWatchedEl = document.getElementById('recentlyWatched');
        const recentItems = JSON.parse(localStorage.getItem('recentlyWatched') || '[]');
        
        if (recentlyWatchedEl) {
            if (recentItems.length > 0) {
                recentlyWatchedEl.innerHTML = recentItems.map(item => `
                    <div class="col-md-4">
                        <div class="card bg-dark h-100">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    ${item.logo ? `<img src="${item.logo}" class="me-2" style="width: 24px; height: 24px;">` : 
                                               `<i class="bi bi-${item.type === 'channel' ? 'broadcast' : 'film'} me-2"></i>`}
                                    <div>
                                        <h6 class="mb-0">${item.name}</h6>
                                        <small class="text-muted">${item.type}</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                recentlyWatchedEl.innerHTML = `
                    <div class="col-12 text-muted">
                        Your recently watched channels and media will appear here
                    </div>
                `;
            }
        }
    }

    function addToRecentlyWatched(item) {
        let recentItems = JSON.parse(localStorage.getItem('recentlyWatched') || '[]');
        
        // Remove if already exists
        recentItems = recentItems.filter(i => i.url !== item.url);
        
        // Add to start of array
        recentItems.unshift(item);
        
        // Keep only last 6 items
        recentItems = recentItems.slice(0, 6);
        
        localStorage.setItem('recentlyWatched', JSON.stringify(recentItems));
        updateRecentlyWatched();
    }

    function filterMedia(searchTerm) {
        // TODO: Implement media search when media content is available
    }

    function playChannel(url, channelName) {
        const player = document.getElementById('player');
        const channelTitle = document.getElementById('currentChannelTitle');
        
        player.src = url;
        if (localStorage.getItem('autoplayEnabled') === 'true') {
            player.play().catch(error => {
                showToast('Error playing channel: ' + error.message, 'error');
            });
        }
        
        channelTitle.textContent = channelName;
    }

    function showToast(message, type = 'success') {
        const toastEl = document.getElementById('toast');
        const toastBody = toastEl.querySelector('.toast-body');
        
        toastEl.classList.remove('bg-success', 'bg-danger');
        toastEl.classList.add(type === 'error' ? 'bg-danger' : 'bg-success');
        
        toastBody.textContent = message;
        bootstrap.Toast.getOrCreateInstance(toastEl).show();
    }

    function resetSettings() {
        if (confirm('Are you sure you want to reset all settings? This will clear your playlist, preferences, and recently watched history.')) {
            // Clear localStorage
            localStorage.clear();
            
            // Reset player settings
            const volumeSlider = document.getElementById('defaultVolume');
            const autoplayCheckbox = document.getElementById('autoplayEnabled');
            if (volumeSlider) volumeSlider.value = 100;
            if (autoplayCheckbox) autoplayCheckbox.checked = false;
            
            // Reset player volume
            const player = document.getElementById('player');
            if (player) player.volume = 1;
            
            // Clear channel list
            const channelList = document.getElementById('channelList');
            if (channelList) {
                channelList.innerHTML = '';
            }
            
            // Update UI
            updateChannelStats();
            updateRecentlyWatched();
            
            showToast('All settings have been reset');
        }
    }

    function loadMedia() {
        fetch('/api/media')
            .then(response => response.json())
            .then(mediaItems => {
                const mediaGrid = document.getElementById('mediaGrid');
                mediaGrid.innerHTML = mediaItems.map(item => `
                    <div class="col-md-4">
                        <div class="card bg-dark stream-card" onclick="playStream('${item.url}', '${item.name}')">
                            <img src="${item.thumbnail}" class="card-img-top" alt="${item.name}">
                            <div class="card-body">
                                <h5 class="card-title">${item.name}</h5>
                                <p class="card-text"><small class="text-muted">Duration: ${item.duration}</small></p>
                            </div>
                        </div>
                    </div>
                `).join('');
            });
    }

    function loadGuide() {
        fetch('/api/guide')
            .then(response => response.json())
            .then(guide => {
                const programGuide = document.querySelector('.program-guide');
                let guideHTML = `
                    <div class="program-time">Channel</div>
                    ${Array.from({length: 24}, (_, i) => 
                        `<div class="program-time">${String(i).padStart(2, '0')}:00</div>`
                    ).join('')}
                `;
                
                for (const [channel, programs] of Object.entries(guide)) {
                    guideHTML += `
                        <div class="program-channel">${channel}</div>
                        ${Array.from({length: 24}, (_, i) => {
                            const hour = String(i).padStart(2, '0') + ':00';
                            const program = programs.find(p => p.start === hour);
                            return `
                                <div class="program-item">
                                    ${program ? `
                                        <div class="fw-bold">${program.title}</div>
                                        <small class="text-muted">${program.description}</small>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    `;
                }
                
                programGuide.innerHTML = guideHTML;
            });
    }

    function playStream(url, title) {
        const video = document.getElementById('player');
        const streamInfo = document.getElementById('streamInfo');
        const streamTitle = streamInfo.querySelector('.stream-title');
        
        // Update stream info
        streamTitle.textContent = title;
        streamInfo.classList.remove('d-none');
        
        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, function() {
                video.play();
            });
        }
        // For native HLS support (Safari)
        else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
            video.addEventListener('loadedmetadata', function() {
                video.play();
            });
        }
        // For regular video files
        else {
            video.src = url;
            video.play();
        }
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // Initialize HLS.js if supported
    const video = document.getElementById('player');
    const hls = new Hls();
    
    // Load media content
    loadMedia();
    
    // Load guide data
    loadGuide();
});

function loadMedia() {
    fetch('/api/media')
        .then(response => response.json())
        .then(mediaItems => {
            const mediaGrid = document.getElementById('mediaGrid');
            mediaGrid.innerHTML = mediaItems.map(item => `
                <div class="col-md-4">
                    <div class="card bg-dark stream-card" onclick="playStream('${item.url}', '${item.name}')">
                        <img src="${item.thumbnail}" class="card-img-top" alt="${item.name}">
                        <div class="card-body">
                            <h5 class="card-title">${item.name}</h5>
                            <p class="card-text"><small class="text-muted">Duration: ${item.duration}</small></p>
                        </div>
                    </div>
                </div>
            `).join('');
        });
}

function loadGuide() {
    fetch('/api/guide')
        .then(response => response.json())
        .then(guide => {
            const programGuide = document.querySelector('.program-guide');
            let guideHTML = `
                <div class="program-time">Channel</div>
                ${Array.from({length: 24}, (_, i) => 
                    `<div class="program-time">${String(i).padStart(2, '0')}:00</div>`
                ).join('')}
            `;
            
            for (const [channel, programs] of Object.entries(guide)) {
                guideHTML += `
                    <div class="program-channel">${channel}</div>
                    ${Array.from({length: 24}, (_, i) => {
                        const hour = String(i).padStart(2, '0') + ':00';
                        const program = programs.find(p => p.start === hour);
                        return `
                            <div class="program-item">
                                ${program ? `
                                    <div class="fw-bold">${program.title}</div>
                                    <small class="text-muted">${program.description}</small>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                `;
            }
            
            programGuide.innerHTML = guideHTML;
        });
}

function playStream(url, title) {
    const video = document.getElementById('player');
    const streamInfo = document.getElementById('streamInfo');
    const streamTitle = streamInfo.querySelector('.stream-title');
    
    // Update stream info
    streamTitle.textContent = title;
    streamInfo.classList.remove('d-none');
    
    if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            video.play();
        });
    }
    // For native HLS support (Safari)
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.addEventListener('loadedmetadata', function() {
            video.play();
        });
    }
    // For regular video files
    else {
        video.src = url;
        video.play();
    }
}
