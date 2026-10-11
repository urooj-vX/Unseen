// UNSEEN — Discovery Agent Interface
// Premium Editorial Natural History Field Journal & Real-Time 3D Specimen Viewer
// Powered by On-Device Local Open-Weight Vision AI (hf.co/Qwen/Qwen3-VL-2B-Instruct-GGUF:Q4_K_M)

import { DiscoverySpecimen3D } from './discovery-scene-3d.js';

export const LOCAL_VISION_MODEL_TAG = 'hf.co/Qwen/Qwen3-VL-2B-Instruct-GGUF:Q4_K_M';

export const VISION_STRUCTURED_PROMPT = `Describe ONLY what is directly visible in this photograph. Do not guess species, geological age, ecological relationships, or causal history. Do not state assumptions as facts.

Reply with strict JSON with these exact keys:
{
  "visible_features": ["specific visible detail 1", "specific visible detail 2"],
  "scene_type": "physical_outdoors" | "digital_rendering" | "illustration" | "screen_capture" | "indoor" | "uncertain",
  "possible_interpretations": ["cautious unverified hypothesis 1"],
  "uncertainties": ["what this photograph cannot prove or establish"],
  "follow_up_observation": "one safe, realistic clue or feature to look for next on foot within 15 minutes without disturbing nature",
  "evidence_summary": "concise factual summary of visible physical elements only"
}
Output only the JSON object.`;

export function parseJsonFromResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const clean = rawText.trim();
  try {
    return JSON.parse(clean);
  } catch (err) {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
}

export function validateVisionAnalysis(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;

  const visible_features = Array.isArray(parsed.visible_features)
    ? parsed.visible_features.map(s => String(s).trim()).filter(Boolean)
    : [];

  const validSceneTypes = ['physical_outdoors', 'digital_rendering', 'illustration', 'screen_capture', 'indoor', 'uncertain'];
  let scene_type = typeof parsed.scene_type === 'string' ? parsed.scene_type.trim().toLowerCase() : 'uncertain';
  if (!validSceneTypes.includes(scene_type)) {
    scene_type = 'uncertain';
  }

  const possible_interpretations = Array.isArray(parsed.possible_interpretations)
    ? parsed.possible_interpretations.map(s => String(s).trim()).filter(Boolean)
    : (parsed.possible_interpretations ? [String(parsed.possible_interpretations).trim()] : []);

  const uncertainties = Array.isArray(parsed.uncertainties)
    ? parsed.uncertainties.map(s => String(s).trim()).filter(Boolean)
    : (parsed.uncertainties ? [String(parsed.uncertainties).trim()] : []);

  const follow_up_observation = typeof parsed.follow_up_observation === 'string' && parsed.follow_up_observation.trim()
    ? parsed.follow_up_observation.trim()
    : 'Find another visible feature within ~100m on foot without disturbing natural habitat.';

  const evidence_summary = typeof parsed.evidence_summary === 'string' && parsed.evidence_summary.trim()
    ? parsed.evidence_summary.trim()
    : (visible_features.join('. ') || '');

  if (visible_features.length === 0 && !evidence_summary) {
    return null;
  }

  return {
    visible_features,
    scene_type,
    possible_interpretations,
    uncertainties,
    follow_up_observation,
    evidence_summary
  };
}

export function generateObservationId(imageSrc, isDemo = false, sampleId = null) {
  if (isDemo) return `demo_${sampleId || 'sample'}`;
  if (!imageSrc || typeof imageSrc !== 'string') return `obs_${Date.now()}`;
  let hash = 0;
  const len = imageSrc.length;
  const step = Math.max(1, Math.floor(len / 100));
  for (let i = 0; i < len; i += step) {
    hash = ((hash << 5) - hash) + imageSrc.charCodeAt(i);
    hash |= 0;
  }
  return `obs_img_${Math.abs(hash).toString(36)}`;
}

export function evaluateEvidenceEligibility({ structuredAnalysis, fieldNote = '', isDemo = false }) {
  // If baseline demo specimen in simulator
  if (isDemo) {
    return {
      status: 'demo_baseline',
      isRewardEligible: true,
      badge: '🔬 3D Specimen Baseline',
      title: 'Simulation Reference Specimen',
      reason: 'Pre-verified 3D natural history baseline specimen. Interactive simulator study model for demonstration.',
      allowPhysicalRewards: true
    };
  }

  if (!structuredAnalysis) {
    return {
      status: 'ineligible',
      isRewardEligible: false,
      badge: '⚠️ Unverified Evidence',
      title: 'Inference Not Available',
      reason: 'Local vision analysis failed or returned malformed data. Physical discoveries cannot be verified without supporting evidence.',
      allowPhysicalRewards: false
    };
  }

  // Separate affirmative descriptions from uncertainties
  // Uncertainties list what the photograph CANNOT prove and should not be used as affirmative detection of synthetic media
  const affirmativeModelText = [
    structuredAnalysis.evidence_summary || '',
    ...(structuredAnalysis.visible_features || [])
  ].join(' ').toLowerCase();

  const allModelText = [
    affirmativeModelText,
    ...(structuredAnalysis.uncertainties || [])
  ].join(' ').toLowerCase();

  const noteLower = (fieldNote || '').toLowerCase();

  // Synthetic / digital rendering indicators
  const syntheticKeywords = [
    'digital rendering',
    'digital render',
    '3d render',
    '3d model',
    'computer-generated',
    'computer generated',
    'cgi',
    'vector graphic',
    'stylized illustration',
    'illustration',
    'screenshot',
    'screen capture',
    'video game',
    'virtual environment',
    'simulated environment',
    'not a real-world',
    'does not depict a real-world',
    'not a real location',
    'fictional',
    'synthetic image',
    'graphic design'
  ];

  const hasExplicitRenderingType = ['digital_rendering', 'illustration', 'screen_capture'].includes(structuredAnalysis.scene_type);
  const hasSyntheticKeyword = syntheticKeywords.some(kw => affirmativeModelText.includes(kw));

  // 1. Digital rendering / illustration / screen capture detected
  if (hasExplicitRenderingType || hasSyntheticKeyword) {
    return {
      status: 'ineligible',
      isRewardEligible: false,
      badge: '⛔ Ineligible for Physical Discovery Rewards',
      title: 'Non-Physical Scene / Digital Rendering',
      reason: 'Local vision analysis identified this image as a digital rendering, illustration, or synthetic screen capture. UNSEEN requires authentic real-world outdoor field evidence to grant physical-world rewards and Sanctuary additions. This entry is preserved in your field journal as a test/reference note only.',
      allowPhysicalRewards: false
    };
  }

  // 2. Indoor scene (not outdoor nature)
  if (structuredAnalysis.scene_type === 'indoor') {
    return {
      status: 'ineligible',
      isRewardEligible: false,
      badge: '⛔ Ineligible: Indoor Environment',
      title: 'Indoor Environment',
      reason: 'Physical outdoor exploration requires outdoor natural or landscape features. Indoor environments cannot grant botanical sanctuary discoveries.',
      allowPhysicalRewards: false
    };
  }

  // 3. Uncertain scene classification
  // Only consider genuinely uncertain when scene_type is 'uncertain' or affirmative text explicitly doubts authenticity.
  // Model uncertainty statements in 'uncertainties' (which report what the camera cannot prove) do not override an affirmative 'physical_outdoors' classification.
  const uncertainKeywords = [
    'uncertain if real',
    'unclear whether this is a photograph',
    'cannot determine if real'
  ];
  const hasAffirmativeUncertainKeyword = uncertainKeywords.some(kw => affirmativeModelText.includes(kw));
  const isExplicitlyUncertain = structuredAnalysis.scene_type === 'uncertain' || hasAffirmativeUncertainKeyword;

  if (isExplicitlyUncertain) {
    const hasDirectUserConfirmation = noteLower.includes('[direct observation]') || 
                                       noteLower.includes('[observed]') ||
                                       noteLower.includes('physically observed') ||
                                       noteLower.includes('observed') ||
                                       noteLower.includes('found') ||
                                       noteLower.includes('saw') ||
                                       noteLower.includes('walk') ||
                                       (noteLower.trim().length > 3 && !noteLower.includes('render') && !noteLower.includes('test'));

    if (!hasDirectUserConfirmation) {
      return {
        status: 'uncertain',
        isRewardEligible: false,
        badge: '⚠️ Authenticity Uncertain',
        title: 'Authenticity Unverified',
        reason: 'Physical-world authenticity cannot be established from photograph evidence alone. The observation remains unverified and ineligible for rewards unless accompanied by direct human field notes.',
        allowPhysicalRewards: false
      };
    } else {
      return {
        status: 'eligible',
        isRewardEligible: true,
        badge: '✓ Corroborated Outdoor Evidence',
        title: 'Corroborated Field Discovery',
        reason: 'Observation corroborated by direct human field notes. Candidate findings may be reviewed and verified.',
        allowPhysicalRewards: true
      };
    }
  }

  // 4. Eligible real-world outdoor observation
  return {
    status: 'eligible',
    isRewardEligible: true,
    badge: '✓ Physical Outdoor Evidence',
    title: 'Physical Field Observation',
    reason: 'Authentic outdoor physical observation verified. Candidate findings may be reviewed and confirmed.',
    allowPhysicalRewards: true
  };
}

export function isObservationSynthetic(obs) {
  if (!obs) return false;
  return obs.eligibilityStatus === 'ineligible' && !obs.analysisError;
}

