const { Logger } = require('../utils/logger');

class ScriptWriterAgent {
  constructor(db, credentials) {
    this.db = db;
    this.credentials = credentials;
    this.logger = new Logger('ScriptWriter');
    this.templates = this.loadTemplates();
  }

  async initialize() {
    this.logger.info('Initializing Script Writer Agent...');
    return true;
  }

  loadTemplates() {
    return {
      documentary: {
        structure: ['hook', 'introduction', 'historical_context', 'key_events', 'turning_point', 'aftermath', 'legacy', 'cta'],
        tone: 'narrative, immersive, respectful',
        pacing: 'deliberate'
      },
      biography: {
        structure: ['hook', 'introduction', 'early_life', 'rise_to_command', 'defining_battle', 'decline_or_death', 'legacy', 'cta'],
        tone: 'narrative, humanizing',
        pacing: 'deliberate'
      },
      explainer: {
        structure: ['hook', 'introduction', 'background', 'explanation', 'examples', 'implications', 'summary', 'cta'],
        tone: 'analytical, clear',
        pacing: 'steady'
      },
      list: {
        structure: ['hook', 'introduction', 'list_items', 'summary', 'cta'],
        tone: 'engaging, punchy',
        pacing: 'quick'
      },
      tutorial: {
        structure: ['hook', 'introduction', 'problem', 'solution_steps', 'demonstration', 'recap', 'cta'],
        tone: 'educational',
        pacing: 'moderate'
      },
      story: {
        structure: ['hook', 'introduction', 'setup', 'conflict', 'climax', 'resolution', 'lesson', 'cta'],
        tone: 'narrative',
        pacing: 'dynamic'
      }
    };
  }

  async generateScript(strategy) {
    try {
      this.logger.info(`Generating script for: ${strategy.topic}`);
      
      const template = this.templates[strategy.contentType.toLowerCase()] || this.templates.explainer;
      
      // Generate script components
      const hook = await this.generateHook(strategy);
      const introduction = await this.generateIntroduction(strategy);
      const mainContent = await this.generateMainContent(strategy, template);
      const conclusion = await this.generateConclusion(strategy);
      const cta = await this.generateCTA(strategy);

      // Assemble complete script
      const script = {
        title: await this.generateTitle(strategy),
        hook,
        introduction,
        mainContent,
        conclusion,
        callToAction: cta,
        duration: this.estimateDuration(mainContent),
        tone: template.tone,
        pacing: template.pacing,
        keywords: strategy.keywords,
        metadata: {
          strategy: strategy,
          generatedAt: new Date().toISOString(),
          version: '1.0'
        }
      };

      // Format for readability
      script.fullScript = this.formatFullScript(script);
      
      // Save to database
      await this.db.saveScript(script);
      
      this.logger.info(`Script generated: ${script.title}`);
      return script;
    } catch (error) {
      this.logger.error('Failed to generate script:', error);
      throw error;
    }
  }

  async generateTitle(strategy) {
    // Use the angle as the primary title when available
    if (strategy.angle) return strategy.angle;

    const contentType = strategy.contentType;
    if (contentType === 'Documentary') {
      return `The Untold Story of ${strategy.topic}`;
    } else if (contentType === 'Biography') {
      return `The Forgotten Soldier: ${strategy.topic}`;
    } else if (contentType === 'List') {
      const cleanTopic = strategy.topic.replace(/^top\s+\d+\s+/i, '');
      return `Top 10 Forgotten Battles: ${cleanTopic}`;
    } else if (contentType === 'Explainer') {
      return `Why ${strategy.topic} Changed the Course of History`;
    }

    return `${strategy.topic}: The Battle History Forgot`;
  }

