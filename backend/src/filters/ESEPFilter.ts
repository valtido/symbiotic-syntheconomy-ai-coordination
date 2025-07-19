export interface ESEPResult {
  score: number; // 0.0 to 1.0, where 0.0 is perfectly balanced
  feedback: string[];
  ethicalScore: number;
  spiritualScore: number;
  balanceScore: number;
}

export class ESEPFilter {
  private ethicalKeywords = [
    'justice',
    'equity',
    'fairness',
    'compassion',
    'empathy',
    'kindness',
    'respect',
    'dignity',
    'rights',
    'freedom',
    'autonomy',
    'consent',
    'responsibility',
    'accountability',
    'transparency',
    'integrity',
    'honesty',
    'trust',
    'cooperation',
    'solidarity',
    'community',
    'inclusion',
    'diversity',
    'tolerance',
    'acceptance',
    'forgiveness',
  ];

  private spiritualKeywords = [
    'sacred',
    'divine',
    'holy',
    'blessed',
    'enlightened',
    'awakened',
    'consciousness',
    'awareness',
    'presence',
    'mindfulness',
    'meditation',
    'prayer',
    'worship',
    'devotion',
    'faith',
    'belief',
    'spirit',
    'soul',
    'essence',
    'transcendence',
    'unity',
    'oneness',
    'connection',
    'harmony',
    'balance',
    'peace',
    'love',
    'grace',
    'wisdom',
    'truth',
  ];

  private negativeKeywords = [
    'hate',
    'violence',
    'harm',
    'destruction',
    'exclusion',
    'discrimination',
    'oppression',
    'exploitation',
    'manipulation',
    'deception',
    'corruption',
    'greed',
    'selfishness',
    'arrogance',
    'pride',
    'anger',
    'fear',
    'separation',
    'division',
    'conflict',
    'war',
    'suffering',
    'pain',
  ];

  async validate(ritualText: string): Promise<ESEPResult> {
    const feedback: string[] = [];

    // Normalize text
    const normalizedText = ritualText.toLowerCase();
    const words = normalizedText.split(/\s+/);
    const totalWords = words.length;

    if (totalWords === 0) {
      return {
        score: 1.0,
        feedback: ['Ritual text is empty'],
        ethicalScore: 0,
        spiritualScore: 0,
        balanceScore: 0,
      };
    }

    // Count keyword occurrences
    const ethicalCount = this.countKeywords(words, this.ethicalKeywords);
    const spiritualCount = this.countKeywords(words, this.spiritualKeywords);
    const negativeCount = this.countKeywords(words, this.negativeKeywords);

    // Calculate scores (0.0 to 1.0)
    const ethicalScore = Math.min(
      ethicalCount / Math.max(totalWords * 0.1, 1),
      1.0,
    );
    const spiritualScore = Math.min(
      spiritualCount / Math.max(totalWords * 0.1, 1),
      1.0,
    );
    const negativeScore = Math.min(
      negativeCount / Math.max(totalWords * 0.05, 1),
      1.0,
    );

    // Calculate balance score (how well ethical and spiritual elements are balanced)
    const balanceScore = 1.0 - Math.abs(ethicalScore - spiritualScore);

    // Calculate overall ESEP score (lower is better)
    let esepScore = 0.0;

    // Balance component (40% weight)
    esepScore += (1.0 - balanceScore) * 0.4;

    // Negative content penalty (30% weight)
    esepScore += negativeScore * 0.3;

    // Minimum presence requirement (30% weight)
    const minPresenceScore = Math.max(
      0,
      0.3 - (ethicalScore + spiritualScore) * 0.15,
    );
    esepScore += minPresenceScore * 0.3;

    // Generate feedback
    if (ethicalScore < 0.1) {
      feedback.push(
        'Consider incorporating more ethical principles and values',
      );
    }
    if (spiritualScore < 0.1) {
      feedback.push(
        'Consider adding spiritual or sacred elements to the ritual',
      );
    }
    if (balanceScore < 0.7) {
      feedback.push(
        'Aim for better balance between ethical and spiritual dimensions',
      );
    }
    if (negativeScore > 0.2) {
      feedback.push('Reduce negative or harmful language in the ritual');
    }
    if (ethicalScore > 0.8 && spiritualScore < 0.3) {
      feedback.push('The ritual is heavily ethical but lacks spiritual depth');
    }
    if (spiritualScore > 0.8 && ethicalScore < 0.3) {
      feedback.push(
        'The ritual is deeply spiritual but needs more ethical grounding',
      );
    }

    // Positive feedback for well-balanced rituals
    if (esepScore < 0.3) {
      feedback.push('Excellent balance of ethical and spiritual elements');
    }
    if (balanceScore > 0.9) {
      feedback.push(
        'Remarkable harmony between ethical and spiritual dimensions',
      );
    }

    return {
      score: Math.min(esepScore, 1.0),
      feedback,
      ethicalScore,
      spiritualScore,
      balanceScore,
    };
  }

  private countKeywords(words: string[], keywords: string[]): number {
    return words.filter((word) =>
      keywords.some((keyword) => word.includes(keyword)),
    ).length;
  }

  // Additional method for detailed analysis
  async analyzeRitualStructure(ritualText: string): Promise<{
    sections: string[];
    ethicalDensity: number[];
    spiritualDensity: number[];
  }> {
    // Split ritual into sections (paragraphs or stanzas)
    const sections = ritualText
      .split(/\n\s*\n/)
      .filter((section) => section.trim().length > 0);

    const ethicalDensity: number[] = [];
    const spiritualDensity: number[] = [];

    for (const section of sections) {
      const words = section.toLowerCase().split(/\s+/);
      const totalWords = words.length;

      const ethicalCount = this.countKeywords(words, this.ethicalKeywords);
      const spiritualCount = this.countKeywords(words, this.spiritualKeywords);

      ethicalDensity.push(totalWords > 0 ? ethicalCount / totalWords : 0);
      spiritualDensity.push(totalWords > 0 ? spiritualCount / totalWords : 0);
    }

    return {
      sections,
      ethicalDensity,
      spiritualDensity,
    };
  }
}
