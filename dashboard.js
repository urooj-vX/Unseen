// UNSEEN — World Dashboard & Application Router
// Orchestrates Screen A (Walk Timer), Screen B (Observation), Screen C (Discovery Review),
// Screen D (Sanctuary Hub), and Screen E (My World Drag-to-Place).

import { DashboardState, WALKING_REWARD_TABLE } from './dashboard-state.js';
import { SanctuaryScene, WildernessScene, WorldScene } from './world-scene.js';
import { DiscoveryAgent, SAMPLE_OBSERVATIONS, getCleanObservationTitle } from './discovery-agent.js';
import { WalkScene3D } from './walk-scene-3d.js';

let state = null;
let sanctuaryScene = null;
let wildernessScene = null;
let scene = null; // Alias for sanctuaryScene
let walkScene3D = null;
let discoveryAgent = null;

let currentScreen = 'walk'; // 'walk' | 'observe' | 'discovery' | 'sanctuary' | 'world'
let walkTimerInterval = null;
let selectedWalkDuration = 25;
let activeDragItemId = null;
let selectedObservationSample = 'sample_archway';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initApp();
  });
} else {
  initApp();
}

function initApp() {
  // 1. Initialize State
  state = new DashboardState();

  // 2. Initialize 3D Curated Botanical Sanctuary Scene
  const sanctuaryCanvas = document.getElementById('sanctuary-canvas');
  if (sanctuaryCanvas) {
    sanctuaryScene = new SanctuaryScene(sanctuaryCanvas, state, {
      onSelect: handleWorldObjectSelected,
      onPlace: handleWorldObjectPlaced,
      onBuild: handleWorldBuildCompleted
    });
    scene = sanctuaryScene;
  }

  // 3. Initialize 3D Expansive Wilderness Scene (The Wilds)
  const worldCanvas = document.getElementById('world-canvas');
  if (worldCanvas) {
    wildernessScene = new WildernessScene(worldCanvas, {
      onSelectLandmark: (landmark) => {
        handleWildernessLandmarkSelected(landmark);
      }
    });
  }

  // 3. Initialize Real-Time 3D Walk Expedition & Observation Scene
  const walkCanvas = document.getElementById('walk-3d-canvas');
  if (walkCanvas) {
    walkScene3D = new WalkScene3D(walkCanvas, {
      onSelectDuration: (mins) => {
        selectDuration(mins);
      },
      onSelectObservation: (obsKey) => {
        selectObservationSample(obsKey);
      }
    });
  }

  // 3. Initialize Discovery Agent Component
  const discoveryMount = document.getElementById('discovery-component-mount');
  if (discoveryMount) {
    discoveryAgent = new DiscoveryAgent(state, discoveryMount, {
      onClaimSuccess: (res) => {
        showToast(res.message, 'success');
        renderSanctuaryInventoryTray();
        renderHubInventory();
        renderWorldInventoryDock();
      },
      onGoToWorld: () => {
        navigateToScreen('sanctuary');
      },
      onNavigate: (screen) => {
        navigateToScreen(screen);
      }
    });
  }

  // 4. Setup Screen Navigation & Hash Router
  setupNavigation();

  // 5. Setup Screen A (Walk Setup & Timer)
  setupWalkScreen();

  // 6. Setup Screen B (Observation Upload)
  setupObservationScreen();

  // 7. Setup Screen D (Sanctuary Hub Living 3D World)
  setupSanctuaryScreen();

  // 8. Setup Screen E (Drag-to-Place & World Interactions)
  setupWorldScreen();

  // 9. Setup Settings Modal
  setupSettingsModal();

  // 10. Initial UI Renders
  updateTopBar();
  updateSanctuaryHUD();
  renderSanctuaryInventoryTray();
  renderSanctuaryHistory();
  renderHubInventory();
  renderHubActivity();

  // 11. Check initial screen from URL hash or active walk
  const initialHash = window.location.hash.replace('#', '');
  if (['walk', 'observe', 'discovery', 'sanctuary', 'world'].includes(initialHash)) {
    navigateToScreen(initialHash);
  } else if (state.activeWalkSession) {
    // If a walk is currently running and no explicit hash was provided, jump to active walk timer
    navigateToScreen('walk');
  } else {
    // Default flow starts on Screen A (Walk Setup)
    navigateToScreen('walk');
  }

  // 12. Subscribe to State Changes
  state.subscribe(() => {
    updateTopBar();
    updateSanctuaryHUD();
    renderSanctuaryInventoryTray();
    renderSanctuaryHistory();
    renderHubInventory();
    renderHubActivity();
    renderWorldInventoryDock();
  });
}

/* -------------------------------------------------------------------------- */
/* 1. SCREEN NAVIGATION & ROUTING                                             */
/* -------------------------------------------------------------------------- */
function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-screen-btn');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const screenId = btn.getAttribute('data-screen');
      if (screenId) navigateToScreen(screenId);
      // Close mobile drawer if open
      const mobileDrawer = document.getElementById('mobile-nav-drawer');
      if (mobileDrawer) mobileDrawer.classList.add('hidden');
    });
  });

  const mobileToggle = document.getElementById('btn-mobile-screen-toggle');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      const mobileDrawer = document.getElementById('mobile-nav-drawer');
      if (mobileDrawer) mobileDrawer.classList.toggle('hidden');
    });
  }

  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (['walk', 'observe', 'discovery', 'sanctuary', 'world'].includes(hash) && hash !== currentScreen) {
      navigateToScreen(hash);
    }
  });

  const hubEnterWorldBtn = document.getElementById('btn-hub-enter-world');
  if (hubEnterWorldBtn) {
    hubEnterWorldBtn.addEventListener('click', () => navigateToScreen('world'));
  }

  const worldExitBtn = document.getElementById('btn-world-exit');
  if (worldExitBtn) {
    worldExitBtn.addEventListener('click', () => navigateToScreen('sanctuary'));
  }

  const journalBtn = document.getElementById('btn-open-journal');
  if (journalBtn) {
    journalBtn.addEventListener('click', () => navigateToScreen('discovery'));
  }

  const mobileJournalBtn = document.getElementById('btn-mobile-journal');
  if (mobileJournalBtn) {
    mobileJournalBtn.addEventListener('click', () => {
      const mobileDrawer = document.getElementById('mobile-nav-drawer');
      if (mobileDrawer) mobileDrawer.classList.add('hidden');
      navigateToScreen('discovery');
    });
  }
}