  async generateHook(strategy) {
    const hooks = [
      {
        type: 'scene',
        text: `[ATMOSPHERIC OPENING] The year is [year]. [Brief vivid scene-setting sentence about ${strategy.topic}]. What happened here was never meant to be remembered.`
      },
      {
        type: 'question',
        text: `Why has history chosen to forget ${strategy.topic}? Today, we change that.`
      },
      {
        type: 'statistic',
        text: `Thousands of men fought and died during ${strategy.topic}. Most history books give it a single paragraph — or none at all. This is their story.`
      },
      {
        type: 'contrast',
        text: `While the world remembers the famous battles of ${strategy.era || 'this era'}, a different conflict was unfolding — one that would prove just as decisive. This is the story of ${strategy.topic}.`
      },
      {
        type: 'survivor',
        text: `"We knew the odds were against us." Those were the words of the men who fought in ${strategy.topic}. Their sacrifice deserves to be told.`
      }
    ];

    const selected = hooks[Math.floor(Math.random() * hooks.length)];

    return {
      type: selected.type,
      text: selected.text,
      duration: '0:00-0:20',
      productionNote: 'Use dramatic orchestral music, archival footage or illustrated maps'
    };
  }

  async generateIntroduction(strategy) {
    return {
      greeting: "Welcome to The Forgotten Front — where we uncover the battles, campaigns, and soldiers that history left behind.",
      topicIntro: `Today we're going deep into ${strategy.topic}${strategy.era ? `, a story from the ${strategy.era}` : ''}.`,
      valueProposition: `By the end of this video, you'll understand ${this.getValueProposition(strategy)}.`,
      channelContext: 'If this is your first time here, this channel is dedicated to the overlooked conflicts and forgotten heroes of military history.',
      duration: '0:20-0:45'
    };
  }

  getValueProposition(strategy) {
    const propositions = {
      'Documentary': `why ${strategy.topic} mattered, who fought there, and why it was forgotten`,
      'Biography': `who this soldier really was — beyond the official record`,
      'Explainer': `the strategic and human dimensions of ${strategy.topic}`,
      'List': `the key battles and events that defined this conflict`,
      'Story': `the full human story behind ${strategy.topic}`
    };

    return propositions[strategy.contentType] || `the full story of ${strategy.topic}`;
  }

  getCredibilityStatement(strategy) {
    const statements = [
      "Drawing from firsthand accounts, military archives, and overlooked records",
      "Based on declassified documents and regimental histories",
      "Reconstructed from letters, diaries, and official dispatches",
      "Using primary sources rarely cited in mainstream history"
    ];

    return statements[Math.floor(Math.random() * statements.length)];
  }

  async generateMainContent(strategy, template) {
    const sections = [];
    
    for (const section of template.structure) {
      if (!['hook', 'introduction', 'cta'].includes(section)) {
        sections.push(await this.generateSection(section, strategy));
      }
    }
    
    return {
      sections,
      totalDuration: this.calculateSectionsDuration(sections)
    };
  }

  async generateSection(sectionType, strategy) {
    const sectionGenerators = {
      // Military history sections
      historical_context: () => this.generateHistoricalContext(strategy),
      key_events: () => this.generateKeyEvents(strategy),
      turning_point: () => this.generateTurningPoint(strategy),
      aftermath: () => this.generateAftermath(strategy),
      legacy: () => this.generateLegacy(strategy),
      early_life: () => this.generateEarlyLife(strategy),
      rise_to_command: () => this.generateRiseToCommand(strategy),
      defining_battle: () => this.generateDefiningBattle(strategy),
      decline_or_death: () => this.generateDeclineOrDeath(strategy),
      // Generic sections
      problem: () => this.generateProblemSection(strategy),
      solution_steps: () => this.generateSolutionSteps(strategy),
      demonstration: () => this.generateDemonstration(strategy),
      background: () => this.generateExplanation(strategy),
      explanation: () => this.generateExplanation(strategy),
      examples: () => this.generateExamples(strategy),
      list_items: () => this.generateListItems(strategy),
      pros: () => this.generatePros(strategy),
      cons: () => this.generateCons(strategy),
      comparison: () => this.generateComparison(strategy),
      implications: () => this.generateImplications(strategy),
      summary: () => this.generateGenericSection('Summary', strategy),
      setup: () => this.generateGenericSection('Setup', strategy),
      conflict: () => this.generateGenericSection('Conflict', strategy),
      climax: () => this.generateGenericSection('Climax', strategy),
      resolution: () => this.generateGenericSection('Resolution', strategy),
      lesson: () => this.generateGenericSection('Lesson', strategy),
      recap: () => this.generateGenericSection('Recap', strategy)
    };

    const generator = sectionGenerators[sectionType];
    
    if (generator) {
      return await generator();
    }
    
    return this.generateGenericSection(sectionType, strategy);
  }

