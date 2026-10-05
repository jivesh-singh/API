/**
 * ElevenLabs Voice Studio — Client-side Application
 * High-performance TTS generation, custom audio controls & Web Audio visualizer
 */

(function () {
  'use strict';

  // Constants & Defaults
  const DEFAULT_API_KEY = 'sk_a5f59291f23b39987ad5d2fd955084f4b9cdf4910e15c7c4';
  const STORAGE_KEY = 'elevenlabs_studio_api_key';
  const HISTORY_STORAGE_KEY = 'elevenlabs_studio_history';

  // Voice descriptions mapping
  const VOICE_DESCRIPTIONS = {
    'JBFqnCBsd6RMkjVDRZzb': 'British male voice with a raspy character tone, ideal for immersive storytelling.',
    'nPczCjzI2devNBz1zQrb': 'Deep, resonant and mature voice with exceptional gravitas for formal narration.',
    'Xb7hH8MSUJpSbSDYk0k2': 'Crisp, articulate and professional British female voice with great clarity.',
    'pFZP5JQG7iQjI54ep4kh': 'Calm, comforting and warm female voice, perfect for audiobooks and guided meditation.',
    'onwK4e9ZLuTAKqWW03F9': 'Sharp, confident and authoritative male tone designed for news and presentations.',
    'cgSgspJ2msm6clMCkdW9': 'Upbeat, friendly and expressive voice ideal for conversational content and videos.',
    'custom': 'Custom ElevenLabs Voice ID specified manually.'
  };

  const MODEL_DESCRIPTIONS = {
    'eleven_multilingual_v2': 'Flagship multilingual model with unparalleled human nuance and rich emotional depth across 29 languages.',
    'eleven_flash_v2_5': 'Ultra-fast speech model (~75ms latency) supporting 32 languages, built for instant interactivity.',
    'eleven_turbo_v2_5': 'Balanced high-throughput model delivering rich quality with ultra-low latency across 32 languages.',
    'eleven_flash_v2': 'Optimized for high-speed streaming and real-time conversational agents.',
    'eleven_turbo_v2': 'High-performance English-focused model with minimal processing delay.',
    'eleven_monolingual_v1': 'Classic ElevenLabs English narration model.'
  };

  const SAMPLE_PRESETS = {
    story: 'The old clockmaker examined the silver pocket watch under the magnifier. Deep within its intricate brass gears, a gentle, crystalline chime began to resonate—a melody not heard for over a century.',
    trailer: 'In a world where artificial intelligence redefines human imagination, one whisper echoes across the digital divide. Prepare to experience speech that breathes life into every word.',
    tech: 'Modern neural speech synthesis utilizes deep diffusion and autoregressive architectures, mapping phonetic representations directly into expressive continuous audio waveforms.',
    quote: 'To perceive is to suffer. But to create is to transcend. In the harmony of voice and story, ideas achieve eternal life.'
  };

  // State Management
  const state = {
    apiKey: localStorage.getItem(STORAGE_KEY) || DEFAULT_API_KEY,
    isGenerating: false,
    currentAudioUrl: null,
    currentBlob: null,
    currentMeta: null,
    audioContext: null,
    analyser: null,
    sourceNode: null,
    animationFrameId: null,
    history: []
  };

  // DOM Elements
  const scriptInput = document.getElementById('scriptInput');
  const clearTextBtn = document.getElementById('clearTextBtn');
  const charCount = document.getElementById('charCount');
  const wordCount = document.getElementById('wordCount');
  const estTime = document.getElementById('estTime');

  const modelSelect = document.getElementById('modelSelect');
  const modelDescription = document.getElementById('modelDescription');
  const voiceSelect = document.getElementById('voiceSelect');
  const voiceDescription = document.getElementById('voiceDescription');
  const customVoiceContainer = document.getElementById('customVoiceContainer');
  const customVoiceId = document.getElementById('customVoiceId');

  const stabilitySlider = document.getElementById('stabilitySlider');
  const stabilityVal = document.getElementById('stabilityVal');
  const similaritySlider = document.getElementById('similaritySlider');
  const similarityVal = document.getElementById('similarityVal');

  const generatePlayBtn = document.getElementById('generatePlayBtn');
  const btnText = document.getElementById('btnText');
  const playIconSvg = document.getElementById('playIconSvg');
  const spinnerSvg = document.getElementById('spinnerSvg');

  const playerCard = document.getElementById('playerCard');
  const audioElement = document.getElementById('audioElement');
  const waveformCanvas = document.getElementById('waveformCanvas');
  const visualizerIdleState = document.getElementById('visualizerIdleState');
  const nowPlayingTitle = document.getElementById('nowPlayingTitle');
  const playerModelBadge = document.getElementById('playerModelBadge');
  const playerVoiceBadge = document.getElementById('playerVoiceBadge');

  const currentTimeEl = document.getElementById('currentTime');
  const durationTimeEl = document.getElementById('durationTime');
  const seekTrack = document.getElementById('seekTrack');
  const seekProgress = document.getElementById('seekProgress');
  const seekBuffer = document.getElementById('seekBuffer');
  const seekHandle = document.getElementById('seekHandle');

  const audioToggleBtn = document.getElementById('audioToggleBtn');
  const audioPlaySvg = document.getElementById('audioPlaySvg');
  const audioPauseSvg = document.getElementById('audioPauseSvg');
  const rewindBtn = document.getElementById('rewindBtn');
  const forwardBtn = document.getElementById('forwardBtn');
  const speedBtn = document.getElementById('speedBtn');
  const muteBtn = document.getElementById('muteBtn');
  const volHighSvg = document.getElementById('volHighSvg');
  const volMuteSvg = document.getElementById('volMuteSvg');
  const volumeSlider = document.getElementById('volumeSlider');
  const downloadAudioBtn = document.getElementById('downloadAudioBtn');

  const historyList = document.getElementById('historyList');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const emptyHistoryMsg = document.getElementById('emptyHistoryMsg');

  // Modal Elements
  const settingsModal = document.getElementById('settingsModal');
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
  const resetApiKeyBtn = document.getElementById('resetApiKeyBtn');
  const toggleApiKeyVisibility = document.getElementById('toggleApiKeyVisibility');
  const eyeShowSvg = document.getElementById('eyeShowSvg');
  const eyeHideSvg = document.getElementById('eyeHideSvg');
  const toastStack = document.getElementById('toastStack');

  // Playback Speed Options
  const SPEED_LEVELS = [0.75, 1.0, 1.25, 1.5, 2.0];
  let currentSpeedIndex = 1;

  // Initialize
  function init() {
    updateCounters();
    setupCanvasDPI();
    bindEvents();
    loadHistory();
    drawIdleWaveform();
  }

  // Bind UI Events
  function bindEvents() {
    // Text stats
    scriptInput.addEventListener('input', updateCounters);
    clearTextBtn.addEventListener('click', () => {
      scriptInput.value = '';
      updateCounters();
      scriptInput.focus();
    });

    // Sample preset chips
    document.querySelectorAll('.preset-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-sample');
        if (SAMPLE_PRESETS[type]) {
          scriptInput.value = SAMPLE_PRESETS[type];
          updateCounters();
          showToast('Sample preset loaded!', 'info');
        }
      });
    });

    // Model and Voice changes
    modelSelect.addEventListener('change', () => {
      const selected = modelSelect.value;
      modelDescription.textContent = MODEL_DESCRIPTIONS[selected] || '';
    });

    voiceSelect.addEventListener('change', () => {
      const selected = voiceSelect.value;
      if (selected === 'custom') {
        customVoiceContainer.classList.remove('hidden');
        customVoiceId.focus();
        voiceDescription.textContent = 'Enter custom ElevenLabs Voice ID.';
      } else {
        customVoiceContainer.classList.add('hidden');
        voiceDescription.textContent = VOICE_DESCRIPTIONS[selected] || '';
      }
    });

    // Sliders
    stabilitySlider.addEventListener('input', (e) => {
      stabilityVal.textContent = Math.round(e.target.value * 100) + '%';
    });
    similaritySlider.addEventListener('input', (e) => {
      similarityVal.textContent = Math.round(e.target.value * 100) + '%';
    });

    // Action button
    generatePlayBtn.addEventListener('click', handleGenerateAndPlay);

    // Keyboard shortcut (Ctrl + Enter)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleGenerateAndPlay();
      }
    });

    // Audio Player controls
    audioToggleBtn.addEventListener('click', toggleAudioPlay);
    rewindBtn.addEventListener('click', () => {
      audioElement.currentTime = Math.max(0, audioElement.currentTime - 5);
    });
    forwardBtn.addEventListener('click', () => {
      audioElement.currentTime = Math.min(audioElement.duration || 0, audioElement.currentTime + 5);
    });

    speedBtn.addEventListener('click', cycleSpeed);
    muteBtn.addEventListener('click', toggleMute);
    volumeSlider.addEventListener('input', (e) => {
      audioElement.volume = parseFloat(e.target.value);
      updateVolumeIcons();
    });

    // Audio Element events
    audioElement.addEventListener('timeupdate', updateProgress);
    audioElement.addEventListener('loadedmetadata', onAudioLoaded);
    audioElement.addEventListener('progress', updateBuffer);
    audioElement.addEventListener('play', () => {
      audioPlaySvg.classList.add('hidden');
      audioPauseSvg.classList.remove('hidden');
      visualizerIdleState.classList.add('hidden');
      initAudioContext();
      if (state.audioContext && state.audioContext.state === 'suspended') {
        state.audioContext.resume();
      }
      startVisualizer();
    });
    audioElement.addEventListener('pause', () => {
      audioPlaySvg.classList.remove('hidden');
      audioPauseSvg.classList.add('hidden');
    });
    audioElement.addEventListener('ended', () => {
      audioPlaySvg.classList.remove('hidden');
      audioPauseSvg.classList.add('hidden');
      drawIdleWaveform();
    });

    // Seek track
    seekTrack.addEventListener('click', handleSeek);

    // Settings Modal
    openSettingsBtn.addEventListener('click', () => {
      apiKeyInput.value = state.apiKey;
      settingsModal.classList.remove('hidden');
    });

    closeSettingsBtn.addEventListener('click', () => {
      settingsModal.classList.add('hidden');
    });

    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.add('hidden');
      }
    });

    toggleApiKeyVisibility.addEventListener('click', () => {
      if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        eyeShowSvg.classList.add('hidden');
        eyeHideSvg.classList.remove('hidden');
      } else {
        apiKeyInput.type = 'password';
        eyeShowSvg.classList.remove('hidden');
        eyeHideSvg.classList.add('hidden');
      }
    });

    saveApiKeyBtn.addEventListener('click', () => {
      const val = apiKeyInput.value.trim();
      if (!val) {
        showToast('Please enter a valid API key', 'error');
        return;
      }
      state.apiKey = val;
      localStorage.setItem(STORAGE_KEY, val);
      settingsModal.classList.add('hidden');
      showToast('API Key updated successfully!', 'success');
    });

    resetApiKeyBtn.addEventListener('click', () => {
      state.apiKey = DEFAULT_API_KEY;
      localStorage.removeItem(STORAGE_KEY);
      apiKeyInput.value = DEFAULT_API_KEY;
      showToast('Default API key restored', 'info');
    });

    clearHistoryBtn.addEventListener('click', () => {
      state.history = [];
      localStorage.removeItem(HISTORY_STORAGE_KEY);
      renderHistory();
      showToast('Library cleared', 'info');
    });
  }

  // Character, word & estimated time calculations
  function updateCounters() {
    const text = scriptInput.value || '';
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    // Average speech rate is ~140 words per minute (2.33 words/sec)
    const estSeconds = Math.ceil(words / 2.33);

    charCount.textContent = chars.toLocaleString();
    wordCount.textContent = words.toLocaleString();
    estTime.textContent = estSeconds;
  }

  // Get active voice ID
  function getSelectedVoiceId() {
    const val = voiceSelect.value;
    if (val === 'custom') {
      return customVoiceId.value.trim() || 'JBFqnCBsd6RMkjVDRZzb';
    }
    return val;
  }

  // Get voice label name
  function getSelectedVoiceName() {
    const sel = voiceSelect;
    if (sel.value === 'custom') {
      return customVoiceId.value.trim() || 'Custom';
    }
    return sel.options[sel.selectedIndex].text.split('—')[0].trim();
  }

  // Primary Action: Generate and Play Narration
  async function handleGenerateAndPlay() {
    if (state.isGenerating) return;

    const text = scriptInput.value.trim();
    if (!text) {
      showToast('Please enter or paste some text to narrate.', 'error');
      scriptInput.focus();
      return;
    }

    const voiceId = getSelectedVoiceId();
    const modelId = modelSelect.value;
    const stability = parseFloat(stabilitySlider.value);
    const similarity = parseFloat(similaritySlider.value);

    // Enter loading state
    setLoading(true);

    try {
      showToast(`Generating speech with ${modelSelect.options[modelSelect.selectedIndex].text.split('(')[0]}...`, 'info');

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
        method: 'POST',
        headers: {
          'xi-api-key': state.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text: text,
          model_id: modelId,
          voice_settings: {
            stability: stability,
            similarity_boost: similarity,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        let errMessage = `Error ${response.status}: Failed to generate narration`;
        try {
          const errData = await response.json();
          if (errData && errData.detail) {
            if (typeof errData.detail === 'string') {
              errMessage = errData.detail;
            } else if (errData.detail.message) {
              errMessage = errData.detail.message;
            }
          }
        } catch (_) {
          const rawText = await response.text();
          if (rawText) errMessage = rawText;
        }

        throw new Error(errMessage);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Clean up previous blob URL if needed
      if (state.currentAudioUrl) {
        URL.revokeObjectURL(state.currentAudioUrl);
      }

      state.currentAudioUrl = audioUrl;
      state.currentBlob = audioBlob;
      state.currentMeta = {
        text: text,
        modelId: modelId,
        voiceId: voiceId,
        voiceName: getSelectedVoiceName(),
        date: new Date()
      };

      // Update Audio Player UI
      loadAudioToPlayer(audioUrl, state.currentMeta);

      // Add to Library History
      addToHistory({
        id: Date.now(),
        text: text,
        modelId: modelId,
        voiceName: getSelectedVoiceName(),
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        blob: audioBlob,
        url: audioUrl
      });

      showToast('Narration generated successfully! Playing now...', 'success');

      // Auto play
      audioElement.play().catch(err => {
        console.warn('Auto-play blocked by browser policy:', err);
        showToast('Click play on the audio studio bar to listen.', 'info');
      });

    } catch (err) {
      console.error('ElevenLabs TTS Error:', err);
      showToast(err.message || 'Generation failed. Check your API key or voice selection.', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Update Loading Button state
  function setLoading(loading) {
    state.isGenerating = loading;
    if (loading) {
      generatePlayBtn.classList.add('loading');
      playIconSvg.classList.add('hidden');
      spinnerSvg.classList.remove('hidden');
      btnText.textContent = 'Synthesizing Audio...';
    } else {
      generatePlayBtn.classList.remove('loading');
      playIconSvg.classList.remove('hidden');
      spinnerSvg.classList.add('hidden');
      btnText.textContent = 'Generate & Play Narration';
    }
  }

  // Load Audio into the player
  function loadAudioToPlayer(url, meta) {
    audioElement.src = url;
    audioElement.load();

    nowPlayingTitle.textContent = meta.text.length > 55 ? meta.text.slice(0, 52) + '...' : meta.text;
    playerModelBadge.textContent = meta.modelId;
    playerVoiceBadge.textContent = meta.voiceName;

    // Enable download link
    downloadAudioBtn.href = url;
    downloadAudioBtn.download = `elevenlabs_${meta.modelId}_${Date.now()}.mp3`;
    downloadAudioBtn.classList.remove('disabled');

    // Reset progress
    seekProgress.style.width = '0%';
    seekHandle.style.left = '0%';
    currentTimeEl.textContent = '0:00';
  }

  // Audio Play / Pause
  function toggleAudioPlay() {
    if (!audioElement.src) {
      handleGenerateAndPlay();
      return;
    }

    if (audioElement.paused) {
      audioElement.play();
    } else {
      audioElement.pause();
    }
  }

  // Update Progress Track
  function updateProgress() {
    if (!audioElement.duration) return;
    const pct = (audioElement.currentTime / audioElement.duration) * 100;
    seekProgress.style.width = `${pct}%`;
    seekHandle.style.left = `${pct}%`;
    currentTimeEl.textContent = formatTime(audioElement.currentTime);
  }

  // Update Buffered Range
  function updateBuffer() {
    if (!audioElement.duration || audioElement.buffered.length === 0) return;
    const bufferedEnd = audioElement.buffered.end(audioElement.buffered.length - 1);
    const pct = (bufferedEnd / audioElement.duration) * 100;
    seekBuffer.style.width = `${pct}%`;
  }

  // Loaded metadata
  function onAudioLoaded() {
    durationTimeEl.textContent = formatTime(audioElement.duration || 0);
  }

  // Seek
  function handleSeek(e) {
    if (!audioElement.duration) return;
    const rect = seekTrack.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioElement.currentTime = pos * audioElement.duration;
    updateProgress();
  }

  // Cycle Speed
  function cycleSpeed() {
    currentSpeedIndex = (currentSpeedIndex + 1) % SPEED_LEVELS.length;
    const speed = SPEED_LEVELS[currentSpeedIndex];
    audioElement.playbackRate = speed;
    speedBtn.textContent = `${speed.toFixed(speed % 1 === 0 ? 1 : 2)}x`;
  }

  // Toggle Mute
  function toggleMute() {
    audioElement.muted = !audioElement.muted;
    updateVolumeIcons();
  }

  function updateVolumeIcons() {
    if (audioElement.muted || audioElement.volume === 0) {
      volHighSvg.classList.add('hidden');
      volMuteSvg.classList.remove('hidden');
    } else {
      volHighSvg.classList.remove('hidden');
      volMuteSvg.classList.add('hidden');
    }
  }

  // Format seconds to mm:ss
  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // ==========================================================================
  // Web Audio API & Waveform Visualizer
  // ==========================================================================
  function setupCanvasDPI() {
    const dpr = window.devicePixelRatio || 1;
    const rect = waveformCanvas.getBoundingClientRect();
    waveformCanvas.width = rect.width * dpr;
    waveformCanvas.height = 120 * dpr;
    const ctx = waveformCanvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }

  window.addEventListener('resize', setupCanvasDPI);

  function initAudioContext() {
    if (state.audioContext) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      state.audioContext = new AudioCtx();
      state.analyser = state.audioContext.createAnalyser();
      state.analyser.fftSize = 128;
      state.analyser.smoothingTimeConstant = 0.8;

      state.sourceNode = state.audioContext.createMediaElementSource(audioElement);
      state.sourceNode.connect(state.analyser);
      state.analyser.connect(state.audioContext.destination);
    } catch (e) {
      console.warn('Web Audio initialization error:', e);
    }
  }

  function startVisualizer() {
    if (state.animationFrameId) {
      cancelAnimationFrame(state.animationFrameId);
    }

    const canvas = waveformCanvas;
    const ctx = canvas.getContext('2d');
    const bufferLength = state.analyser ? state.analyser.frequencyBinCount : 32;
    const dataArray = new Uint8Array(bufferLength);

    function render() {
      if (audioElement.paused && !state.isGenerating) {
        drawIdleWaveform();
        return;
      }

      state.animationFrameId = requestAnimationFrame(render);

      if (state.analyser) {
        state.analyser.getByteFrequencyData(dataArray);
      }

      const width = canvas.offsetWidth;
      const height = 120;
      ctx.clearRect(0, 0, width, height);

      // Render sleek equalizer bars with gradient & glow
      const barCount = 48;
      const barWidth = Math.max(3, (width / barCount) - 3);
      let x = 3;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * (bufferLength * 0.75));
        const val = dataArray[dataIndex] || 0;
        const percent = val / 255;
        const barHeight = Math.max(4, percent * (height - 18));

        // Create vibrant gradient
        const grad = ctx.createLinearGradient(0, height, 0, height - barHeight);
        grad.addColorStop(0, 'rgba(99, 102, 241, 0.9)');
        grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.95)');
        grad.addColorStop(1, 'rgba(236, 72, 153, 1)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, (height - barHeight) / 2, barWidth, barHeight, 3);
        } else {
          ctx.rect(x, (height - barHeight) / 2, barWidth, barHeight);
        }
        ctx.fill();

        x += barWidth + 3;
      }
    }

    render();
  }

  function drawIdleWaveform() {
    const canvas = waveformCanvas;
    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth || 800;
    const height = 120;
    ctx.clearRect(0, 0, width, height);

    // Draw aesthetic subtle idle wave
    const barCount = 48;
    const barWidth = Math.max(3, (width / barCount) - 3);
    let x = 3;

    for (let i = 0; i < barCount; i++) {
      const idleHeight = 6 + Math.sin(i * 0.25) * 4;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, (height - idleHeight) / 2, barWidth, idleHeight, 2);
      } else {
        ctx.rect(x, (height - idleHeight) / 2, barWidth, idleHeight);
      }
      ctx.fill();
      x += barWidth + 3;
    }
  }

  // ==========================================================================
  // Library History
  // ==========================================================================
  function addToHistory(item) {
    state.history.unshift(item);
    if (state.history.length > 20) {
      state.history.pop();
    }
    saveHistory();
    renderHistory();
  }

  function saveHistory() {
    try {
      const serializable = state.history.map(h => ({
        id: h.id,
        text: h.text,
        modelId: h.modelId,
        voiceName: h.voiceName,
        date: h.date
      }));
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(serializable));
    } catch (_) {}
  }

  function loadHistory() {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          state.history = parsed;
          renderHistory();
        }
      }
    } catch (_) {}
  }

  function renderHistory() {
    if (state.history.length === 0) {
      emptyHistoryMsg.classList.remove('hidden');
      return;
    }

    emptyHistoryMsg.classList.add('hidden');
    // Clear existing items
    const items = historyList.querySelectorAll('.history-item');
    items.forEach(el => el.remove());

    state.history.forEach(item => {
      const div = document.createElement('div');
      div.className = 'history-item';
      div.innerHTML = `
        <div class="history-info">
          <div class="history-text" title="${escapeHtml(item.text)}">${escapeHtml(item.text)}</div>
          <div class="history-tags">
            <span class="history-tag">${escapeHtml(item.modelId)}</span>
            <span class="history-tag">${escapeHtml(item.voiceName)}</span>
            <span>${escapeHtml(item.date)}</span>
          </div>
        </div>
        <div class="history-actions">
          <button class="history-action-btn load-btn" title="Load script into editor">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
        </div>
      `;

      div.querySelector('.load-btn').addEventListener('click', () => {
        scriptInput.value = item.text;
        updateCounters();
        modelSelect.value = item.modelId;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast('Script loaded into editor', 'info');
      });

      historyList.appendChild(div);
    });
  }

  // ==========================================================================
  // Toast System
  // ==========================================================================
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else {
      iconSvg = `<svg class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `
      ${iconSvg}
      <div class="toast-content">
        <div class="toast-msg">${escapeHtml(message)}</div>
      </div>
    `;

    toastStack.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      setTimeout(() => toast.remove(), 250);
    }, 4500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function (m) {
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      })[m];
    });
  }

  // Initialize on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