function navigateToScreen(screenName) {
  currentScreen = screenName;
  window.location.hash = screenName;

  // Hide all screens
  const screens = ['walk', 'observe', 'discovery', 'sanctuary', 'world'];
  screens.forEach(s => {
    const el = document.getElementById(`screen-${s}`);
    if (el) el.classList.add('hidden');
  });

  // Show active screen
  const target = document.getElementById(`screen-${screenName}`);
  if (target) target.classList.remove('hidden');

  // Update nav pill styling
  document.querySelectorAll('.nav-screen-btn').forEach(btn => {
    const s = btn.getAttribute('data-screen');
    const isTarget = s === screenName;
    if (s === 'world') {
      btn.className = `nav-screen-btn px-4 py-1.5 rounded-full text-xs font-heading font-extrabold transition-all flex items-center gap-1.5 ${
        isTarget ? 'bg-forest text-cream shadow-md ring-2 ring-mint/40 scale-102' : 'bg-forest hover:bg-forest-deep text-cream shadow-xs'
      }`;
    } else {
      btn.className = `nav-screen-btn px-3.5 py-1.5 rounded-full text-xs font-heading font-bold transition-all ${
        isTarget ? 'bg-cream-card text-forest shadow-xs border border-sage-border' : 'text-text-muted hover:text-forest'
      }`;
    }
  });

  // Viewports
  const walkViewport = document.getElementById('walk-3d-viewport');
  const sanctuaryViewport = document.getElementById('sanctuary-3d-viewport');
  const worldViewport = document.getElementById('world-3d-viewport');

  // Pause all 3D scenes first
  if (walkScene3D) walkScene3D.pause();
  if (sanctuaryScene) sanctuaryScene.pause();
  if (wildernessScene) wildernessScene.pause();
  if (discoveryAgent) discoveryAgent.pause3D();

  // Hide viewports
  if (walkViewport) walkViewport.classList.add('hidden');
  if (sanctuaryViewport) sanctuaryViewport.classList.add('hidden');
  if (worldViewport) worldViewport.classList.add('hidden');

  if (screenName === 'walk') {
    if (walkViewport) walkViewport.classList.remove('hidden');
    if (walkScene3D) {
      requestAnimationFrame(() => {
        walkScene3D.resume();
        walkScene3D.resize();
        walkScene3D.setMode(state.activeWalkSession ? 'active' : 'setup');
      });
    }
    updateWalkScreenState();
  } else if (screenName === 'observe') {
    if (walkViewport) walkViewport.classList.remove('hidden');
    if (walkScene3D) {
      requestAnimationFrame(() => {
        walkScene3D.resume();
        walkScene3D.resize();
        walkScene3D.setMode('observe');
        walkScene3D.focusObservation(selectedObservationSample || 'sample_archway');
      });
    }
    updateObservationScreenUI();
  } else if (screenName === 'sanctuary') {
    if (sanctuaryViewport) sanctuaryViewport.classList.remove('hidden');
    if (sanctuaryScene) {
      sanctuaryScene.setSelectMode();
      requestAnimationFrame(() => {
        sanctuaryScene.resume();
        sanctuaryScene.onResize();
        sanctuaryScene.renderWorldFromState();
      });
    }
    updateSanctuaryHUD();
    renderSanctuaryInventoryTray();
    renderSanctuaryHistory();
  } else if (screenName === 'world') {
    if (worldViewport) worldViewport.classList.remove('hidden');
    if (wildernessScene) {
      requestAnimationFrame(() => {
        wildernessScene.resume();
        wildernessScene.onResize();
      });
    }
  } else if (screenName === 'discovery') {
    if (discoveryAgent) {
      discoveryAgent.resume3D();
      discoveryAgent.render();
      requestAnimationFrame(() => {
        discoveryAgent.resize3D();
      });
    }
  }
}

function updateTopBar() {
  const nameEl = document.getElementById('topbar-world-name');
  if (nameEl) nameEl.textContent = state.worldName;

  const wpEl = document.getElementById('counter-wp');
  if (wpEl) wpEl.textContent = state.walkingPoints;

  const dmEl = document.getElementById('counter-dm');
  if (dmEl) dmEl.textContent = state.discoveryMaterials;
}

/* -------------------------------------------------------------------------- */
/* 2. SCREEN A: WALK SETUP & COUNTDOWN TIMER (REAL-TIME 3D EXPEDITION)       */
/* -------------------------------------------------------------------------- */
function selectDuration(durationMinutes) {
  selectedWalkDuration = parseInt(durationMinutes, 10) || 25;

  // 1. Update duration buttons in console
  const pills = document.querySelectorAll('.btn-walk-dur');
  pills.forEach(p => {
    const isTarget = parseInt(p.getAttribute('data-min'), 10) === selectedWalkDuration;
    if (isTarget) {
      p.classList.add('walk-dur-active');
      if (!p.querySelector('.walk-dur-dot')) {
        const dot = document.createElement('span');
        dot.className = 'walk-dur-dot';
        p.prepend(dot);
      }
    } else {
      p.classList.remove('walk-dur-active');
      const dot = p.querySelector('.walk-dur-dot');
      if (dot) dot.remove();
    }
  });

  // 2. Notify 3D Scene to move explorer and focus camera on waypoint
  if (walkScene3D) {
    walkScene3D.setDuration(selectedWalkDuration);
  }

  // 3. Update preview figures
  updateSetupPreview();
}

function setupWalkScreen() {
  // Console duration buttons
  const pills = document.querySelectorAll('.btn-walk-dur');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      const min = pill.getAttribute('data-min');
      selectDuration(min);
    });
  });

  // Start Walk CTA
  const startBtn = document.getElementById('btn-start-walk');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      state.startWalk(selectedWalkDuration);
      showToast(`Walk expedition started (${selectedWalkDuration} min). Phone in pocket!`);
      updateWalkScreenState();
    });
  }

  // Pause / Resume
  const pauseBtn = document.getElementById('btn-pause-walk');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      if (!state.activeWalkSession) return;
      if (state.activeWalkSession.isPaused) {
        state.resumeWalk();
        pauseBtn.textContent = 'Pause Walk';
        pauseBtn.classList.remove('is-paused');
        showToast('Walk session resumed.');
      } else {
        state.pauseWalk();
        pauseBtn.textContent = 'Resume Walk';
        pauseBtn.classList.add('is-paused');
        showToast('Walk session paused.');
      }
      renderActiveTimer();
    });
  }

  // Complete Walk
  const completeBtn = document.getElementById('btn-complete-walk');
  if (completeBtn) {
    completeBtn.addEventListener('click', () => {
      const record = state.completeWalk(false);
      if (record) {
        showToast(`Walk completed! +${record.walkingPointsEarned} Walking Points awarded.`);
        setObservationWalkSummary(record);
        navigateToScreen('observe');
      }
    });
  }

  // End Early
  const endEarlyBtn = document.getElementById('btn-end-early-walk');
  if (endEarlyBtn) {
    endEarlyBtn.addEventListener('click', () => {
      if (confirm('End walk early? Walking points will be awarded based on actual elapsed time.')) {
        const record = state.completeWalk(true);
        if (record) {
          showToast(`Walk ended early (${record.durationMinutes} min). +${record.walkingPointsEarned} WP awarded.`);
          setObservationWalkSummary(record);
          navigateToScreen('observe');
        }
      }
    });
  }

  // Initialize selected milestone (25m default)
  selectDuration(selectedWalkDuration || 25);
}

function updateSetupPreview() {
  const reward = WALKING_REWARD_TABLE.find(r => r.durationMinutes === selectedWalkDuration);
  if (!reward) return;

  const wpEl = document.getElementById('setup-preview-wp');
  const stepsEl = document.getElementById('setup-preview-steps');

  if (wpEl) wpEl.textContent = `+${reward.walkingPoints} WP`;
  if (stepsEl) stepsEl.textContent = `~${reward.estimatedSteps.toLocaleString()} estimated steps`;
}

function updateWalkScreenState() {
  const setupOverlay = document.getElementById('walk-setup-overlay');
  const activeOverlay = document.getElementById('walk-active-overlay');

  if (state.activeWalkSession) {
    if (walkScene3D) walkScene3D.setMode('active');
    if (setupOverlay) setupOverlay.classList.add('hidden');
    if (activeOverlay) activeOverlay.classList.remove('hidden');

    const pauseBtn = document.getElementById('btn-pause-walk');
    if (pauseBtn) {
      pauseBtn.textContent = state.activeWalkSession.isPaused ? 'Resume Walk' : 'Pause Walk';
      pauseBtn.classList.toggle('is-paused', !!state.activeWalkSession.isPaused);
    }

    startTimerInterval();
    renderActiveTimer();
  } else {
    if (walkScene3D) walkScene3D.setMode('setup');
    if (setupOverlay) setupOverlay.classList.remove('hidden');
    if (activeOverlay) activeOverlay.classList.add('hidden');
    stopTimerInterval();
  }
}

function startTimerInterval() {
  stopTimerInterval();
  walkTimerInterval = setInterval(() => {
    if (!state.activeWalkSession) {
      stopTimerInterval();
      return;
    }
    renderActiveTimer();
  }, 1000);
}

function stopTimerInterval() {
  if (walkTimerInterval) {
    clearInterval(walkTimerInterval);
    walkTimerInterval = null;
  }
}

