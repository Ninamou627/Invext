/**
 * InvestX Sentiment Analysis Service
 * Full NLP pipeline: Tokenisation → Stop-words → Lexicon Scoring (VADER-style) → Negation/Booster handling
 * No external LLM API — 100% local processing.
 */

// ─── Financial Sentiment Lexicon ─────────────────────────────────────────────
// Positive terms → +value, Negative terms → −value. Range is typically 0.5–3.0.
const FINANCIAL_LEXICON: Record<string, number> = {
  // Strongly positive
  surge: 2.8, soar: 2.8, skyrocket: 3.0, breakthrough: 2.5, outperform: 2.5,
  record: 2.2, 'all-time-high': 3.0, profit: 2.0, revenue: 1.5, growth: 2.0,
  bullish: 2.5, rally: 2.3, upgrade: 2.2, beat: 2.0, exceed: 2.0, strong: 1.8,
  robust: 1.8, recover: 1.7, gain: 1.7, rise: 1.6, jump: 1.8, boost: 1.9,
  expand: 1.5, opportunity: 1.5, positive: 1.6, optimistic: 1.8, confident: 1.7,
  invest: 1.3, innovation: 1.5, dividend: 1.4, buyback: 1.6, buy: 1.2,
  profitable: 2.1, wins: 1.9, upside: 1.7, uptrend: 1.8, momentum: 1.5,
  success: 1.8, effective: 1.4, efficient: 1.4, approved: 1.9, launch: 1.4,
  partnership: 1.5, acquisition: 1.3, revenue_growth: 2.1, eps: 1.4, earnings: 1.5,
  rebound: 1.8, accelerate: 1.7, improve: 1.5, leadership: 1.4, demand: 1.4,
  // Moderately positive
  stable: 1.0, steady: 1.0, solid: 1.2, maintain: 0.8, meet: 0.7, inline: 0.8,
  // Mildly positive
  slight: 0.5, minor: 0.5, modest: 0.6, cautious: 0.4,

  // Strongly negative
  crash: -3.0, collapse: -2.9, bankrupt: -3.0, insolvency: -3.0, fraud: -3.0,
  scandal: -2.8, plunge: -2.7, plummet: -2.7, tank: -2.5, tumble: -2.3,
  loss: -2.0, deficit: -2.0, debt: -1.8, downgrade: -2.2, bearish: -2.5,
  recession: -2.4, layoff: -2.1, bankruptcy: -3.0, default: -2.5, miss: -1.9,
  fail: -2.2, disappoint: -2.0, weak: -1.7, decline: -1.8, drop: -1.7,
  fall: -1.6, slump: -2.0, cut: -1.5, reduce: -1.4, risk: -1.3, concern: -1.2,
  negative: -1.6, pessimistic: -1.8, uncertainty: -1.5, volatile: -1.3,
  lawsuit: -2.0, penalty: -1.9, fine: -1.6, recall: -1.7, warning: -1.8,
  sell: -1.2, short: -1.1, underperform: -2.0, miss_earnings: -2.1,
  headwind: -1.5, downside: -1.7, downtrend: -1.8, correction: -1.5,
  investigation: -2.0, probe: -1.8, suspend: -1.9, halt: -1.7, delay: -1.3,
  // Moderately negative
  slow: -1.0, sluggish: -1.2, pressure: -1.0, challenge: -0.9, difficult: -1.0,
  // Mildly negative
  lower: -0.6, below: -0.5,
};

// ─── English Stop-Words ───────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up',
  'about', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'out', 'off', 'over', 'under', 'again', 'further',
  'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
  'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  's', 't', 'just', 'don', 'now', 'any', 'if', 'or', 'as', 'and', 'but',
  'this', 'that', 'these', 'those', 'it', 'its', 'their', 'our', 'your',
  'his', 'her', 'we', 'they', 'you', 'he', 'she', 'i', 'me', 'my',
  'him', 'us', 'them', 'who', 'whom', 'which', 'what', 'while', 'also',
  'new', 'said', 'says', 'say', 'year', 'years', 'month', 'months',
]);

// ─── Negation Tokens ─────────────────────────────────────────────────────────
const NEGATIONS = new Set([
  'not', 'no', 'never', 'neither', 'nobody', 'nothing', 'nowhere',
  "n't", 'dont', 'doesnt', 'isnt', 'wasnt', 'shouldnt', 'wouldnt',
  'couldnt', 'without', 'barely', 'hardly', 'scarcely',
]);

// ─── Booster Words (intensity modifiers) ─────────────────────────────────────
const BOOSTERS: Record<string, number> = {
  extremely: 1.5, incredibly: 1.5, massively: 1.4, significantly: 1.3,
  substantially: 1.3, greatly: 1.3, hugely: 1.4, severely: 1.3,
  remarkably: 1.3, considerably: 1.2, very: 1.2, really: 1.15,
  quite: 1.1, rather: 1.05, somewhat: 0.9, slightly: 0.8, barely: 0.7,
  marginally: 0.75, modestly: 0.8, mildly: 0.8, relatively: 0.85,
};

// ─── Conjunction Markers (VADER "but" rule: second clause dominates) ──────────
const CONTRAST_CONJUNCTIONS = new Set(['but', 'however', 'although', 'though', 'despite', 'yet', 'nevertheless']);

// ─── Types ───────────────────────────────────────────────────────────────────
export interface SentimentResult {
  score: number;        // normalised −1.0 (bearish) to +1.0 (bullish)
  label: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  tokens: string[];     // cleaned tokens (after stop-word removal)
  keywords: Array<{ word: string; score: number }>; // matched lexicon words
  compound: number;     // raw summed score before normalisation
}

export interface AnalysedArticle {
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: number;
  sentiment: SentimentResult;
}

