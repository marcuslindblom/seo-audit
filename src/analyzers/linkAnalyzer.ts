import { log } from '@clack/prompts';

interface LinkAnalysis {
  total: number;
  internal: number;
  external: number;
  broken: number;
  nofollow: number;
  emptyHrefs: number;
  missingText: number;
  duplicates: number;
}

interface LinkDetails {
  href: string;
  text: string;
  isInternal: boolean;
  isNofollow: boolean;
  hasValidText: boolean;
}

function getLinkText(link: Element): string {
  // First try to get the text content
  let text = link.textContent?.trim() || '';

  // If no text content, check for aria-label
  if (!text) {
    text = link.getAttribute('aria-label')?.trim() || '';
  }

  // If still no text, check for title attribute
  if (!text) {
    text = link.getAttribute('title')?.trim() || '';
  }

  // If still no text, check for img alt text
  if (!text) {
    const img = link.querySelector('img');
    if (img) {
      text = img.getAttribute('alt')?.trim() || '';
    }
  }

  return text;
}

export async function analyzeLinks(document: Document) {
  log.info('\nAnalyzing Links...');

  const links = document.querySelectorAll('a');
  if (links.length === 0) {
    log.warn('No links found in the document');
    return;
  }

  // Get base URL safely
  let baseUrl = '';
  try {
    baseUrl = document.location?.origin || '';
  } catch (error) {
    // If we can't get the origin, we'll work without it
    log.warn('Could not determine base URL');
  }

  const linkDetails: LinkDetails[] = [];
  const seenUrls = new Set<string>();

  // Collect link details
  links.forEach(link => {
    const href = link.getAttribute('href') || '';
    const text = getLinkText(link);
    const rel = link.getAttribute('rel') || '';

    // Skip anchor links and javascript: links
    if (href.startsWith('#') || href.startsWith('javascript:')) {
      return;
    }

    let fullUrl = href;
    try {
      const isInternal = isInternalLink(href, baseUrl);
      if (isInternal && baseUrl && href.startsWith('/')) {
        fullUrl = new URL(href, baseUrl).toString();
      } else if (href.startsWith('http')) {
        fullUrl = new URL(href).toString();
      }
    } catch (error) {
      // If URL parsing fails, use the href as is
      fullUrl = href;
    }

    linkDetails.push({
      href: fullUrl,
      text,
      isInternal: isInternalLink(href, baseUrl),
      isNofollow: rel.includes('nofollow'),
      hasValidText: hasValidLinkText(text, href)
    });

    if (fullUrl) {
      seenUrls.add(fullUrl);
    }
  });

  const analysis: LinkAnalysis = {
    total: linkDetails.length,
    internal: linkDetails.filter(l => l.isInternal).length,
    external: linkDetails.filter(l => !l.isInternal).length,
    broken: 0, // Will be updated after checking
    nofollow: linkDetails.filter(l => l.isNofollow).length,
    emptyHrefs: linkDetails.filter(l => !l.href).length,
    missingText: linkDetails.filter(l => !l.hasValidText).length,
    duplicates: linkDetails.length - seenUrls.size
  };

  // Display initial analysis
  displayLinkAnalysis(analysis, linkDetails);

  // Check for broken links if we're in a browser environment
  if (typeof window !== 'undefined') {
    log.info('\nChecking for broken links...');
    await checkBrokenLinks(linkDetails, analysis);
  }

  // Provide recommendations
  provideLinkRecommendations(analysis, linkDetails);
}

function isInternalLink(href: string, baseUrl: string): boolean {
  if (!href) return true;
  if (href.startsWith('/')) return true;
  if (baseUrl && href.startsWith(baseUrl)) return true;

  try {
    if (!href.startsWith('http')) return true;
    if (!baseUrl) return false;
    const url = new URL(href);
    const base = new URL(baseUrl);
    return url.hostname === base.hostname;
  } catch {
    // If URL parsing fails, assume it's internal
    return true;
  }
}

