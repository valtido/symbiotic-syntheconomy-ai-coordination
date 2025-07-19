export interface NarrativeForensicsResult {
  polarizationScore: number; // 0.0 to 1.0 (lower is better)
  biasScore: number; // 0.0 to 1.0 (lower is better)
  communityHarmonyScore: number; // 0.0 to 1.0 (higher is better)
  factVerificationScore: number; // 0.0 to 1.0 (higher is better)
  overallScore: number; // 0.0 to 1.0 (higher is better)
  feedback: string[];
  detectedIssues: NarrativeIssue[];
  recommendations: string[];
}

export interface NarrativeIssue {
  type: 'polarization' | 'bias' | 'factual' | 'harmony' | 'cultural';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  context: string;
  suggestion: string;
}

export class NarrativeForensics {
  private polarizingKeywords = [
    // Us vs Them language
    'us',
    'them',
    'we',
    'they',
    'our',
    'their',
    'ours',
    'theirs',
    'enemy',
    'opponent',
    'adversary',
    'foe',
    'rival',
    'superior',
    'inferior',
    'better',
    'worse',
    'right',
    'wrong',

    // Absolute statements
    'always',
    'never',
    'everyone',
    'nobody',
    'all',
    'none',
    'completely',
    'totally',
    'absolutely',
    'definitely',

    // Divisive language
    'divide',
    'separate',
    'split',
    'fragment',
    'isolate',
    'exclude',
    'reject',
    'ban',
    'prohibit',
    'forbid',

    // Emotional manipulation
    'fear',
    'anger',
    'hate',
    'despise',
    'loathe',
    'abhor',
    'manipulate',
    'control',
    'dominate',
    'subjugate',
  ];

  private biasIndicators = [
    // Gender bias
    'manly',
    'womanly',
    'masculine',
    'feminine',
    'girly',
    'manly',
    'bossy',
    'aggressive',
    'emotional',
    'rational',

    // Cultural bias
    'primitive',
    'advanced',
    'civilized',
    'uncivilized',
    'modern',
    'traditional',
    'backward',
    'progressive',

    // Religious bias
    'heathen',
    'pagan',
    'infidel',
    'believer',
    'non-believer',
    'sacred',
    'profane',
    'holy',
    'unholy',

    // Economic bias
    'rich',
    'poor',
    'wealthy',
    'destitute',
    'privileged',
    'underprivileged',
    'elite',
    'common',
    'noble',
    'peasant',
  ];

  private factualVerificationTerms = [
    // Claims that need verification
    'proven',
    'scientifically',
    'research shows',
    'studies indicate',
    'experts say',
    'authorities claim',
    'traditionally',
    'historically',
    'ancient wisdom',
    'time-tested',
    'universally accepted',
  ];

  private communityHarmonyTerms = [
    // Positive community language
    'together',
    'united',
    'harmony',
    'peace',
    'cooperation',
    'collaboration',
    'mutual',
    'shared',
    'collective',
    'community',
    'inclusive',
    'welcoming',
    'embracing',
    'accepting',
    'respecting',

    // Healing and reconciliation
    'heal',
    'reconcile',
    'forgive',
    'understand',
    'empathize',
    'support',
    'help',
    'assist',
    'nurture',
    'care',
  ];

  private culturalSensitivityTerms = [
    // Respectful cultural language
    'honor',
    'respect',
    'acknowledge',
    'recognize',
    'appreciate',
    'learn from',
    'guided by',
    'inspired by',
    'following',

    // Permission and consent
    'with permission',
    'with guidance',
    'with blessing',
    'with consent',
    'in consultation',
    'with elders',
    'with community',
  ];

  async analyzeNarrative(
    ritualText: string,
  ): Promise<NarrativeForensicsResult> {
    const feedback: string[] = [];
    const detectedIssues: NarrativeIssue[] = [];
    const recommendations: string[] = [];

    // Normalize text for analysis
    const normalizedText = ritualText.toLowerCase();
    const sentences = ritualText
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);
    const words = normalizedText.split(/\s+/);

    // 1. Polarization Analysis
    const polarizationScore = this.analyzePolarization(
      words,
      sentences,
      detectedIssues,
    );

    // 2. Bias Detection
    const biasScore = this.analyzeBias(words, sentences, detectedIssues);

    // 3. Community Harmony Assessment
    const communityHarmonyScore = this.analyzeCommunityHarmony(
      words,
      sentences,
    );

    // 4. Fact Verification
    const factVerificationScore = this.analyzeFactualClaims(
      sentences,
      detectedIssues,
    );