function renderActiveTimer() {
  if (!state.activeWalkSession) return;

  const remSec = state.getWalkRemainingSeconds();
  const minutes = Math.floor(remSec / 60);
  const seconds = remSec % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const timerEl = document.getElementById('active-timer-display');
  if (timerEl) {
    timerEl.textContent = timeStr;
    if (state.activeWalkSession.isPaused) {
      timerEl.classList.add('text-citrus');
    } else {
      timerEl.classList.remove('text-citrus');
    }
  }

  const totalSec = state.activeWalkSession.targetDurationMinutes * 60;
  const elapsedSec = totalSec - remSec;
  const pct = Math.min(100, Math.max(0, (elapsedSec / totalSec) * 100));

  const barEl = document.getElementById('active-timer-progressbar');
  if (barEl) barEl.style.width = `${pct}%`;

  const pctEl = document.getElementById('active-timer-pct');
  if (pctEl) pctEl.textContent = `${Math.round(pct)}% elapsed`;

  const metaEl = document.getElementById('active-timer-meta');
  if (metaEl) {
    const targetReward = WALKING_REWARD_TABLE.find(r => r.durationMinutes === state.activeWalkSession.targetDurationMinutes);
    const rewardWP = targetReward ? targetReward.walkingPoints : Math.round(state.activeWalkSession.targetDurationMinutes * 2.4);
    const estSteps = targetReward ? targetReward.estimatedSteps : state.activeWalkSession.targetDurationMinutes * 110;
    metaEl.textContent = `Target Duration: ${state.activeWalkSession.targetDurationMinutes} min (${timeStr} remaining) · +${rewardWP} WP · ~${estSteps.toLocaleString()} steps`;
  }
}

/* -------------------------------------------------------------------------- */
/* 3. SCREEN B: RETURN & OBSERVATION UPLOAD (3D DISCOVERY EXPERIENCE)         */
/* -------------------------------------------------------------------------- */
let userUploadedPhotoSrc = null;

function setupObservationScreen() {
  // 1. Preset sample buttons
  const sampleBtns = document.querySelectorAll('.btn-observe-sample');
  sampleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const sId = btn.getAttribute('data-sample');
      if (sId) {
        selectObservationSample(sId);
      }
    });
  });

  // 2. Dropzone & File upload handling
  const dropzone = document.getElementById('observe-dropzone');
  const fileInput = document.getElementById('observe-photo-input');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-active');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-active');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-active');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handlePhotoFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handlePhotoFile(e.target.files[0]);
      }
    });
  }

  // 3. Sample photo load button
  const samplePhotoBtn = document.getElementById('btn-load-sample-photo');
  if (samplePhotoBtn) {
    samplePhotoBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        const res = await fetch('/experiments/kill-test/photos/p08_a.jpeg');
        const blob = await res.blob();
        const file = new File([blob], 'p08_a.jpeg', { type: 'image/jpeg' });
        handlePhotoFile(file);
      } catch (err) {
        console.error('Failed to load sample photo', err);
      }
    });
  }

  // 4. Replace photo button
  const replacePhotoBtn = document.getElementById('btn-replace-photo');
  if (replacePhotoBtn) {
    replacePhotoBtn.addEventListener('click', () => {
      if (fileInput) fileInput.click();
    });
  }

  // 5. Remove photo button
  const removePhotoBtn = document.getElementById('btn-remove-photo');
  if (removePhotoBtn) {
    removePhotoBtn.addEventListener('click', () => {
      userUploadedPhotoSrc = null;
      if (fileInput) fileInput.value = '';
      const evidenceCard = document.getElementById('observe-photo-evidence-card');
      if (evidenceCard) evidenceCard.classList.add('hidden');
      const dropzone = document.getElementById('observe-dropzone');
      if (dropzone) dropzone.classList.remove('hidden');
      const noticeEl = document.getElementById('observe-action-notice');
      if (noticeEl) {
        noticeEl.className = 'hidden';
        noticeEl.innerHTML = '';
      }
      showToast('Photo removed.', 'info');
    });
  }

  // 6. Lightweight writing prompt chips
  const promptBtns = document.querySelectorAll('.btn-note-prompt, .btn-note-tag');
  const noteInput = document.getElementById('observe-field-note');
  promptBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!noteInput) return;
      const prompt = btn.getAttribute('data-prompt') || (btn.getAttribute('data-tag') ? `[${btn.getAttribute('data-tag')}]: ` : '');
      if (!prompt) return;
      const current = noteInput.value;
      const prefix = current.trim().length > 0 && !current.endsWith('\n') ? '\n' : '';
      noteInput.value = current + prefix + prompt;
      noteInput.focus();
      noteInput.selectionStart = noteInput.selectionEnd = noteInput.value.length;
    });
  });

  // 7. Submit "Examine Discovery" primary button
  const submitBtn = document.getElementById('btn-submit-observation');
  if (submitBtn) {
    submitBtn.addEventListener('click', handleExamineDiscovery);
  }

  // 8. Separate Simulator Baseline testing button
  const simSubmitBtn = document.getElementById('btn-submit-simulator-test');
  if (simSubmitBtn) {
    simSubmitBtn.addEventListener('click', async () => {
      const noteInput = document.getElementById('observe-field-note');
      const fieldNote = noteInput ? noteInput.value.trim() : '';

      simSubmitBtn.disabled = true;
      simSubmitBtn.innerHTML = '<span>⏳</span><span>Simulating Baseline...</span>';

      try {
        if (discoveryAgent) {
          await discoveryAgent.analyzeObservation({
            imageSrc: null,
            fieldNote: fieldNote,
            sampleId: selectedObservationSample || 'sample_archway',
            isDemo: true
          });
        }
        const obs = discoveryAgent?.currentObservation || state.pendingObservation;
        if (obs) {
          showDiscoveryReveal(obs);
        }
      } catch (err) {
        console.error('Simulator baseline load failed', err);
        showToast('Failed to load simulator baseline.', 'error');
      } finally {
        simSubmitBtn.disabled = false;
        simSubmitBtn.innerHTML = '<span>🔬</span><span>Run Simulator Baseline</span>';
      }
    });
  }

  // Initial selection for simulator drawer
  selectObservationSample('sample_archway');
}

function handlePhotoFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    alert('Please select a valid image file (JPEG, PNG, WebP, HEIC).');
    return;
  }

  const reader = new FileReader();
  reader.onload = (evt) => {
    userUploadedPhotoSrc = evt.target.result;

    const img = document.getElementById('observe-preview-img');
    const evidenceCard = document.getElementById('observe-photo-evidence-card');
    const dropzone = document.getElementById('observe-dropzone');
    const label = document.getElementById('observe-evidence-label');
    const noticeEl = document.getElementById('observe-action-notice');

    if (img) img.src = userUploadedPhotoSrc;
    if (label) label.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
    if (evidenceCard) evidenceCard.classList.remove('hidden');
    if (dropzone) dropzone.classList.add('hidden');
    if (noticeEl) {
      noticeEl.className = 'hidden';
      noticeEl.innerHTML = '';
    }

    showToast('Field photograph attached! Ready to examine.', 'success');
  };
  reader.readAsDataURL(file);
}

function selectObservationSample(sampleId) {
  selectedObservationSample = sampleId || 'sample_archway';

  // 1. Update specimen buttons
  const sampleBtns = document.querySelectorAll('.btn-observe-sample');
  sampleBtns.forEach(b => {
    const isTarget = b.getAttribute('data-sample') === selectedObservationSample;
    const indicator = b.querySelector('.specimen-indicator');
    if (isTarget) {
      b.classList.add('observe-specimen-active');
      if (indicator) {
        indicator.className = 'specimen-indicator w-2.5 h-2.5 rounded-full bg-citrus shrink-0 border border-forest';
      }
    } else {
      b.classList.remove('observe-specimen-active');
      if (indicator) {
        indicator.className = 'specimen-indicator w-2.5 h-2.5 rounded-full bg-sage-border shrink-0';
      }
    }
  });

  // 2. Update 3D landmark camera
  if (walkScene3D) {
    walkScene3D.focusObservation(selectedObservationSample);
  }

  // 3. Update HUD and prompt text
  const hudTitle = document.getElementById('observe-hud-title');
  const hudDesc = document.getElementById('observe-hud-desc');
  const promptHint = document.getElementById('observe-notes-prompt-hint');

  const infoMap = {
    sample_archway: {
      title: 'Stone Archway',
      desc: 'Weathered granite masonry & creeping ivy roots.',
      hint: 'Notice masonry joints & ivy roots...'
    },
    sample_stream: {
      title: 'Forest Stream',
      desc: 'Clear runoff, river stones & wetland reeds.',
      hint: 'Notice water velocity & pebble bed...'
    },
    sample_trailhead: {
      title: 'Compacted Trail',
      desc: 'Packed pine needles & wooden trail marker.',
      hint: 'Notice footpath tread & pine needles...'
    }
  };

  const info = infoMap[selectedObservationSample] || infoMap.sample_archway;
  if (hudTitle) hudTitle.textContent = info.title;
  if (hudDesc) hudDesc.textContent = info.desc;
  if (promptHint) promptHint.textContent = info.hint;
}

