// UNSEEN — World Dashboard State & Inventory Economy Management
// Handles Walk Sessions, Observations, Deterministic Rewards, Earned Inventory, Placed Objects, and Persistence

export const STORAGE_KEY = 'unseen_world_state_v2';

// Configurable Reward Table for Completed Walking Sessions
export const WALKING_REWARD_TABLE = [
  { durationMinutes: 10, walkingPoints: 20, estimatedSteps: 1100 },
  { durationMinutes: 15, walkingPoints: 32, estimatedSteps: 1650 },
  { durationMinutes: 20, walkingPoints: 45, estimatedSteps: 2200 },
  { durationMinutes: 25, walkingPoints: 60, estimatedSteps: 2750 },
  { durationMinutes: 30, walkingPoints: 75, estimatedSteps: 3300 },
  { durationMinutes: 35, walkingPoints: 90, estimatedSteps: 3850 },
  { durationMinutes: 40, walkingPoints: 110, estimatedSteps: 4400 },
  { durationMinutes: 45, walkingPoints: 130, estimatedSteps: 4950 },
  { durationMinutes: 50, walkingPoints: 150, estimatedSteps: 5500 },
  { durationMinutes: 60, walkingPoints: 190, estimatedSteps: 6600 },
];

// Catalogue of Placeable Objects (Definitions & Tiers)
export const CATALOGUE = {
  nature: [
    {
      id: 'ancient_oak',
      name: 'Ancient Oak',
      category: 'nature',
      icon: '🌳',
      description: 'A deep-rooted deciduous tree with a broad, sheltering leaf canopy.',
      upgradeCost: { wp: 40, dm: 3 },
      maxTier: 3,
      tiers: [
        { tier: 1, name: 'Sapling Oak', desc: 'A young oak taking root in the fertile soil.' },
        { tier: 2, name: 'Broadleaf Oak', desc: 'Mature foliage that casts a welcoming shade.' },
        { tier: 3, name: 'Elder Monarch', desc: 'Centuries-old oak with sprawling roots and firefly hollows.' },
      ]
    },
    {
      id: 'pine_cluster',
      name: 'Pine Cluster',
      category: 'nature',
      icon: '🌲',
      description: 'A resilient cluster of fragrant mountain evergreens.',
      upgradeCost: { wp: 35, dm: 2 },
      maxTier: 2,
      tiers: [
        { tier: 1, name: 'Pine Trio', desc: 'Slender conifers braving the mountain wind.' },
        { tier: 2, name: 'High Needle Spire', desc: 'Tall, majestic pines covered in soft moss.' },
      ]
    },
    {
      id: 'mossy_boulder',
      name: 'Mossy Boulder',
      category: 'nature',
      icon: '🪨',
      description: 'Weathered river granite wrapped in vibrant green moss cushions.',
      upgradeCost: { wp: 30, dm: 2 },
      maxTier: 2,
      tiers: [
        { tier: 1, name: 'Granite Rock', desc: 'Cold cut stone resting along the clearing edge.' },
        { tier: 2, name: 'Standing Monolith', desc: 'A towering natural monolith etched by weathering.' },
      ]
    },
    {
      id: 'wild_ferns',
      name: 'Wild Ferns',
      category: 'nature',
      icon: '🌿',
      description: 'Lush undergrowth fronds that flourish in damp forest shade.',
      upgradeCost: { wp: 25, dm: 2 },
      maxTier: 2,
      tiers: [
        { tier: 1, name: 'Fern Bush', desc: 'Sprouting fiddleheads and soft fronds.' },
        { tier: 2, name: 'Bioluminescent Fronds', desc: 'Glowing spores illuminate the forest floor at night.' },
      ]
    }
  ],
  structures: [
    {
      id: 'stone_cairn',
      name: 'Stone Cairn',
      category: 'structures',
      icon: '⛰️',
      description: 'Balanced waymarker stone stack indicating trailheads and sacred paths.',
      upgradeCost: { wp: 50, dm: 3 },
      maxTier: 3,
      tiers: [
        { tier: 1, name: 'Trail Cairn', desc: 'Simple stacked stones indicating a trailhead.' },
        { tier: 2, name: 'Beacon Cairn', desc: 'Higher masonry with a protective lantern recess.' },
        { tier: 3, name: 'Keystone Monument', desc: 'Ancient stone archway housing a floating golden relic.' },
      ]
    },
    {
      id: 'field_shelter',
      name: 'Field Shelter',
      category: 'structures',
      icon: '⛺',
      description: 'A modest canvas bivouac or timber outpost for weary field surveyors.',
      upgradeCost: { wp: 60, dm: 4 },
      maxTier: 2,
      tiers: [
        { tier: 1, name: 'Survey Bivouac', desc: 'Waxed canvas ridge tent with field maps inside.' },
        { tier: 2, name: 'Timber Outpost', desc: 'Weatherproof timber cabin with stone hearth chimney.' },
      ]
    },
    {
      id: 'watchtower',
      name: 'Field Watchtower',
      category: 'structures',
      icon: '🗼',
      description: 'An elevated wooden observation tower for spotting distant landmarks.',
      upgradeCost: { wp: 75, dm: 5 },
      maxTier: 2,
      tiers: [
        { tier: 1, name: 'Timber Lookout', desc: 'High timber lookout platform with brass telescope.' },
        { tier: 2, name: 'High Beacon Tower', desc: 'Reinforced tower with beacon brazier.' },
      ]
    },
    {
      id: 'house_foundation',
      name: 'Hearthstone Foundation',
      category: 'structures',
      icon: '🏡',
      description: 'Dressed granite and heavy-timber foundation for your future sanctuary dwelling.',
      upgradeCost: { wp: 80, dm: 6 },
      maxTier: 2,
      tiers: [
        { tier: 1, name: 'Hearth Foundation', desc: 'Dressed granite plinth, mortared chimney base, and timber sills.' },
        { tier: 2, name: 'Framed Pavilion', desc: 'Timber post-and-beam frame with raised cedar deck.' },
      ]
    }
  ],
  paths: [
    {
      id: 'earth_trail',
      name: 'Beaten Trail',
      category: 'paths',
      icon: '🥾',
      description: 'A well-trodden dirt trail packed smooth by countless walks.',
      upgradeCost: { wp: 20, dm: 1 },
      maxTier: 2,
      tiers: [
        { tier: 1, name: 'Dirt Footpath', desc: 'Natural earth pathway with scattered pine needles.' },
        { tier: 2, name: 'Gravel Track', desc: 'Crushed stone gravel resilient to heavy rainfall.' },
      ]
    },
    {
      id: 'flagstone_paver',
      name: 'Flagstone Paver',
      category: 'paths',
      icon: '🧱',
      description: 'Hand-cut granite pavers set with living moss joints.',
      upgradeCost: { wp: 28, dm: 2 },
      maxTier: 2,
      tiers: [
        { tier: 1, name: 'Weathered Flags', desc: 'Ancient stones smoothed by centuries of boots.' },
        { tier: 2, name: 'Bordered Cobbles', desc: 'Carved stone curb with embedded glow-lichen.' },
      ]
    },
    {
      id: 'wooden_boardwalk',
      name: 'Boardwalk',
      category: 'paths',
      icon: '🪵',
      description: 'Elevated timber boardwalk keeping boots dry above wetlands.',
      upgradeCost: { wp: 30, dm: 2 },
      maxTier: 2,
      tiers: [
        { tier: 1, name: 'Timber Plankway', desc: 'Rustic cedar planks pegged above marshy soil.' },
        { tier: 2, name: 'Railed Boardwalk', desc: 'Polished cedar handrails and lantern brackets.' },
      ]
    }
  ],
  water: [
    {
      id: 'stream_tile',
      name: 'Forest Stream',
      category: 'water',
      icon: '🌊',
      description: 'Clear glacial runoff murmuring over smooth river pebbles.',
      upgradeCost: { wp: 40, dm: 3 },
      maxTier: 2,
      tiers: [
        { tier: 1, name: 'Babbling Brook', desc: 'Shallow flowing water reflecting the forest canopy.' },
        { tier: 2, name: 'Deep Waterway', desc: 'Deeper channel lined with watercress and smoothed rocks.' },
      ]
    },
    {
      id: 'natural_spring',
      name: 'Natural Spring',
      category: 'water',
      icon: '💧',
      description: 'A bubbling subterranean aquifer rising through fissures.',
      upgradeCost: { wp: 55, dm: 4 },
      maxTier: 2,
      tiers: [
        { tier: 1, name: 'Stone Spring', desc: 'Cold bubbling pool circled by flat stones.' },
        { tier: 2, name: 'Sanctuary Pool', desc: 'Crystal basin with glowing luminescent reeds.' },
      ]
    },
    {
      id: 'lily_basin',
      name: 'Lily Basin',
      category: 'water',
      icon: '🪷',
      description: 'Quiet still pond waters dotted with flowering lily pads.',
      upgradeCost: { wp: 35, dm: 2 },
      maxTier: 2,
      tiers: [
        { tier: 1, name: 'Pond Basin', desc: 'Calm water surface with green lily leaves.' },
        { tier: 2, name: 'Lotus Sanctuary', desc: 'Full bloom white lotus petals glowing in twilight.' },
      ]
    }
  ],
  vehicles: [
    {
      id: 'handcart',
      name: 'Survey Handcart',
      category: 'vehicles',
      icon: '🛒',
      description: 'Two-wheeled wooden cart laden with field specimens and tools.',
      upgradeCost: { wp: 45, dm: 3 },
      maxTier: 2,
      tiers: [
        { tier: 1, name: 'Timber Handcart', desc: 'Sturdy oak spoke wheels carrying survey gear.' },
        { tier: 2, name: 'Covered Wagonette', desc: 'Weatherproof canvas-topped mobile specimen lab.' },
      ]
    },
    {
      id: 'pack_bicycle',
      name: 'Expedition Bike',
      category: 'vehicles',
      icon: '🚲',
      description: 'Rugged gravel-touring bicycle equipped with canvas panniers.',
      upgradeCost: { wp: 60, dm: 4 },
      maxTier: 2,
      tiers: [
        { tier: 1, name: 'Trail Bicycle', desc: 'Steel-frame bicycle with front and rear racks.' },
        { tier: 2, name: 'Surveyor Rig', desc: 'Integrated dynamo headlight and GPS surveying tripod.' },
      ]
    },
    {
      id: 'field_canoe',
      name: 'Field Canoe',
      category: 'vehicles',
      icon: '🛶',
      description: 'Cedar-strip exploration canoe suited for shallow river waterways.',
      upgradeCost: { wp: 50, dm: 3 },
      maxTier: 2,
      tiers: [
        { tier: 1, name: 'Cedar Canoe', desc: 'Lightweight canoe with ash-wood oars resting inside.' },
        { tier: 2, name: 'River Skiff', desc: 'Reinforced keel with brass compass and lantern bow.' },
      ]
    }
  ]
};