  async generateProblemSection(strategy) {
    return {
      type: 'problem',
      title: 'The Challenge',
      content: [
        `Many people struggle with ${strategy.topic}.`,
        `The main issues are:`,
        `1. Lack of clear information`,
        `2. Complexity and confusion`,
        `3. Not knowing where to start`,
        `But don't worry, we're going to solve all of these today.`
      ],
      visuals: ['Problem illustration', 'Statistics graphic'],
      duration: 30
    };
  }

  async generateSolutionSteps(strategy) {
    const steps = [];
    const numSteps = 3 + Math.floor(Math.random() * 3); // 3-5 steps
    
    for (let i = 1; i <= numSteps; i++) {
      steps.push({
        number: i,
        title: `Step ${i}: ${this.generateStepTitle(strategy.topic, i)}`,
        description: this.generateStepDescription(strategy.topic, i),
        tip: this.generateProTip(strategy.topic)
      });
    }
    
    return {
      type: 'solution_steps',
      title: 'The Solution',
      steps,
      duration: steps.length * 45
    };
  }

  generateStepTitle(topic, stepNumber) {
    const titles = [
      'Research and Preparation',
      'Setting Up the Foundation',
      'Implementation and Execution',
      'Testing and Optimization',
      'Scaling and Automation'
    ];
    
    return titles[stepNumber - 1] || `Advanced ${topic} Techniques`;
  }

  generateStepDescription(topic, stepNumber) {
    return `This step involves understanding the key aspects of ${topic} and how to apply them effectively. Pay special attention to the details here, as they make all the difference.`;
  }

  generateProTip(topic) {
    const tips = [
      `Pro tip: Start small and scale gradually`,
      `Remember: Consistency is more important than perfection`,
      `Quick tip: Document everything as you go`,
      `Expert advice: Focus on one aspect at a time`,
      `Insider secret: This works best when combined with regular practice`
    ];
    
    return tips[Math.floor(Math.random() * tips.length)];
  }

  async generateDemonstration(strategy) {
    return {
      type: 'demonstration',
      title: 'Live Demo',
      content: [
        `Now let me show you exactly how this works.`,
        `[Screen recording or visual demonstration]`,
        `As you can see, the process is straightforward once you understand the basics.`,
        `The key is to follow the steps exactly as shown.`
      ],
      visuals: ['Screen recording', 'Step-by-step graphics'],
      duration: 120
    };
  }

  async generateExplanation(strategy) {
    return {
      type: 'explanation',
      title: 'Deep Dive',
      content: [
        `Let's break down ${strategy.topic} into its core components.`,
        `First, we need to understand the fundamental principles.`,
        `The science behind this is fascinating...`,
        `[Detailed explanation with visuals]`,
        `This is why ${strategy.topic} works so effectively.`
      ],
      visuals: ['Diagrams', 'Infographics', 'Charts'],
      duration: 90
    };
  }

  async generateExamples(strategy) {
    return {
      type: 'examples',
      title: 'Real-World Examples',
      content: [
        `Let's look at some real examples of ${strategy.topic} in action.`,
        `Example 1: [Specific case study]`,
        `Example 2: [Another relevant example]`,
        `Example 3: [Third compelling example]`,
        `These examples show the versatility and power of ${strategy.topic}.`
      ],
      visuals: ['Case study graphics', 'Before/after comparisons'],
      duration: 75
    };
  }

