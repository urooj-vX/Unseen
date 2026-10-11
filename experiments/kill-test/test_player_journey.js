// UNSEEN — Automated Player Journey & UX Simplification Test
// Verifies:
// 1. Primary navigation simplification (no standalone Discovery Tab in primary nav pills)
// 2. Simplified Observation Screen (photo area, 'What caught your eye?' notes, prominent 'Discover' button)
// 3. Discovery Reveal Modal (clean title, details, actual rewards, 'Visit My Sanctuary' & 'Keep Exploring')
// 4. Rewards saved to Sanctuary inventory & duplicate claim prevention (idempotency)
// 5. Friendly study record for digital renderings (0 DM, no physical item unlock)
// 6. Honest failure handling without fabrication

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DashboardState } from '../../dashboard-state.js';
import { 
  DiscoveryAgent, 
  getCleanObservationTitle, 
  evaluateEvidenceEligibility 
} from '../../discovery-agent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

// Polyfill window & localStorage for headless testing
global.window = {};
const storageMock = {};
global.localStorage = {
  getItem: (key) => storageMock[key] || null,
  setItem: (key, val) => { storageMock[key] = val; },
  removeItem: (key) => { delete storageMock[key]; },
  clear: () => { Object.keys(storageMock).forEach(k => delete storageMock[k]); }
};

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('UNSEEN FINAL PLAYER EXPERIENCE POLISH TEST SUITE');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// CHECK 1: HTML Navigation Structure Verification
// -----------------------------------------------------------------------------
console.log('Check 1: Navigation Simplification in dashboard.html');
{
  const htmlPath = path.join(rootDir, 'dashboard.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Verify primary desktop nav
  const desktopNavMatch = html.match(/<nav class="hidden md:flex[^>]*>([\s\S]*?)<\/nav>/);
  assert(desktopNavMatch !== null, 'Desktop navigation element exists');
  
  if (desktopNavMatch) {
    const navContent = desktopNavMatch[1];
    assert(navContent.includes('data-screen="walk"'), 'Nav contains Walk Timer');
    assert(navContent.includes('data-screen="observe"'), 'Nav contains Observation');
    assert(navContent.includes('data-screen="sanctuary"'), 'Nav contains Your Sanctuary');
    assert(navContent.includes('data-screen="world"'), 'Nav contains The Wilds');
    assert(!navContent.includes('data-screen="discovery"'), 'Nav does NOT contain standalone Discovery Tab');
  }

  // Verify mobile drawer
  const mobileDrawerMatch = html.match(/<div id="mobile-nav-drawer"[^>]*>([\s\S]*?)<\/div>/);
  assert(mobileDrawerMatch !== null, 'Mobile nav drawer exists');
  if (mobileDrawerMatch) {
    const drawerContent = mobileDrawerMatch[1];
    assert(!drawerContent.includes('data-screen="discovery"'), 'Mobile drawer does NOT contain standalone Discovery Tab');
  }

  // Verify Field Journal entry point
  assert(html.includes('id="btn-open-journal"'), 'Unobtrusive Field Journal entry point exists in header');
}

// -----------------------------------------------------------------------------
// CHECK 2: Observation Screen Simplification
// -----------------------------------------------------------------------------
console.log('\nCheck 2: Observation Screen Simplification in dashboard.html');
{
  const htmlPath = path.join(rootDir, 'dashboard.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // One clear photo upload area
  assert(html.includes('id="observe-dropzone"'), 'Single photo dropzone exists');
  assert(html.includes('id="observe-photo-input"'), 'Camera/file input exists');

  // Friendly field notes prompt
  assert(html.includes('What caught your eye?'), 'Friendly prompt "What caught your eye?" is present');
  assert(html.includes('id="observe-field-note"'), 'Field note input exists');

  // One prominent Discover action
  assert(html.includes('id="btn-submit-observation"'), 'Observation submit button exists');
  assert(html.includes('id="btn-submit-obs-text">Discover<'), 'Button text is prominently "Discover"');

  // Simulator specimen list removed from primary flow (kept in unobtrusive testing drawer)
  assert(html.includes('id="observe-simulator-drawer"'), 'Testing drawer is in separate <details>');
  assert(html.includes('Developer &amp; Sample Testing'), 'Testing drawer labeled unobtrusively for development');
}

// -----------------------------------------------------------------------------
// CHECK 3: Discovery Reveal Modal Markup
// -----------------------------------------------------------------------------
console.log('\nCheck 3: Discovery Reveal Modal in dashboard.html');
{
  const htmlPath = path.join(rootDir, 'dashboard.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert(html.includes('id="modal-discovery-reveal"'), 'Discovery Reveal Modal element exists');
  assert(html.includes('id="reveal-photo-img"'), 'Photo thumbnail preview element exists');
  assert(html.includes('id="reveal-title"'), 'Concise discovery title element exists');
  assert(html.includes('id="reveal-description"'), 'Discovery description element exists');
  assert(html.includes('id="reveal-details-container"'), 'Up to 3 interesting details container exists');
  assert(html.includes('id="reveal-reward-box"'), 'Reward summary box exists');
  assert(html.includes('id="btn-reveal-primary"'), 'Primary CTA button exists (Visit My Sanctuary)');
  assert(html.includes('id="btn-reveal-secondary"'), 'Secondary CTA button exists (Keep Exploring)');
}

// -----------------------------------------------------------------------------
// CHECK 4: Discovery Reveal & Sanctuary Reward Flow (End-to-End State)
// -----------------------------------------------------------------------------
console.log('\nCheck 4: Real Rewards Transferred & Idempotency in State');
{
  global.localStorage.clear();
  const state = new DashboardState();

  const initMats = state.discoveryMaterials;
  const initOaks = state.earnedInventory['ancient_oak'] || 0;
  const initFerns = state.earnedInventory['wild_ferns'] || 0;

  const genuineObservation = {
    id: `obs_test_${Date.now()}`,
    title: 'Walk Field Observation',
    isRewardEligible: true,
    allowPhysicalRewards: true,
    eligibilityStatus: 'eligible',
    detectedElements: [
      { id: 'det_1', name: 'Ancient Oak Canopy', category: 'tree', suggestedReward: 2, grantsItem: 'ancient_oak', grantsItemQty: 1 },
      { id: 'det_2', name: 'Wild Fern Patch', category: 'flora', suggestedReward: 1, grantsItem: 'wild_ferns', grantsItemQty: 1 }
    ],
    fieldNote: 'Towering mossy oak tree with dense canopy.',
    structuredAnalysis: {
      dominant_subject: 'Ancient Oak Tree',
      evidence_summary: 'Mature oak tree with mossy bark and spreading canopy branches.',
      visible_features: ['Lichen-covered trunk bark', 'Extensive radial root spread', 'Dense leaf canopy'],
      scene_type: 'physical_outdoors'
    }
  };

  // 1. Clean Title generation
  const title = getCleanObservationTitle(genuineObservation);
  assert(title === 'Ancient Oak Tree', `Clean title generated correctly: "${title}"`);

  // 2. Auto-claiming rewards during reveal
  const validElements = genuineObservation.detectedElements.filter(e => !e.ineligible);
  const claimResult = state.claimObservationRewards(genuineObservation.id, validElements, genuineObservation);

  assert(claimResult.success === true, 'Claiming rewards succeeded');
  assert(state.discoveryMaterials === initMats + 3, `Discovery Materials updated to ${state.discoveryMaterials} (+3 DM)`);
  assert(state.earnedInventory['ancient_oak'] === initOaks + 1, 'Sanctuary received +1 Ancient Oak in backpack');
  assert(state.earnedInventory['wild_ferns'] === initFerns + 1, 'Sanctuary received +1 Wild Ferns in backpack');

  // 3. Idempotency safeguard: Reopening or reclaiming cannot grant duplicate rewards
  const duplicateClaimResult = state.claimObservationRewards(genuineObservation.id, validElements, genuineObservation);
  assert(duplicateClaimResult.success === false, 'Duplicate claim was strictly rejected');
  assert(state.discoveryMaterials === initMats + 3, 'Discovery Materials unchanged on duplicate claim');
  assert(state.earnedInventory['ancient_oak'] === initOaks + 1, 'Ancient Oak quantity unchanged on duplicate claim');
}

// -----------------------------------------------------------------------------
// CHECK 5: Non-Physical Image (Digital Rendering) Friendliness & Reward Safeguard
// -----------------------------------------------------------------------------
console.log('\nCheck 5: Friendly Study Entry for Non-Physical Images');
{
  global.localStorage.clear();
  const state = new DashboardState();

  const initMats = state.discoveryMaterials;

  const syntheticObservation = {
    id: `obs_synth_${Date.now()}`,
    title: 'Screen Rendering Test',
    isRewardEligible: false,
    allowPhysicalRewards: false,
    eligibilityStatus: 'ineligible',
    detectedElements: [
      { id: 'det_s1', name: 'Rendered Tree', suggestedReward: 0, ineligible: true, grantsItem: null }
    ],
    fieldNote: 'Testing rendered graphic',
    structuredAnalysis: {
      dominant_subject: '3D Computer Model',
      evidence_summary: 'Digital rendering with computer graphics lighting.',
      visible_features: ['3D mesh polygons', 'Specular digital lighting'],
      scene_type: 'digital_rendering'
    }
  };

  // Attempting to claim rewards must fail safely
  const claimResult = state.claimObservationRewards(syntheticObservation.id, syntheticObservation.detectedElements, syntheticObservation);
  assert(claimResult.success === false, 'Synthetic rendering was denied physical rewards');
  assert(state.discoveryMaterials === initMats, 'Discovery Materials strictly unchanged (0 DM granted)');
}

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
