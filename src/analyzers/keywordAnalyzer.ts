import { log } from '@clack/prompts';

interface KeywordAnalysis {
  density: number;
  count: number;
  inTitle: boolean;
  inFirstParagraph: boolean;
  inHeadings: { h1: number; h2: number; h3: number };
  inMetaDescription: boolean;
  inUrl: boolean;
  occurrences: string[];
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')                      // Normalize whitespace
    .trim();
}

function findKeywordOccurrences(text: string, keyword: string): string[] {
  const normalizedText = normalizeText(text);
  const normalizedKeyword = normalizeText(keyword);
  const words = normalizedText.split(' ');
  const keywordWords = normalizedKeyword.split(' ');
  const occurrences: string[] = [];

  // For single word keywords
  if (keywordWords.length === 1) {
    const regex = new RegExp(`\\b${normalizedKeyword}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches) {
      return matches;
    }
    return [];
  }

  // For multi-word keywords
  for (let i = 0; i <= words.length - keywordWords.length; i++) {
    const possibleMatch = words.slice(i, i + keywordWords.length).join(' ');
    if (possibleMatch === normalizedKeyword) {
      // Get the original text format for this match
      const originalTextMatch = text
        .split(/\s+/)
        .slice(i, i + keywordWords.length)
        .join(' ');
      occurrences.push(originalTextMatch);
    }
  }

  return occurrences;
}

function countKeywordInText(text: string, keyword: string): number {
  return findKeywordOccurrences(text, keyword).length;
}

export function analyzeKeywordUsage(document: Document, keywordsInput: string) {
  if (!keywordsInput.trim()) {
    log.error('No keywords provided');
    return;
  }

  // Split by commas and clean up each keyword
  const keywords = keywordsInput
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0);

  log.info(`\nAnalyzing ${keywords.length} keywords:`);

  // Analyze each keyword separately
  keywords.forEach((keyword, index) => {
    log.info(`\n${index + 1}. Analyzing keyword: "${keyword}"`);
    const analysis = analyzeKeyword(document, keyword);
    displayResults(analysis, keyword);
  });

  // If multiple keywords were provided, show relationship analysis
  if (keywords.length > 1) {
    analyzeKeywordRelationships(keywords);
  }
}

function analyzeKeyword(document: Document, keyword: string): KeywordAnalysis {
  // Get all text content
  const bodyText = document.body.textContent || '';
  const wordCount = normalizeText(bodyText).split(/\s+/).length;

  // Find all keyword occurrences
  const occurrences = findKeywordOccurrences(bodyText, keyword);
  const keywordCount = occurrences.length;

  // Calculate density (accounting for multi-word keywords)
  const keywordWordCount = keyword.split(/\s+/).length;
  const density = (keywordCount * keywordWordCount) / wordCount * 100;

  // Check title
  const title = document.querySelector('title')?.textContent || '';
  const inTitle = findKeywordOccurrences(title, keyword).length > 0;

  // Check first paragraph
  const firstParagraph = document.querySelector('p')?.textContent || '';
  const inFirstParagraph = findKeywordOccurrences(firstParagraph, keyword).length > 0;

  // Check headings
  const h1Count = Array.from(document.querySelectorAll('h1'))
    .reduce((count, el) => count + findKeywordOccurrences(el.textContent || '', keyword).length, 0);
  const h2Count = Array.from(document.querySelectorAll('h2'))
    .reduce((count, el) => count + findKeywordOccurrences(el.textContent || '', keyword).length, 0);
  const h3Count = Array.from(document.querySelectorAll('h3'))
    .reduce((count, el) => count + findKeywordOccurrences(el.textContent || '', keyword).length, 0);

  // Check meta description
  const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const inMetaDescription = findKeywordOccurrences(metaDescription, keyword).length > 0;

  // Check URL
  const url = document.location?.pathname || '';
  const urlKeyword = normalizeText(keyword).replace(/\s+/g, '-');
  const inUrl = normalizeText(url).includes(urlKeyword);

  return {
    density,
    count: keywordCount,
    inTitle,
    inFirstParagraph,
    inHeadings: { h1: h1Count, h2: h2Count, h3: h3Count },
    inMetaDescription,
    inUrl,
    occurrences
  };
}

function displayResults(analysis: KeywordAnalysis, keyword: string) {
  log.step('Keyword Analysis Results:');

  // Show occurrences
  if (analysis.count > 0) {
    log.success(`Found ${analysis.count} keyword occurrences`);
    log.info('Keyword locations:');
    analysis.occurrences.forEach((occurrence, index) => {
      log.info(`${index + 1}. "${occurrence}"`);
    });
  } else {
    log.error('No keyword occurrences found');
  }

  // Density check
  log.step('Keyword Density:');
  log.info(`Current density: ${analysis.density.toFixed(2)}%`);
  if (analysis.density < 0.5) {
    log.warn('Density is too low (aim for 0.5% - 2.5%)');
  } else if (analysis.density > 2.5) {
    log.warn('Density is too high (possible keyword stuffing)');
  } else {
    log.success('Density is optimal');
  }

  // Title check
  log.step('Key Element Checks:');
  if (analysis.inTitle) {
    log.success('Found in title');
  } else {
    log.warn('Missing from title');
  }

  if (analysis.inFirstParagraph) {
    log.success('Found in first paragraph');
  } else {
    log.warn('Missing from first paragraph');
  }

  // Headings check
  log.step('Heading Usage:');
  const { h1, h2, h3 } = analysis.inHeadings;
  log.info(`H1 headings: ${h1}`);
  log.info(`H2 headings: ${h2}`);
  log.info(`H3 headings: ${h3}`);

  if (h1 + h2 + h3 === 0) {
    log.warn('Not found in any headings');
  }

  // Meta description check
  if (analysis.inMetaDescription) {
    log.success('Found in meta description');
  } else {
    log.warn('Missing from meta description');
  }

  // URL check
  if (analysis.inUrl) {
    log.success('Found in URL');
  } else {
    log.info('Consider including in URL');
  }

  // Overall assessment
  const recommendations: string[] = [];

  if (analysis.count === 0) {
    recommendations.push('Add the keyword to your content');
  }
  if (!analysis.inTitle && !analysis.inHeadings.h1) {
    recommendations.push('Include keyword in title or H1 heading');
  }
  if (!analysis.inFirstParagraph) {
    recommendations.push('Add keyword to the first paragraph');
  }
  if (!analysis.inMetaDescription) {
    recommendations.push('Include keyword in meta description');
  }
  if (analysis.density < 0.5) {
    recommendations.push('Increase keyword usage naturally throughout the content');
  } else if (analysis.density > 2.5) {
    recommendations.push('Reduce keyword usage to avoid over-optimization');
  }

  if (recommendations.length > 0) {
    log.step('Recommendations:');
    recommendations.forEach(rec => log.warn(rec));
  } else {
    log.success('Content is well-optimized for the focus keyword');
  }
}

function analyzeKeywordRelationships(keywords: string[]) {
  log.info('\nKeyword Relationship Analysis:');

  // Check for potentially competing keywords
  const similarities: [string, string, number][] = [];

  for (let i = 0; i < keywords.length; i++) {
    for (let j = i + 1; j < keywords.length; j++) {
      const similarity = calculateSimilarity(keywords[i], keywords[j]);
      if (similarity > 0.3) { // 30% similarity threshold
        similarities.push([keywords[i], keywords[j], similarity]);
      }
    }
  }

  if (similarities.length > 0) {
    log.warn('Potentially competing keywords found:');
    similarities.forEach(([kw1, kw2, similarity]) => {
      log.warn(`- "${kw1}" and "${kw2}" are ${(similarity * 100).toFixed(1)}% similar`);
    });
    log.info('Consider focusing on more distinct keywords to avoid keyword cannibalization');
  } else {
    log.success('Keywords are sufficiently distinct from each other');
  }
}

function calculateSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.toLowerCase().split(' '));
  const set2 = new Set(str2.toLowerCase().split(' '));

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}