  async generateListItems(strategy) {
    const items = [];
    const numItems = 5 + Math.floor(Math.random() * 6); // 5-10 items
    
    for (let i = 1; i <= numItems; i++) {
      items.push({
        number: numItems - i + 1, // Countdown for engagement
        title: this.generateListItemTitle(strategy.topic, i),
        description: this.generateListItemDescription(strategy.topic),
        impact: this.generateImpactStatement()
      });
    }
    
    return {
      type: 'list_items',
      title: `Top ${numItems} Things About ${strategy.topic}`,
      items,
      duration: items.length * 30
    };
  }

  generateListItemTitle(topic, index) {
    const titles = [
      `The Hidden Power of ${topic}`,
      `Why ${topic} Matters More Than You Think`,
      `The Surprising Truth About ${topic}`,
      `How ${topic} Can Transform Your Approach`,
      `The ${topic} Secret Nobody Talks About`,
      `Mastering ${topic} in Record Time`,
      `The Ultimate ${topic} Hack`,
      `${topic}: The Game Changer`,
      `Breaking Down ${topic} Myths`,
      `The Future of ${topic}`
    ];
    
    return titles[index - 1] || `Advanced ${topic} Technique #${index}`;
  }

  generateListItemDescription(topic) {
    return `This aspect of ${topic} is crucial because it fundamentally changes how we approach the subject. Understanding this will give you a significant advantage.`;
  }

  generateImpactStatement() {
    const impacts = [
      'This alone can save you hours',
      'Game-changing for beginners',
      'Essential for long-term success',
      'Often overlooked but critical',
      'The difference between success and failure'
    ];
    
    return impacts[Math.floor(Math.random() * impacts.length)];
  }

  async generatePros(strategy) {
    return {
      type: 'pros',
      title: 'The Benefits',
      points: [
        'Easy to get started',
        'Cost-effective solution',
        'Proven results',
        'Scalable approach',
        'Community support'
      ],
      duration: 45
    };
  }

  async generateCons(strategy) {
    return {
      type: 'cons',
      title: 'Things to Consider',
      points: [
        'Learning curve at the beginning',
        'Requires consistent effort',
        'Results may vary',
        'Some technical knowledge helpful'
      ],
      duration: 30
    };
  }

  async generateComparison(strategy) {
    return {
      type: 'comparison',
      title: 'How It Compares',
      content: `Compared to alternatives, ${strategy.topic} stands out because of its unique approach and proven effectiveness.`,
      comparisonPoints: [
        'More efficient than traditional methods',
        'Better ROI than competitors',
        'Easier to implement',
        'More sustainable long-term'
      ],
      duration: 60
    };
  }

  async generateImplications(strategy) {
    return {
      type: 'implications',
      title: 'What This Means',
      content: [
        `The implications of ${strategy.topic} are far-reaching.`,
        'This will change how we think about the industry.',
        'Early adopters will have a significant advantage.',
        'The potential for growth is enormous.'
      ],
      duration: 45
    };
  }

  generateGenericSection(sectionType, strategy) {
    return {
      type: sectionType,
      title: sectionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      content: `This section covers important aspects of ${strategy.topic} that you need to know.`,
      duration: 60
    };
  }

  async generateHistoricalContext(strategy) {
    return {
      type: 'historical_context',
      title: 'Setting the Scene',
      content: [
        `To understand ${strategy.topic}, we first need to understand the world in which it took place.`,
        `[DESCRIBE the broader conflict, the strategic situation, and the forces involved]`,
        `[MAP showing the theater of operations — region: ${strategy.region || 'unknown'}]`,
        `The stakes could not have been higher.`
      ],
      productionNote: 'Overlay maps, troop disposition graphics, timeline animation',
      duration: 90
    };
  }

  async generateKeyEvents(strategy) {
    return {
      type: 'key_events',
      title: 'The Events That Defined It',
      content: [
        `[EVENT 1] — The opening moves. What each side planned and why.`,
        `[EVENT 2] — The first contact. How the battle or campaign began to unfold.`,
        `[EVENT 3] — The escalation. Moments where the outcome was truly in the balance.`,
        `Throughout all of this, the men on the ground were [describe conditions: terrain, weather, exhaustion, morale].`
      ],
      productionNote: 'Use archival photographs, illustrated battle maps, voiceover narration',
      duration: 150
    };
  }