function updateObservationScreenUI() {
  const summaryBadge = document.getElementById('observe-walk-summary-badge');
  if (summaryBadge && state && state.lastWalkCompletedMinutes) {
    summaryBadge.textContent = `${state.lastWalkCompletedMinutes}m Walk Logged`;
  }
  const hudBadge = document.getElementById('observe-hud-badge');
  if (hudBadge && state && state.lastWalkCompletedMinutes) {
    hudBadge.textContent = `${state.lastWalkCompletedMinutes}m Walk Logged`;
  }
  selectObservationSample(selectedObservationSample || 'sample_archway');
}

async function handleExamineDiscovery() {
  const noticeEl = document.getElementById('observe-action-notice');
  const submitBtn = document.getElementById('btn-submit-observation');
  const submitText = document.getElementById('btn-submit-obs-text');
  const submitIcon = document.getElementById('btn-submit-obs-icon');

  const noteInput = document.getElementById('observe-field-note');
  const fieldNote = noteInput ? noteInput.value.trim() : '';

  const photoToProcess = userUploadedPhotoSrc;

  // 1. Missing-photo behavior
  if (!photoToProcess) {
    if (noticeEl) {
      noticeEl.className = 'p-3 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] space-y-1 block';
      noticeEl.innerHTML = `
        <div class="font-heading font-bold text-xs text-[#B45309] flex items-center gap-1.5">
          <span>📷</span>
          <span>Field Photograph Required</span>
        </div>
        <p class="text-[11px] text-[#78350F] leading-relaxed">
          Please attach a field photograph from your walk before discovering. 
          Or expand <em>Developer &amp; Sample Testing</em> below if you want to test without a photo.
        </p>
      `;
    }
    showToast('Please attach a field photograph to discover.', 'warning');
    return;
  }

  if (noticeEl) {
    noticeEl.className = 'hidden';
    noticeEl.innerHTML = '';
  }

  // 2. Clear visual processing state (keep player on Observation screen!)
  if (submitBtn) submitBtn.disabled = true;
  if (submitText) submitText.textContent = 'Discovering with Local Vision AI...';
  if (submitIcon) submitIcon.innerHTML = '<span class="inline-block animate-spin">🌿</span>';

  try {
    if (discoveryAgent) {
      await discoveryAgent.analyzeObservation({
        imageSrc: photoToProcess,
        fieldNote: fieldNote,
        title: 'Walk Field Observation'
      });
    }

    const obs = discoveryAgent?.currentObservation || state.pendingObservation;
    if (obs) {
      showDiscoveryReveal(obs);
    } else {
      showToast('Could not complete observation.', 'warning');
    }
  } catch (err) {
    console.error('Observation discovery failed', err);
    // Preserve user photo and notes on failure - show friendly in-game message
    if (noticeEl) {
      noticeEl.className = 'p-3 rounded-2xl bg-[#FFF5F5] border border-[#FECACA] text-xs text-[#991B1B] space-y-1.5 block';
      noticeEl.innerHTML = `
        <div class="font-heading font-bold text-xs text-[#7F1D1D] flex items-center gap-1.5">
          <span>🍃</span>
          <span>Could Not Complete Discovery</span>
        </div>
        <p class="text-[11px] text-[#991B1B] leading-relaxed">
          Local vision analysis could not connect or timed out. Your photograph and field notes have been safely kept.
        </p>
        <button type="button" id="btn-retry-discovery" class="mt-1 px-3 py-1.5 rounded-xl bg-forest text-cream text-[11px] font-heading font-bold hover:bg-forest-deep transition-colors cursor-pointer">
          Retry Discovery ↻
        </button>
      `;
      const retryBtn = document.getElementById('btn-retry-discovery');
      if (retryBtn) {
        retryBtn.addEventListener('click', handleExamineDiscovery);
      }
    }
    showToast('Inference unavailable. Your photo and notes were kept.', 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (submitText) submitText.textContent = 'Discover';
    if (submitIcon) submitIcon.textContent = '✨';
  }
}

function clearObservationInputs() {
  userUploadedPhotoSrc = null;
  const fileInput = document.getElementById('observe-photo-input');
  if (fileInput) fileInput.value = '';
  const evidenceCard = document.getElementById('observe-photo-evidence-card');
  if (evidenceCard) evidenceCard.classList.add('hidden');
  const dropzone = document.getElementById('observe-dropzone');
  if (dropzone) dropzone.classList.remove('hidden');
  const noteInput = document.getElementById('observe-field-note');
  if (noteInput) noteInput.value = '';
  const noticeEl = document.getElementById('observe-action-notice');
  if (noticeEl) {
    noticeEl.className = 'hidden';
    noticeEl.innerHTML = '';
  }
}

function showDiscoveryReveal(obs) {
  const modal = document.getElementById('modal-discovery-reveal');
  if (!modal || !obs) return;

  const photoImg = document.getElementById('reveal-photo-img');
  const titleEl = document.getElementById('reveal-title');
  const descEl = document.getElementById('reveal-description');
  const detailsSec = document.getElementById('reveal-details-section');
  const detailsContainer = document.getElementById('reveal-details-container');
  const badgeIcon = document.getElementById('reveal-badge-icon');
  const badgeText = document.getElementById('reveal-badge-text');

  const rewardBox = document.getElementById('reveal-reward-box');
  const rewardIcon = document.getElementById('reveal-reward-icon');
  const rewardTitle = document.getElementById('reveal-reward-title');
  const rewardSubtitle = document.getElementById('reveal-reward-subtitle');
  const rewardBadge = document.getElementById('reveal-reward-badge');

  const btnPrimary = document.getElementById('btn-reveal-primary');
  const btnPrimaryText = document.getElementById('btn-reveal-primary-text');
  const btnSecondary = document.getElementById('btn-reveal-secondary');
  const btnCloseX = document.getElementById('btn-close-reveal-x');

  // 1. Photo thumbnail
  if (photoImg) {
    if (obs.imageSrc) {
      photoImg.src = obs.imageSrc;
      photoImg.classList.remove('hidden');
    } else {
      photoImg.src = '';
      photoImg.classList.add('hidden');
    }
  }

  // 2. Memorable, clean discovery title
  const cleanTitle = getCleanObservationTitle(obs);
  if (titleEl) titleEl.textContent = cleanTitle;

  // 3. Up to 3 interesting details
  if (detailsContainer) {
    const rawDetails = [];
    if (obs.structuredAnalysis?.visible_features && Array.isArray(obs.structuredAnalysis.visible_features)) {
      rawDetails.push(...obs.structuredAnalysis.visible_features);
    }
    if (rawDetails.length === 0 && obs.detectedElements && Array.isArray(obs.detectedElements)) {
      rawDetails.push(...obs.detectedElements.map(d => d.name));
    }
    const displayDetails = rawDetails.slice(0, 3);

    if (displayDetails.length > 0) {
      if (detailsSec) detailsSec.classList.remove('hidden');
      detailsContainer.innerHTML = displayDetails.map(detail => {
        const clean = String(detail).replace(/^a\s+|^an\s+|^the\s+/i, '').slice(0, 36);
        return `<span class="px-2.5 py-1 rounded-xl bg-[#EDEAE4] text-forest text-[11px] font-heading font-bold border border-sage-border/80 shadow-2xs">✦ ${clean}</span>`;
      }).join('');
    } else {
      if (detailsSec) detailsSec.classList.add('hidden');
    }
  }

  // 4. Rewards & State Handling based on evidence eligibility
  const isEligible = obs.isRewardEligible && obs.allowPhysicalRewards && !obs.analysisError;
  const isSynthetic = obs.eligibilityStatus === 'ineligible' && !obs.analysisError;
  const isError = Boolean(obs.analysisError);

  if (isEligible) {
    // ----------------------------------------------------
    // CASE A: Eligible Real-World Physical Discovery
    // ----------------------------------------------------
    if (badgeIcon) badgeIcon.textContent = '🌿';
    if (badgeText) badgeText.textContent = 'A New Discovery!';

    if (descEl) {
      descEl.textContent = obs.fieldNote || obs.structuredAnalysis?.evidence_summary || obs.notes || 'Observed natural physical features in the field.';
    }

    // Auto-claim reward into state/inventory if not already claimed
    let claimResult = null;
    const isAlreadyClaimed = state.claimedObservationIds && state.claimedObservationIds.has(obs.id);

    if (!isAlreadyClaimed) {
      const validConfirmed = (obs.detectedElements || []).filter(el => !el.ineligible);
      claimResult = state.claimObservationRewards(obs.id, validConfirmed, obs);

      if (claimResult && claimResult.success) {
        window.newlyEarnedItemIds = new Set((claimResult.earnedItems || []).map(i => i.itemId));
        updateTopBar();
      }
    }

    if (rewardBox) {
      rewardBox.className = 'p-3.5 rounded-2xl bg-cream-warm border border-citrus/60 shadow-xs flex items-center justify-between';
      if (rewardIcon) rewardIcon.textContent = '💎';
      
      const matsEarned = claimResult ? claimResult.earnedMaterials : (obs.detectedElements?.reduce((s, e) => s + (e.suggestedReward || 1), 0) || 2);
      const itemsList = claimResult?.earnedItems?.length > 0 
        ? claimResult.earnedItems.map(i => `${i.qty}x ${i.name}`).join(', ')
        : 'Sanctuary discoveries';

      if (rewardTitle) rewardTitle.textContent = isAlreadyClaimed ? 'Discovery Saved' : `+${matsEarned} Discovery Materials`;
      if (rewardSubtitle) rewardSubtitle.textContent = isAlreadyClaimed ? 'Already added to your Sanctuary backpack' : `Unlocked ${itemsList} for your garden`;
      if (rewardBadge) {
        rewardBadge.textContent = isAlreadyClaimed ? 'Saved' : 'Earned';
        rewardBadge.className = 'px-2.5 py-1 rounded-xl bg-forest text-cream text-[10px] font-heading font-extrabold shadow-2xs';
      }
    }

    // Primary CTA: Visit My Sanctuary
    if (btnPrimaryText) btnPrimaryText.textContent = 'Visit My Sanctuary';
    btnPrimary.onclick = () => {
      modal.classList.add('hidden');
      clearObservationInputs();
      navigateToScreen('sanctuary');
      showToast('Welcome to your Sanctuary! Newly earned items are in your backpack.', 'success');
    };

    // Secondary CTA: Keep Exploring
    btnSecondary.textContent = 'Keep Exploring';
    btnSecondary.onclick = () => {
      modal.classList.add('hidden');
      clearObservationInputs();
      showToast('Observation recorded! Ready for your next discovery.', 'info');
    };

  } else if (isSynthetic) {
    // ----------------------------------------------------
    // CASE B: Screenshot / Rendering / Non-Physical Image
    // ----------------------------------------------------
    if (badgeIcon) badgeIcon.textContent = '📓';
    if (badgeText) badgeText.textContent = 'Field Study Record';

    if (descEl) {
      descEl.textContent = obs.fieldNote 
        ? `${obs.fieldNote} — Recorded as a study note. Real-world outdoor exploration unlocks Sanctuary materials.`
        : 'Recorded in your Field Journal as a study note. Real-world outdoor discoveries unlock living Sanctuary materials.';
    }

    if (rewardBox) {
      rewardBox.className = 'p-3.5 rounded-2xl bg-linen border border-sage-border/80 shadow-xs flex items-center justify-between';
      if (rewardIcon) rewardIcon.textContent = '📓';
      if (rewardTitle) rewardTitle.textContent = 'Field Study Note';
      if (rewardSubtitle) rewardSubtitle.textContent = '0 DM · Physical exploration unlocks living items';
      if (rewardBadge) {
        rewardBadge.textContent = 'Recorded';
        rewardBadge.className = 'px-2.5 py-1 rounded-xl bg-linen text-forest border border-sage-border text-[10px] font-heading font-bold shadow-2xs';
      }
    }

    // Primary CTA: Keep Exploring
    if (btnPrimaryText) btnPrimaryText.textContent = 'Keep Exploring';
    btnPrimary.onclick = () => {
      modal.classList.add('hidden');
      clearObservationInputs();
    };

    // Secondary CTA: Close
    btnSecondary.textContent = 'Close';
    btnSecondary.onclick = () => {
      modal.classList.add('hidden');
      clearObservationInputs();
    };

  } else if (isError) {
    // ----------------------------------------------------
    // CASE D: Local Vision Inference Failure / Offline
    // ----------------------------------------------------
    if (badgeIcon) badgeIcon.textContent = '⚠️';
    if (badgeText) badgeText.textContent = 'Inference Unavailable';

    if (descEl) {
      descEl.textContent = obs.analysisError || 'Local vision analysis could not complete. Your photograph and notes are safely kept.';
    }

    if (rewardBox) {
      rewardBox.className = 'p-3.5 rounded-2xl bg-[#FFF5F5] border border-[#FECACA] shadow-xs flex items-center justify-between';
      if (rewardIcon) rewardIcon.textContent = '🍃';
      if (rewardTitle) rewardTitle.textContent = 'Analysis Incomplete';
      if (rewardSubtitle) rewardSubtitle.textContent = '0 DM · Photograph and field notes safely preserved';
      if (rewardBadge) {
        rewardBadge.textContent = 'Retry Available';
        rewardBadge.className = 'px-2.5 py-1 rounded-xl bg-forest text-cream text-[10px] font-heading font-bold shadow-2xs';
      }
    }

    if (btnPrimaryText) btnPrimaryText.textContent = 'Retry Discovery';
    btnPrimary.onclick = () => {
      modal.classList.add('hidden');
      handleExamineDiscovery();
    };

    btnSecondary.textContent = 'Close';
    btnSecondary.onclick = () => {
      modal.classList.add('hidden');
    };

  } else {
    // ----------------------------------------------------
    // CASE C: Insufficient Evidence or Unclear Observation
    // ----------------------------------------------------
    if (badgeIcon) badgeIcon.textContent = '🔍';
    if (badgeText) badgeText.textContent = 'Needs Closer Observation';

    if (descEl) {
      descEl.textContent = 'The camera didn\'t capture clear natural details this time. Try taking a steady photo closer to the specimen on your next walk!';
    }

    if (rewardBox) {
      rewardBox.className = 'p-3.5 rounded-2xl bg-linen border border-sage-border/80 shadow-xs flex items-center justify-between';
      if (rewardIcon) rewardIcon.textContent = '🌱';
      if (rewardTitle) rewardTitle.textContent = '0 Materials Earned';
      if (rewardSubtitle) rewardSubtitle.textContent = 'Take a closer outdoor photo next walk';
      if (rewardBadge) {
        rewardBadge.textContent = 'Pending';
        rewardBadge.className = 'px-2.5 py-1 rounded-xl bg-linen text-text-muted border border-sage-border text-[10px] font-heading font-bold shadow-2xs';
      }
    }

    if (btnPrimaryText) btnPrimaryText.textContent = 'Keep Exploring';
    btnPrimary.onclick = () => {
      modal.classList.add('hidden');
      clearObservationInputs();
    };

    btnSecondary.textContent = 'Close';
    btnSecondary.onclick = () => {
      modal.classList.add('hidden');
      clearObservationInputs();
    };
  }

  // Close X button
  if (btnCloseX) {
    btnCloseX.onclick = () => {
      modal.classList.add('hidden');
      clearObservationInputs();
    };
  }

  // Open the reveal modal
  modal.classList.remove('hidden');
}

function setObservationWalkSummary(record) {
  const textEl = document.getElementById('observe-walk-summary-text');
  if (textEl && record) {
    textEl.textContent = `Completed ${record.durationMinutes} min outdoor walk. Earned +${record.walkingPointsEarned} WP (~${record.estimatedSteps.toLocaleString()} estimated steps). Upload an observation photograph below.`;
  }
}

/* -------------------------------------------------------------------------- */
/* 4. SCREEN D: SANCTUARY HUB (LIVING 3D BOTANICAL WORLD & BUILDING HUD)     */
/* -------------------------------------------------------------------------- */
function setupSanctuaryScreen() {
  // Build Mode Toggle
  const buildToggle = document.getElementById('btn-sanctuary-build-toggle');
  const buildToolbar = document.getElementById('sanctuary-build-toolbar');
  const buildRotate = document.getElementById('btn-build-rotate');
  const buildCancel = document.getElementById('btn-build-cancel');
  const buildRotLabel = document.getElementById('build-rot-label');

  if (buildToggle) {
    buildToggle.addEventListener('click', () => {
      if (!scene) return;
      if (scene.currentMode === 'build') {
        scene.setSelectMode();
        buildToggle.classList.remove('sanctuary-hud-btn-active');
        if (buildToolbar) buildToolbar.classList.add('hidden');
        showToast('Build mode cancelled.');
      } else {
        scene.setBuildMode('house_foundation');
        buildToggle.classList.add('sanctuary-hud-btn-active');
        if (buildToolbar) buildToolbar.classList.remove('hidden');
        if (buildRotLabel) buildRotLabel.textContent = `${scene.buildRotation || 0}°`;
        showToast('Build mode: Hearthstone Foundation preview active. Click any vacant knoll tile.');
      }
    });
  }

  if (buildRotate) {
    buildRotate.addEventListener('click', () => {
      if (scene && scene.currentMode === 'build') {
        const rot = scene.rotateBuildGhost();
        if (buildRotLabel) buildRotLabel.textContent = `${rot}°`;
      }
    });
  }

  if (buildCancel) {
    buildCancel.addEventListener('click', () => {
      if (scene) scene.setSelectMode();
      if (buildToggle) buildToggle.classList.remove('sanctuary-hud-btn-active');
      if (buildToolbar) buildToolbar.classList.add('hidden');
    });
  }

  // Camera Zoom Controls for Sanctuary
  const zoomIn = document.getElementById('btn-sanctuary-zoom-in');
  const zoomOut = document.getElementById('btn-sanctuary-zoom-out');
  const zoomReset = document.getElementById('btn-sanctuary-zoom-reset');
  if (zoomIn) zoomIn.addEventListener('click', () => scene && scene.zoomIn());
  if (zoomOut) zoomOut.addEventListener('click', () => scene && scene.zoomOut());
  if (zoomReset) zoomReset.addEventListener('click', () => scene && scene.resetCamera());

  // Expedition History Drawer Toggle
  const histToggle = document.getElementById('btn-sanctuary-history-toggle');
  const histDrawer = document.getElementById('sanctuary-history-drawer');
  const closeHist = document.getElementById('btn-sanctuary-close-history');

  if (histToggle && histDrawer) {
    histToggle.addEventListener('click', () => {
      const isHidden = histDrawer.classList.toggle('hidden');
      if (!isHidden) {
        renderSanctuaryHistory();
        histToggle.classList.add('sanctuary-hud-btn-active');
      } else {
        histToggle.classList.remove('sanctuary-hud-btn-active');
      }
    });
  }

  if (closeHist && histDrawer) {
    closeHist.addEventListener('click', () => {
      histDrawer.classList.add('hidden');
      if (histToggle) histToggle.classList.remove('sanctuary-hud-btn-active');
    });
  }

  // Sanctuary Inspect Drawer Close
  const closeInspect = document.getElementById('btn-sanctuary-close-inspect');
  if (closeInspect) {
    closeInspect.addEventListener('click', () => {
      const drawer = document.getElementById('sanctuary-inspect-drawer');
      if (drawer) drawer.classList.add('hidden');
      if (scene) {
        scene.selectedPlacedId = null;
        scene.updateSelectionIndicator();
      }
    });
  }

  // Canvas Drag & Drop listeners for Sanctuary Garden
  const sanctuaryCanvas = document.getElementById('sanctuary-canvas');
  if (sanctuaryCanvas) {
    sanctuaryCanvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (activeDragItemId && sanctuaryScene) {
        sanctuaryScene.handleExternalDragOver(e.clientX, e.clientY, activeDragItemId);
      }
    });

    sanctuaryCanvas.addEventListener('dragleave', () => {
      if (sanctuaryScene) sanctuaryScene.clearHover();
    });

    sanctuaryCanvas.addEventListener('drop', (e) => {
      e.preventDefault();
      const itemId = e.dataTransfer.getData('text/plain') || activeDragItemId;
      if (itemId && sanctuaryScene) {
        const result = sanctuaryScene.handleExternalDrop(e.clientX, e.clientY, itemId);
        handleWorldObjectPlaced(result);
      }
      activeDragItemId = null;
    });
  }

  // Inventory Tray Toggle (Minimize / Expand)
  const toggleTrayBtn = document.getElementById('btn-toggle-inventory-tray');
  const trayContainer = document.getElementById('sanctuary-inventory-tray');
  const trayText = document.getElementById('inventory-tray-toggle-text');

  if (toggleTrayBtn && trayContainer) {
    toggleTrayBtn.addEventListener('click', () => {
      const isHidden = trayContainer.classList.toggle('hidden');
      if (trayText) {
        trayText.textContent = isHidden ? '▲ Expand' : '▼ Minimize';
      }
    });
  }

  renderSanctuaryInventoryTray();
  renderSanctuaryHistory();
}