// Starting World Grid (Clean personal garden with unobstructed central building lawn)
export function createDefaultWorldGrid() {
  return [
    // Starter perimeter plantings only — central home building area is open & spacious
    { id: 'placed_init_1', itemId: 'ancient_oak', x: 0, y: 1, rotation: 0, tier: 1 },
    { id: 'placed_init_2', itemId: 'wild_ferns', x: 1, y: 0, rotation: 30, tier: 1 },
    { id: 'placed_init_3', itemId: 'mossy_boulder', x: 9, y: 1, rotation: 15, tier: 1 },
    { id: 'placed_init_4', itemId: 'wild_ferns', x: 8, y: 9, rotation: 45, tier: 1 },
  ];
}

// Initial Earned Inventory (Unplaced items earned and available to place)
export function createDefaultEarnedInventory() {
  return {
    'ancient_oak': 1,
    'wild_ferns': 2,
    'earth_trail': 3,
    'mossy_boulder': 1,
  };
}

export function createDefaultActivities() {
  return [
    {
      id: 'act_init_1',
      type: 'walk',
      timestamp: 'Earlier today',
      title: 'Morning Forest Trail Walk',
      detail: 'Completed 25 min walk. Earned +60 Walking Points (~2,750 estimated steps).'
    },
    {
      id: 'act_init_2',
      type: 'observation',
      timestamp: 'Earlier today',
      title: 'Discovery Verified: Forest Canopy & Granite',
      detail: 'Verified physical landmark. Earned 1x Ancient Oak, 1x Mossy Boulder, and +3 Discovery Materials.'
    }
  ];
}

