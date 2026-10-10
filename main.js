// UNSEEN — Interactive Landing Page Logic & 3D Forest Scene Integration

import { ForestScene } from './forest-scene.js';

let forestSceneInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  initHero3D();
  initExpeditionModal();
});

/* -------------------------------------------------------------------------- */
/* 1. NAVIGATION & SCROLL HEADER                                              */
/* -------------------------------------------------------------------------- */
function initNavigation() {
  const header = document.getElementById('site-header');
  if (!header) return;
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const barsIcon = document.getElementById('menu-icon-bars');
  const closeIcon = document.getElementById('menu-icon-close');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link, .btn-mobile-begin');

  // Header scroll backdrop effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });

  // Mobile menu toggle
  let isMenuOpen = false;
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      isMenuOpen = !isMenuOpen;
      if (isMenuOpen) {
        mobileMenu.classList.remove('hidden');
        mobileMenu.classList.add('flex');
        barsIcon.classList.add('hidden');
        closeIcon.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      } else {
        closeMenu();
      }
    });
  }

  function closeMenu() {
    isMenuOpen = false;
    mobileMenu.classList.add('hidden');
    mobileMenu.classList.remove('flex');
    barsIcon.classList.remove('hidden');
    closeIcon.classList.add('hidden');
    document.body.style.overflow = '';
  }

  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });
}

/* -------------------------------------------------------------------------- */
/* 2. HERO THREE.JS 3D SCENE INITIALIZATION                                  */
/* -------------------------------------------------------------------------- */
function initHero3D() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  forestSceneInstance = new ForestScene(canvas);
}

/* -------------------------------------------------------------------------- */
/* 3. DISCOVERY ATLAS — INTERACTIVE TERRAIN MAP & FIELD NOTES                 */
/* -------------------------------------------------------------------------- */
function initDiscoveryAtlas() {
  const pinButtons = document.querySelectorAll('.atlas-pin');
  if (!pinButtons || pinButtons.length === 0) return;
  const panel = document.getElementById('field-note-panel');
  const closeBtn = document.getElementById('panel-close-btn');

  // Panel element refs
  const panelPinId = document.getElementById('panel-pin-id');
  const panelTitle = document.getElementById('panel-title');
  const panelDescA = document.getElementById('panel-desc-a');
  const panelDescB = document.getElementById('panel-desc-b');
  const panelHypothesis = document.getElementById('panel-hypothesis');
  const panelObjective = document.getElementById('panel-objective');
  const panelStatusBadge = document.getElementById('panel-status-badge');

  // Observation Dataset
  const pinsData = {
    '01': {
      title: 'Overgrown Stone Archway',
      descA: '"Weathered mortar archway with dense ivy rootlets spanning a dry drainage embankment."',
      descB: '"Matching cut-granite foundation wall 120 metres south along the tree line."',
      hypothesis: 'The archway and stone foundation may belong to the same 19th-century mill raceway infrastructure.',
      objective: 'Walk 80m south along the dry embankment. Search for a third stone culvert marker before the footbridge.',
      status: 'PLAUSIBLE',
      statusClass: 'bg-earth/20 text-earth border-earth/30'
    },
    '02': {
      title: 'Concrete Drainage Channel',
      descA: '"Concrete drainage channel with parallel alignment alongside paved access road."',
      descB: '"Concrete drainage channel section running down sidewalk center."',
      hypothesis: 'Both observations identify connected municipal storm drainage infrastructure.',
      objective: 'Follow the paved channel 100m west to inspect the main outfall junction.',
      status: 'PLAUSIBLE',
      statusClass: 'bg-earth/20 text-earth border-earth/30'
    },
    '03': {
      title: 'Weathered Survey Marker',
      descA: '"Brass USGS benchmark disk stamped \'ELEV 240\' set in granite boulder."',
      descB: '"Paved trail bend near wooden footbridge."',
      hypothesis: 'No specific structural connection. Benchmark indicates elevation boundary line.',
      objective: 'Find another visible object within 100 metres that clearly relates to either Observation A or B.',
      status: 'INSUFFICIENT',
      statusClass: 'bg-sage/20 text-sage border-sage/30'
    },
    '04': {
      title: 'Canopy Stream Culvert',
      descA: '"Stacked basalt stone culvert directing stream flow beneath gravel access road."',
      descB: '"Dry creekbed with rounded river stones 50m upstream."',
      hypothesis: 'The culvert and dry creekbed are part of the seasonal Fallenbrooke stream network.',
      objective: 'Walk 50m upstream to locate the main spring outlet behind the mossy cliff.',
      status: 'PLAUSIBLE',
      statusClass: 'bg-earth/20 text-earth border-earth/30'
    }
  };

  pinButtons.forEach(pinBtn => {
    pinBtn.addEventListener('click', () => {
      const pinId = pinBtn.dataset.pin;
      const data = pinsData[pinId];

      if (!data) return;

      // Highlight active pin
      pinButtons.forEach(b => b.classList.remove('active'));
      pinBtn.classList.add('active');

      // Update Panel Content
      if (panelPinId) panelPinId.textContent = `PIN ${pinId}`;
      if (panelTitle) panelTitle.textContent = data.title;
      if (panelDescA) panelDescA.textContent = data.descA;
      if (panelDescB) panelDescB.textContent = data.descB;
      if (panelHypothesis) panelHypothesis.textContent = data.hypothesis;
      if (panelObjective) panelObjective.textContent = data.objective;
      if (panelStatusBadge) panelStatusBadge.textContent = data.status;

      // Open Panel
      if (panel) panel.classList.add('open');
    });
  });

  // Close Panel
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (panel) panel.classList.remove('open');
      pinButtons.forEach(b => b.classList.remove('active'));
    });
  }

  // Zoom Controls
  const mapSvg = document.getElementById('atlas-svg-map');
  const zoomInBtn = document.getElementById('atlas-zoom-in');
  const zoomOutBtn = document.getElementById('atlas-zoom-out');
  let currentZoom = 1;

  if (zoomInBtn && zoomOutBtn && mapSvg) {
    zoomInBtn.addEventListener('click', () => {
      if (currentZoom < 1.4) {
        currentZoom += 0.15;
        mapSvg.style.transform = `scale(${currentZoom})`;
        mapSvg.style.transformOrigin = 'center center';
        mapSvg.style.transition = 'transform 0.3s ease';
      }
    });

    zoomOutBtn.addEventListener('click', () => {
      if (currentZoom > 0.85) {
        currentZoom -= 0.15;
        mapSvg.style.transform = `scale(${currentZoom})`;
        mapSvg.style.transformOrigin = 'center center';
        mapSvg.style.transition = 'transform 0.3s ease';
      }
    });
  }
}

