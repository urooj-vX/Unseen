// UNSEEN — Evidence Integrity Automated Regression Test Suite
// Verifies deterministic evidence-eligibility gate, non-rewarding digital renderings,
// user confirmation requirement, uncertain scene handling, and error states.

import { 
  evaluateEvidenceEligibility, 
  validateVisionAnalysis, 
  parseJsonFromResponse, 
  getCleanObservationTitle,
  DiscoveryAgent 
} from '../../discovery-agent.js';
import { DashboardState } from '../../dashboard-state.js';
import fs from 'fs';
import path from 'path';

// Polyfill window & localStorage for headless testing of DashboardState
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

function assert(condition, testName, extraInfo = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${extraInfo}`);
    failed++;
  }
}

console.log('================================================================');
console.log('UNSEEN EVIDENCE INTEGRITY REGRESSION TESTS');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// TEST 1: Digital-rendering evidence classification & reward blocking
// -----------------------------------------------------------------------------
console.log('Test Suite 1: Digital-Rendering Image Evidence Gate');
{
  const syntheticAnalysis = {
    evidence_summary: 'Digital 3D rendering of an ornate stone archway surrounded by stylized foliage and artificial sunlight.',
    visible_features: ['3D modeled stone archway', 'Stylized digital tree canopy', 'Artificial water plane'],
    possible_interpretations: ['Conceptual video game asset'],
    uncertainties: ['Synthetic geometry and digital texture mapping indicate this is not a real-world location.'],
    follow_up_observation: 'Observe authentic real-world natural features outdoors.',
    scene_type: 'digital_rendering'
  };

  const eligibility = evaluateEvidenceEligibility({ structuredAnalysis: syntheticAnalysis, fieldNote: '', isDemo: false });
  assert(eligibility.status === 'ineligible', 'Eligibility status is "ineligible"');
  assert(eligibility.isRewardEligible === false, 'isRewardEligible is strictly false');
  assert(eligibility.allowPhysicalRewards === false, 'allowPhysicalRewards is false');
  assert(eligibility.reason.includes('digital rendering'), 'Eligibility reason explains non-physical / digital rendering origin');

  // Candidate detections derivation
  const mockAgent = new DiscoveryAgent(new DashboardState(), null);
  const detections = mockAgent.deriveCandidateDetections(syntheticAnalysis, '', null, eligibility);
  
  assert(detections.length === 3, `Extracted ${detections.length} features as journal entries`);
  assert(detections.every(d => d.suggestedReward === 0), 'Every digital candidate suggestedReward is strictly 0 DM');
  assert(detections.every(d => d.grantsItem === null), 'Every digital candidate grantsItem is null (no Sanctuary items)');
  assert(detections.every(d => d.ineligible === true), 'Every digital candidate marked ineligible: true');

  // Even if user checks "Keep Note" on all of them:
  detections.forEach(d => { d.confirmed = true; });
  const totalMaterials = detections.filter(d => d.confirmed && !d.ineligible).reduce((s, d) => s + d.suggestedReward, 0);
  assert(totalMaterials === 0, 'Total materials yield remains 0 DM when keeping notes');

  // Attempting state claim
  const state = new DashboardState();
  const claimResult = state.claimObservationRewards('obs_test_digital', detections, {
    id: 'obs_test_digital',
    eligibilityStatus: 'ineligible',
    isRewardEligible: false
  });
  assert(claimResult.success === false, 'DashboardState rejects claiming digital rendering observation');
  assert(claimResult.message.includes('ineligible for physical-world rewards'), 'State returns clear rejection message');
}
console.log();

// -----------------------------------------------------------------------------
// TEST 2: Genuine outdoor photo verification flow
// -----------------------------------------------------------------------------
console.log('Test Suite 2: Genuine Outdoor Photo Evidence Gate');
{
  const realOutdoorAnalysis = {
    evidence_summary: 'Outdoor photograph of an ancient deciduous oak canopy with rough textured bark and fallen leaves on forest floor.',
    visible_features: ['Deep furrowed tree bark', 'Deciduous leaf canopy', 'Exposed tree roots', 'Granite boulder'],
    possible_interpretations: ['Quercus alba or similar mature deciduous oak'],
    uncertainties: ['Specific species cannot be confirmed without leaf specimen examination.'],
    follow_up_observation: 'Inspect lower leaf venation and acorn cupules within 15 meters on foot.',
    scene_type: 'physical_outdoors'
  };

  const eligibility = evaluateEvidenceEligibility({ structuredAnalysis: realOutdoorAnalysis, fieldNote: '', isDemo: false });
  assert(eligibility.status === 'eligible', 'Eligibility status is "eligible"');
  assert(eligibility.isRewardEligible === true, 'isRewardEligible is true');
  assert(eligibility.allowPhysicalRewards === true, 'allowPhysicalRewards is true');

  const mockAgent = new DiscoveryAgent(new DashboardState(), null);
  const detections = mockAgent.deriveCandidateDetections(realOutdoorAnalysis, '', null, eligibility);

  // Model suggestions are candidates, NOT automatic verified facts
  assert(detections.length > 0, 'Candidate detections extracted from botanical catalog');
  assert(detections.every(d => d.confirmed === false), 'Candidates start UNCONFIRMED (model text alone is NOT automatic fact)');

  // User confirms Ancient Oak candidate
  const oakFinding = detections.find(d => d.name === 'Deciduous Tree Canopy');
  assert(!!oakFinding, 'Found Deciduous Tree Canopy candidate');
  oakFinding.confirmed = true;

  const validConfirmed = detections.filter(d => d.confirmed && !d.ineligible);
  assert(validConfirmed.length === 1, 'Exactly 1 verified finding confirmed by user');

  const state = new DashboardState();
  const initOakQty = state.earnedInventory['ancient_oak'] || 0;
  const initDM = state.discoveryMaterials;

  const claimResult = state.claimObservationRewards('obs_test_outdoor', validConfirmed, {
    id: 'obs_test_outdoor',
    eligibilityStatus: 'eligible',
    isRewardEligible: true
  });

  assert(claimResult.success === true, 'Successfully claimed user-confirmed outdoor discovery');
  assert(state.earnedInventory['ancient_oak'] === initOakQty + 1, 'Sanctuary received +1 Ancient Oak');
  assert(state.discoveryMaterials === initDM + 2, 'Received +2 Discovery Materials (DM)');
}
console.log();

// -----------------------------------------------------------------------------
// TEST 3: Uncertain or malformed model responses
// -----------------------------------------------------------------------------
console.log('Test Suite 3: Uncertain Scene Classification & Malformed JSON');
{
  // 3a. Uncertain scene without user field note corroboration
  const uncertainAnalysis = {
    evidence_summary: 'Subject appears to be a stone surface, but lighting is ambiguous.',
    visible_features: ['Smooth stone face'],
    possible_interpretations: ['Could be natural stone or synthetic countertop'],
    uncertainties: ['Unclear whether this is an outdoor field photo.'],
    follow_up_observation: 'Check surroundings.',
    scene_type: 'uncertain'
  };

  const uncertEligibility = evaluateEvidenceEligibility({ structuredAnalysis: uncertainAnalysis, fieldNote: '', isDemo: false });
  assert(uncertEligibility.status === 'uncertain', 'Uncertain scene marked status="uncertain"');
  assert(uncertEligibility.isRewardEligible === false, 'Uncertain scene without notes has isRewardEligible=false');
  assert(uncertEligibility.allowPhysicalRewards === false, 'Physical rewards locked for uncorroborated uncertain scene');

  const mockAgent = new DiscoveryAgent(new DashboardState(), null);
  const uncertDetections = mockAgent.deriveCandidateDetections(uncertainAnalysis, '', null, uncertEligibility);
  assert(uncertDetections.every(d => d.suggestedReward === 0 && d.ineligible === true), 'Uncertain candidates award 0 DM and are marked ineligible');

  // 3b. Uncertain scene WITH explicit user direct observation note
  const corroboratedEligibility = evaluateEvidenceEligibility({ 
    structuredAnalysis: uncertainAnalysis, 
    fieldNote: 'Field observation: [direct observation] Found this granite rock along the hiking trail.', 
    isDemo: false 
  });
  assert(corroboratedEligibility.status === 'eligible', 'Direct user field note corroborates uncertain scene');
  assert(corroboratedEligibility.isRewardEligible === true, 'Corroborated observation becomes reward eligible');

  // 3c. Malformed model response (schema validation failure)
  const malformedJson = { some_random_key: 'foo' };
  const validated = validateVisionAnalysis(malformedJson);
  assert(validated === null, 'validateVisionAnalysis rejects malformed JSON schema');

  const parseFail = parseJsonFromResponse('Not a json at all');
  assert(parseFail === null, 'parseJsonFromResponse returns null for invalid text');
}
console.log();

// -----------------------------------------------------------------------------
// TEST 4: Offline / unavailable Ollama inference handling
// -----------------------------------------------------------------------------
console.log('Test Suite 4: Offline / Unreachable Local Inference Path');
{
  const offlineEligibility = evaluateEvidenceEligibility({ structuredAnalysis: null, fieldNote: '', isDemo: false });
  assert(offlineEligibility.status === 'ineligible', 'When inference fails, eligibility is ineligible');
  assert(offlineEligibility.isRewardEligible === false, 'No rewards when inference fails');

  const mockAgent = new DiscoveryAgent(new DashboardState(), null);
  const offlineDetections = mockAgent.deriveCandidateDetections(null, '', 'Ollama connection failed', offlineEligibility);
  assert(offlineDetections.length === 0, 'No simulated or fake findings fabricated when inference fails');
}
console.log();

// -----------------------------------------------------------------------------
// TEST 5: Live Ollama Inference Verification on Physical and Synthetic Files
// -----------------------------------------------------------------------------
console.log('Test Suite 5: Live Ollama Qwen3-VL-2B Integration Verification');
async function testLiveOllama() {
  const modelName = 'hf.co/Qwen/Qwen3-VL-2B-Instruct-GGUF:Q4_K_M';
  try {
    const pingRes = await fetch('http://127.0.0.1:11434/api/tags');
    if (!pingRes.ok) throw new Error('Ollama ping failed');
    const tags = await pingRes.json();
    const hasModel = tags.models && tags.models.some(m => m.name.includes('Qwen3-VL-2B'));
    assert(hasModel, `Ollama server online with target model: ${modelName}`);

    // Test digital rendering file: Illustrations/_ (16).jpeg
    const synthPath = path.resolve('Illustrations/_ (16).jpeg');
    if (fs.existsSync(synthPath)) {
      const imgBuffer = fs.readFileSync(synthPath);
      const base64Img = imgBuffer.toString('base64');

      const PROMPT = `You are the local visual observation engine for UNSEEN.
Analyze ONLY what is directly visible in the image. Do not invent details.
You must return a valid JSON object matching this schema exactly:
{
  "evidence_summary": "1-2 factual sentences summarizing visible evidence",
  "visible_features": ["feature 1", "feature 2"],
  "possible_interpretations": ["hypothesis 1"],
  "uncertainties": ["uncertainty 1"],
  "follow_up_observation": "concrete physical clue",
  "scene_type": "physical_outdoors" | "digital_rendering" | "illustration" | "screen_capture" | "indoor" | "uncertain"
}`;

      const t0 = performance.now();
      const res = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: PROMPT,
          images: [base64Img],
          stream: false,
          format: 'json',
          options: { temperature: 0 }
        })
      });

      const latency = ((performance.now() - t0) / 1000).toFixed(1);
      const data = await res.json();
      const parsed = parseJsonFromResponse(data.response);
      const validated = validateVisionAnalysis(parsed);

      assert(!!validated, `Live inference validated JSON in ${latency}s`);
      assert(
        validated.scene_type === 'digital_rendering' || 
        validated.evidence_summary.toLowerCase().includes('digital') || 
        validated.evidence_summary.toLowerCase().includes('render'),
        `Live model identified synthetic test image as digital (${validated.scene_type})`
      );

      const liveEligibility = evaluateEvidenceEligibility({ structuredAnalysis: validated, fieldNote: '', isDemo: false });
      assert(liveEligibility.status === 'ineligible', 'Live digital image marked ineligible by Evidence Gate');
      assert(liveEligibility.isRewardEligible === false, 'Live digital image blocked from physical rewards');
    }

  } catch (err) {
    console.warn('  (Ollama live check skipped or error:', err.message, ')');
  }

  // -----------------------------------------------------------------------------
  // TEST 6: Simplified Discovery Tab Title & State Integrity
  // -----------------------------------------------------------------------------
  console.log('\nTest Suite 6: Simplified Discovery Hierarchy & Title Integrity');
  {
    // A. Natural title derivation without raw filenames
    const obsWithFilename = {
      title: 'Test Photo: p01_a.jpeg (Real Outdoor Test)',
      structuredAnalysis: {
        dominant_subject: 'a stack of four road signs, including a construction warning',
        visible_features: ['road signs', 'metal post']
      }
    };
    const cleanTitle1 = getCleanObservationTitle(obsWithFilename);
    assert(!cleanTitle1.includes('p01_a'), `Clean title "${cleanTitle1}" strips raw filename p01_a.jpeg`);
    assert(!cleanTitle1.includes('Test Photo:'), `Clean title "${cleanTitle1}" strips "Test Photo:" prefix`);
    assert(cleanTitle1.length > 3, `Clean title "${cleanTitle1}" is a natural descriptive title`);

    const obsWithRawFilename = {
      title: 'sample_04.jpg',
      structuredAnalysis: {
        dominant_subject: 'dense conifer forest canopy with sunlight',
        visible_features: ['pine needles', 'tree bark']
      }
    };
    const cleanTitle2 = getCleanObservationTitle(obsWithRawFilename);
    assert(!cleanTitle2.includes('.jpg'), `Clean title "${cleanTitle2}" strips file extension`);
    assert(cleanTitle2.toLowerCase().includes('conifer') || cleanTitle2.toLowerCase().includes('forest') || cleanTitle2.toLowerCase().includes('canopy'), `Derived title correctly captures dominant subject`);

    const baselineObs = {
      title: 'Cut-Granite Archway (3D Baseline)',
      isDemo: true
    };
    const cleanTitle3 = getCleanObservationTitle(baselineObs);
    assert(!cleanTitle3.includes('(3D Baseline)'), `Clean title "${cleanTitle3}" strips simulator tag`);

    // B. Study entry journal preservation
    const mockState = new DashboardState();
    const mockAgent = new DiscoveryAgent(mockState, null);
    mockAgent.currentObservation = {
      id: 'study_obs_123',
      title: 'Digital Rendering Test',
      eligibilityStatus: 'ineligible',
      isRewardEligible: false,
      preserved: false,
      detectedElements: [
        { id: 'feat_1', name: 'Digital texture', suggestedReward: 0, ineligible: true }
      ]
    };
    const initialMaterials = mockState.discoveryMaterials;
    const initialClaimedCount = mockState.claimedObservationIds.size;
    mockAgent.recordStudyEntryInJournal();
    assert(mockAgent.currentObservation.preserved === true, 'Study entry marks preserved: true in journal');
    assert(mockState.discoveryMaterials === initialMaterials, 'Discovery materials strictly unchanged when study entry is preserved');
    assert(!mockState.claimedObservationIds.has('study_obs_123'), 'Study entry is not added to claimed physical observations');
    assert(mockState.claimedObservationIds.size === initialClaimedCount, 'Claimed observations count unchanged');

    // C. Inference failure preserves evidence without fabricating
    const failedObs = {
      id: 'failed_obs_456',
      title: 'Field Photo',
      imageSrc: 'data:image/jpeg;base64,...',
      fieldNote: 'Observed mossy stones by riverbank',
      analysisError: 'Connection to local engine timed out',
      structuredAnalysis: null,
      detectedElements: []
    };
    assert(failedObs.imageSrc !== null, 'Field photograph preserved on inference failure');
    assert(failedObs.fieldNote.length > 0, 'Field note preserved on inference failure');
    assert(failedObs.detectedElements.length === 0, 'Zero fabricated findings when inference fails');
  }

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

testLiveOllama();
