import { intro, outro, text, spinner, log } from '@clack/prompts';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import lighthouse from 'lighthouse';
import chromeLauncher from 'chrome-launcher';
import { analyzeTitle, analyzeMetaDescription } from './analyzers/seoAnalyzer';
import { analyzeHeadings } from './analyzers/headingAnalyzer';
import { analyzeImages } from './analyzers/imageAnalyzer';
import { analyzeContent } from './analyzers/contentAnalyzer';
import { analyzeKeywordUsage } from './analyzers/keywordAnalyzer';
import { analyzeLinks } from './analyzers/linkAnalyzer';

async function runLighthouseAudit(url: string) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = {
    logLevel: 'error' as const,
    output: 'json' as const,
    port: chrome.port,
  };

  const runnerResult = await lighthouse(url, options as any);
  await chrome.kill();

  if (!runnerResult?.lhr?.categories) {
    throw new Error('Failed to get Lighthouse results');
  }

  const { performance, accessibility, 'best-practices': bestPractices, seo } =
    runnerResult.lhr.categories;

  log.info('\n📊 Lighthouse Scores:');
  log.info(`Performance: ${performance?.score ? Math.round(performance.score * 100) : 'N/A'}`);
  log.info(`Accessibility: ${accessibility?.score ? Math.round(accessibility.score * 100) : 'N/A'}`);
  log.info(`Best Practices: ${bestPractices?.score ? Math.round(bestPractices.score * 100) : 'N/A'}`);
  log.info(`SEO: ${seo?.score ? Math.round(seo.score * 100) : 'N/A'}\n`);

  return runnerResult;
}

async function main() {
  intro(`🔍 Simple SEO Audit Tool`);

  const url = await text({
    message: 'Enter the website URL to audit',
    placeholder: 'https://example.com',
    validate(value) {
      if (!value) return 'Please enter a URL';
      if (!value.startsWith('http')) return 'Please enter a valid URL with http/https';
    },
  });

  const s = spinner();
  s.start('Analyzing website...');

  try {
    const response = await fetch(url.toString());
    const html = await response.text();
    const dom = new JSDOM(html, {
      runScripts: 'outside-only',
      resources: 'usable',
      features: {
        FetchExternalResources: ['script'],
        ProcessExternalResources: ['script'],
        SkipExternalResources: ['stylesheet']  // Skip loading CSS
      }
    });
    const document = dom.window.document;

    const title = document.querySelector('title')?.textContent || '';
    const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

    s.stop('Analysis complete!');

    log.step('\n📝 Analyzing Title...');
    analyzeTitle(title);

    log.step('\n📋 Analyzing Meta Description...');
    analyzeMetaDescription(metaDescription);

    log.step('\n📚 Analyzing Headings...');
    analyzeHeadings(document);

    log.step('\n🖼️ Analyzing Images...');
    analyzeImages(document);

    log.step('\n📄 Analyzing Content...');
    analyzeContent(document);

    log.step('\n🎯 Analyzing Keyword Usage...');
    analyzeKeywordUsage(document, 'Energi, förnybar');

    log.step('\n🔗 Analyzing Links...');
    analyzeLinks(document);

    s.start('Running Lighthouse audit...');
    await runLighthouseAudit(url.toString());
    s.stop('Lighthouse audit complete!');

  } catch (error: any) {
    s.stop('Analysis failed!');
    log.error(`Error: ${error.message}`);
  }

  outro(`Audit complete! 🎉`);
}

main().catch((err) => {
  log.error(err);
  process.exit(1);
});