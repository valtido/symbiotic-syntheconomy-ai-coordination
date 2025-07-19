export interface CEDAResult {
  score: number; // Number of cultural references detected
  feedback: string[];
  culturalReferences: CulturalReference[];
  culturalDiversity: number; // 0.0 to 1.0
  authenticityScore: number; // 0.0 to 1.0
}

export interface CulturalReference {
  type: 'tradition' | 'language' | 'symbol' | 'practice' | 'belief' | 'custom';
  content: string;
  confidence: number; // 0.0 to 1.0
  context: string;
}

export class CEDAFilter {
  private culturalTraditions = [
    // Indigenous traditions
    'smudging',
    'sweat lodge',
    'vision quest',
    'medicine wheel',
    'talking circle',
    'powwow',
    'potlatch',
    'giveaway',
    'naming ceremony',
    'coming of age',

    // Eastern traditions
    'meditation',
    'yoga',
    'qi gong',
    'tai chi',
    'zen',
    'mindfulness',
    'chakra',
    'kundalini',
    'prana',
    'dharma',
    'karma',
    'samsara',
    'mandala',
    'mudra',
    'mantra',
    'yantra',
    'puja',
    'darshan',

    // Western traditions
    'prayer',
    'worship',
    'blessing',
    'communion',
    'baptism',
    'confirmation',
    'pilgrimage',
    'retreat',
    'contemplation',
    'mysticism',
    'gnosis',

    // African traditions
    'ancestral veneration',
    'libation',
    'drumming',
    'dancing',
    'storytelling',
    'griot',
    'sankofa',
    'ubuntu',
    'kwanzaa',
    'harvest festival',

    // Middle Eastern traditions
    'salah',
    'dhikr',
    'sufism',
    'whirling',
    'zakat',
    'hajj',
    'ramadan',
    'eid',
    'halal',
    'kosher',
    'shabbat',

    // Latin American traditions
    'día de los muertos',
    'quinceañera',
    'fiesta',
    'celebration',
    'curandero',
    'shaman',
    'ayahuasca',
    'tobacco',
    'cacao ceremony',

    // Pacific traditions
    'hula',
    'lei',
    'aloha',
    'mana',
    'kapu',
    'kahuna',
    'tapu',
    'mana',
    'tiki',
    'haka',
    'koru',

    // European traditions
    'maypole',
    'bonfire',
    'harvest',
    'solstice',
    'equinox',
    'sabbat',
    'wheel of the year',
    'imbolc',
    'beltane',
    'lughnasadh',
    'samhain',
  ];

  private culturalSymbols = [
    // Universal symbols
    'circle',
    'cross',
    'star',
    'moon',
    'sun',
    'tree',
    'water',
    'fire',
    'earth',
    'air',

    // Cultural specific symbols
    'yin yang',
    'om',
    'swastika',
    'ankh',
    'eye of horus',
    'lotus',
    'dragon',
    'phoenix',
    'eagle',
    'wolf',
    'bear',
    'deer',
    'feather',
    'shell',
    'crystal',
    'gemstone',
    'herb',
    'flower',

    // Geometric patterns
    'mandala',
    'yantra',
    'labyrinth',
    'spiral',
    'infinity',
    'vesica piscis',
    'flower of life',
    'seed of life',
    'metatron cube',
    'sacred geometry',
  ];

  private culturalPractices = [
    // Ritual practices
    'ceremony',
    'ritual',
    'celebration',
    'festival',
    'gathering',
    'offering',
    'sacrifice',
    'libation',
    'incense',
    'candle',
    'altar',
    'shrine',
    'temple',
    'sacred space',
    'sanctuary',

    // Movement practices
    'dance',
    'movement',
    'gesture',
    'posture',
    'walking',
    'procession',
    'pilgrimage',
    'journey',
    'quest',
    'adventure',
    'exploration',

    // Sound practices
    'chanting',
    'singing',
    'drumming',
    'music',
    'sound',
    'vibration',
    'mantra',
    'prayer',
    'invocation',
    'evocation',
    'blessing',
  ];

