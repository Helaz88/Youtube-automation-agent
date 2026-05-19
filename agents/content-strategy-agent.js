const { Logger } = require('../utils/logger');

// Curated pool of forgotten/underrepresented military history topics
const MILITARY_TOPIC_POOL = [
  // WW2 - lesser-known fronts
  { topic: 'The Italian Campaign 1943', era: 'WW2', region: 'Europe', tags: ['WW2', 'Italy', 'Allied forces'] },
  { topic: 'The Winter War Finland vs Soviet Union', era: 'WW2', region: 'Europe', tags: ['WW2', 'Finland', 'Soviet'] },
  { topic: 'The Battle of Kohima', era: 'WW2', region: 'Asia', tags: ['WW2', 'Burma', 'British Empire'] },
  { topic: 'Operation Compass North Africa 1940', era: 'WW2', region: 'Africa', tags: ['WW2', 'North Africa', 'Rommel'] },
  { topic: 'The Soviet-Japanese Border War 1939', era: 'WW2', region: 'Asia', tags: ['WW2', 'Mongolia', 'Japan'] },
  { topic: 'The Battle of the Admin Box', era: 'WW2', region: 'Asia', tags: ['WW2', 'Burma', 'British'] },
  { topic: 'The Greek Campaign 1940', era: 'WW2', region: 'Europe', tags: ['WW2', 'Greece', 'Italy', 'Axis'] },
  { topic: 'The Siege of Leningrad', era: 'WW2', region: 'Europe', tags: ['WW2', 'Russia', 'Siege'] },
  { topic: 'The Forgotten War in Yugoslavia', era: 'WW2', region: 'Europe', tags: ['WW2', 'Partisans', 'Balkans'] },

  // WW1 - forgotten fronts
  { topic: 'The East African Campaign WW1', era: 'WW1', region: 'Africa', tags: ['WW1', 'Africa', 'Von Lettow-Vorbeck'] },
  { topic: 'The Gallipoli Campaign', era: 'WW1', region: 'Middle East', tags: ['WW1', 'ANZAC', 'Dardanelles'] },
  { topic: 'The Macedonian Front WW1', era: 'WW1', region: 'Europe', tags: ['WW1', 'Balkans', 'Salonika'] },
  { topic: 'The Mesopotamia Campaign WW1', era: 'WW1', region: 'Middle East', tags: ['WW1', 'Iraq', 'Ottoman'] },
  { topic: 'The Italian Front Isonzo Battles', era: 'WW1', region: 'Europe', tags: ['WW1', 'Italy', 'Austria'] },

  // Colonial & 19th century wars
  { topic: 'The Zulu War Battle of Isandlwana', era: '19th Century', region: 'Africa', tags: ['Colonial', 'Zulu', 'British'] },
  { topic: 'The Anglo-Afghan Wars', era: '19th Century', region: 'Asia', tags: ['Colonial', 'Afghanistan', 'British'] },
  { topic: 'The First Boer War', era: '19th Century', region: 'Africa', tags: ['Boer', 'South Africa', 'British'] },
  { topic: 'The Boxer Rebellion', era: '19th Century', region: 'Asia', tags: ['China', 'Colonial', 'Siege'] },

  // Korean & Vietnam
  { topic: 'The Battle of Chosin Reservoir', era: 'Korean War', region: 'Asia', tags: ['Korea', 'Marines', 'China'] },
  { topic: 'The Forgotten Battles of the Korean War', era: 'Korean War', region: 'Asia', tags: ['Korea', 'UN', 'Cold War'] },
  { topic: 'The Siege of Dien Bien Phu', era: 'Cold War', region: 'Asia', tags: ['Vietnam', 'France', 'Defeat'] },
  { topic: 'The Ia Drang Valley Battle 1965', era: 'Cold War', region: 'Asia', tags: ['Vietnam', 'USA', 'First battle'] },

  // Napoleonic & older
  { topic: 'The Battle of Austerlitz', era: 'Napoleonic', region: 'Europe', tags: ['Napoleon', 'Austria', 'Russia'] },
  { topic: 'The Peninsula War Spain 1808', era: 'Napoleonic', region: 'Europe', tags: ['Napoleon', 'Spain', 'Guerrilla'] },
  { topic: 'The Battle of Waterloo Untold Stories', era: 'Napoleonic', region: 'Europe', tags: ['Napoleon', 'Wellington', 'Belgium'] },
  { topic: 'The Russian Campaign of 1812', era: 'Napoleonic', region: 'Europe', tags: ['Napoleon', 'Russia', 'Retreat'] },

  // Cold War proxy conflicts
  { topic: 'The Soviet-Afghan War 1979', era: 'Cold War', region: 'Asia', tags: ['Soviet', 'Afghanistan', 'Cold War'] },
  { topic: 'The Angolan Civil War', era: 'Cold War', region: 'Africa', tags: ['Cold War', 'Angola', 'Cuba'] },
  { topic: 'The Falklands War 1982', era: 'Cold War', region: 'South America', tags: ['Falklands', 'Britain', 'Argentina'] },
  { topic: 'The Iran-Iraq War', era: 'Cold War', region: 'Middle East', tags: ['Iran', 'Iraq', 'Saddam'] },

  // Forgotten heroes & units
  { topic: 'The Ghost Army WW2 Deception Unit', era: 'WW2', region: 'Europe', tags: ['WW2', 'Deception', 'Secret'] },
  { topic: 'The Night Witches Soviet Female Pilots', era: 'WW2', region: 'Europe', tags: ['WW2', 'Women', 'Soviet'] },
  { topic: 'The Tuskegee Airmen', era: 'WW2', region: 'Europe', tags: ['WW2', 'USA', 'African American'] },
  { topic: 'The Gurkhas Forgotten Warriors', era: 'Multiple', region: 'Asia', tags: ['Gurkha', 'Nepal', 'British'] },
  { topic: 'The Navajo Code Talkers WW2', era: 'WW2', region: 'Pacific', tags: ['WW2', 'Native American', 'Code'] }
];