/* -------------------------------------------------------------------------- */
/* 4. EVIDENCE GATE SIMULATOR                                                 */
/* -------------------------------------------------------------------------- */
function initEvidenceGateSimulator() {
  const select = document.getElementById('sim-pair-select');
  const decisionBadge = document.getElementById('sim-gate-decision');
  const reasonText = document.getElementById('sim-gate-reason');

  if (!select) return;

  const simData = {
    'pair-01': {
      decision: 'INSUFFICIENT',
      decisionClass: 'bg-sage/20 text-sage',
      reason: 'Both descriptions mention road signs, but no specific shared relationship between the observations is established. Vague category overlap is rejected.'
    },
    'pair-02': {
      decision: 'PLAUSIBLE',
      decisionClass: 'bg-earth text-mist',
      reason: 'Both descriptions identify drainage infrastructure, though the exact same physical drainage system is unconfirmed.'
    },
    'pair-03': {
      decision: 'PLAUSIBLE',
      decisionClass: 'bg-earth text-mist',
      reason: 'Shared sculptural installation features verified by spatial alignment.'
    },
    'pair-07': {
      decision: 'INSUFFICIENT',
      decisionClass: 'bg-sage/20 text-sage',
      reason: 'Park bench and flock of birds are unrelated observations. Gate triggers safe fallback objective.'
    }
  };

  select.addEventListener('change', (e) => {
    const key = e.target.value;
    const item = simData[key];
    if (!item) return;

    if (decisionBadge) {
      decisionBadge.textContent = item.decision;
      decisionBadge.className = `px-3 py-1 rounded-full text-xs font-mono font-bold ${item.decisionClass}`;
    }
    if (reasonText) reasonText.textContent = item.reason;
  });
}

/* -------------------------------------------------------------------------- */
/* 5. EXPEDITION MODAL                                                        */
/* -------------------------------------------------------------------------- */
function initExpeditionModal() {
  const modal = document.getElementById('expedition-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const cancelBtn = document.getElementById('modal-cancel-btn');
  const startBtn = document.getElementById('modal-start-btn');
  
  const triggerBtns = document.querySelectorAll(
    '#hero-cta-primary, #nav-begin-btn, .btn-mobile-begin, .btn-panel-action, .hero-node'
  );

  triggerBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  const finalCta = document.getElementById('final-cta-btn');
  if (finalCta) {
    finalCta.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/dashboard.html#walk';
    });
  }

  function closeModal() {
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  [closeBtn, cancelBtn].forEach(b => {
    if (b) b.addEventListener('click', closeModal);
  });

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      alert('Local Expedition Preview: UNSEEN is evaluating local vision inference models on your device. Take a walk outside and observe your surroundings!');
      closeModal();
    });
  }
}

/* -------------------------------------------------------------------------- */
/* 6. PHONE IN POCKET TOGGLE                                                  */
/* -------------------------------------------------------------------------- */
function initPhoneToggle() {
  const btn = document.getElementById('phone-toggle-btn');
  const statusText = document.getElementById('phone-status-text');

  if (!btn) return;

  let isPocket = true;

  btn.addEventListener('click', () => {
    isPocket = !isPocket;
    if (isPocket) {
      if (statusText) statusText.textContent = 'STATUS: PHONE IN POCKET';
      btn.classList.remove('bg-earth/40');
      btn.classList.add('bg-moss/40');
    } else {
      if (statusText) statusText.textContent = 'STATUS: OBSERVING SURROUNDINGS';
      btn.classList.remove('bg-moss/40');
      btn.classList.add('bg-earth/40');
    }
  });
}