  private culturalLanguages = [
    // Sacred languages
    'sanskrit',
    'pali',
    'hebrew',
    'arabic',
    'latin',
    'greek',
    'old english',
    'gaelic',
    'quechua',
    'nahuatl',
    'maori',

    // Sacred words
    'amen',
    'om',
    'shalom',
    'salaam',
    'namaste',
    'aloha',
    'blessed be',
    'so mote it be',
    'as above so below',
    'peace be with you',
    'may the force be with you',
  ];

  async validate(ritualText: string): Promise<CEDAResult> {
    const feedback: string[] = [];
    const culturalReferences: CulturalReference[] = [];

    const normalizedText = ritualText.toLowerCase();
    const words = normalizedText.split(/\s+/);
    const sentences = ritualText
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);

    // Detect cultural traditions
    const traditionMatches = this.detectPatterns(
      normalizedText,
      this.culturalTraditions,
      'tradition',
    );
    culturalReferences.push(...traditionMatches);

    // Detect cultural symbols
    const symbolMatches = this.detectPatterns(
      normalizedText,
      this.culturalSymbols,
      'symbol',
    );
    culturalReferences.push(...symbolMatches);

    // Detect cultural practices
    const practiceMatches = this.detectPatterns(
      normalizedText,
      this.culturalPractices,
      'practice',
    );
    culturalReferences.push(...practiceMatches);

    // Detect cultural languages
    const languageMatches = this.detectPatterns(
      normalizedText,
      this.culturalLanguages,
      'language',
    );
    culturalReferences.push(...languageMatches);

    // Detect cultural beliefs and customs through context analysis
    const beliefMatches = this.detectBeliefsAndCustoms(sentences);
    culturalReferences.push(...beliefMatches);

    // Calculate cultural diversity
    const culturalDiversity =
      this.calculateCulturalDiversity(culturalReferences);

    // Calculate authenticity score
    const authenticityScore = this.calculateAuthenticityScore(
      culturalReferences,
      ritualText,
    );

    // Generate feedback
    if (culturalReferences.length < 2) {
      feedback.push('Include at least 2 cultural references or expressions');
    }
    if (culturalReferences.length < 5) {
      feedback.push(
        'Consider adding more cultural elements to enrich the ritual',
      );
    }
    if (culturalDiversity < 0.3) {
      feedback.push(
        'Try to incorporate elements from diverse cultural traditions',
      );
    }
    if (authenticityScore < 0.5) {
      feedback.push(
        'Ensure cultural elements are used respectfully and authentically',
      );
    }

    // Positive feedback
    if (culturalReferences.length >= 5) {
      feedback.push(
        'Rich cultural tapestry with multiple traditions represented',
      );
    }
    if (culturalDiversity > 0.7) {
      feedback.push('Excellent cultural diversity and inclusion');
    }
    if (authenticityScore > 0.8) {
      feedback.push('Authentic and respectful use of cultural elements');
    }