const DOCUMENTARY_ANGLES = [
  'The Battle Nobody Remembers: {topic}',
  'Forgotten Front: The True Story of {topic}',
  'Why {topic} Changed History Forever',
  'The Untold Story of {topic}',
  '{topic}: The Soldiers History Forgot',
  'How {topic} Almost Changed the Outcome of the War',
  'The Hidden Cost of {topic}',
  '{topic}: A Story of Courage Against the Odds',
  'The Men Who Fought and Were Forgotten: {topic}',
  'Rediscovering {topic}: What the History Books Left Out'
];

class ContentStrategyAgent {
  constructor(db, credentials) {
    this.db = db;
    this.credentials = credentials;
    this.logger = new Logger('ContentStrategy');
    this.usedTopics = new Set();
    this.historicalPerformance = [];
  }

  async initialize() {
    this.logger.info('Initializing Content Strategy Agent (Military History)...');
    await this.loadHistoricalData();
    return true;
  }

  async loadHistoricalData() {
    try {
      const history = await this.db.getContentHistory();
      this.historicalPerformance = history;
      history.forEach(entry => this.usedTopics.add(entry.topic));
    } catch (error) {
      this.logger.warn('No historical data found, starting fresh');
      this.historicalPerformance = [];
    }
  }

  async generateContentStrategy(requestedTopic = null) {
    try {
      let topicEntry;

      if (requestedTopic) {
        topicEntry = this._buildCustomTopicEntry(requestedTopic);
      } else {
        topicEntry = this._selectNextTopic();
      }

      const angle = this._generateAngle(topicEntry.topic);
      const contentType = this._selectContentType(topicEntry);

      const strategy = {
        topic: topicEntry.topic,
        angle,
        era: topicEntry.era,
        region: topicEntry.region,
        tags: topicEntry.tags,
        targetAudience: 'History enthusiasts, military history buffs, documentary viewers aged 18-45',
        contentType,
        keywords: this._buildKeywords(topicEntry),
        estimatedViews: this._estimateViews(topicEntry),
        bestPublishTime: this._calculateBestPublishTime(),
        tone: 'Narrative, immersive, documentary-style. Respectful of the soldiers involved.',
        createdAt: new Date().toISOString()
      };

      await this.db.saveContentStrategy(strategy);
      this.usedTopics.add(topicEntry.topic);

      this.logger.info(`Strategy: [${strategy.contentType}] ${strategy.angle}`);
      return strategy;
    } catch (error) {
      this.logger.error('Failed to generate content strategy:', error);
      throw error;
    }
  }