function hasValidLinkText(text: string, href: string): boolean {
  if (!text) return false;
  const lowercaseText = text.toLowerCase();
  const invalidTexts = ['click here', 'read more', 'learn more', 'more info', 'here', 'link'];
  return !invalidTexts.includes(lowercaseText) && text.length > 2;
}

async function checkBrokenLinks(links: LinkDetails[], analysis: LinkAnalysis) {
  const checkedUrls = new Set<string>();
  let brokenCount = 0;

  for (const link of links) {
    if (!link.href || checkedUrls.has(link.href)) continue;

    try {
      const response = await fetch(link.href, { method: 'HEAD', mode: 'no-cors' });
      if (!response.ok) {
        log.error(`Broken link found: ${link.href}`);
        brokenCount++;
      }
    } catch (error) {
      log.error(`Could not access: ${link.href}`);
      brokenCount++;
    }

    checkedUrls.add(link.href);
  }

  analysis.broken = brokenCount;
}

function displayLinkAnalysis(analysis: LinkAnalysis, links: LinkDetails[]) {
  log.info('\nLink Analysis Results:');
  log.info(`Total Links: ${analysis.total}`);
  log.info(`Internal Links: ${analysis.internal}`);
  log.info(`External Links: ${analysis.external}`);
  log.info(`Nofollow Links: ${analysis.nofollow}`);

  if (analysis.emptyHrefs > 0) {
    log.warn(`Empty href attributes: ${analysis.emptyHrefs}`);
  }

  if (analysis.missingText > 0) {
    log.warn(`Links with missing or generic text: ${analysis.missingText}`);
  }

  if (analysis.duplicates > 0) {
    log.warn(`Duplicate links: ${analysis.duplicates}`);
  }

  // Display distribution of internal vs external links
  const internalRatio = (analysis.internal / analysis.total) * 100;
  if (analysis.total > 0) {
    log.info(`\nLink Distribution: ${internalRatio.toFixed(1)}% internal, ${(100 - internalRatio).toFixed(1)}% external`);
  }

  // Add example links with their text
  if (links.length > 0) {
    log.info('\nExample Links:');
    links.slice(0, 3).forEach((link, index) => {
      const textPreview = link.text || '[No text]';
      const hrefPreview = link.href.slice(0, 50) + (link.href.length > 50 ? '...' : '');
      log.info(`${index + 1}. "${textPreview}" → ${hrefPreview}`);
    });
  }
}

function provideLinkRecommendations(analysis: LinkAnalysis, links: LinkDetails[]) {
  log.info('\nRecommendations:');

  if (analysis.total === 0) {
    log.warn('- Consider adding some links to provide more value to your readers');
    return;
  }

  if (analysis.internal === 0) {
    log.warn('- Add internal links to help with site navigation and SEO');
  }

  if (analysis.external === 0) {
    log.warn('- Consider adding external links to authoritative sources');
  }

  if (analysis.missingText > 0) {
    log.warn('- Improve accessibility by replacing generic or missing link text:');
    links
      .filter(l => !l.hasValidText)
      .slice(0, 3)
      .forEach(l => {
        const textPreview = l.text || '[No text]';
        const hrefPreview = l.href.slice(0, 50) + (l.href.length > 50 ? '...' : '');
        log.info(`  • "${textPreview}" → ${hrefPreview}`);
      });
  }

  if (analysis.emptyHrefs > 0) {
    log.warn('- Fix links with empty href attributes');
  }

  if (analysis.duplicates > 0) {
    log.warn('- Consider reducing duplicate links to improve user experience');
  }

  const internalRatio = (analysis.internal / analysis.total) * 100;
  if (internalRatio < 20) {
    log.warn('- Consider adding more internal links to improve site navigation');
  } else if (internalRatio > 80) {
    log.warn('- Consider adding more external links to authoritative sources');
  }

  if (analysis.broken > 0) {
    log.error('- Fix broken links to improve user experience and SEO');
  }
}