    return {
      score: culturalReferences.length,
      feedback,
      culturalReferences,
      culturalDiversity,
      authenticityScore,
    };
  }

  private detectPatterns(
    text: string,
    patterns: string[],
    type: CulturalReference['type'],
  ): CulturalReference[] {
    const references: CulturalReference[] = [];

    for (const pattern of patterns) {
      const regex = new RegExp(
        `\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
        'gi',
      );
      const matches = text.match(regex);

      if (matches) {
        references.push({
          type,
          content: pattern,
          confidence: 0.9,
          context: this.extractContext(text, pattern),
        });
      }
    }

    return references;
  }

  private detectBeliefsAndCustoms(sentences: string[]): CulturalReference[] {
    const references: CulturalReference[] = [];

    // Common cultural belief patterns
    const beliefPatterns = [
      /ancestors?\s+(spirit|guide|protect|bless)/i,
      /(sacred|holy)\s+(land|water|air|fire|earth)/i,
      /(spirit|soul)\s+(world|realm|dimension)/i,
      /(divine|god|goddess)\s+(presence|blessing|guidance)/i,
      /(traditional|ancient)\s+(wisdom|knowledge|practice)/i,
      /(cultural|heritage)\s+(preservation|celebration)/i,
    ];

    for (const sentence of sentences) {
      for (const pattern of beliefPatterns) {
        const match = sentence.match(pattern);
        if (match) {
          references.push({
            type: 'belief',
            content: match[0],
            confidence: 0.7,
            context: sentence.trim(),
          });
        }
      }
    }

    return references;
  }

  private extractContext(text: string, pattern: string): string {
    const index = text.toLowerCase().indexOf(pattern.toLowerCase());
    if (index === -1) return '';

    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + pattern.length + 50);
    return text.substring(start, end).trim();
  }

  private calculateCulturalDiversity(references: CulturalReference[]): number {
    if (references.length === 0) return 0;

    const typeCounts = new Map<string, number>();
    for (const ref of references) {
      typeCounts.set(ref.type, (typeCounts.get(ref.type) || 0) + 1);
    }

    // Shannon diversity index
    const total = references.length;
    let diversity = 0;

    for (const count of typeCounts.values()) {
      const proportion = count / total;
      diversity -= proportion * Math.log(proportion);
    }

    // Normalize to 0-1 range
    const maxDiversity = Math.log(typeCounts.size);
    return maxDiversity > 0 ? diversity / maxDiversity : 0;
  }

  private calculateAuthenticityScore(
    references: CulturalReference[],
    ritualText: string,
  ): number {
    if (references.length === 0) return 0;

    let score = 0;
    let totalWeight = 0;

    for (const ref of references) {
      // Higher confidence references get more weight
      const weight = ref.confidence;
      score += ref.confidence * weight;
      totalWeight += weight;

      // Bonus for contextual usage
      if (ref.context.length > 20) {
        score += 0.1 * weight;
      }
    }

    // Penalty for overuse of cultural elements
    const density = references.length / (ritualText.split(/\s+/).length / 100);
    if (density > 10) {
      score *= 0.8;
    }

    return totalWeight > 0 ? Math.min(score / totalWeight, 1.0) : 0;
  }

  // Additional method for cultural context analysis
  async analyzeCulturalContext(ritualText: string): Promise<{
    primaryTraditions: string[];
    culturalThemes: string[];
    authenticityIndicators: string[];
  }> {
    const result = await this.validate(ritualText);

    // Identify primary cultural traditions
    const traditionRefs = result.culturalReferences.filter(
      (ref) => ref.type === 'tradition',
    );
    const primaryTraditions = [
      ...new Set(traditionRefs.map((ref) => ref.content)),
    ];

    // Identify cultural themes
    const culturalThemes: string[] = [];
    if (traditionRefs.some((ref) => ref.content.includes('indigenous'))) {
      culturalThemes.push('Indigenous Wisdom');
    }
    if (traditionRefs.some((ref) => ref.content.includes('eastern'))) {
      culturalThemes.push('Eastern Philosophy');
    }
    if (traditionRefs.some((ref) => ref.content.includes('western'))) {
      culturalThemes.push('Western Spirituality');
    }

    // Authenticity indicators
    const authenticityIndicators: string[] = [];
    if (result.authenticityScore > 0.8) {
      authenticityIndicators.push('High authenticity');
    }
    if (result.culturalDiversity > 0.7) {
      authenticityIndicators.push('Cultural diversity');
    }
    if (result.score >= 5) {
      authenticityIndicators.push('Rich cultural content');
    }

    return {
      primaryTraditions,
      culturalThemes,
      authenticityIndicators,
    };
  }
}