  _selectNextTopic() {
    // Prefer topics not yet covered, vary by era and region
    const unused = MILITARY_TOPIC_POOL.filter(t => !this.usedTopics.has(t.topic));
    const pool = unused.length > 0 ? unused : MILITARY_TOPIC_POOL;

    // Balance eras to avoid repeating same period consecutively
    const lastEra = this._getLastUsedEra();
    const varied = pool.filter(t => t.era !== lastEra);
    const candidates = varied.length > 0 ? varied : pool;

    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  _buildCustomTopicEntry(topic) {
    return {
      topic,
      era: 'Various',
      region: 'Various',
      tags: topic.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    };
  }

  _generateAngle(topic) {
    const template = DOCUMENTARY_ANGLES[Math.floor(Math.random() * DOCUMENTARY_ANGLES.length)];
    return template.replace('{topic}', topic);
  }

  _selectContentType(topicEntry) {
    // Military history maps naturally to these types
    const typeWeights = [
      { type: 'Documentary', weight: 50 },
      { type: 'Explainer', weight: 25 },
      { type: 'List', weight: 15 },
      { type: 'Biography', weight: 10 }
    ];

    const roll = Math.random() * 100;
    let cumulative = 0;
    for (const { type, weight } of typeWeights) {
      cumulative += weight;
      if (roll < cumulative) return type;
    }
    return 'Documentary';
  }

  _buildKeywords(topicEntry) {
    const base = topicEntry.tags || [];
    const fromTopic = topicEntry.topic
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);
    return [...new Set([...base, ...fromTopic, 'military history', 'forgotten battles', 'documentary'])];
  }

  _estimateViews(topicEntry) {
    // WW2 and Napoleonic topics tend to get more views
    const eraMultiplier = { 'WW2': 1.4, 'Napoleonic': 1.2, 'WW1': 1.1, 'Cold War': 1.0 };
    const base = 8000;
    const multiplier = eraMultiplier[topicEntry.era] || 1.0;
    const variance = base * 0.4;
    return Math.floor(base * multiplier + (Math.random() * variance * 2) - variance);
  }

  _calculateBestPublishTime() {
    // Military history audience peaks Tue-Thu evenings and weekend mornings
    const slots = [
      { day: 'Tuesday', hour: 18 },
      { day: 'Wednesday', hour: 18 },
      { day: 'Thursday', hour: 19 },
      { day: 'Saturday', hour: 10 },
      { day: 'Sunday', hour: 10 }
    ];

    const selected = slots[Math.floor(Math.random() * slots.length)];
    const date = this._getNextWeekday(selected.day);
    date.setHours(selected.hour, 0, 0, 0);
    return date.toISOString();
  }

  _getNextWeekday(dayName) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDay = days.indexOf(dayName);
    const today = new Date();
    const daysUntil = (targetDay - today.getDay() + 7) % 7 || 7;
    const result = new Date(today);
    result.setDate(today.getDate() + daysUntil);
    return result;
  }

  _getLastUsedEra() {
    if (this.historicalPerformance.length === 0) return null;
    return this.historicalPerformance[this.historicalPerformance.length - 1]?.era || null;
  }
}

module.exports = { ContentStrategyAgent };