function updateSanctuaryHUD() {
  const nameEl = document.getElementById('sanctuary-hud-world-name');
  if (nameEl) nameEl.textContent = 'Your Sanctuary';
}

function renderSanctuaryInventoryTray() {
  const tray = document.getElementById('sanctuary-inventory-tray');
  const countBadge = document.getElementById('sanctuary-inventory-pill');
  if (!tray) return;

  const entries = Object.entries(state.earnedInventory || {}).filter(([_, qty]) => qty > 0);
  const totalCount = entries.reduce((acc, [_, qty]) => acc + qty, 0);

  if (countBadge) countBadge.textContent = `${totalCount} ${totalCount === 1 ? 'Item' : 'Items'}`;

  if (entries.length === 0) {
    tray.innerHTML = `
      <div class="flex items-center gap-3 px-3 py-2 rounded-2xl bg-cream-warm/80 border border-sage-border text-xs text-text-muted">
        <span>🎒 No unplaced items in backpack.</span>
        <button class="nav-screen-btn px-3 py-1 rounded-full bg-forest text-cream text-[11px] font-heading font-extrabold hover:bg-forest-deep transition-colors cursor-pointer" data-screen="walk">
          Take a Walk →
        </button>
      </div>
    `;
    return;
  }

  tray.innerHTML = entries.map(([itemId, qty]) => {
    const meta = state.getCatalogueItem(itemId);
    if (!meta) return '';

    return `
      <button 
        type="button"
        class="sanctuary-inv-card shrink-0 p-2 sm:p-2.5 rounded-2xl flex flex-col justify-between w-28 h-20 text-left select-none relative cursor-pointer"
        draggable="true"
        data-item-id="${itemId}"
      >
        <div class="flex items-start justify-between w-full">
          <span class="text-xl leading-none">${meta.icon}</span>
          <span class="px-2 py-0.5 rounded-full bg-mint-soft text-[10px] font-heading font-black text-forest border border-mint leading-none">
            ×${qty}
          </span>
        </div>
        <div class="w-full">
          <div class="font-heading font-extrabold text-[11px] text-forest truncate leading-tight">${meta.name}</div>
          <div class="text-[9px] text-fern font-semibold">Tap / Drag to place</div>
        </div>
      </button>
    `;
  }).join('');

  // Attach click and drag to place
  tray.querySelectorAll('.sanctuary-inv-card').forEach(card => {
    const itemId = card.getAttribute('data-item-id');
    const meta = state.getCatalogueItem(itemId);

    card.addEventListener('dragstart', (e) => {
      tray.querySelectorAll('.sanctuary-inv-card').forEach(c => c.classList.remove('sanctuary-inv-card-active'));
      card.classList.add('sanctuary-inv-card-active');
      activeDragItemId = itemId;
      e.dataTransfer.setData('text/plain', itemId);
      e.dataTransfer.effectAllowed = 'copy';
      if (sanctuaryScene) sanctuaryScene.setPlaceMode(itemId);
    });

    card.addEventListener('dragend', () => {
      activeDragItemId = null;
      if (sanctuaryScene && sanctuaryScene.currentMode === 'drag') {
        sanctuaryScene.setSelectMode();
        tray.querySelectorAll('.sanctuary-inv-card').forEach(c => c.classList.remove('sanctuary-inv-card-active'));
      }
    });

    card.addEventListener('click', () => {
      if (!scene) return;
      const isAlreadyActive = card.classList.contains('sanctuary-inv-card-active');

      tray.querySelectorAll('.sanctuary-inv-card').forEach(c => c.classList.remove('sanctuary-inv-card-active'));

      if (isAlreadyActive) {
        scene.setSelectMode();
        showToast('Placement cancelled.');
      } else {
        card.classList.add('sanctuary-inv-card-active');
        scene.setPlaceMode(itemId);
        showToast(`Placing ${meta?.name || 'Item'}: Click any vacant terrain tile.`);
      }
    });
  });
}

