import { log } from '@clack/prompts';
import { BRAND_POSITION_END, SEO_RULES } from '../constants';
import { analyzeTitleFormat } from './titleAnalyzer';

export function analyzeTitle(title: string) {
  if (title.length === 0) {
    log.error('Title tag is missing!');
    return;
  }

  // Length check
  if (title.length < SEO_RULES.TITLE_LENGTH.MIN) {
    log.warn(`Title length (${title.length} chars) is too short. Recommended: ${SEO_RULES.TITLE_LENGTH.MIN}-${SEO_RULES.TITLE_LENGTH.MAX} characters`);
  } else if (title.length > SEO_RULES.TITLE_LENGTH.MAX) {
    log.warn(`Title length (${title.length} chars) is too long. Recommended: ${SEO_RULES.TITLE_LENGTH.MIN}-${SEO_RULES.TITLE_LENGTH.MAX} characters`);
  } else {
    log.success(`Title length (${title.length} chars) is optimal`);
  }
  log.info(`Title: ${title}`);

  // Format analysis
  const titleAnalysis = analyzeTitleFormat(title);

  if (!titleAnalysis.hasSeparator) {
    log.warn('Title doesn\'t use a separator. Consider format: "Primary Keyword - Secondary Keyword | Brand"');
  } else {
    log.info(`Title separator used: "${titleAnalysis.separator}"`);

    if (titleAnalysis.segments.length > 3) {
      log.warn('Title has too many segments. Consider limiting to 2-3 parts');
    }

    const brandSegment = BRAND_POSITION_END === 'end'
      ? titleAnalysis.segments[titleAnalysis.segments.length - 1]
      : titleAnalysis.segments[0];

    if (brandSegment.length < 3) {
      log.warn(`Brand segment seems too short. Make sure brand name is included at the ${BRAND_POSITION_END}`);
    }

    log.info('Title segments:');
    titleAnalysis.segments.forEach((segment, index) => {
      log.info(`   ${index + 1}. "${segment}"`);
    });
  }
}

export function analyzeMetaDescription(metaDescription: string) {
  if (metaDescription.length === 0) {
    log.error('Meta description is missing!');
    return;
  }

  if (metaDescription.length < SEO_RULES.META_DESCRIPTION_LENGTH.MIN) {
    log.warn(`Meta description length (${metaDescription.length} chars) is too short. Recommended: ${SEO_RULES.META_DESCRIPTION_LENGTH.MIN}-${SEO_RULES.META_DESCRIPTION_LENGTH.MAX} characters`);
  } else if (metaDescription.length > SEO_RULES.META_DESCRIPTION_LENGTH.MAX) {
    log.warn(`Meta description length (${metaDescription.length} chars) is too long. Recommended: ${SEO_RULES.META_DESCRIPTION_LENGTH.MIN}-${SEO_RULES.META_DESCRIPTION_LENGTH.MAX} characters`);
  } else {
    log.success(`Meta description length (${metaDescription.length} chars) is optimal`);
  }
  log.info(`Meta Description: ${metaDescription}`);
}