export function getCleanObservationTitle(obs) {
  if (!obs) return 'Field Observation';

  // 1. Try dominant_subject from vision analysis
  if (obs.structuredAnalysis?.dominant_subject) {
    let sub = obs.structuredAnalysis.dominant_subject.trim();
    sub = sub.replace(/[\w-]+\.(jpe?g|png|webp|gif|bmp)/gi, '').trim();
    if (sub.length >= 3) {
      const match = sub.match(/^(?:a\b|an\b|the\b)?\s*([a-z0-9\s-]{3,40}?)(?:,\s*|\s+(?:including|with|set\s+against|against|on|in)\s+|\.|$)/i);
      const cleanSub = (match && match[1].trim().length >= 3) ? match[1].trim() : sub.slice(0, 40).trim();
      if (cleanSub.length >= 3 && !/test\s*photo/i.test(cleanSub)) {
        return cleanSub
          .replace(/^(?:a\b|an\b|the\b)\s*/i, '')
          .split(/\s+/)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
      }
    }
  }

  // 2. Try clean title if available
  if (obs.title) {
    let clean = obs.title
      .replace(/Test Photo:\s*/gi, '')
      .replace(/\(Real Outdoor Test\)/gi, '')
      .replace(/\(3D Baseline\)/gi, '')
      .replace(/[\w-]+\.(jpe?g|png|webp|gif|bmp)/gi, '')
      .replace(/[_\(\)\[\]]/g, ' ')
      .trim();
    if (clean.length >= 3 && !/test\s*photo/i.test(clean)) {
      return clean;
    }
  }

  // 3. Try clean version of detectedElements[0]
  if (obs.detectedElements && obs.detectedElements.length > 0) {
    let first = (obs.detectedElements[0].name || '').trim();
    first = first.replace(/[\w-]+\.(jpe?g|png|webp|gif|bmp)/gi, '').trim();
    if (first.length >= 3 && !/test\s*photo/i.test(first)) {
      const match = first.match(/^(?:a\b|an\b|the\b)?\s*([a-z0-9\s-]{3,40}?)(?:,\s*|\s+(?:including|with)\s+|\.|$)/i);
      const cleanFirst = (match && match[1].trim().length >= 3) ? match[1].trim() : first.slice(0, 40).trim();
      return cleanFirst
        .replace(/^(?:a\b|an\b|the\b)\s*/i, '')
        .split(/\s+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  }

  return 'Natural Field Observation';
}

export const SAMPLE_OBSERVATIONS = [
  {
    id: 'sample_archway',
    title: 'Cut-Granite Archway (3D Baseline)',
    location: 'North Meadow Boundary',
    imageSrc: null,
    isDemo: true,
    inferenceSource: '3D Simulator Specimen Baseline',
    modelName: 'Interactive 3D Study Reference',
    eligibilityStatus: 'demo_baseline',
    isRewardEligible: true,
    eligibilityBadge: '🔬 3D Specimen Baseline',
    eligibilityReason: 'Pre-verified 3D natural history baseline specimen. Interactive simulator study model for demonstration.',
    notes: 'Weathered cut-granite mortar archway with dense ivy rootlets spanning dry drainage ditch.',
    detectedElements: [
      { id: 'el_arch_1', name: 'Weathered Cut Granite Arch', category: 'Historic Masonry', evidenceStatus: 'Simulator Baseline (Interactive Study)', confirmed: true, suggestedReward: 2, grantsItem: 'stone_cairn', grantsItemName: 'Stone Cairn (x1)' },
      { id: 'el_arch_2', name: 'Living Ivy & Wild Ferns', category: 'Flora / Lichen', evidenceStatus: 'Simulator Baseline (Interactive Study)', confirmed: true, suggestedReward: 1, grantsItem: 'wild_ferns', grantsItemName: 'Wild Ferns (x1)' },
      { id: 'el_arch_3', name: 'Drainage Embankment', category: 'Terrain Feature', evidenceStatus: 'Unverified Candidate · Review needed', confirmed: false, suggestedReward: 0, grantsItem: null, grantsItemName: null }
    ]
  },
  {
    id: 'sample_stream',
    title: 'Forest Runoff Stream (3D Baseline)',
    location: 'West Creek Corridor',
    imageSrc: null,
    isDemo: true,
    inferenceSource: '3D Simulator Specimen Baseline',
    modelName: 'Interactive 3D Study Reference',
    eligibilityStatus: 'demo_baseline',
    isRewardEligible: true,
    eligibilityBadge: '🔬 3D Specimen Baseline',
    eligibilityReason: 'Pre-verified 3D natural history baseline specimen. Interactive simulator study model for demonstration.',
    notes: 'Clear shallow creek flowing over rounded river stones with aquatic fern clumps along edges.',
    detectedElements: [
      { id: 'el_str_1', name: 'Clear Glacial Stream Channel', category: 'Hydrology', evidenceStatus: 'Simulator Baseline (Interactive Study)', confirmed: true, suggestedReward: 2, grantsItem: 'stream_tile', grantsItemName: 'Forest Stream (x1)' },
      { id: 'el_str_2', name: 'Smooth River Granite Rocks', category: 'Geology', evidenceStatus: 'Simulator Baseline (Interactive Study)', confirmed: true, suggestedReward: 1, grantsItem: 'mossy_boulder', grantsItemName: 'Mossy Boulder (x1)' },
      { id: 'el_str_3', name: 'Wetland Reeds & Ferns', category: 'Flora', evidenceStatus: 'Simulator Baseline (Interactive Study)', confirmed: true, suggestedReward: 1, grantsItem: 'wild_ferns', grantsItemName: 'Wild Ferns (x1)' }
    ]
  },
  {
    id: 'sample_trailhead',
    title: 'Compacted Trailhead (3D Baseline)',
    location: 'Elder Ridge Path',
    imageSrc: null,
    isDemo: true,
    inferenceSource: '3D Simulator Specimen Baseline',
    modelName: 'Interactive 3D Study Reference',
    eligibilityStatus: 'demo_baseline',
    isRewardEligible: true,
    eligibilityBadge: '🔬 3D Specimen Baseline',
    eligibilityReason: 'Pre-verified 3D natural history baseline specimen. Interactive simulator study model for demonstration.',
    notes: 'Beaten dirt trail packed solid by walkers, winding into a cluster of evergreen trees.',
    detectedElements: [
      { id: 'el_trl_1', name: 'Compacted Earth Footpath', category: 'Pedestrian Trail', evidenceStatus: 'Simulator Baseline (Interactive Study)', confirmed: true, suggestedReward: 1, grantsItem: 'earth_trail', grantsItemName: 'Beaten Trail (x2)' },
      { id: 'el_trl_2', name: 'Mountain Evergreen Conifers', category: 'Canopy Flora', evidenceStatus: 'Simulator Baseline (Interactive Study)', confirmed: true, suggestedReward: 2, grantsItem: 'pine_cluster', grantsItemName: 'Pine Cluster (x1)' },
      { id: 'el_trl_3', name: 'Survey Milepost Marker', category: 'Trail Marker', evidenceStatus: 'Unverified Candidate · Review needed', confirmed: false, suggestedReward: 0, grantsItem: null, grantsItemName: null }
    ]
  }
];

export class DiscoveryAgent {
  constructor(state, containerEl, options = {}) {
    this.state = state || new DashboardState();
    this.containerEl = containerEl;
    this.onClaimSuccess = options.onClaimSuccess || (() => {});
    this.onGoToWorld = options.onGoToWorld || (() => {});
    this.onNavigate = options.onNavigate || (() => {});

    // Maintain current observation from state, or default to first curated specimen
    this.currentObservation = this.state.pendingObservation || JSON.parse(JSON.stringify(SAMPLE_OBSERVATIONS[0]));
    this.activeSpecimenKey = this.inferSpecimenKey(this.currentObservation);

    this.isAnalyzing = false;
    this.analysisStartTime = 0;
    this.analysisElapsed = 0;
    this.analysisInterval = null;

    this.ollamaOnline = false;
    this.activeModel = LOCAL_VISION_MODEL_TAG;

    this.specimen3D = null;

    this.checkOllamaStatus();
    this.render();
  }

  inferSpecimenKey(obs) {
    if (!obs) return 'sample_archway';
    const summaryText = obs.structuredAnalysis 
      ? (obs.structuredAnalysis.evidence_summary + ' ' + (obs.structuredAnalysis.visible_features || []).join(' ')) 
      : '';
    const combined = ((obs.title || '') + ' ' + (obs.notes || '') + ' ' + (obs.fieldNote || '') + ' ' + summaryText).toLowerCase();

    if (combined.includes('stream') || combined.includes('water') || combined.includes('creek') || combined.includes('reed') || combined.includes('brook') || combined.includes('river')) {
      return 'sample_stream';
    }
    if (combined.includes('trail') || combined.includes('path') || combined.includes('pine') || combined.includes('marker') || combined.includes('signpost') || combined.includes('footpath') || combined.includes('track')) {
      return 'sample_trailhead';
    }
    return 'sample_archway';
  }

  async checkOllamaStatus() {
    try {
      const res = await fetch('/api/ollama/api/tags');
      if (res.ok) {
        const data = await res.json();
        const hasExactModel = data.models && data.models.some(m => m.name === LOCAL_VISION_MODEL_TAG);
        const hasAnyQwen = data.models && data.models.some(m => m.name.toLowerCase().includes('qwen'));
        this.ollamaOnline = true;
        if (hasExactModel) {
          this.activeModel = LOCAL_VISION_MODEL_TAG;
        } else if (hasAnyQwen) {
          const m = data.models.find(m => m.name.toLowerCase().includes('qwen'));
          this.activeModel = m.name;
        }
      } else {
        this.ollamaOnline = false;
      }
    } catch {
      this.ollamaOnline = false;
    }
    if (!this.isAnalyzing) {
      this.updateJournalDOM();
    }
  }

  setObservation(obs) {
    if (!obs) {
      this.currentObservation = JSON.parse(JSON.stringify(SAMPLE_OBSERVATIONS[0]));
    } else {
      this.currentObservation = JSON.parse(JSON.stringify(obs));
    }
    this.activeSpecimenKey = this.inferSpecimenKey(this.currentObservation);
    this.render();
  }

  loadSample(sampleId) {
    const found = SAMPLE_OBSERVATIONS.find(s => s.id === sampleId);
    if (!found) return;

    this.activeSpecimenKey = sampleId;
    this.currentObservation = {
      ...JSON.parse(JSON.stringify(found)),
      id: `demo_${Date.now()}`,
      isDemo: true,
      modelName: 'Interactive 3D Study Reference',
      isRunningLocally: false,
      inferenceLatencySec: null,
      structuredAnalysis: null,
      analysisError: null,
      eligibilityStatus: 'demo_baseline',
      isRewardEligible: true,
      eligibilityBadge: '🔬 3D Specimen Baseline',
      eligibilityTitle: 'Simulation Reference Specimen',
      eligibilityReason: 'Pre-verified 3D natural history baseline specimen. Interactive simulator study model for demonstration.',
      allowPhysicalRewards: true,
      claimed: false
    };
    this.state.setPendingObservation(this.currentObservation);

    // Update 3D scene smoothly without tearing down the WebGL canvas
    if (this.specimen3D) {
      this.specimen3D.setSpecimen(sampleId);
    }
    this.update3DOverlayDOM();
    this.updateJournalDOM();
  }

  startAnalysisTimer() {
    this.analysisElapsed = 0;
    clearInterval(this.analysisInterval);
    this.analysisInterval = setInterval(() => {
      this.analysisElapsed += 1;
      const el = document.getElementById('analysis-timer-sec');
      if (el) el.textContent = this.analysisElapsed;
    }, 1000);
  }

  stopAnalysisTimer() {
    clearInterval(this.analysisInterval);
    this.analysisInterval = null;
  }

  async analyzeObservation({ imageSrc = null, fieldNote = '', title = '', isDemo = false, sampleId = null }) {
    this.isAnalyzing = true;
    this.analysisStartTime = performance.now();
    this.startAnalysisTimer();
    this.render();

    // 1. Explicit demo specimen without custom photograph
    if (isDemo && !imageSrc) {
      this.stopAnalysisTimer();
      const sample = SAMPLE_OBSERVATIONS.find(s => s.id === sampleId) || SAMPLE_OBSERVATIONS[0];
      this.activeSpecimenKey = sample.id;
      this.currentObservation = {
        id: `demo_${Date.now()}`,
        title: sample.title,
        location: sample.location,
        imageSrc: null,
        fieldNote: fieldNote || sample.notes,
        isDemo: true,
        inferenceSource: '3D Simulator Specimen Baseline',
        modelName: 'Interactive 3D Study Reference',
        isRunningLocally: false,
        inferenceLatencySec: null,
        structuredAnalysis: null,
        analysisError: null,
        eligibilityStatus: 'demo_baseline',
        isRewardEligible: true,
        eligibilityBadge: '🔬 3D Specimen Baseline',
        eligibilityTitle: 'Simulation Reference Specimen',
        eligibilityReason: 'Pre-verified 3D natural history baseline specimen. Interactive simulator study model for demonstration.',
        allowPhysicalRewards: true,
        detectedElements: JSON.parse(JSON.stringify(sample.detectedElements)),
        notes: sample.notes,
        claimed: false
      };
      this.state.setPendingObservation(this.currentObservation);
      this.isAnalyzing = false;
      this.render();
      return;
    }

    // 2. Real photograph observation
    let structuredAnalysis = null;
    let analysisError = null;
    let inferenceLatencySec = null;
    let isRunningLocally = false;
    let analysisSource = 'Local Vision Model';

    if (imageSrc && imageSrc.startsWith('data:image/')) {
      const base64Data = imageSrc.split(',')[1];
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      const t0 = performance.now();

      try {
        const res = await fetch('/api/ollama/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.activeModel,
            prompt: VISION_STRUCTURED_PROMPT,
            images: [base64Data],
            stream: false,
            format: 'json',
            options: {
              temperature: 0
            }
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const latency = ((performance.now() - t0) / 1000).toFixed(1);

        if (res.ok) {
          const data = await res.json();
          const rawResponse = data.response || '';
          const parsed = parseJsonFromResponse(rawResponse);
          const validated = validateVisionAnalysis(parsed);

          if (validated) {
            structuredAnalysis = validated;
            inferenceLatencySec = latency;
            isRunningLocally = true;
            this.ollamaOnline = true;
            analysisSource = `Local Vision Model (${this.activeModel})`;
          } else {
            analysisError = 'Vision model response failed strict JSON schema validation. No simulated findings substituted.';
            analysisSource = 'Local Vision Model (Schema Validation Error)';
            inferenceLatencySec = latency;
          }
        } else {
          analysisError = `Local Ollama server returned HTTP error ${res.status}. Verify local server status.`;
          analysisSource = 'Local Vision Model (HTTP Error)';
          this.ollamaOnline = false;
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          analysisError = 'Local vision inference timed out after 120 seconds. Check device load.';
        } else {
          analysisError = 'Could not connect to local Ollama server at http://127.0.0.1:11434. Verify ollama serve is running.';
        }
        analysisSource = 'Local Vision Model (Offline / Unreachable)';
        this.ollamaOnline = false;
      }
    } else {
      analysisError = 'No photograph provided for local vision analysis.';
    }

    this.stopAnalysisTimer();

    // 3. Evaluate Evidence-Eligibility Gate
    const eligibility = evaluateEvidenceEligibility({ structuredAnalysis, fieldNote, isDemo: false });

    // 4. Grounded Candidate Detections (distinct from confirmed user facts)
    const detections = this.deriveCandidateDetections(structuredAnalysis, fieldNote, analysisError, eligibility);
    this.activeSpecimenKey = this.inferSpecimenKey({ title, structuredAnalysis, fieldNote });

    this.currentObservation = {
      id: generateObservationId(imageSrc, isDemo, sampleId),
      title: title || 'Walk Field Observation',
      location: 'Local Field Discovery',
      imageSrc: imageSrc,
      fieldNote: fieldNote,
      isDemo: false,
      inferenceSource: analysisSource,
      modelName: this.activeModel,
      isRunningLocally: isRunningLocally,
      inferenceLatencySec: inferenceLatencySec,
      structuredAnalysis: structuredAnalysis,
      analysisError: analysisError,
      eligibilityStatus: eligibility.status,
      isRewardEligible: eligibility.isRewardEligible,
      eligibilityBadge: eligibility.badge,
      eligibilityTitle: eligibility.title,
      eligibilityReason: eligibility.reason,
      allowPhysicalRewards: eligibility.allowPhysicalRewards,
      detectedElements: detections,
      notes: fieldNote || (structuredAnalysis ? structuredAnalysis.evidence_summary : 'Field observation recorded.'),
      claimed: false
    };

    this.state.setPendingObservation(this.currentObservation);
    this.isAnalyzing = false;
    this.render();
  }

  deriveCandidateDetections(structuredAnalysis, fieldNote = '', analysisError = null, eligibility = null) {
    const detections = [];
    let idCounter = 1;

    // Strict Evidence Integrity: If local inference failed and no field note was recorded,
    // do NOT substitute fabricated findings. Return an empty list.
    if (!structuredAnalysis && !fieldNote) {
      if (analysisError) {
        return [];
      }
    }

    // 1. DETERMINISTIC EVIDENCE-ELIGIBILITY GATE:
    // If the observation is identified as a digital rendering, illustration, screen capture, or non-physical scene:
    if (eligibility && eligibility.status === 'ineligible') {
      const features = structuredAnalysis ? (structuredAnalysis.visible_features || []) : [];
      if (features.length > 0) {
        features.forEach((feat, idx) => {
          detections.push({
            id: `det_inelig_${idx + 1}`,
            name: feat,
            category: 'Digital / Rendered Feature',
            evidenceStatus: 'Ineligible · Identified as Digital Rendering / Non-Physical',
            confirmed: false,
            suggestedReward: 0,
            grantsItem: null,
            grantsItemName: null,
            ineligible: true
          });
        });
      } else {
        detections.push({
          id: `det_inelig_1`,
          name: 'Digital Image Subject',
          category: 'Digital / Rendered Feature',
          evidenceStatus: 'Ineligible · Identified as Digital Rendering / Non-Physical',
          confirmed: false,
          suggestedReward: 0,
          grantsItem: null,
          grantsItemName: null,
          ineligible: true
        });
      }
      return detections;
    }

    // 2. UNCERTAIN SCENE CLASSIFICATION:
    // Treat uncertain scene classification as uncertain, not as proof that image is real or fake.
    // Never let model-generated text alone establish a verified real-world fact.
    if (eligibility && eligibility.status === 'uncertain') {
      const features = structuredAnalysis ? (structuredAnalysis.visible_features || []) : [];
      features.forEach((feat, idx) => {
        detections.push({
          id: `det_uncert_${idx + 1}`,
          name: feat,
          category: 'Unverified Subject',
          evidenceStatus: 'Authenticity Uncertain · Direct physical corroboration required',
          confirmed: false,
          suggestedReward: 0,
          grantsItem: null,
          grantsItemName: null,
          ineligible: true
        });
      });
      return detections;
    }

    // 3. PHYSICAL OUTDOOR DISCOVERY (ELIGIBLE OR DEMO BASELINE)
    const visibleText = structuredAnalysis
      ? (structuredAnalysis.visible_features.join(' ') + ' ' + (structuredAnalysis.evidence_summary || '')).toLowerCase()
      : '';
    const noteText = (fieldNote || '').toLowerCase();
    const combined = visibleText + ' ' + noteText;

    const checkMatch = (keywords) => keywords.some(k => combined.includes(k));
    const keywordsInText = (keywords, text) => keywords.some(k => text.includes(k));
    const isDirectNote = (keywords) => keywords.some(k => noteText.includes(k)) && (noteText.includes('[direct observation]') || noteText.includes('observed'));

    // 1. Deciduous Tree Canopy (Ancient Oak)
    if (checkMatch(['oak', 'deciduous', 'tree', 'canopy', 'branches', 'bark', 'trunk'])) {
      const fromVision = structuredAnalysis && keywordsInText(['oak', 'deciduous', 'tree', 'canopy', 'branches', 'bark', 'trunk'], visibleText);
      const confirmedByUser = isDirectNote(['oak', 'deciduous', 'tree']);
      detections.push({
        id: `det_${idCounter++}`,
        name: 'Deciduous Tree Canopy',
        category: 'Canopy Flora',
        evidenceStatus: confirmedByUser
          ? 'Direct User Observation (Field Note)'
          : (fromVision ? 'AI Visual Candidate (Unverified · Review to confirm)' : 'Grounded in Field Notes (Unverified)'),
        confirmed: confirmedByUser,
        suggestedReward: 2,
        grantsItem: 'ancient_oak',
        grantsItemName: 'Ancient Oak (x1)'
      });
    }

    // 2. Evergreen Conifer Spire (Pine Cluster)
    if (checkMatch(['pine', 'conifer', 'evergreen', 'spruce', 'fir', 'needle'])) {
      const fromVision = structuredAnalysis && keywordsInText(['pine', 'conifer', 'evergreen', 'spruce', 'fir', 'needle'], visibleText);
      const confirmedByUser = isDirectNote(['pine', 'conifer', 'evergreen']);
      detections.push({
        id: `det_${idCounter++}`,
        name: 'Evergreen Conifer Spire',
        category: 'Canopy Flora',
        evidenceStatus: confirmedByUser
          ? 'Direct User Observation (Field Note)'
          : (fromVision ? 'AI Visual Candidate (Unverified · Review to confirm)' : 'Grounded in Field Notes (Unverified)'),
        confirmed: confirmedByUser,
        suggestedReward: 1,
        grantsItem: 'pine_cluster',
        grantsItemName: 'Pine Cluster (x1)'
      });
    }

    // 3. Historic Stone Masonry / Cairn
    if (checkMatch(['arch', 'masonry', 'cairn', 'ruin', 'stone wall', 'monument', 'carved stone'])) {
      const fromVision = structuredAnalysis && keywordsInText(['arch', 'masonry', 'cairn', 'ruin', 'stone wall', 'monument', 'carved stone'], visibleText);
      const confirmedByUser = isDirectNote(['arch', 'masonry', 'cairn']);
      detections.push({
        id: `det_${idCounter++}`,
        name: 'Historic Stone Masonry',
        category: 'Historic Masonry',
        evidenceStatus: confirmedByUser
          ? 'Direct User Observation (Field Note)'
          : (fromVision ? 'AI Visual Candidate (Unverified · Review to confirm)' : 'Grounded in Field Notes (Unverified)'),
        confirmed: confirmedByUser,
        suggestedReward: 2,
        grantsItem: 'stone_cairn',
        grantsItemName: 'Stone Cairn (x1)'
      });
    }

    // 4. Granite Boulder & Rock
    if (checkMatch(['boulder', 'granite', 'rock', 'stone', 'pebble', 'dust', 'gravel']) && !combined.includes('arch') && !combined.includes('masonry')) {
      const fromVision = structuredAnalysis && keywordsInText(['boulder', 'granite', 'rock', 'stone', 'pebble', 'dust', 'gravel'], visibleText);
      const confirmedByUser = isDirectNote(['boulder', 'granite', 'rock']);
      detections.push({
        id: `det_${idCounter++}`,
        name: 'Granite Boulder & Rock',
        category: 'Geology',
        evidenceStatus: confirmedByUser
          ? 'Direct User Observation (Field Note)'
          : (fromVision ? 'AI Visual Candidate (Unverified · Review to confirm)' : 'Grounded in Field Notes (Unverified)'),
        confirmed: confirmedByUser,
        suggestedReward: 1,
        grantsItem: 'mossy_boulder',
        grantsItemName: 'Mossy Boulder (x1)'
      });
    }

    // 5. Freshwater Stream Corridor
    if (checkMatch(['stream', 'creek', 'river', 'water', 'brook', 'pond', 'wetland', 'runoff'])) {
      const fromVision = structuredAnalysis && keywordsInText(['stream', 'creek', 'river', 'water', 'brook', 'pond', 'wetland', 'runoff'], visibleText);
      const confirmedByUser = isDirectNote(['stream', 'creek', 'water']);
      detections.push({
        id: `det_${idCounter++}`,
        name: 'Freshwater Stream Corridor',
        category: 'Hydrology',
        evidenceStatus: confirmedByUser
          ? 'Direct User Observation (Field Note)'
          : (fromVision ? 'AI Visual Candidate (Unverified · Review to confirm)' : 'Grounded in Field Notes (Unverified)'),
        confirmed: confirmedByUser,
        suggestedReward: 2,
        grantsItem: 'stream_tile',
        grantsItemName: 'Forest Stream (x1)'
      });
    }

    // 6. Beaten Earth Trail
    if (checkMatch(['trail', 'path', 'dirt road', 'footpath', 'track', 'walkway', 'ground'])) {
      const fromVision = structuredAnalysis && keywordsInText(['trail', 'path', 'dirt road', 'footpath', 'track', 'walkway', 'ground'], visibleText);
      const confirmedByUser = isDirectNote(['trail', 'path', 'footpath']);
      detections.push({
        id: `det_${idCounter++}`,
        name: 'Beaten Earth Trail',
        category: 'Pedestrian Trail',
        evidenceStatus: confirmedByUser
          ? 'Direct User Observation (Field Note)'
          : (fromVision ? 'AI Visual Candidate (Unverified · Review to confirm)' : 'Grounded in Field Notes (Unverified)'),
        confirmed: confirmedByUser,
        suggestedReward: 1,
        grantsItem: 'earth_trail',
        grantsItemName: 'Beaten Trail (x2)'
      });
    }

    // 7. Wild Ferns & Forest Undergrowth
    if (checkMatch(['fern', 'moss', 'lichen', 'ivy', 'undergrowth', 'foliage', 'wildflower', 'grass', 'plant', 'shrub', 'bush', 'vegetation'])) {
      const fromVision = structuredAnalysis && keywordsInText(['fern', 'moss', 'lichen', 'ivy', 'undergrowth', 'foliage', 'wildflower', 'grass', 'plant', 'shrub', 'bush', 'vegetation'], visibleText);
      const confirmedByUser = isDirectNote(['fern', 'moss', 'lichen']);
      detections.push({
        id: `det_${idCounter++}`,
        name: 'Wild Ferns & Undergrowth',
        category: 'Forest Undergrowth',
        evidenceStatus: confirmedByUser
          ? 'Direct User Observation (Field Note)'
          : (fromVision ? 'AI Visual Candidate (Unverified · Review to confirm)' : 'Grounded in Field Notes (Unverified)'),
        confirmed: confirmedByUser,
        suggestedReward: 1,
        grantsItem: 'wild_ferns',
        grantsItemName: 'Wild Ferns (x1)'
      });
    }

    // If nothing matched, provide an honest finding
    if (detections.length === 0 && structuredAnalysis) {
      const isOutdoorEligible = eligibility && eligibility.isRewardEligible;
      detections.push({
        id: `det_${idCounter++}`,
        name: isOutdoorEligible ? 'Natural Field Subject' : 'Uncatalogued Field Subject',
        category: 'Field Observation',
        evidenceStatus: isOutdoorEligible ? 'Authentic Outdoor Evidence Verified' : 'Physical Feature Outside Botanical Baseline · Review needed',
        confirmed: isOutdoorEligible,
        suggestedReward: isOutdoorEligible ? 2 : 0,
        grantsItem: isOutdoorEligible ? 'wild_ferns' : null,
        grantsItemName: isOutdoorEligible ? 'Wild Ferns (x1)' : null
      });
    }

    return detections;
  }

  attachPhotoFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      const currentNotes = this.currentObservation ? (this.currentObservation.fieldNote || '') : '';
      await this.analyzeObservation({
        imageSrc: dataUrl,
        fieldNote: currentNotes,
        title: `Field Photo: ${file.name.replace(/\.[^/.]+$/, '')}`
      });
    };
    reader.readAsDataURL(file);
  }

  toggleElement(elId) {
    if (!this.currentObservation || !this.currentObservation.detectedElements) return;
    const item = this.currentObservation.detectedElements.find(e => e.id === elId);
    if (item) {
      item.confirmed = !item.confirmed;
      this.state.setPendingObservation(this.currentObservation);
      this.updateJournalDOM();
    }
  }

  claimObservation() {
    const obs = this.currentObservation;
    if (!obs) return;

    if (obs.eligibilityStatus === 'ineligible' || obs.isRewardEligible === false) {
      alert('This observation is ineligible for physical-world rewards. Digital renderings and non-physical images cannot be transferred to the Sanctuary.');
      return;
    }

    if (obs.claimed || this.state.claimedObservationIds.has(obs.id)) {
      alert('This observation has already been transferred to your sanctuary.');
      return;
    }

    let confirmed = (obs.detectedElements || []).filter(e => e.confirmed && !e.ineligible);
    if (confirmed.length === 0) {
      const eligible = (obs.detectedElements || []).filter(e => !e.ineligible);
      if (eligible.length > 0) {
        eligible.forEach(e => { e.confirmed = true; });
        confirmed = eligible;
      }
    }

    if (confirmed.length === 0) {
      alert('Please confirm at least one verified physical finding before claiming.');
      return;
    }

    const result = this.state.claimObservationRewards(obs.id, confirmed, obs);
    if (result.success) {
      obs.claimed = true;
      this.justClaimed = true;
      this.state.setPendingObservation(obs);
      this.updateJournalDOM();
      if (this.onClaimSuccess) {
        this.onClaimSuccess(result);
      }
    } else {
      alert(result.message);
    }
  }

  /* -------------------------------------------------------------------------- */
  /* LIFECYCLE FOR 3D ENGINE                                                    */
  /* -------------------------------------------------------------------------- */
  pause3D() {
    if (this.specimen3D) {
      this.specimen3D.pause();
    }
  }

  resume3D() {
    if (this.specimen3D) {
      this.specimen3D.resume();
      this.specimen3D.resize();
    }
  }

  resize3D() {
    if (this.specimen3D) {
      this.specimen3D.resize();
    }
  }

  /* -------------------------------------------------------------------------- */
  /* FULL RENDERING & SPLIT-SCREEN LAYOUT                                       */
  /* -------------------------------------------------------------------------- */
  render() {
    if (!this.containerEl) return;

    // 1. Analyzing Loading State (Demonstrable Local AI with live timer)
    if (this.isAnalyzing) {
      this.containerEl.innerHTML = `
        <div class="w-full h-full flex items-center justify-center p-8 bg-[#F8F6F1]">
          <div class="p-8 sm:p-10 rounded-3xl bg-[#EDEAE4] border border-[#D9D4C8] text-center max-w-md mx-auto space-y-4 shadow-xl">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#E8F5EE] border border-[#95D5B2] shadow-sm">
              <div class="w-8 h-8 border-3 border-[#064E2D] border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div class="space-y-1.5">
              <h3 class="font-display font-extrabold text-2xl text-[#064E2D] tracking-tight">Examining Field Evidence</h3>
              <p class="text-xs text-[#538B57] leading-relaxed">
                Running on-device visual analysis via local vision model. Extracting visible evidence and physical features...
              </p>
            </div>
            
            <!-- Live Model Tag & Timer -->
            <div class="p-3 rounded-2xl bg-[#E2DED5]/70 border border-[#D9D4C8] text-left space-y-2">
              <div class="flex items-center justify-between text-[11px]">
                <span class="font-heading font-extrabold text-[#064E2D] uppercase tracking-wider">Engine:</span>
                <span class="px-2 py-0.5 rounded-full bg-[#E8F5EE] text-[#064E2D] font-bold text-[10px] border border-[#95D5B2] flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-[#538B57] animate-pulse"></span>
                  <span>Running Locally</span>
                </span>
              </div>
              <div class="font-mono text-[10px] text-[#2D3830] truncate" title="${this.activeModel}">
                ${this.activeModel}
              </div>
              <div class="flex items-center justify-between text-[11px] pt-1 border-t border-[#D9D4C8]/60 text-[#538B57]">
                <span>Inference Time:</span>
                <span class="font-mono font-bold text-[#064E2D]"><span id="analysis-timer-sec">0</span>s elapsed</span>
              </div>
            </div>

            <div class="text-[10px] text-[#6B7280]">
              🔒 100% On-Device · Private · Zero Cloud Telemetry
            </div>
          </div>
        </div>
      `;
      return;
    }

    const obs = this.currentObservation;
    const activeSampleKey = this.activeSpecimenKey || 'sample_archway';

    // 2. Render Full Split-Screen Layout
    this.containerEl.innerHTML = `
      <div class="discovery-screen-container w-full h-full flex flex-col md:flex-row overflow-hidden bg-[#F8F6F1]">
        
        <!-- Hidden file input for photo replacement / attachment -->
        <input type="file" id="discovery-photo-input" accept="image/*" class="hidden">

        <!-- ================================================================== -->
        <!-- LEFT COLUMN: 3D FIELD SPECIMEN VIEWPORT (58% desktop width)         -->
        <!-- ================================================================== -->
        <div class="w-full md:w-[58%] lg:w-[60%] h-[48vh] md:h-full relative overflow-hidden bg-[#EBF5EE] border-b md:border-b-0 md:border-r border-[#E2DED5] select-none">
          
          <!-- Real-Time WebGL Canvas -->
          <canvas id="discovery-3d-canvas" class="w-full h-full block cursor-grab active:cursor-grabbing"></canvas>

          <!-- Floating Specimen Label (Top-Left) -->
          <div class="absolute top-4 left-4 right-4 md:right-auto md:max-w-sm pointer-events-none z-10">
            <div class="p-3.5 rounded-2xl bg-[#EDEAE4]/90 backdrop-blur-md border border-[#D9D4C8] shadow-md space-y-1">
              <div class="flex items-center gap-2">
                <span id="discovery-3d-badge" class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-heading font-extrabold uppercase tracking-wider ${
                  obs.isDemo 
                    ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]' 
                    : 'bg-[#E8F5EE] text-[#064E2D] border border-[#95D5B2]'
                }">
                  ${obs.isDemo ? '🔬 3D SPECIMEN REFERENCE' : '📸 FIELD PHOTO REFERENCE'}
                </span>
                <span id="discovery-3d-sublabel" class="text-[10px] text-[#538B57] font-medium">
                  · ${obs.isDemo ? '3D Simulator Specimen' : (obs.isRunningLocally ? 'Analyzed via Local Vision AI' : 'Field Photograph Evidence')}
                </span>
              </div>
              <h3 id="discovery-3d-title" class="font-display font-extrabold text-lg text-[#064E2D] tracking-tight">
                ${getCleanObservationTitle(obs)}
              </h3>
              <p id="discovery-3d-desc" class="text-xs text-[#538B57] leading-tight">
                ${obs.notes || obs.fieldNote || 'Weathered cut-granite mortar archway with creeping ivy roots.'}
              </p>
            </div>
          </div>

          <!-- Specimen Quick-Switch Ribbon (Top-Right) -->
          <div class="absolute top-4 right-4 z-10 flex items-center gap-1 bg-[#EDEAE4]/90 backdrop-blur-md p-1 rounded-xl border border-[#D9D4C8] shadow-sm">
            <button 
              class="btn-pick-sample px-2.5 py-1.5 rounded-lg text-xs font-heading font-bold cursor-pointer transition-all ${
                activeSampleKey === 'sample_archway' 
                  ? 'bg-[#064E2D] text-[#EDEAE4] shadow-xs' 
                  : 'text-[#4A5B4E] hover:bg-[#E2DED5]'
              }"
              data-sample-id="sample_archway"
            >
              🏛️ Archway
            </button>
            <button 
              class="btn-pick-sample px-2.5 py-1.5 rounded-lg text-xs font-heading font-bold cursor-pointer transition-all ${
                activeSampleKey === 'sample_stream' 
                  ? 'bg-[#064E2D] text-[#EDEAE4] shadow-xs' 
                  : 'text-[#4A5B4E] hover:bg-[#E2DED5]'
              }"
              data-sample-id="sample_stream"
            >
              💧 Stream
            </button>
            <button 
              class="btn-pick-sample px-2.5 py-1.5 rounded-lg text-xs font-heading font-bold cursor-pointer transition-all ${
                activeSampleKey === 'sample_trailhead' 
                  ? 'bg-[#064E2D] text-[#EDEAE4] shadow-xs' 
                  : 'text-[#4A5B4E] hover:bg-[#E2DED5]'
              }"
              data-sample-id="sample_trailhead"
            >
              🪵 Trail
            </button>
          </div>

          <!-- Viewer Controls (Reset Camera, Zoom +, Zoom -) -->
          <div class="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5">
            <button id="btn-discovery-reset-cam" class="w-9 h-9 rounded-xl bg-[#EDEAE4]/90 backdrop-blur-md hover:bg-[#EDEAE4] text-[#064E2D] border border-[#CAD8C5] shadow-sm flex items-center justify-center text-sm font-bold transition-all cursor-pointer" title="Reset Camera View">
              ⟲
            </button>
            <button id="btn-discovery-zoom-in" class="w-9 h-9 rounded-xl bg-[#EDEAE4]/90 backdrop-blur-md hover:bg-[#EDEAE4] text-[#064E2D] border border-[#CAD8C5] shadow-sm flex items-center justify-center text-sm font-bold transition-all cursor-pointer" title="Zoom In">
              +
            </button>
            <button id="btn-discovery-zoom-out" class="w-9 h-9 rounded-xl bg-[#EDEAE4]/90 backdrop-blur-md hover:bg-[#EDEAE4] text-[#064E2D] border border-[#CAD8C5] shadow-sm flex items-center justify-center text-sm font-bold transition-all cursor-pointer" title="Zoom Out">
              −
            </button>
          </div>

          <!-- Bottom Left Legend & Landmark Inspection Popup -->
          <div class="absolute bottom-4 left-4 z-10 pointer-events-none space-y-1.5">
            <div id="discovery-landmark-inspect-card" class="hidden pointer-events-auto px-3.5 py-1.5 rounded-xl bg-[#064E2D]/95 backdrop-blur-md text-[#EDEAE4] text-xs font-heading font-bold shadow-md flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-[#E7CA49] animate-pulse"></span>
              <span id="discovery-landmark-name">Landmark</span>
              <span class="text-[10px] text-[#95D5B2] font-normal" id="discovery-landmark-cat">(Category)</span>
            </div>
            <div class="px-3 py-1.5 rounded-xl bg-[#EDEAE4]/80 backdrop-blur-md text-[11px] font-heading font-bold text-[#538B57] border border-[#D9D4C8]/80 shadow-xs flex items-center gap-2">
              <span>🧭 Drag to orbit</span>
              <span>·</span>
              <span>Scroll / pinch to zoom</span>
              <span>·</span>
              <span>Click landmark to inspect</span>
            </div>
          </div>

          <!-- Floating Photo Inset if user attached an actual photograph -->
          ${obs.imageSrc ? `
            <div id="discovery-photo-pip" class="absolute bottom-14 left-4 z-10 pointer-events-auto max-w-[200px] p-2 rounded-xl bg-[#EDEAE4]/90 backdrop-blur-md border border-[#D9D4C8] shadow-md space-y-1">
              <div class="relative w-full h-20 rounded-lg overflow-hidden bg-[#E2DED5]">
                <img src="${obs.imageSrc}" alt="User field photograph" class="w-full h-full object-cover">
                <span class="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#064E2D]/85 text-[#EDEAE4]">Field Photo</span>
              </div>
              <div class="flex items-center justify-between text-[10px] text-[#538B57]">
                <span>Attached walk evidence</span>
                <button id="btn-trigger-photo-replace" class="font-bold text-[#064E2D] hover:underline cursor-pointer">Replace</button>
              </div>
            </div>
          ` : ''}

        </div>

        <!-- ================================================================== -->
        <!-- RIGHT COLUMN: EDITORIAL FIELD JOURNAL (42% desktop width)           -->
        <!-- ================================================================== -->
        <div id="discovery-journal-panel" class="w-full md:w-[42%] lg:w-[40%] h-[52vh] md:h-full overflow-y-auto custom-scrollbar journal-paper-panel p-5 sm:p-7 lg:p-8 space-y-5 text-[#2D3830]">
          <!-- Injected via updateJournalDOM() -->
        </div>

      </div>
    `;

    // 3. Mount and connect 3D Scene Viewer
    this.mountSpecimen3D();

    // 4. Render Field Journal Panel
    this.updateJournalDOM();

    // 5. Attach interaction listeners
    this.attachDomEvents();
  }

  mountSpecimen3D() {
    const canvas = this.containerEl.querySelector('#discovery-3d-canvas');
    if (!canvas) return;

    if (this.specimen3D) {
      this.specimen3D.dispose();
      this.specimen3D = null;
    }

    this.specimen3D = new DiscoverySpecimen3D(canvas, {
      onInspectLandmark: (data) => {
        this.handleLandmarkInspect(data);
      }
    });

    const activeSampleKey = this.activeSpecimenKey || 'sample_archway';
    this.specimen3D.setSpecimen(activeSampleKey, true);
  }

  handleLandmarkInspect(data) {
    const card = this.containerEl.querySelector('#discovery-landmark-inspect-card');
    const nameEl = this.containerEl.querySelector('#discovery-landmark-name');
    const catEl = this.containerEl.querySelector('#discovery-landmark-cat');

    if (card && nameEl && catEl) {
      nameEl.textContent = data.name || 'Specimen Feature';
      catEl.textContent = `· ${data.category || 'Natural Landmark'}`;
      card.classList.remove('hidden');

      clearTimeout(this.inspectCardTimeout);
      this.inspectCardTimeout = setTimeout(() => {
        card.classList.add('hidden');
      }, 4200);
    }

    // Highlight matching finding in right-hand journal list
    if (this.currentObservation && this.currentObservation.detectedElements) {
      const match = this.currentObservation.detectedElements.find(
        e => e.name.toLowerCase().includes((data.name || '').toLowerCase()) ||
             (data.name || '').toLowerCase().includes(e.name.toLowerCase())
      );
      if (match) {
        const row = this.containerEl.querySelector(`[data-row-id="${match.id}"]`);
        if (row) {
          row.classList.add('bg-[#E8F5EE]', 'ring-1', 'ring-[#95D5B2]');
          setTimeout(() => {
            row.classList.remove('bg-[#E8F5EE]', 'ring-1', 'ring-[#95D5B2]');
          }, 2400);
        }
      }
    }
  }

  update3DOverlayDOM() {
    const obs = this.currentObservation;
    if (!obs) return;

    const cleanTitle = getCleanObservationTitle(obs);
    const titleEl = this.containerEl.querySelector('#discovery-3d-title');
    const descEl = this.containerEl.querySelector('#discovery-3d-desc');
    const badgeEl = this.containerEl.querySelector('#discovery-3d-badge');
    const sublabelEl = this.containerEl.querySelector('#discovery-3d-sublabel');

    if (titleEl) titleEl.textContent = cleanTitle;
    if (descEl) descEl.textContent = obs.notes || obs.fieldNote || '';
    if (badgeEl) {
      if (obs.isDemo) {
        badgeEl.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-heading font-extrabold uppercase tracking-wider bg-[#EDEAE4] text-[#064E2D] border border-[#CAD8C5]';
        badgeEl.textContent = '🔬 3D SPECIMEN REFERENCE';
      } else if (obs.eligibilityStatus === 'ineligible' || obs.isRewardEligible === false) {
        badgeEl.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-heading font-extrabold uppercase tracking-wider bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]';
        badgeEl.textContent = '📓 FIELD STUDY ENTRY';
      } else {
        badgeEl.className = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-heading font-extrabold uppercase tracking-wider bg-[#E8F5EE] text-[#064E2D] border border-[#95D5B2]';
        badgeEl.textContent = '📸 FIELD PHOTO REFERENCE';
      }
    }
    if (sublabelEl) {
      sublabelEl.textContent = '· ' + (obs.isDemo ? '3D Simulator Specimen' : (obs.isRunningLocally ? 'Local Vision AI' : 'Field Photo Evidence'));
    }

    // Update specimen picker active states
    this.containerEl.querySelectorAll('.btn-pick-sample').forEach(btn => {
      const isSelected = btn.getAttribute('data-sample-id') === this.activeSpecimenKey;
      btn.className = `btn-pick-sample px-2.5 py-1.5 rounded-lg text-xs font-heading font-bold cursor-pointer transition-all ${
        isSelected 
          ? 'bg-[#064E2D] text-[#EDEAE4] shadow-xs' 
          : 'text-[#4A5B4E] hover:bg-[#E2DED5]'
      }`;
    });
  }

  async retryCurrentObservation() {
    if (this.currentObservation && this.currentObservation.imageSrc) {
      return await this.analyzeObservation({
        imageSrc: this.currentObservation.imageSrc,
        fieldNote: this.currentObservation.fieldNote,
        title: this.currentObservation.title
      });
    }
    return null;
  }

  recordStudyEntryInJournal() {
    const obs = this.currentObservation;
    if (!obs) return;
    obs.preserved = true;
    this.state.setPendingObservation(obs);
    this.updateJournalDOM();
    if (this.onClaimSuccess) {
      this.onClaimSuccess({ success: true, message: 'Study entry recorded in field journal.' });
    }
  }

  updateJournalDOM() {
    if (!this.containerEl) return;
    const journalPanel = this.containerEl.querySelector('#discovery-journal-panel');
    if (!journalPanel) return;

    const obs = this.currentObservation;
    if (!obs) return;

    const hasError = !!obs.analysisError;
    const isRunningLocally = !!obs.isRunningLocally;
    const isAlreadyClaimed = obs.claimed || (this.state.claimedObservationIds && this.state.claimedObservationIds.has(obs.id));
    const isPreserved = !!obs.preserved || isAlreadyClaimed;
    const isEligible = obs.eligibilityStatus !== 'ineligible' && obs.isRewardEligible !== false && !hasError;
    const cleanTitle = getCleanObservationTitle(obs);

    const candidates = obs.detectedElements || [];
    const totalCandidates = candidates.length;
    const validConfirmedCount = candidates.filter(e => e.confirmed && !e.ineligible).length;
    const totalMaterials = isEligible 
      ? candidates.filter(e => e.confirmed && !e.ineligible).reduce((sum, e) => sum + (e.suggestedReward || 0), 0)
      : 0;
    const eligibleItems = isEligible 
      ? candidates.filter(e => e.confirmed && !e.ineligible && e.grantsItemName)
      : [];

    const getFindIcon = (name = '', category = '') => {
      const lower = (name + ' ' + category).toLowerCase();
      if (lower.includes('oak') || lower.includes('canopy') || lower.includes('tree')) return '🌳';
      if (lower.includes('pine') || lower.includes('conifer')) return '🌲';
      if (lower.includes('arch') || lower.includes('cairn') || lower.includes('masonry') || lower.includes('stone')) return '🏛️';
      if (lower.includes('boulder') || lower.includes('rock') || lower.includes('granite')) return '🪨';
      if (lower.includes('stream') || lower.includes('water') || lower.includes('creek')) return '🌊';
      if (lower.includes('trail') || lower.includes('path') || lower.includes('footpath')) return '🪵';
      if (lower.includes('fern') || lower.includes('moss') || lower.includes('flora')) return '🌿';
      return '✨';
    };

    const hasStructured = !!obs.structuredAnalysis;
    const allFeatures = (obs.structuredAnalysis?.visible_features && obs.structuredAnalysis.visible_features.length > 0)
      ? obs.structuredAnalysis.visible_features
      : candidates.map(e => e.name);
    const prominentFeatures = allFeatures.slice(0, 3);
    const remainingFeaturesCount = Math.max(0, allFeatures.length - 3);

    // Derived location context
    const locationLabel = obs.location || (obs.isDemo ? 'Botanical Reserve Baseline' : 'Outdoor Expedition Field');

    // 1. SINGLE Consolidated Entry Status (No duplicate warnings across cards)
    let entryStatus = {
      badge: 'Study entry',
      badgeClass: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
      icon: '📓',
      summary: 'Saved in field journal as a study record · Outdoor walk needed for living world rewards'
    };

    if (hasError) {
      entryStatus = {
        badge: 'Inference notice',
        badgeClass: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
        icon: '⚠️',
        summary: 'Local vision engine encountered an issue · Photo and notes preserved safely'
      };
    } else if (obs.isDemo || obs.eligibilityStatus === 'demo_baseline') {
      entryStatus = {
        badge: 'Reference baseline',
        badgeClass: 'bg-[#EDEAE4] text-[#064E2D] border-[#CAD8C5]',
        icon: '🔬',
        summary: '3D simulator study specimen · Pre-verified for natural history exploration'
      };
    } else if (obs.eligibilityStatus === 'ineligible' || obs.isRewardEligible === false) {
      entryStatus = {
        badge: 'Study entry',
        badgeClass: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
        icon: '📓',
        summary: 'Saved in field journal as a study record · Physical-world discoveries require outdoor exploration'
      };
    } else if (obs.eligibilityStatus === 'uncertain') {
      entryStatus = {
        badge: 'Needs review',
        badgeClass: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
        icon: '🔍',
        summary: 'Outdoor authenticity unverified · Direct field notes can corroborate findings'
      };
    } else {
      entryStatus = {
        badge: isAlreadyClaimed ? 'Catalogued in Sanctuary' : 'Verified discovery',
        badgeClass: 'bg-[#E8F5EE] text-[#064E2D] border-[#95D5B2]',
        icon: '🌱',
        summary: isAlreadyClaimed 
          ? 'Transferred to your living sanctuary' 
          : 'Authentic outdoor observation · Ready to collect findings'
      };
    }

    // 2. Summary text
    const summaryText = obs.structuredAnalysis?.evidence_summary || obs.notes || 'Natural features observed and catalogued.';

    // 3. Next adventure text & tip
    let nextAdventureText = 'Look for tree bark textures, leaf shapes, or stone moss within 15 minutes on foot.';
    let nextAdventureTip = 'Put your phone away and explore safely. Observe nature without disturbing wildlife.';

    if (obs.eligibilityStatus === 'ineligible' || obs.isRewardEligible === false) {
      nextAdventureText = 'Take a 15-minute nature walk in a nearby park, trail, or garden to record authentic outdoor discoveries.';
      nextAdventureTip = 'Put your phone away while walking and observe nature without disturbing wildlife.';
    } else if (hasError) {
      nextAdventureText = 'Check that your local Ollama engine is running, or enjoy a walk outside and capture a fresh photo when ready.';
      nextAdventureTip = 'Your field photo and notes remain safely preserved in UNSEEN.';
    } else if (obs.isDemo || obs.eligibilityStatus === 'demo_baseline') {
      nextAdventureText = 'Head outside to spot similar living rock formations, tree canopies, or water features in your local environment.';
      nextAdventureTip = 'Take a 15-minute walk to compare real-world textures and lighting.';
    } else if (obs.structuredAnalysis?.follow_up_observation) {
      nextAdventureText = obs.structuredAnalysis.follow_up_observation;
      nextAdventureTip = 'Put your phone away and explore safely. Observe nature without disturbing wildlife.';
    }

    // Model display badge in details summary
    const modelBadge = isRunningLocally 
      ? `🟢 Qwen3-VL${obs.inferenceLatencySec ? ` · ${obs.inferenceLatencySec}s` : ''}` 
      : (hasError ? '⚠️ Engine Notice' : '🔬 3D Baseline');

    journalPanel.innerHTML = `
      <!-- ================================================================ -->
      <!-- 1. OBSERVATION TITLE & STATUS HIERARCHY                          -->
      <!-- ================================================================ -->
      <div class="space-y-2 pb-4 border-b border-[#E2DED5]">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5 text-[10px] font-heading font-extrabold uppercase tracking-wider text-[#538B57]">
            <span>🌿</span>
            <span>FIELD JOURNAL</span>
            <span>·</span>
            <span class="truncate max-w-[150px] sm:max-w-none">${locationLabel}</span>
          </div>

          <!-- Single consolidated status badge -->
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-heading font-bold border shrink-0 ${entryStatus.badgeClass}">
            <span>${entryStatus.icon}</span>
            <span>${entryStatus.badge}</span>
          </span>
        </div>

        <div>
          <h2 id="discovery-journal-title" class="font-display font-extrabold text-2xl text-[#064E2D] tracking-tight leading-snug">
            ${cleanTitle}
          </h2>
          <p class="text-xs text-[#5A6E5F] font-medium leading-relaxed mt-1">
            ${entryStatus.summary}
          </p>
        </div>
      </div>

      <!-- ================================================================ -->
      <!-- 2. WHAT WE NOTICED (Concise summary + max 3 prominent features)  -->
      <!-- ================================================================ -->
      <div class="p-4 rounded-2xl bg-[#FFFFFF] border border-[#D9D4C8] shadow-2xs space-y-2.5 text-xs">
        <div class="flex items-center justify-between">
          <span class="font-heading font-extrabold text-[11px] text-[#064E2D] uppercase tracking-wider">
            What We Noticed
          </span>
          <span class="text-[10px] text-[#538B57] font-medium">Field Record</span>
        </div>

        <p class="text-xs text-[#064E2D] font-medium leading-relaxed">
          ${summaryText}
        </p>

        ${(obs.fieldNote && obs.fieldNote.trim() !== summaryText.trim()) ? `
          <div class="pt-2 border-t border-[#E2DED5] flex items-start gap-2 text-xs text-[#2D3830]">
            <span class="shrink-0 text-[#538B57]">✍️</span>
            <span class="italic font-serif leading-relaxed text-[#064E2D]">"${obs.fieldNote}"</span>
          </div>
        ` : ''}

        ${prominentFeatures.length > 0 ? `
          <div class="pt-2 border-t border-[#E2DED5] flex flex-wrap gap-1.5 items-center">
            ${prominentFeatures.map(f => {
              const shortName = f.length > 38 ? f.slice(0, 36) + '…' : f;
              return `
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F8F6F1] border border-[#CAD8C5] text-xs font-heading font-bold text-[#064E2D]" title="${f}">
                  <span>${getFindIcon(f)}</span>
                  <span>${shortName}</span>
                </span>
              `;
            }).join('')}
            ${remainingFeaturesCount > 0 ? `
              <span class="text-[10px] text-[#538B57] font-medium pl-1">
                +${remainingFeaturesCount} more in details
              </span>
            ` : ''}
          </div>
        ` : ''}
      </div>

      <!-- ================================================================ -->
      <!-- 3. NEXT ADVENTURE (One friendly, safe objective)                 -->
      <!-- ================================================================ -->
      <div class="p-4 rounded-2xl bg-[#F4F9F5] border border-[#CAD8C5] space-y-2 shadow-2xs">
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-lg bg-[#E7CA49]/30 text-[#064E2D] flex items-center justify-center text-xs font-bold shrink-0">🧭</span>
            <span class="font-heading font-extrabold text-[#064E2D] uppercase tracking-wider text-[11px]">
              Next Adventure
            </span>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-heading font-bold bg-[#EDEAE4] text-[#538B57] border border-[#D9D4C8]">
            ${isEligible ? '~15 min on foot' : 'Outdoor Step'}
          </span>
        </div>

        <p class="text-xs text-[#064E2D] font-bold leading-snug pl-8">
          ${nextAdventureText}
        </p>

        <div class="pl-8 pt-1 text-[10px] text-[#538B57] flex items-center gap-1.5 border-t border-[#CAD8C5]/60">
          <span>🌿</span>
          <span>${nextAdventureTip}</span>
        </div>
      </div>

      <!-- ================================================================ -->
      <!-- 4. MORE DETAILS (Collapsed AI Transparency & Diagnostics)         -->
      <!-- ================================================================ -->
      <details class="group rounded-2xl border border-[#D9D4C8] bg-[#EDEAE4]/70 overflow-hidden text-xs transition-all shadow-2xs">
        <summary class="p-3.5 flex items-center justify-between cursor-pointer select-none list-none hover:bg-[#E2DED5]/60 transition-colors">
          <div class="flex items-center gap-2.5">
            <span class="text-sm">🔍</span>
            <div>
              <span class="font-heading font-extrabold text-[#064E2D] uppercase tracking-wider text-[11px] block">
                More details & diagnostics
              </span>
              <span class="text-[10px] text-[#538B57]">Full vision analysis, uncertainties & local AI runtime</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isRunningLocally 
                ? 'bg-[#E8F5EE] text-[#064E2D] border border-[#95D5B2]' 
                : hasError 
                  ? 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]' 
                  : 'bg-[#EDEAE4] text-[#538B57] border border-[#D9D4C8]'
            }">
              ${modelBadge}
            </span>
            <span class="text-[#538B57] text-xs transition-transform group-open:rotate-180">▼</span>
          </div>
        </summary>

        <div class="p-4 pt-1 space-y-3 border-t border-[#D9D4C8]/60 bg-[#FFFFFF]/70">
          <!-- Runtime Model Details -->
          <div class="p-2.5 rounded-xl bg-[#EDEAE4] border border-[#D9D4C8] space-y-1">
            <div class="flex items-center justify-between text-[11px]">
              <span class="font-heading font-extrabold text-[#538B57] uppercase tracking-wider">Vision Engine:</span>
              <span class="font-mono text-[10px] text-[#064E2D] font-bold truncate max-w-[210px]" title="${obs.modelName || this.activeModel}">
                ${obs.modelName || this.activeModel}
              </span>
            </div>
            <div class="flex items-center justify-between text-[10px] text-[#5A6E5F] pt-1 border-t border-[#D9D4C8]/60">
              <span>Ollama Q4_K_M GGUF · Apple Silicon</span>
              <span>100% On-Device · Latency: ${obs.inferenceLatencySec ? `${obs.inferenceLatencySec}s` : 'Instant'}</span>
            </div>
          </div>

          <!-- Error notice if inference failed -->
          ${hasError ? `
            <div class="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] space-y-1">
              <div class="font-heading font-bold text-xs text-[#B45309]">⚠️ Local Vision Notice</div>
              <p class="text-[11px] text-[#78350F]">${obs.analysisError}</p>
              <div class="text-[10px] text-[#B45309] font-medium pt-1 border-t border-[#FDE68A]/60">
                UNSEEN preserves your photo and notes without fabricating simulated findings.
              </div>
            </div>
          ` : ''}

          <!-- Complete visible features breakdown -->
          ${allFeatures.length > 0 ? `
            <div class="space-y-1">
              <span class="text-[10px] font-heading font-extrabold text-[#538B57] uppercase tracking-wider">All Visible Features (${allFeatures.length}):</span>
              <div class="flex flex-wrap gap-1.5">
                ${allFeatures.map(f => `
                  <span class="px-2 py-0.5 rounded-md bg-[#FFFFFF] border border-[#CAD8C5] text-[10px] font-medium text-[#14281D]">
                    • ${f}
                  </span>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Cautious hypotheses -->
          ${hasStructured && (obs.structuredAnalysis.possible_interpretations || []).length > 0 ? `
            <div class="space-y-1">
              <span class="text-[10px] font-heading font-extrabold text-[#92400E] uppercase tracking-wider">Unverified Hypotheses:</span>
              <div class="space-y-1">
                ${obs.structuredAnalysis.possible_interpretations.map(h => `
                  <div class="text-[11px] text-[#78350F] italic bg-[#FEF3C7]/60 p-2 rounded-lg border border-[#FDE68A]">
                    "${h}" <span class="not-italic text-[10px] font-bold text-[#B45309]">· (Hypothesis, not proven fact)</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Physical uncertainties -->
          ${hasStructured && (obs.structuredAnalysis.uncertainties || []).length > 0 ? `
            <div class="space-y-1">
              <span class="text-[10px] font-heading font-extrabold text-[#5A6E5F] uppercase tracking-wider">Physical Uncertainties:</span>
              <ul class="space-y-0.5 text-[11px] text-[#4A5B4E] list-disc list-inside bg-[#FFFFFF] p-2 rounded-xl border border-[#CAD8C5]">
                ${obs.structuredAnalysis.uncertainties.map(u => `<li>${u}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <!-- Photo attachment & Test triggers -->
          <div class="pt-2 border-t border-[#D9D4C8]/60 flex items-center gap-2">
            <button id="btn-attach-custom-photo" class="flex-1 py-1.5 px-2.5 rounded-xl bg-[#F8F6F1] hover:bg-[#FFFFFF] border border-[#D9D4C8] text-[11px] font-heading font-bold text-[#064E2D] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs">
              <span>📷</span>
              <span>Upload Photo</span>
            </button>
            <button id="btn-sample-discovery-photo" class="flex-1 py-1.5 px-2.5 rounded-xl bg-[#E8F5EE] hover:bg-[#D4EDDF] border border-[#95D5B2] text-[11px] font-heading font-bold text-[#064E2D] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs">
              <span>🌲</span>
              <span>Test Specimen Photo</span>
            </button>
          </div>
        </div>
      </details>

      <!-- ================================================================ -->
      <!-- 5. JOURNAL ACTION (State-Aware: Study Entry vs Eligible vs Error)-->
      <!-- ================================================================ -->
      ${hasError ? `
        <!-- Case A: Inference Failure -->
        <div class="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] space-y-3 shadow-2xs">
          <div class="flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <span class="text-base">⚠️</span>
              <span class="font-heading font-extrabold text-[#92400E] uppercase tracking-wider text-[11px]">
                Analysis Notice
              </span>
            </div>
            <span class="text-[10px] font-heading font-bold text-[#92400E] px-2 py-0.5 rounded-full bg-[#FEF3C7] border border-[#FDE68A]">
              Evidence Preserved
            </span>
          </div>

          <p class="text-xs text-[#78350F] leading-relaxed">
            ${obs.analysisError || 'Local vision analysis could not be completed.'} Your field photo and notes remain preserved.
          </p>

          <div class="flex items-center gap-2 pt-2 border-t border-[#FDE68A]/70">
            <button id="btn-retry-inference" class="flex-1 py-2 px-3 rounded-xl bg-[#064E2D] text-[#EDEAE4] font-heading font-bold text-xs uppercase tracking-wider hover:bg-[#083D24] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm">
              <span>🔄</span><span>Retry Analysis</span>
            </button>
            <button id="btn-edit-observation" class="flex-1 py-2 px-3 rounded-xl bg-[#EDEAE4] text-[#064E2D] font-heading font-bold text-xs uppercase tracking-wider hover:bg-[#E2DED5] border border-[#CAD8C5] transition-all flex items-center justify-center gap-1.5 cursor-pointer">
              <span>✏️</span><span>Edit Observation</span>
            </button>
          </div>
        </div>
      ` : (obs.eligibilityStatus === 'ineligible' || obs.isRewardEligible === false) ? `
        <!-- Case B: Study Entry / Digital Rendering (No large empty reward box) -->
        <div class="p-4 rounded-2xl bg-[#EDEAE4] border border-[#D9D4C8] space-y-3 shadow-2xs">
          <div class="flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <span class="text-base">📓</span>
              <span class="font-heading font-extrabold text-[#064E2D] uppercase tracking-wider text-[11px]">
                Field Journal Record
              </span>
            </div>
            <span class="text-[10px] font-heading font-bold text-[#78350F] px-2 py-0.5 rounded-full bg-[#F8F6F1] border border-[#D9D4C8]">
              Study Record Preserved
            </span>
          </div>

          <p class="text-xs text-[#5A6E5F] leading-relaxed">
            This study observation is preserved in your field journal. Living Sanctuary transfers and physical rewards are reserved for authentic outdoor nature walks.
          </p>

          <div class="pt-2 border-t border-[#D9D4C8]">
            <button id="btn-save-study-journal" class="w-full py-2.5 px-4 rounded-xl font-heading font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              isPreserved 
                ? 'bg-[#E8F5EE] text-[#064E2D] border border-[#95D5B2] cursor-default' 
                : 'bg-[#064E2D] text-[#EDEAE4] hover:bg-[#083D24] shadow-sm cursor-pointer'
            }">
              <span>${isPreserved ? '✓ Recorded in Field Journal' : 'Record in Field Journal'}</span>
            </button>
          </div>
        </div>
      ` : `
        <!-- Case C: Eligible Outdoor Observation or Baseline Specimen -->
        <div class="space-y-3">
          <!-- Findings to Collect List -->
          <div class="flex items-center justify-between text-xs">
            <span class="font-heading font-extrabold text-[#064E2D] uppercase tracking-wider text-[11px]">
              Findings to Collect
            </span>
            <span class="text-[10px] font-heading font-bold text-[#538B57]">
              ${validConfirmedCount} of ${totalCandidates} findings confirmed
            </span>
          </div>

          ${candidates.length > 0 ? `
            <div class="space-y-2">
              ${candidates.map(el => {
                const icon = getFindIcon(el.name, el.category);
                const isConfirmed = !!el.confirmed;
                return `
                  <div class="finding-card p-3 rounded-2xl bg-[#FFFFFF] border ${
                    isConfirmed ? 'border-[#95D5B2] bg-[#F7FCF9]' : 'border-[#E2DED5]'
                  } shadow-2xs flex items-center justify-between gap-3" data-row-id="${el.id}">
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-9 h-9 rounded-xl ${
                        isConfirmed ? 'bg-[#E8F5EE] border-[#95D5B2]' : 'bg-[#F8F6F1] border-[#E2DED5]'
                      } text-[#064E2D] flex items-center justify-center text-base shrink-0 border">
                        ${icon}
                      </div>
                      <div class="min-w-0">
                        <div class="font-heading font-extrabold text-xs sm:text-sm text-[#064E2D] truncate">
                          ${el.name}
                        </div>
                        <div class="text-[11px] text-[#538B57] truncate">
                          ${el.category || 'Natural Feature'}
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center gap-2.5 shrink-0">
                      <div class="text-right">
                        ${el.grantsItemName ? `
                          <div class="text-[10px] font-heading font-extrabold text-[#E96D2C]">
                            ${el.grantsItemName}
                          </div>
                        ` : ''}
                        <div class="text-[10px] text-[#538B57] font-mono font-bold">
                          ${isConfirmed ? `+${el.suggestedReward || 0} DM` : `(+${el.suggestedReward || 0} DM)`}
                        </div>
                      </div>

                      <button 
                        class="btn-toggle-find px-3 py-1.5 rounded-xl text-xs font-heading font-bold transition-all cursor-pointer ${
                          isConfirmed 
                            ? 'bg-[#064E2D] text-[#EDEAE4] hover:bg-[#083D24] shadow-xs' 
                            : 'bg-[#F8F6F1] text-[#4A5B4E] border border-[#D9D4C8] hover:bg-[#EDEAE4]'
                        }"
                        data-el-id="${el.id}"
                        aria-label="${isConfirmed ? 'Remove finding' : 'Collect finding'}"
                      >
                        ${isConfirmed ? '✓ Collected' : '+ Collect'}
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div class="p-4 rounded-2xl bg-[#EDEAE4] border border-[#D9D4C8] text-center text-xs text-[#6B7280]">
              No candidate findings recorded for this specimen.
            </div>
          `}

          <!-- Yield & Action Box -->
          <div class="p-3.5 rounded-2xl bg-[#EDEAE4] border border-[#D9D4C8] space-y-2.5 shadow-2xs">
            <div class="flex items-center justify-between text-xs">
              <span class="font-heading font-extrabold text-[#064E2D] uppercase tracking-wider text-[10px]">
                Sanctuary Yield:
              </span>
              <span class="font-display font-extrabold text-sm text-[#064E2D]">
                +${totalMaterials} Discovery Materials ${eligibleItems.length > 0 ? `· ${eligibleItems.map(i => i.grantsItemName).join(', ')}` : ''}
              </span>
            </div>

            ${isAlreadyClaimed ? `
              <div class="pt-2 border-t border-[#D9D4C8] flex items-center justify-between gap-3">
                <div class="flex items-center gap-1.5 text-xs text-[#064E2D] font-heading font-bold">
                  <span>✓</span>
                  <span>Catalogued in Sanctuary</span>
                </div>
                <button id="btn-discovery-to-world" class="px-4 py-2 rounded-xl bg-[#064E2D] text-[#EDEAE4] font-heading font-bold text-xs uppercase tracking-wider hover:bg-[#083D24] transition-all cursor-pointer shadow-sm flex items-center gap-1.5">
                  <span>Enter My World</span>
                  <span>→</span>
                </button>
              </div>
            ` : `
              <div class="pt-2 border-t border-[#D9D4C8] space-y-1.5">
                <button 
                  id="btn-claim-rewards" 
                  class="w-full py-2.5 px-4 rounded-xl font-heading font-bold text-xs uppercase tracking-wider text-[#EDEAE4] transition-all flex items-center justify-center gap-2 shadow-sm ${
                    validConfirmedCount > 0 
                      ? 'bg-[#064E2D] hover:bg-[#083D24] cursor-pointer' 
                      : 'bg-[#9CA3AF] opacity-60 cursor-not-allowed'
                  }"
                  ${validConfirmedCount === 0 ? 'disabled' : ''}
                >
                  <span>Bring discoveries to my world</span>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                  </svg>
                </button>
                ${validConfirmedCount === 0 ? `
                  <p class="text-[10px] text-[#6B7280] text-center">Tap '+ Collect' on at least one finding above to bring to your world.</p>
                ` : ''}
              </div>
            `}
          </div>
        </div>
      `}
    `;

    // Reattach listeners inside journal panel
    this.attachJournalEvents();
  }

  attachDomEvents() {
    // 1. Specimen quick-pick buttons
    this.containerEl.querySelectorAll('.btn-pick-sample').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-sample-id');
        this.loadSample(id);
      });
    });

    // 2. Camera Controls (Reset, Zoom In, Zoom Out)
    const resetBtn = this.containerEl.querySelector('#btn-discovery-reset-cam');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (this.specimen3D) this.specimen3D.resetCamera();
      });
    }

    const zoomInBtn = this.containerEl.querySelector('#btn-discovery-zoom-in');
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        if (this.specimen3D) this.specimen3D.zoomIn();
      });
    }

    const zoomOutBtn = this.containerEl.querySelector('#btn-discovery-zoom-out');
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        if (this.specimen3D) this.specimen3D.zoomOut();
      });
    }

    // 3. Photo Replacement Trigger in 3D inset
    const photoReplaceBtn = this.containerEl.querySelector('#btn-trigger-photo-replace');
    const fileInput = this.containerEl.querySelector('#discovery-photo-input');
    if (photoReplaceBtn && fileInput) {
      photoReplaceBtn.addEventListener('click', () => {
        fileInput.click();
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.attachPhotoFile(e.target.files[0]);
        }
      });
    }
  }

  attachJournalEvents() {
    // 1. Finding Toggle Buttons (for eligible observations)
    this.containerEl.querySelectorAll('.btn-toggle-find').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-el-id');
        this.toggleElement(id);
      });
    });

    // 2. Primary Claim Rewards Action (for eligible observations)
    const claimBtn = this.containerEl.querySelector('#btn-claim-rewards');
    if (claimBtn) {
      claimBtn.addEventListener('click', () => {
        this.claimObservation();
      });
    }

    // 3. Navigate to 3D World after Claim
    const toWorldBtn = this.containerEl.querySelector('#btn-discovery-to-world');
    if (toWorldBtn) {
      toWorldBtn.addEventListener('click', () => {
        if (this.onGoToWorld) this.onGoToWorld();
      });
    }

    // 4. Record Study Entry in Journal
    const saveStudyBtn = this.containerEl.querySelector('#btn-save-study-journal');
    if (saveStudyBtn) {
      saveStudyBtn.addEventListener('click', () => {
        this.recordStudyEntryInJournal();
      });
    }

    // 5. Retry Inference (for failed local inference)
    const retryBtn = this.containerEl.querySelector('#btn-retry-inference');
    if (retryBtn) {
      retryBtn.addEventListener('click', async () => {
        if (this.currentObservation) {
          await this.analyzeObservation({
            imageSrc: this.currentObservation.imageSrc,
            fieldNote: this.currentObservation.fieldNote,
            title: this.currentObservation.title
          });
        }
      });
    }

    // 6. Edit in Observation (for failed local inference or adjustments)
    const editBtn = this.containerEl.querySelector('#btn-edit-observation');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        if (this.onNavigate) {
          this.onNavigate('observe');
        } else {
          window.location.hash = 'observe';
        }
      });
    }

    // 7. Attach Custom Photo Trigger in Collapsed Details
    const attachPhotoBtn = this.containerEl.querySelector('#btn-attach-custom-photo');
    const fileInput = this.containerEl.querySelector('#discovery-photo-input');
    if (attachPhotoBtn && fileInput) {
      attachPhotoBtn.addEventListener('click', () => {
        fileInput.click();
      });
    }

    // 8. Load Sample Photo in Collapsed Details
    const samplePhotoBtn = this.containerEl.querySelector('#btn-sample-discovery-photo');
    if (samplePhotoBtn) {
      samplePhotoBtn.addEventListener('click', async () => {
        try {
          const res = await fetch('/experiments/kill-test/photos/p08_a.jpeg');
          const blob = await res.blob();
          const reader = new FileReader();
          reader.onload = async (e) => {
            const dataUrl = e.target.result;
            await this.analyzeObservation({
              imageSrc: dataUrl,
              fieldNote: 'Field observation: solitary oak tree with expansive canopy in grassy field.',
              title: 'Solitary Oak Tree Observation'
            });
          };
          reader.readAsDataURL(blob);
        } catch (err) {
          console.error('Failed to load sample photo', err);
        }
      });
    }
  }
}
