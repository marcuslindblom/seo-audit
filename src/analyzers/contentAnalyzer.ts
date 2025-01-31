import { log } from '@clack/prompts';
import { improveText } from '../services/openaiService';

interface ReadabilityMetrics {
  fleschEase: number;
  fleschKincaid: number;
  gunningFog: number;
  colemanLiau: number;
  averageWordsPerSentence: number;
  averageSyllablesPerWord: number;
  totalWords: number;
  totalSentences: number;
  complexWords: number;
  lix?: number;
  longWords?: number;
}

function calculateMetrics(text: string, language: string): ReadabilityMetrics {
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
  const totalSyllables = countSyllables(text);
  const complexWords = words.filter(word => countWordSyllables(word) > 2).length;

  const totalWords = words.length;
  const totalSentences = sentences.length;
  const averageWordsPerSentence = totalWords / totalSentences;
  const averageSyllablesPerWord = totalSyllables / totalWords;
  const chars = text.replace(/\s/g, '').length;
  const averageCharsPerWord = chars / totalWords;

  const lix = calculateLIX(text);
  const longWords = words.filter(word => word.length > 15).length;

  return {
    fleschEase: 206.835 - (1.015 * averageWordsPerSentence) - (84.6 * averageSyllablesPerWord),
    fleschKincaid: (0.39 * averageWordsPerSentence) + (11.8 * averageSyllablesPerWord) - 15.59,
    gunningFog: 0.4 * (averageWordsPerSentence + 100 * (complexWords / totalWords)),
    colemanLiau: (0.0588 * (averageCharsPerWord * 100)) - (0.296 * (totalSentences / totalWords * 100)) - 15.8,
    averageWordsPerSentence,
    averageSyllablesPerWord,
    totalWords,
    totalSentences,
    complexWords,
    lix,
    longWords
  };
}

function countSyllables(text: string): number {
  const words = text.toLowerCase().split(/\s+/);
  return words.reduce((total, word) => {
    return total + countWordSyllables(word);
  }, 0);
}

function countWordSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;

  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const syllables = word.match(/[aeiouy]{1,2}/g);
  return syllables ? syllables.length : 1;
}

function calculateLIX(text: string): number {
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
  const longWords = words.filter(word => word.length > 6).length;

  return (words.length / sentences.length) + (longWords * 100 / words.length);
}

function getReadabilityGrade(score: number): string {
  if (score >= 90) return 'Very Easy (5th grade)';
  if (score >= 80) return 'Easy (6th grade)';
  if (score >= 70) return 'Fairly Easy (7th grade)';
  if (score >= 60) return 'Standard (8th-9th grade)';
  if (score >= 50) return 'Fairly Difficult (10th-12th grade)';
  if (score >= 30) return 'Difficult (College)';
  return 'Very Difficult (College graduate)';
}

function getLIXGrade(score: number): string {
  if (score < 30) return 'Very Easy';
  if (score < 40) return 'Easy';
  if (score < 50) return 'Moderate';
  if (score < 60) return 'Difficult';
  return 'Very Difficult';
}

function getReadabilityRecommendations(metrics: ReadabilityMetrics, language: string): string[] {
  const recommendations: string[] = [];

  if (language === 'sv') {
    if (metrics.averageWordsPerSentence > 15) {
      recommendations.push('Consider shortening your sentences (aim for 15 words per sentence for Swedish text)');
    }
    if (metrics.lix && metrics.lix > 50) {
      recommendations.push('Text might be too difficult for general audience (aim for LIX below 50)');
    }
  } else {
    if (metrics.averageWordsPerSentence > 20) {
      recommendations.push('Consider shortening your sentences (aim for 15-20 words per sentence)');
    }
    if (metrics.complexWords / metrics.totalWords > 0.2) {
      recommendations.push('Try using simpler words (too many complex words)');
    }
    if (metrics.fleschEase && metrics.fleschEase < 60) {
      recommendations.push('Content might be too difficult for general audience (aim for score above 60)');
    }
  }

  return recommendations;
}

export async function analyzeContent(document: Document) {
  const language = document.documentElement.lang.toLowerCase().split('-')[0] || 'en';

  const paragraphs = document.querySelectorAll('p');
  if (paragraphs.length === 0) {
    log.warn('No paragraph content found to analyze');
    return;
  }

  log.step('Content Structure Analysis:');

  // Analyze each paragraph individually
  for (const [index, paragraph] of Array.from(paragraphs).entries()) {
    const text = paragraph.textContent?.trim() || '';
    if (text.length === 0) continue;

    const words = text.split(/\s+/).filter(word => word.length > 0);
    if (words.length > 40) {
      log.warn(`Paragraph ${index + 1} is quite long (${words.length} words).`);
      try {
        const improvedText = await improveText(text, 'paragraph', {
          targetReadingLevel: 'grade 8'
        });
        if (improvedText) {
          log.info('Suggested improvement:');
          log.info(improvedText);
        }
      } catch (error) {
        log.warn(`Could not generate improvement suggestion: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
    for (const sentence of sentences) {
      const sentenceWords = sentence.trim().split(/\s+/).length;
      if (sentenceWords > 20) {
        log.warn(`Long sentence in paragraph ${index + 1} (${sentenceWords} words): "${sentence.trim()}"`);
        try {
          const improvedSentence = await improveText(sentence.trim(), 'sentence', {
            maxLength: 150
          });
          if (improvedSentence) {
            log.info('Suggested improvement:');
            log.info(improvedSentence);
          }
        } catch (error) {
          log.warn(`Could not generate improvement suggestion: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  }

  // Analyze overall content
  const fullText = Array.from(paragraphs)
    .map(p => p.textContent?.trim())
    .filter(Boolean)
    .join(' ');

  const metrics = calculateMetrics(fullText, language);

  log.step('Readability Analysis:');

  if (language === 'sv') {
    log.info(`LIX Score: ${Math.round(metrics.lix!)} (${getLIXGrade(metrics.lix!)})`);
  } else {
    log.info(`Flesch Reading Ease: ${Math.round(metrics.fleschEase!)} (${getReadabilityGrade(metrics.fleschEase!)})`);
    log.info(`Flesch-Kincaid Grade Level: ${Math.round(metrics.fleschKincaid!)}`);
    log.info(`Gunning Fog Index: ${Math.round(metrics.gunningFog!)}`);
    log.info(`Coleman-Liau Index: ${Math.round(metrics.colemanLiau!)}`);
  }

  log.step('Content Statistics:');
  log.info(`Total Words: ${metrics.totalWords}`);
  log.info(`Total Sentences: ${metrics.totalSentences}`);
  log.info(`Average Words per Sentence: ${Math.round(metrics.averageWordsPerSentence * 10) / 10}`);

  if (language === 'sv') {
    log.info(`Long Words: ${metrics.longWords!} (${Math.round(metrics.longWords! / metrics.totalWords * 100)}%)`);
  } else {
    log.info(`Complex Words: ${metrics.complexWords} (${Math.round(metrics.complexWords / metrics.totalWords * 100)}%)`);
  }

  // Display recommendations
  const recommendations = getReadabilityRecommendations(metrics, language);
  if (recommendations.length > 0) {
    log.step('Recommendations:');
    recommendations.forEach(rec => log.warn(rec));
  }
}