  async generateTurningPoint(strategy) {
    return {
      type: 'turning_point',
      title: 'The Moment Everything Changed',
      content: [
        `Then came the moment that decided everything.`,
        `[DESCRIBE the critical decision, tactical shift, or event that tipped the balance]`,
        `Those who were there described it as [quote or paraphrase from records].`,
        `In a matter of hours — or days — the outcome of ${strategy.topic} was sealed.`
      ],
      productionNote: 'Slow pacing, dramatic music drop, close-up photographs if available',
      duration: 90
    };
  }

  async generateAftermath(strategy) {
    return {
      type: 'aftermath',
      title: 'The Cost',
      content: [
        `When the fighting ended, the scale of what had happened became clear.`,
        `[CASUALTIES, territorial changes, strategic consequences]`,
        `For the survivors, the road home — or forward — was long.`,
        `And yet, almost immediately, ${strategy.topic} began to fade from the headlines.`
      ],
      productionNote: 'Memorial imagery, statistics displayed on screen, muted tone',
      duration: 75
    };
  }

  async generateLegacy(strategy) {
    return {
      type: 'legacy',
      title: 'Why It Still Matters',
      content: [
        `${strategy.topic} has largely been forgotten — but it shouldn't be.`,
        `The outcome here directly influenced [broader strategic/historical consequence].`,
        `The men who fought deserve to be remembered — not as statistics, but as individuals who made a choice under impossible circumstances.`,
        `That is why channels like this one exist.`
      ],
      productionNote: 'Close with archival portrait photographs if available, fade to black',
      duration: 60
    };
  }

  async generateEarlyLife(strategy) {
    return {
      type: 'early_life',
      title: 'The Making of a Soldier',
      content: [
        `Before the war, before the medals and the dispatches, there was just a person.`,
        `[BIRTHPLACE, social background, what shaped them before military service]`,
        `Nothing in their early life seemed to predict what was coming.`
      ],
      duration: 60
    };
  }

  async generateRiseToCommand(strategy) {
    return {
      type: 'rise_to_command',
      title: 'Earning Their Place',
      content: [
        `[EARLY MILITARY CAREER — first postings, early experiences, what set them apart]`,
        `By the time ${strategy.topic} came around, they had already seen enough to know exactly how bad it could get.`,
        `And yet they stepped forward.`
      ],
      duration: 75
    };
  }

  async generateDefiningBattle(strategy) {
    return {
      type: 'defining_battle',
      title: 'The Crucible',
      content: [
        `[THE CENTRAL CONFLICT OR CAMPAIGN — the moment that defined this person's story]`,
        `The decisions made here — right or wrong — would follow them for the rest of their life.`,
        `[WHAT HAPPENED, how they responded, what it cost them]`
      ],
      productionNote: 'Most detailed section — use maps, quotes, archival records',
      duration: 120
    };
  }

  async generateDeclineOrDeath(strategy) {
    return {
      type: 'decline_or_death',
      title: 'The End of the Road',
      content: [
        `Every story has an end.`,
        `[HOW THEIR SERVICE OR LIFE CONCLUDED — death in battle, retirement, disgrace, illness]`,
        `For someone who had given so much, the world moved on quickly.`
      ],
      duration: 60
    };
  }

  async generateConclusion(strategy) {
    return {
      type: 'conclusion',
      title: 'Lest We Forget',
      recap: [
        `${strategy.topic} was not a footnote. It was a battle fought by real people, for real stakes.`,
        `We covered:`,
        `- The context that made it inevitable`,
        `- The men and decisions that shaped its outcome`,
        `- Why it was forgotten — and why it shouldn't be`
      ],
      finalThought: `History is not just made by the famous battles in the famous places. It's made on the forgotten fronts too — by soldiers whose names we barely know.`,
      duration: '45 seconds'
    };
  }