export class DashboardState {
  constructor() {
    this.listeners = new Set();
    this.loadState();
  }

  loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.worldName = parsed.worldName || 'Elder Grove';
        this.walkingPoints = parsed.walkingPoints ?? 120;
        this.discoveryMaterials = parsed.discoveryMaterials ?? 8;
        this.totalStepsEstimated = parsed.totalStepsEstimated ?? 5500;
        this.gridSize = parsed.gridSize || 10;
        this.earnedInventory = parsed.earnedInventory || createDefaultEarnedInventory();
        let loadedObjects = parsed.placedObjects || createDefaultWorldGrid();
        // Remove legacy cluttered starter items that occupied the central lawn
        if (Array.isArray(loadedObjects)) {
          loadedObjects = loadedObjects.filter(obj => {
            if (obj.id && (obj.id.startsWith('placed_init_') || obj.id.startsWith('init_'))) {
              // Only keep the clean edge starter items 1-4, remove 5-10
              return ['placed_init_1', 'placed_init_2', 'placed_init_3', 'placed_init_4'].includes(obj.id);
            }
            // Remove legacy default path/stream tiles that crossed the central building lawn
            if (['earth_trail', 'stream_tile', 'stone_trail'].includes(obj.itemId)) {
              return false;
            }
            return true;
          });
        }
        this.placedObjects = loadedObjects;
        this.activeWalkSession = parsed.activeWalkSession || null;
        this.completedWalks = parsed.completedWalks || [];
        this.pendingObservation = parsed.pendingObservation || null;
        this.claimedObservationIds = new Set(parsed.claimedObservationIds || ['sample_preset_1']);
        this.activities = parsed.activities || createDefaultActivities();
        this.saveState();
        return;
      }
    } catch (e) {
      console.warn('[UNSEEN] Error reading saved state from localStorage, initializing fresh:', e);
    }

    // Default Fresh State
    this.worldName = 'Elder Grove';
    this.walkingPoints = 120;
    this.discoveryMaterials = 8;
    this.totalStepsEstimated = 5500;
    this.gridSize = 10;
    this.earnedInventory = createDefaultEarnedInventory();
    this.placedObjects = createDefaultWorldGrid();
    this.activeWalkSession = null;
    this.completedWalks = [];
    this.pendingObservation = null;
    this.claimedObservationIds = new Set(['sample_preset_1']);
    this.activities = createDefaultActivities();
  }

  saveState() {
    try {
      const data = {
        worldName: this.worldName,
        walkingPoints: this.walkingPoints,
        discoveryMaterials: this.discoveryMaterials,
        totalStepsEstimated: this.totalStepsEstimated,
        gridSize: this.gridSize,
        earnedInventory: this.earnedInventory,
        placedObjects: this.placedObjects,
        activeWalkSession: this.activeWalkSession,
        completedWalks: this.completedWalks,
        pendingObservation: this.pendingObservation,
        claimedObservationIds: Array.from(this.claimedObservationIds || []),
        activities: (this.activities || []).slice(0, 30),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[UNSEEN] Could not save state to localStorage:', e);
    }
    this.notify();
  }

  resetToDefault() {
    this.worldName = 'Elder Grove';
    this.walkingPoints = 120;
    this.discoveryMaterials = 8;
    this.totalStepsEstimated = 5500;
    this.earnedInventory = createDefaultEarnedInventory();
    this.placedObjects = createDefaultWorldGrid();
    this.activeWalkSession = null;
    this.completedWalks = [];
    this.pendingObservation = null;
    this.claimedObservationIds = new Set();
    this.activities = createDefaultActivities();
    this.saveState();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify() {
    for (const fn of this.listeners) {
      try {
        fn(this);
      } catch (err) {
        console.error('[UNSEEN] Listener error:', err);
      }
    }
  }

  getCatalogueItem(itemId) {
    for (const category of Object.values(CATALOGUE)) {
      const found = category.find(item => item.id === itemId);
      if (found) return found;
    }
    return null;
  }

  getObjectAt(x, y) {
    return this.placedObjects.find(obj => obj.x === x && obj.y === y);
  }

  /* -------------------------------------------------------------------------- */
  /* 1. WALK SESSION & TIMER MANAGEMENT                                         */
  /* -------------------------------------------------------------------------- */
  startWalk(durationMinutes) {
    const now = Date.now();
    const durationMs = durationMinutes * 60 * 1000;

    this.activeWalkSession = {
      id: `walk_${now}`,
      targetDurationMinutes: durationMinutes,
      startTimestamp: now,
      endTimestamp: now + durationMs,
      isPaused: false,
      pausedRemainingSeconds: null,
      status: 'in_progress'
    };

    this.addActivity({
      type: 'walk',
      title: `Walk Started (${durationMinutes} min)`,
      detail: `Headed outdoors. Phone in pocket, observing surrounding details.`
    });

    this.saveState();
    return this.activeWalkSession;
  }

  getWalkRemainingSeconds() {
    if (!this.activeWalkSession) return 0;
    if (this.activeWalkSession.isPaused) {
      return this.activeWalkSession.pausedRemainingSeconds || 0;
    }
    const remMs = this.activeWalkSession.endTimestamp - Date.now();
    return Math.max(0, Math.round(remMs / 1000));
  }

  pauseWalk() {
    if (!this.activeWalkSession || this.activeWalkSession.isPaused) return;
    const remaining = this.getWalkRemainingSeconds();
    this.activeWalkSession.isPaused = true;
    this.activeWalkSession.pausedRemainingSeconds = remaining;
    this.saveState();
  }

  resumeWalk() {
    if (!this.activeWalkSession || !this.activeWalkSession.isPaused) return;
    const remaining = this.activeWalkSession.pausedRemainingSeconds || 0;
    this.activeWalkSession.endTimestamp = Date.now() + (remaining * 1000);
    this.activeWalkSession.isPaused = false;
    this.activeWalkSession.pausedRemainingSeconds = null;
    this.saveState();
  }

  completeWalk(isEarly = false) {
    if (!this.activeWalkSession) return null;

    const session = this.activeWalkSession;
    const elapsedMinutes = Math.min(
      session.targetDurationMinutes,
      Math.max(1, Math.round((Date.now() - session.startTimestamp) / (60 * 1000)))
    );

    // Explicit Reward Rule:
    // If completed fully: award the target duration's reward
    // If ended early: find highest reward tier <= elapsedMinutes, or proportional
    let reward;
    if (!isEarly) {
      reward = WALKING_REWARD_TABLE.find(r => r.durationMinutes === session.targetDurationMinutes)
        || { durationMinutes: session.targetDurationMinutes, walkingPoints: session.targetDurationMinutes * 2.5, estimatedSteps: session.targetDurationMinutes * 110 };
    } else {
      // Find highest tier matching elapsed time
      const eligibleTiers = WALKING_REWARD_TABLE.filter(r => r.durationMinutes <= elapsedMinutes);
      if (eligibleTiers.length > 0) {
        reward = eligibleTiers[eligibleTiers.length - 1];
      } else {
        // Less than 10 minutes: proportional calculation
        reward = {
          durationMinutes: elapsedMinutes,
          walkingPoints: Math.max(5, Math.round(elapsedMinutes * 1.8)),
          estimatedSteps: elapsedMinutes * 110
        };
      }
    }

    // Award Points
    this.walkingPoints += reward.walkingPoints;
    this.totalStepsEstimated += reward.estimatedSteps;

    const completedRecord = {
      id: session.id,
      completedAt: new Date().toISOString(),
      durationMinutes: reward.durationMinutes,
      targetDurationMinutes: session.targetDurationMinutes,
      walkingPointsEarned: reward.walkingPoints,
      estimatedSteps: reward.estimatedSteps,
      isEarly
    };

    this.completedWalks.unshift(completedRecord);
    this.activeWalkSession = null;

    this.addActivity({
      type: 'walk',
      title: `Completed Walk (${reward.durationMinutes} min)`,
      detail: `Earned +${reward.walkingPoints} Walking Points (~${reward.estimatedSteps.toLocaleString()} estimated steps).`
    });

    this.saveState();
    return completedRecord;
  }

  /* -------------------------------------------------------------------------- */
  /* 2. OBSERVATION & DISCOVERY CLAIMING (IDEMPOTENT)                          */
  /* -------------------------------------------------------------------------- */
  setPendingObservation(obsData) {
    this.pendingObservation = {
      id: `obs_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      claimed: false,
      ...obsData
    };
    this.saveState();
    return this.pendingObservation;
  }

  hasClaimedObservation(observationId) {
    return this.claimedObservationIds ? this.claimedObservationIds.has(observationId) : false;
  }

  claimObservationRewards(observationId, confirmedElements, observationMetadata = null) {
    if (this.claimedObservationIds.has(observationId)) {
      return { success: false, message: 'This observation has already been claimed.' };
    }

    const obs = observationMetadata || (this.pendingObservation && this.pendingObservation.id === observationId ? this.pendingObservation : null);
    if (obs && (obs.eligibilityStatus === 'ineligible' || obs.isRewardEligible === false)) {
      return { 
        success: false, 
        message: 'This observation is ineligible for physical-world rewards (identified as a digital rendering or non-physical scene).' 
      };
    }

    // Filter out any elements marked ineligible
    const validConfirmed = (confirmedElements || []).filter(el => !el.ineligible);
    if (validConfirmed.length === 0) {
      return { success: false, message: 'Please confirm at least one verified physical observation element.' };
    }

    let earnedItems = [];
    let earnedMaterials = 0;

    // Deterministic Reward Rules based on confirmed elements:
    validConfirmed.forEach(el => {
      const cat = (el.category || '').toLowerCase();
      const name = (el.name || '').toLowerCase();

      const matReward = typeof el.suggestedReward === 'number' ? el.suggestedReward : 1;
      earnedMaterials += matReward;

      // Deterministic Placeable Object Assignment:
      // Respect explicit el.grantsItem property if defined
      if (el.grantsItem) {
        const qty = el.grantsItemQty || (el.grantsItem === 'earth_trail' ? 2 : 1);
        this.addInventoryItem(el.grantsItem, qty);
        earnedItems.push({ itemId: el.grantsItem, name: el.grantsItemName || el.name, qty });
      } else if (el.grantsItem === null) {
        // Explicitly grants no placeable item (e.g. unverified or material-only finding)
      } else if (name.includes('oak') || name.includes('canopy') || name.includes('tree') || cat.includes('tree')) {
        this.addInventoryItem('ancient_oak', 1);
        earnedItems.push({ itemId: 'ancient_oak', name: 'Ancient Oak', qty: 1 });
      } else if (name.includes('pine') || name.includes('conifer')) {
        this.addInventoryItem('pine_cluster', 1);
        earnedItems.push({ itemId: 'pine_cluster', name: 'Pine Cluster', qty: 1 });
      } else if (name.includes('fern') || name.includes('moss') || name.includes('lichen') || cat.includes('flora')) {
        this.addInventoryItem('wild_ferns', 1);
        earnedItems.push({ itemId: 'wild_ferns', name: 'Wild Ferns', qty: 1 });
      } else if (name.includes('arch') || name.includes('stone') || name.includes('cairn') || cat.includes('mineral')) {
        this.addInventoryItem('stone_cairn', 1);
        earnedItems.push({ itemId: 'stone_cairn', name: 'Stone Cairn', qty: 1 });
      } else if (name.includes('boulder') || name.includes('rock') || cat.includes('geology')) {
        this.addInventoryItem('mossy_boulder', 1);
        earnedItems.push({ itemId: 'mossy_boulder', name: 'Mossy Boulder', qty: 1 });
      } else if (name.includes('stream') || name.includes('water') || name.includes('creek') || cat.includes('water')) {
        this.addInventoryItem('stream_tile', 1);
        earnedItems.push({ itemId: 'stream_tile', name: 'Forest Stream', qty: 1 });
      } else if (name.includes('trail') || name.includes('path') || name.includes('post') || cat.includes('pedestrian')) {
        this.addInventoryItem('earth_trail', 2);
        earnedItems.push({ itemId: 'earth_trail', name: 'Beaten Trail', qty: 2 });
      } else if (name.includes('cart') || name.includes('wagon') || cat.includes('vehicle')) {
        this.addInventoryItem('handcart', 1);
        earnedItems.push({ itemId: 'handcart', name: 'Survey Handcart', qty: 1 });
      }
    });

    // Safeguard: A verified eligible physical outdoor observation must receive at least baseline rewards
    if (earnedMaterials === 0 && obs && obs.isRewardEligible) {
      earnedMaterials = 2;
    }
    if (earnedItems.length === 0 && obs && obs.isRewardEligible) {
      this.addInventoryItem('wild_ferns', 1);
      earnedItems.push({ itemId: 'wild_ferns', name: 'Wild Ferns', qty: 1 });
    }

    this.discoveryMaterials += earnedMaterials;
    this.claimedObservationIds.add(observationId);

    if (this.pendingObservation && this.pendingObservation.id === observationId) {
      this.pendingObservation.claimed = true;
    }

    const itemSummary = earnedItems.map(i => `${i.qty}x ${i.name}`).join(', ');

    this.addActivity({
      type: 'observation',
      title: 'Discovery Verified & Claimed',
      detail: `Claimed ${itemSummary} and +${earnedMaterials} Discovery Materials into your inventory.`
    });

    this.saveState();
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('sanctuary:inventory-updated', { detail: { earnedItems, earnedMaterials } }));
    }
    return {
      success: true,
      earnedItems,
      earnedMaterials,
      message: `Transferred ${itemSummary} and +${earnedMaterials} Materials to inventory!`
    };
  }

  addInventoryItem(itemId, count = 1) {
    this.earnedInventory[itemId] = (this.earnedInventory[itemId] || 0) + count;
  }

  /* -------------------------------------------------------------------------- */
  /* 3. INVENTORY-BOUND DRAG & PLACE MECHANICS                                   */
  /* -------------------------------------------------------------------------- */
  placeFromInventory(itemId, x, y, rotation = 0) {
    if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) {
      return { success: false, message: 'Placement target is outside grid boundary.' };
    }

    if (this.getObjectAt(x, y)) {
      return { success: false, message: `Tile (${x}, ${y}) is already occupied. Choose a vacant cell.` };
    }

    const availableQty = this.earnedInventory[itemId] || 0;
    if (availableQty <= 0) {
      return {
        success: false,
        message: 'No copies of this object in your inventory. Complete an outdoor observation to earn one.'
      };
    }

    const itemMeta = this.getCatalogueItem(itemId);
    if (!itemMeta) {
      return { success: false, message: 'Invalid object identifier.' };
    }

    // 1. Deduct exactly one from earned inventory
    this.earnedInventory[itemId] -= 1;
    if (this.earnedInventory[itemId] < 0) this.earnedInventory[itemId] = 0;

    // 2. Add placed object
    const newPlaced = {
      id: `placed_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      itemId,
      x,
      y,
      rotation: rotation % 360,
      tier: 1
    };

    this.placedObjects.push(newPlaced);

    this.addActivity({
      type: 'build',
      title: `Placed ${itemMeta.name}`,
      detail: `Placed at grid (${x}, ${y}). 1 consumed from inventory (${this.earnedInventory[itemId]} remaining).`
    });

    this.saveState();
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('sanctuary:inventory-updated', { detail: { earnedItems, earnedMaterials } }));
    }
    return {
      success: true,
      object: newPlaced,
      remaining: this.earnedInventory[itemId],
      message: `Placed ${itemMeta.name} at (${x}, ${y})!`
    };
  }

  // Future-Ready House Building: Place Hearthstone Foundation
  placeFoundation(x, y, rotation = 0) {
    if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) {
      return { success: false, message: 'Placement target is outside grid boundary.' };
    }

    if (this.getObjectAt(x, y)) {
      return { success: false, message: `Tile (${x}, ${y}) is already occupied. Choose a vacant cell.` };
    }

    const newPlaced = {
      id: `placed_house_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      itemId: 'house_foundation',
      x,
      y,
      rotation: rotation % 360,
      tier: 1
    };

    this.placedObjects.push(newPlaced);

    this.addActivity({
      type: 'build',
      title: 'Established Hearthstone Foundation',
      detail: `Laid stone plinth and heavy timber sills at grid (${x}, ${y}). Ready for future dwelling construction.`
    });

    this.saveState();
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('sanctuary:inventory-updated', { detail: { earnedItems, earnedMaterials } }));
    }
    return {
      success: true,
      object: newPlaced,
      message: `Hearthstone Foundation laid at (${x}, ${y})!`
    };
  }

  // Dismantle: returns object back to inventory (+1 quantity)
  returnObjectToInventory(placedId) {
    const index = this.placedObjects.findIndex(o => o.id === placedId);
    if (index === -1) return { success: false, message: 'Object not found on world.' };

    const obj = this.placedObjects[index];
    const itemMeta = this.getCatalogueItem(obj.itemId);

    // Return to inventory if applicable
    if (obj.itemId !== 'house_foundation') {
      this.addInventoryItem(obj.itemId, 1);
    }
    this.placedObjects.splice(index, 1);

    this.addActivity({
      type: 'build',
      title: obj.itemId === 'house_foundation' ? 'Dismantled Foundation' : `Returned ${itemMeta?.name || 'Object'} to Inventory`,
      detail: obj.itemId === 'house_foundation'
        ? `Cleared foundation site at (${obj.x}, ${obj.y}). Ground prepared for future building.`
        : `Dismantled from (${obj.x}, ${obj.y}). Returned 1x ${itemMeta?.name || 'item'} to inventory (${this.earnedInventory[obj.itemId] || 0} available).`
    });

    this.saveState();
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('sanctuary:inventory-updated', { detail: { earnedItems, earnedMaterials } }));
    }
    return {
      success: true,
      message: obj.itemId === 'house_foundation' ? 'Foundation cleared.' : `${itemMeta?.name || 'Object'} returned to inventory.`
    };
  }

  // Move / Reposition object on grid (does NOT consume inventory)
  moveObject(placedId, newX, newY) {
    const obj = this.placedObjects.find(o => o.id === placedId);
    if (!obj) return { success: false, message: 'Object not found.' };

    if (newX < 0 || newX >= this.gridSize || newY < 0 || newY >= this.gridSize) {
      return { success: false, message: 'Target tile is outside grid boundary.' };
    }

    const existing = this.getObjectAt(newX, newY);
    if (existing && existing.id !== placedId) {
      return { success: false, message: `Tile (${newX}, ${newY}) is already occupied.` };
    }

    const oldX = obj.x;
    const oldY = obj.y;
    obj.x = newX;
    obj.y = newY;

    this.addActivity({
      type: 'build',
      title: `Moved ${this.getCatalogueItem(obj.itemId)?.name || 'Object'}`,
      detail: `Repositioned from (${oldX}, ${oldY}) to (${newX}, ${newY}). Inventory unchanged.`
    });

    this.saveState();
    return { success: true, object: obj, message: `Moved to (${newX}, ${newY})` };
  }

  // Rotate object 90° (does NOT consume inventory)
  rotateObject(placedId) {
    const obj = this.placedObjects.find(o => o.id === placedId);
    if (!obj) return { success: false, message: 'Object not found.' };

    obj.rotation = (obj.rotation + 90) % 360;
    this.saveState();
    return { success: true, object: obj, message: `Rotated to ${obj.rotation}°` };
  }

  // Upgrade object tier with Walking Points and Discovery Materials
  upgradeObject(placedId) {
    const obj = this.placedObjects.find(o => o.id === placedId);
    if (!obj) return { success: false, message: 'Object not found.' };

    const itemMeta = this.getCatalogueItem(obj.itemId);
    if (!itemMeta) return { success: false, message: 'Item definition missing.' };

    if (obj.tier >= itemMeta.maxTier) {
      return { success: false, message: `${itemMeta.name} is at maximum tier.` };
    }

    const cost = itemMeta.upgradeCost || { wp: 30, dm: 2 };
    if (this.walkingPoints < cost.wp || this.discoveryMaterials < cost.dm) {
      return {
        success: false,
        message: `Insufficient resources! Upgrade requires ${cost.wp} WP and ${cost.dm} DM.`
      };
    }

    this.walkingPoints -= cost.wp;
    this.discoveryMaterials -= cost.dm;
    obj.tier += 1;

    const nextTierMeta = itemMeta.tiers[obj.tier - 1];

    this.addActivity({
      type: 'upgrade',
      title: `Upgraded ${itemMeta.name} (Tier ${obj.tier})`,
      detail: `Promoted to ${nextTierMeta?.name || 'Tier ' + obj.tier} at (${obj.x}, ${obj.y}).`
    });

    this.saveState();
    return { success: true, object: obj, message: `Upgraded to ${nextTierMeta?.name || 'Tier ' + obj.tier}!` };
  }

  addActivity(act) {
    const formatted = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...act
    };
    this.activities.unshift(formatted);
    if (this.activities.length > 40) this.activities.pop();
  }

  setWorldName(name) {
    if (!name || !name.trim()) return;
    this.worldName = name.trim().slice(0, 32);
    this.saveState();
  }
}
