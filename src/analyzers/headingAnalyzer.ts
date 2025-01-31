import { log } from '@clack/prompts';

export function analyzeHeadings(document: Document) {
  const h1Elements = document.querySelectorAll('h1');
  const h1Count = h1Elements.length;
  const nonEmptyH1s = Array.from(h1Elements).filter((h1: Element) => h1.textContent!.trim().length > 0);

  if (h1Count === 0) {
    log.error('No H1 heading found on the page - this is crucial for SEO');
    return;
  }

  const cleanHeadingText = (text: string) => text.replace(/\s+/g, ' ').trim();

  if (h1Count > 1) {
    log.warn(`Multiple H1 headings found (${h1Count}). Best practice is to have exactly one H1 per page`);
    nonEmptyH1s.forEach((h1, index) => {
      log.info(`   H1 #${index + 1}: "${cleanHeadingText(h1.textContent!)}"`);
    });
  }

  if (h1Count === 1 && nonEmptyH1s.length === 1) {
    log.success('Single H1 tag found (recommended)');
    log.info(`   H1: "${cleanHeadingText(nonEmptyH1s[0].textContent!)}"`);
  }

  if (h1Count !== nonEmptyH1s.length) {
    log.error(`Empty H1 tag(s) found (${h1Count - nonEmptyH1s.length} empty)`);
  }
}