  async generateCTA(strategy) {
    return {
      type: 'call_to_action',
      subscribe: "If this story moved you, subscribe to The Forgotten Front — we publish a new forgotten battle every week.",
      like: "A like helps more people discover these stories. It takes two seconds and it matters.",
      comment: `Which front do you think history has most unfairly forgotten? Let us know in the comments.`,
      nextVideo: `If you enjoyed this, you might also want to watch our video on [RELATED FORGOTTEN BATTLE].`,
      duration: '20 seconds'
    };
  }

  formatFullScript(script) {
    let fullScript = '';
    
    // Title
    fullScript += `TITLE: ${script.title}\n\n`;
    fullScript += '═'.repeat(50) + '\n\n';
    
    // Hook
    fullScript += `[${script.hook.duration}] HOOK\n`;
    fullScript += `${script.hook.text}\n\n`;
    
    // Introduction
    fullScript += `[${script.introduction.duration}] INTRODUCTION\n`;
    fullScript += `${script.introduction.greeting}\n`;
    fullScript += `${script.introduction.topicIntro}\n`;
    fullScript += `${script.introduction.valueProposition}\n`;
    fullScript += `${script.introduction.credibility}\n\n`;
    
    // Main Content
    fullScript += 'MAIN CONTENT\n';
    fullScript += '─'.repeat(30) + '\n\n';
    
    for (const section of script.mainContent.sections) {
      fullScript += `[${this.formatDuration(section.duration)}] ${section.title.toUpperCase()}\n`;
      
      if (Array.isArray(section.content)) {
        section.content.forEach(line => {
          fullScript += `${line}\n`;
        });
      } else if (section.steps) {
        section.steps.forEach(step => {
          fullScript += `\n${step.title}\n`;
          fullScript += `${step.description}\n`;
          fullScript += `💡 ${step.tip}\n`;
        });
      } else if (section.items) {
        section.items.forEach(item => {
          fullScript += `\n#${item.number}: ${item.title}\n`;
          fullScript += `${item.description}\n`;
          fullScript += `Impact: ${item.impact}\n`;
        });
      } else if (section.points) {
        section.points.forEach(point => {
          fullScript += `• ${point}\n`;
        });
      } else {
        fullScript += `${section.content}\n`;
      }
      
      if (section.visuals) {
        fullScript += `\n[VISUALS: ${section.visuals.join(', ')}]\n`;
      }
      
      fullScript += '\n';
    }
    
    // Conclusion
    fullScript += `[${script.conclusion.duration}] CONCLUSION\n`;
    script.conclusion.recap.forEach(line => {
      fullScript += `${line}\n`;
    });
    fullScript += `\n${script.conclusion.finalThought}\n\n`;
    
    // Call to Action
    fullScript += `[${script.callToAction.duration}] CALL TO ACTION\n`;
    fullScript += `${script.callToAction.subscribe}\n`;
    fullScript += `${script.callToAction.like}\n`;
    fullScript += `${script.callToAction.comment}\n`;
    fullScript += `${script.callToAction.nextVideo}\n\n`;
    
    // Metadata
    fullScript += '═'.repeat(50) + '\n';
    fullScript += `ESTIMATED DURATION: ${script.duration}\n`;
    fullScript += `TONE: ${script.tone}\n`;
    fullScript += `PACING: ${script.pacing}\n`;
    fullScript += `KEYWORDS: ${script.keywords.join(', ')}\n`;
    
    return fullScript;
  }

  estimateDuration(mainContent) {
    const totalSeconds = mainContent.sections.reduce((total, section) => {
      return total + (section.duration || 60);
    }, 0);
    
    // Add hook, intro, conclusion, CTA
    const fullDuration = totalSeconds + 5 + 15 + 30 + 15;
    
    return this.formatDuration(fullDuration);
  }

  formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  calculateSectionsDuration(sections) {
    return sections.reduce((total, section) => total + (section.duration || 60), 0);
  }
}

module.exports = { ScriptWriterAgent };