    // 5. Cultural Sensitivity Check
    this.analyzeCulturalSensitivity(sentences, detectedIssues);

    // Calculate overall score
    const overallScore = this.calculateOverallScore({
      polarizationScore,
      biasScore,
      communityHarmonyScore,
      factVerificationScore,
    });

    // Generate feedback and recommendations
    this.generateFeedback(
      {
        polarizationScore,
        biasScore,
        communityHarmonyScore,
        factVerificationScore,
        overallScore,
      },
      feedback,
      recommendations,
    );

    return {
      polarizationScore,
      biasScore,
      communityHarmonyScore,
      factVerificationScore,
      overallScore,
      feedback,
      detectedIssues,
      recommendations,
    };
  }

  private analyzePolarization(
    words: string[],
    sentences: string[],
    issues: NarrativeIssue[],
  ): number {
    let polarizationCount = 0;
    let totalWords = words.length;

    // Count polarizing keywords
    for (const word of words) {
      if (this.polarizingKeywords.some((keyword) => word.includes(keyword))) {
        polarizationCount++;
      }
    }

    // Analyze sentence structure for us vs them patterns
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();

      // Check for us vs them patterns
      if (
        (lowerSentence.includes('us') ||
          lowerSentence.includes('we') ||
          lowerSentence.includes('our')) &&
        (lowerSentence.includes('them') ||
          lowerSentence.includes('they') ||
          lowerSentence.includes('their'))
      ) {
        issues.push({
          type: 'polarization',
          severity: 'medium',
          description: 'Us vs them language detected',
          context: sentence.trim(),
          suggestion:
            'Consider using inclusive language that unites rather than divides',
        });
      }

      // Check for absolute statements
      if (
        this.polarizingKeywords.some(
          (keyword) =>
            ['always', 'never', 'everyone', 'nobody', 'all', 'none'].includes(
              keyword,
            ) && lowerSentence.includes(keyword),
        )
      ) {
        issues.push({
          type: 'polarization',
          severity: 'low',
          description: 'Absolute statement detected',
          context: sentence.trim(),
          suggestion:
            'Consider using more nuanced language that acknowledges complexity',
        });
      }
    }

    // Calculate polarization score (lower is better)
    const score = Math.min(
      polarizationCount / Math.max(totalWords * 0.1, 1),
      1.0,
    );
    return 1.0 - score; // Invert so higher is better
  }

  private analyzeBias(
    words: string[],
    sentences: string[],
    issues: NarrativeIssue[],
  ): number {
    let biasCount = 0;
    let totalWords = words.length;

    // Count bias indicators
    for (const word of words) {
      if (this.biasIndicators.some((indicator) => word.includes(indicator))) {
        biasCount++;
      }
    }

    // Analyze sentences for bias patterns
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();

      // Check for gender bias
      if (
        lowerSentence.includes('manly') ||
        lowerSentence.includes('womanly') ||
        lowerSentence.includes('bossy') ||
        lowerSentence.includes('aggressive')
      ) {
        issues.push({
          type: 'bias',
          severity: 'medium',
          description: 'Potential gender bias detected',
          context: sentence.trim(),
          suggestion: 'Consider using gender-neutral language',
        });
      }

      // Check for cultural bias
      if (
        lowerSentence.includes('primitive') ||
        lowerSentence.includes('advanced') ||
        lowerSentence.includes('civilized') ||
        lowerSentence.includes('backward')
      ) {
        issues.push({
          type: 'bias',
          severity: 'high',
          description: 'Cultural bias detected',
          context: sentence.trim(),
          suggestion:
            'Avoid hierarchical language that implies cultural superiority',
        });
      }
    }

    // Calculate bias score (lower is better)
    const score = Math.min(biasCount / Math.max(totalWords * 0.05, 1), 1.0);
    return 1.0 - score; // Invert so higher is better
  }

  private analyzeCommunityHarmony(
    words: string[],
    sentences: string[],
  ): number {
    let harmonyCount = 0;
    let totalWords = words.length;

    // Count community harmony terms
    for (const word of words) {
      if (this.communityHarmonyTerms.some((term) => word.includes(term))) {
        harmonyCount++;
      }
    }

    // Calculate harmony score (higher is better)
    return Math.min(harmonyCount / Math.max(totalWords * 0.1, 1), 1.0);
  }

  private analyzeFactualClaims(
    sentences: string[],
    issues: NarrativeIssue[],
  ): number {
    let factualClaims = 0;
    let verifiedClaims = 0;

    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();

      // Check for factual claims
      if (
        this.factualVerificationTerms.some((term) =>
          lowerSentence.includes(term),
        )
      ) {
        factualClaims++;

        // Check if claim is properly qualified
        if (
          lowerSentence.includes('may') ||
          lowerSentence.includes('might') ||
          lowerSentence.includes('could') ||
          lowerSentence.includes('suggest') ||
          lowerSentence.includes('appear') ||
          lowerSentence.includes('seem')
        ) {
          verifiedClaims++;
        } else {
          issues.push({
            type: 'factual',
            severity: 'medium',
            description: 'Unqualified factual claim detected',
            context: sentence.trim(),
            suggestion:
              'Consider qualifying claims with appropriate language like "may" or "suggest"',
          });
        }
      }
    }

    // Calculate verification score
    return factualClaims > 0 ? verifiedClaims / factualClaims : 1.0;
  }

  private analyzeCulturalSensitivity(
    sentences: string[],
    issues: NarrativeIssue[],
  ): void {
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();

      // Check for cultural appropriation indicators
      if (
        lowerSentence.includes('ancient wisdom') ||
        lowerSentence.includes('traditional knowledge')
      ) {
        if (
          !lowerSentence.includes('permission') &&
          !lowerSentence.includes('guidance') &&
          !lowerSentence.includes('blessing') &&
          !lowerSentence.includes('consultation')
        ) {
          issues.push({
            type: 'cultural',
            severity: 'high',
            description: 'Potential cultural appropriation detected',
            context: sentence.trim(),
            suggestion:
              'Ensure proper permission and guidance when referencing cultural traditions',
          });
        }
      }
    }
  }

  private calculateOverallScore(scores: {
    polarizationScore: number;
    biasScore: number;
    communityHarmonyScore: number;
    factVerificationScore: number;
  }): number {
    // Weighted average with emphasis on polarization and bias
    const weights = {
      polarization: 0.3,
      bias: 0.3,
      harmony: 0.2,
      factual: 0.2,
    };

    return (
      scores.polarizationScore * weights.polarization +
      scores.biasScore * weights.bias +
      scores.communityHarmonyScore * weights.harmony +
      scores.factVerificationScore * weights.factual
    );
  }

  private generateFeedback(
    scores: {
      polarizationScore: number;
      biasScore: number;
      communityHarmonyScore: number;
      factVerificationScore: number;
      overallScore: number;
    },
    feedback: string[],
    recommendations: string[],
  ): void {
    // Polarization feedback
    if (scores.polarizationScore < 0.7) {
      feedback.push(
        'Consider reducing polarizing language that creates divisions',
      );
      recommendations.push(
        'Use inclusive language that brings people together',
      );
    }

    // Bias feedback
    if (scores.biasScore < 0.7) {
      feedback.push('Review content for potential biases and stereotypes');
      recommendations.push(
        'Ensure balanced and respectful representation of all groups',
      );
    }

    // Community harmony feedback
    if (scores.communityHarmonyScore < 0.5) {
      feedback.push('Include more language that promotes community harmony');
      recommendations.push(
        'Emphasize cooperation, understanding, and mutual respect',
      );
    }

    // Factual verification feedback
    if (scores.factVerificationScore < 0.8) {
      feedback.push('Qualify factual claims with appropriate language');
      recommendations.push(
        'Use terms like "may," "suggest," or "appear" for claims',
      );
    }

    // Overall positive feedback
    if (scores.overallScore > 0.8) {
      feedback.push('Excellent narrative balance and cultural sensitivity');
      recommendations.push(
        'Continue maintaining high standards of inclusive language',
      );
    }
  }

  // Additional method for detailed narrative analysis
  async generateNarrativeReport(ritualText: string): Promise<{
    summary: string;
    strengths: string[];
    areasForImprovement: string[];
    culturalConsiderations: string[];
  }> {
    const result = await this.analyzeNarrative(ritualText);

    const summary = `Narrative analysis completed with overall score: ${(
      result.overallScore * 100
    ).toFixed(1)}%`;

    const strengths: string[] = [];
    if (result.polarizationScore > 0.8)
      strengths.push('Low polarization language');
    if (result.biasScore > 0.8) strengths.push('Minimal bias detected');
    if (result.communityHarmonyScore > 0.7)
      strengths.push('Strong community harmony focus');
    if (result.factVerificationScore > 0.9)
      strengths.push('Well-qualified factual claims');

    const areasForImprovement = result.recommendations;

    const culturalConsiderations = result.detectedIssues
      .filter((issue) => issue.type === 'cultural')
      .map((issue) => issue.suggestion);

    return {
      summary,
      strengths,
      areasForImprovement,
      culturalConsiderations,
    };
  }
}