function renderSanctuaryHistory() {
  const container = document.getElementById('sanctuary-activity-list');
  if (!container) return;

  const acts = state.activities || [];
  if (acts.length === 0) {
    container.innerHTML = '<div class="text-xs text-text-muted font-heading font-bold py-6 text-center">No recent activity yet. Take a walk to begin!</div>';
    return;
  }

  container.innerHTML = acts.slice(0, 10).map(act => {
    const icon = act.type === 'walk' ? '🥾' : act.type === 'observation' ? '💎' : act.type === 'upgrade' ? '⭐' : '🔨';
    return `
      <div class="p-2.5 rounded-2xl bg-cream-warm/80 border border-sage-border/80 space-y-0.5">
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5">
            <span>${icon}</span>
            <span class="font-heading font-extrabold text-forest text-[11px]">${act.title}</span>
          </div>
          <span class="text-[9px] font-heading font-bold text-text-muted">${act.timestamp}</span>
        </div>
        <p class="text-[10px] text-text-muted leading-relaxed pl-5">${act.detail}</p>
      </div>
    `;
  }).join('');
}

function handleWorldBuildCompleted(result) {
  if (result.success) {
    showToast(result.message, 'success');
    const buildToolbar = document.getElementById('sanctuary-build-toolbar');
    const buildToggle = document.getElementById('btn-sanctuary-build-toggle');
    if (buildToolbar) buildToolbar.classList.add('hidden');
    if (buildToggle) buildToggle.classList.remove('sanctuary-hud-btn-active');
    if (scene) scene.setSelectMode();
    renderSanctuaryInventoryTray();
    renderSanctuaryHistory();
  } else {
    showToast(result.message, 'warning');
  }
}