export interface AggregatedSentiment {
  overallScore: number;      // −1.0 to +1.0
  overallLabel: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  articles: AnalysedArticle[];
  dominantKeywords: Array<{ word: string; score: number; count: number }>;
}

// ─── Step 1: Tokenise ─────────────────────────────────────────────────────────
function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    // Preserve hyphenated words like "all-time-high"
    .replace(/([a-z])-([a-z])/g, '$1_$2')
    // Remove punctuation except underscores
    .replace(/[^a-z0-9\s_']/g, ' ')
    // Normalize whitespace
    .split(/\s+/)
    .filter(t => t.length > 1);
}

// ─── Step 2: Remove stop-words ────────────────────────────────────────────────
function removeStopWords(tokens: string[]): string[] {
  return tokens.filter(t => !STOP_WORDS.has(t));
}

// ─── Step 3: VADER-style sentiment scoring with negation + boosters ──────────
function scoreTokens(tokens: string[]): SentimentResult {
  let compound = 0;
  const keywords: Array<{ word: string; score: number }> = [];
  let negationMultiplier = 1;
  let boosterMultiplier = 1;
  let contrastSeen = false;
  let preContrastSum = 0;
  let postContrastSum = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Detect conjunction (VADER "but" rule)
    if (CONTRAST_CONJUNCTIONS.has(token)) {
      contrastSeen = true;
      preContrastSum = compound;
      continue;
    }

    // Update negation state (negation applies to the next 3 words)
    if (NEGATIONS.has(token)) {
      negationMultiplier = -1;
      boosterMultiplier = 1;
      continue;
    }

    // Update booster state
    if (BOOSTERS[token] !== undefined) {
      boosterMultiplier = BOOSTERS[token];
      continue;
    }

    // Check lexicon match
    if (FINANCIAL_LEXICON[token] !== undefined) {
      const rawScore = FINANCIAL_LEXICON[token];
      const adjustedScore = rawScore * negationMultiplier * boosterMultiplier;
      compound += adjustedScore;
      keywords.push({ word: token, score: adjustedScore });

      if (contrastSeen) {
        postContrastSum += adjustedScore;
      }
    }

    // Reset modifiers after applying them (they only affect the immediate meaningful token)
    negationMultiplier = 1;
    boosterMultiplier = 1;
  }

  // Apply VADER "but" rule: if there was a contrast conjunction, weight post-contrast higher
  if (contrastSeen && postContrastSum !== 0) {
    const adjustment = (postContrastSum - preContrastSum) * 0.3;
    compound += adjustment;
  }

  // Normalise compound score to [−1, +1] using VADER's formula: x / sqrt(x² + α)
  const alpha = 15;
  const normalised = compound / Math.sqrt(compound * compound + alpha);
  const score = Math.max(-1, Math.min(1, normalised));

  const label: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
    score >= 0.05 ? 'BULLISH' :
    score <= -0.05 ? 'BEARISH' :
    'NEUTRAL';

  return { score, label, tokens: removeStopWords(tokens), keywords, compound };
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function analyseText(text: string): SentimentResult {
  const tokens = tokenise(text);
  return scoreTokens(tokens);
}

export function analyseArticle(article: {
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
}): AnalysedArticle {
  // Weight headline more (×2) than summary as headline has stronger impact
  const combinedText = `${article.headline} ${article.headline} ${article.summary}`;
  const sentiment = analyseText(combinedText);

  return {
    title: article.headline,
    summary: article.summary,
    source: article.source,
    url: article.url,
    publishedAt: article.datetime,
    sentiment,
  };
}

export function aggregateSentiment(articles: AnalysedArticle[]): AggregatedSentiment {
  if (articles.length === 0) {
    return {
      overallScore: 0,
      overallLabel: 'NEUTRAL',
      bullishCount: 0,
      bearishCount: 0,
      neutralCount: 0,
      articles: [],
      dominantKeywords: [],
    };
  }

  let bullishCount = 0;
  let bearishCount = 0;
  let neutralCount = 0;

  // Weight more recent articles higher (decay by age)
  const now = Date.now() / 1000;
  const maxAgeSeconds = 7 * 24 * 3600; // 1 week
  let weightedSum = 0;
  let totalWeight = 0;

  const keywordMap: Map<string, { totalScore: number; count: number }> = new Map();

  for (const article of articles) {
    const ageSecs = now - article.publishedAt;
    const ageWeight = Math.max(0, 1 - ageSecs / maxAgeSeconds);
    const weight = 0.3 + 0.7 * ageWeight; // min weight 0.3, max 1.0

    weightedSum += article.sentiment.score * weight;
    totalWeight += weight;

    if (article.sentiment.label === 'BULLISH') bullishCount++;
    else if (article.sentiment.label === 'BEARISH') bearishCount++;
    else neutralCount++;

    // Aggregate keywords
    for (const kw of article.sentiment.keywords) {
      const existing = keywordMap.get(kw.word);
      if (existing) {
        existing.totalScore += kw.score;
        existing.count++;
      } else {
        keywordMap.set(kw.word, { totalScore: kw.score, count: 1 });
      }
    }
  }

  const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const overallLabel: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
    overallScore >= 0.05 ? 'BULLISH' :
    overallScore <= -0.05 ? 'BEARISH' :
    'NEUTRAL';

  const dominantKeywords = Array.from(keywordMap.entries())
    .map(([word, { totalScore, count }]) => ({ word, score: totalScore / count, count }))
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
    .slice(0, 10);

  return {
    overallScore: Math.round(overallScore * 1000) / 1000,
    overallLabel,
    bullishCount,
    bearishCount,
    neutralCount,
    articles,
    dominantKeywords,
  };
}
