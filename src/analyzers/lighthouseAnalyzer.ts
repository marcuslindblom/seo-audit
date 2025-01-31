import { log, spinner } from '@clack/prompts';
import lighthouse from 'lighthouse';
import chromeLauncher from 'chrome-launcher';

export async function runLighthouseAudit(url: string) {
  const spin = spinner();
  spin.start('Running Lighthouse audit...');

  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = {
    logLevel: 'error' as const,
    output: 'json' as const,
    port: chrome.port,
  };

  try {
    const runnerResult = await lighthouse(url, options as any);
    await chrome.kill();
    spin.stop('Audit complete');

    if (!runnerResult?.lhr?.categories) {
      throw new Error('Failed to get Lighthouse results');
    }

    const { performance, accessibility, 'best-practices': bestPractices, seo } =
      runnerResult.lhr.categories;

    log.step('Lighthouse Scores:');

    const scores = [
      { name: 'Performance', score: performance?.score },
      { name: 'Accessibility', score: accessibility?.score },
      { name: 'Best Practices', score: bestPractices?.score },
      { name: 'SEO', score: seo?.score }
    ];

    scores.forEach(({ name, score }) => {
      if (!score) {
        log.warn(`${name}: N/A`);
      } else {
        const numericScore = Math.round(score * 100);
        if (numericScore >= 90) {
          log.success(`${name}: ${numericScore}`);
        } else if (numericScore >= 50) {
          log.warn(`${name}: ${numericScore}`);
        } else {
          log.error(`${name}: ${numericScore}`);
        }
      }
    });

    return runnerResult;
  } catch (error) {
    spin.stop('Audit failed');
    throw error;
  }
}