// Proxies for backwards compatibility with any existing calls
function renderHubInventory() {
  renderSanctuaryInventoryTray();
}

function renderHubActivity() {
  renderSanctuaryHistory();
}

/* -------------------------------------------------------------------------- */
/* 5. SCREEN E: THE WILDS (EXPANSIVE EXPLORATION RESERVE & 3D LANDMARKS)      */
/* -------------------------------------------------------------------------- */
function setupWorldScreen() {
  // Return to Sanctuary button
  const worldExitBtn = document.getElementById('btn-world-exit');
  if (worldExitBtn) {
    worldExitBtn.addEventListener('click', () => navigateToScreen('sanctuary'));
  }

  // Camera Zoom Controls for The Wilds
  const zoomIn = document.getElementById('btn-zoom-in');
  const zoomOut = document.getElementById('btn-zoom-out');
  const zoomReset = document.getElementById('btn-zoom-reset');

  if (zoomIn) zoomIn.addEventListener('click', () => wildernessScene && wildernessScene.zoomIn());
  if (zoomOut) zoomOut.addEventListener('click', () => wildernessScene && wildernessScene.zoomOut());
  if (zoomReset) zoomReset.addEventListener('click', () => wildernessScene && wildernessScene.resetCamera());

  // Close landmark drawer
  const closeLandmarkBtn = document.getElementById('btn-close-wild-landmark');
  if (closeLandmarkBtn) {
    closeLandmarkBtn.addEventListener('click', () => {
      const drawer = document.getElementById('wild-landmark-drawer');
      if (drawer) drawer.classList.add('hidden');
      if (wildernessScene) {
        wildernessScene.selectedLandmarkId = null;
      }
      document.querySelectorAll('#wild-waypoint-ribbon .wild-waypoint-chip').forEach(b => b.classList.remove('active'));
    });
  }

  // Waypoint Ribbon clicks
  document.querySelectorAll('#wild-waypoint-ribbon .wild-waypoint-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const landmarkId = btn.getAttribute('data-landmark-id');
      if (wildernessScene) {
        wildernessScene.focusLandmark(landmarkId);
      }
      document.querySelectorAll('#wild-waypoint-ribbon .wild-waypoint-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Mobile Touch Joystick for Walking Explorer
  setupWildernessTouchJoystick();
}

function setupWildernessTouchJoystick() {
  const joystickEl = document.getElementById('wild-touch-joystick');
  const baseEl = document.getElementById('wild-joystick-base');
  const knobEl = document.getElementById('wild-joystick-knob');
  if (!baseEl || !knobEl) return;

  let activePointerId = null;
  let baseCenter = { x: 0, y: 0 };
  const maxRadius = 34;

  // Reveal touch joystick on touchstart
  window.addEventListener('touchstart', () => {
    if (joystickEl) joystickEl.style.display = 'block';
  }, { once: true, passive: true });

  const onPointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    activePointerId = e.pointerId;
    baseEl.setPointerCapture(e.pointerId);

    const rect = baseEl.getBoundingClientRect();
    baseCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  };

  const onPointerMove = (e) => {
    if (activePointerId !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();

    const dx = e.clientX - baseCenter.x;
    const dy = e.clientY - baseCenter.y;
    const dist = Math.hypot(dx, dy);

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;

    knobEl.style.transform = `translate(${clampedX}px, ${clampedY}px)`;

    if (wildernessScene) {
      const normX = clampedX / maxRadius;
      const normY = -clampedY / maxRadius; // Upward touch is positive forward
      wildernessScene.setTouchMovement(normX, normY);
    }
  };

  const onPointerEnd = (e) => {
    if (activePointerId !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    activePointerId = null;
    try {
      baseEl.releasePointerCapture(e.pointerId);
    } catch (_) {}

    knobEl.style.transform = 'translate(0px, 0px)';
    if (wildernessScene) {
      wildernessScene.setTouchMovement(0, 0);
    }
  };

  baseEl.addEventListener('pointerdown', onPointerDown);
  baseEl.addEventListener('pointermove', onPointerMove);
  baseEl.addEventListener('pointerup', onPointerEnd);
  baseEl.addEventListener('pointercancel', onPointerEnd);
}

function handleWildernessLandmarkSelected(landmark) {
  if (!landmark) return;

  const drawer = document.getElementById('wild-landmark-drawer');
  const iconEl = document.getElementById('wild-landmark-icon');
  const titleEl = document.getElementById('wild-landmark-title');
  const biomeEl = document.getElementById('wild-landmark-biome');
  const descEl = document.getElementById('wild-landmark-desc');
  const sampleEl = document.getElementById('wild-landmark-sample-name');
  const walkBtn = document.getElementById('btn-wild-walk-to');
  const obsBtn = document.getElementById('btn-wild-observe-at');

  if (iconEl) iconEl.textContent = landmark.icon || '🌲';
  if (titleEl) titleEl.textContent = landmark.title;
  if (biomeEl) biomeEl.textContent = landmark.biome || 'Expedition Reserve';
  if (descEl) descEl.textContent = landmark.desc;
  if (sampleEl) {
    const sample = SAMPLE_OBSERVATIONS[landmark.sampleId];
    sampleEl.textContent = sample ? `Verified Discovery: ${sample.title} (${sample.category})` : 'Physical exploration landmark';
  }

  // Update active chip in ribbon
  document.querySelectorAll('#wild-waypoint-ribbon .wild-waypoint-chip').forEach(b => {
    if (b.getAttribute('data-landmark-id') === landmark.id) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  if (walkBtn) {
    walkBtn.onclick = () => {
      showToast(`Expedition route plotted toward ${landmark.title}!`);
      selectDuration(20);
      navigateToScreen('walk');
    };
  }

  if (obsBtn) {
    obsBtn.onclick = () => {
      if (landmark.sampleId) {
        selectObservationSample(landmark.sampleId);
      }
      showToast(`Inspecting field evidence for ${landmark.title}`);
      navigateToScreen('observe');
    };
  }

  if (drawer) drawer.classList.remove('hidden');
}

function renderWorldInventoryDock() {
  renderSanctuaryInventoryTray();
}

function handleWorldObjectPlaced(result) {
  if (result.success) {
    showToast(result.message, 'success');
    renderWorldInventoryDock();
    renderSanctuaryInventoryTray();
    renderSanctuaryHistory();

    const modeText = document.getElementById('world-mode-text');
    if (modeText) modeText.textContent = 'Drag an earned object from inventory below onto a vacant tile';
  } else {
    showToast(result.message, 'warning');
  }
}

function handleWorldObjectSelected(placedObject) {
  const sanctuaryDrawer = document.getElementById('sanctuary-inspect-drawer');
  const sanctuaryContent = document.getElementById('sanctuary-inspect-content');
  const worldDrawer = document.getElementById('world-inspect-drawer');
  const worldContent = document.getElementById('world-inspect-content');

  if (!placedObject) {
    if (sanctuaryDrawer) sanctuaryDrawer.classList.add('hidden');
    if (worldDrawer) worldDrawer.classList.add('hidden');
    return;
  }

  const meta = state.getCatalogueItem(placedObject.itemId);
  if (!meta) return;

  const currentTierMeta = meta.tiers[(placedObject.tier || 1) - 1] || meta.tiers[0];
  const nextTierIndex = placedObject.tier || 1;
  const nextTierMeta = meta.tiers[nextTierIndex];
  const isMaxTier = !nextTierMeta;
  const upgradeCost = meta.upgradeCost || { wp: 30, dm: 2 };
  const canAffordUpgrade = state.walkingPoints >= upgradeCost.wp && state.discoveryMaterials >= upgradeCost.dm;

  const html = `
    <div class="space-y-3">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-2xl bg-mint-soft border border-mint flex items-center justify-center text-3xl shadow-2xs">
          ${meta.icon}
        </div>
        <div>
          <h4 class="font-display font-extrabold text-lg text-forest leading-tight">${meta.name}</h4>
          <span class="text-xs font-heading font-bold text-fern">Grid (${placedObject.x}, ${placedObject.y}) · ${placedObject.rotation || 0}°</span>
        </div>
      </div>

      <div class="p-3 rounded-2xl bg-cream-warm border border-sage-border text-xs text-text-dark leading-relaxed space-y-1">
        <div class="font-heading font-extrabold text-forest">${currentTierMeta.name} (Tier ${placedObject.tier}/${meta.maxTier})</div>
        <p class="text-text-muted text-[11px]">${currentTierMeta.desc}</p>
      </div>
    </div>

    <!-- Actions -->
    <div class="space-y-2 pt-1">
      <button class="btn-inspect-action-rotate w-full py-2.5 px-3 rounded-2xl bg-cream-warm hover:bg-linen border border-sage-border text-xs font-heading font-extrabold text-forest flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs">
        <span>↻</span>
        <span>Rotate 90°</span>
      </button>

      ${!isMaxTier ? `
        <button class="btn-inspect-action-upgrade btn-tangerine-primary w-full py-2.5 px-3 text-xs font-heading font-black uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md hover:scale-102" ${!canAffordUpgrade ? 'disabled' : ''}>
          Upgrade to Tier ${placedObject.tier + 1} (${upgradeCost.wp} WP, ${upgradeCost.dm} DM)
        </button>
      ` : `
        <div class="text-xs font-display font-extrabold text-amber-800 text-center py-1.5 bg-citrus/20 rounded-xl border border-citrus/50">Max Tier Reached</div>
      `}

      <button class="btn-inspect-action-return w-full py-2.5 px-3 rounded-2xl bg-cream-warm hover:bg-red-50 border border-red-200 text-red-600 text-xs font-heading font-bold transition-colors cursor-pointer flex items-center justify-center gap-2">
        <span>🗑</span>
        <span>${placedObject.itemId === 'house_foundation' ? 'Dismantle Foundation' : 'Return to Inventory (+1)'}</span>
      </button>
    </div>
  `;

  // Update sanctuary drawer
  if (sanctuaryDrawer && sanctuaryContent) {
    sanctuaryContent.innerHTML = html;
    sanctuaryDrawer.classList.remove('hidden');
    bindInspectActions(sanctuaryDrawer, placedObject);
  }

  // Update world drawer
  if (worldDrawer && worldContent) {
    worldContent.innerHTML = html;
    worldDrawer.classList.remove('hidden');
    bindInspectActions(worldDrawer, placedObject);
  }
}

function bindInspectActions(parentEl, placedObject) {
  const rotateBtn = parentEl.querySelector('.btn-inspect-action-rotate');
  if (rotateBtn) {
    rotateBtn.addEventListener('click', () => {
      const res = state.rotateObject(placedObject.id);
      if (res.success) {
        showToast(`Rotated to ${res.object.rotation}°`);
        if (scene) scene.renderWorldFromState();
        handleWorldObjectSelected(res.object);
      }
    });
  }

  const upgradeBtn = parentEl.querySelector('.btn-inspect-action-upgrade');
  if (upgradeBtn) {
    upgradeBtn.addEventListener('click', () => {
      const res = state.upgradeObject(placedObject.id);
      if (res.success) {
        showToast(res.message, 'success');
        if (scene) scene.renderWorldFromState();
        handleWorldObjectSelected(res.object);
      } else {
        showToast(res.message, 'warning');
      }
    });
  }

  const returnBtn = parentEl.querySelector('.btn-inspect-action-return');
  if (returnBtn) {
    returnBtn.addEventListener('click', () => {
      const res = state.returnObjectToInventory(placedObject.id);
      if (res.success) {
        showToast(res.message, 'success');
        const sanctuaryDrawer = document.getElementById('sanctuary-inspect-drawer');
        const worldDrawer = document.getElementById('world-inspect-drawer');
        if (sanctuaryDrawer) sanctuaryDrawer.classList.add('hidden');
        if (worldDrawer) worldDrawer.classList.add('hidden');
        if (scene) {
          scene.selectedPlacedId = null;
          scene.renderWorldFromState();
        }
        renderWorldInventoryDock();
        renderSanctuaryInventoryTray();
        renderSanctuaryHistory();
      }
    });
  }
}

/* -------------------------------------------------------------------------- */
/* 6. SETTINGS MODAL                                                          */
/* -------------------------------------------------------------------------- */
function setupSettingsModal() {
  const modal = document.getElementById('modal-settings');
  const triggerBtn = document.getElementById('btn-settings');
  const closeBtn = document.getElementById('btn-close-settings');
  const saveBtn = document.getElementById('btn-settings-save');
  const resetBtn = document.getElementById('btn-reset-state');
  const nameInput = document.getElementById('settings-input-name');

  if (triggerBtn && modal) {
    triggerBtn.addEventListener('click', () => {
      if (nameInput) nameInput.value = state.worldName;
      modal.classList.remove('hidden');
    });
  }

  if (closeBtn && modal) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  if (saveBtn && modal) {
    saveBtn.addEventListener('click', () => {
      if (nameInput && nameInput.value.trim()) {
        state.setWorldName(nameInput.value.trim());
        showToast(`Sanctuary renamed to "${state.worldName}"`);
      }
      modal.classList.add('hidden');
    });
  }

  if (resetBtn && modal) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset all progress, walks, and inventory back to default? This cannot be undone.')) {
        state.resetToDefault();
        if (scene) scene.renderWorldFromState();
        showToast('All progress reset to default.');
        modal.classList.add('hidden');
        navigateToScreen('walk');
      }
    });
  }
}

/* -------------------------------------------------------------------------- */
/* 7. TOAST NOTIFICATIONS                                                     */
/* -------------------------------------------------------------------------- */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const isWarning = type === 'warning';
  const isSuccess = type === 'success';

  toast.className = `px-4 py-3 rounded-2xl shadow-2xl border text-xs font-heading font-extrabold transition-all transform translate-y-2 opacity-0 flex items-center gap-2.5 ${
    isWarning 
      ? 'bg-cream-card text-amber-900 border-2 border-citrus shadow-xl' 
      : isSuccess 
        ? 'bg-cream-card text-forest border-2 border-fern shadow-xl'
        : 'bg-cream-card text-forest border border-sage-border shadow-xl'
  }`;

  toast.innerHTML = `
    <span class="text-base">${isWarning ? '⚠️' : isSuccess ? '🌿' : '✨'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3200);
}
