import { intro, outro, text, spinner, log, multiselect } from '@clack/prompts';
import fetch from 'node-fetch';
import { parseHTML } from 'linkedom';
import { runLighthouseAudit } from './analyzers/lighthouseAnalyzer';
import { analyzeTitle, analyzeMetaDescription } from './analyzers/seoAnalyzer';
import { analyzeHeadings } from './analyzers/headingAnalyzer';
import { analyzeImages } from './analyzers/imageAnalyzer';
import { analyzeContent } from './analyzers/contentAnalyzer';
import { analyzeKeywordUsage } from './analyzers/keywordAnalyzer';
import { analyzeLinks } from './analyzers/linkAnalyzer';

interface Analyzer {
  name: string;
  value: string;
  run: (document: Document, url: string) => void | Promise<void>;
}

const analyzers: Analyzer[] = [
  {
    name: 'Page Title & Branding',
    value: 'title',
    run: (document: Document) => analyzeTitle(document.title)
  },
  {
    name: 'Meta Description Length & Content',
    value: 'metaDescription',
    run: (document: Document) => {
      const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      analyzeMetaDescription(metaDesc);
    }
  },
  {
    name: 'Keyword Usage & Distribution',
    value: 'keyword',
    run: async (document: Document) => {
      const keyword = await text({
        message: 'Enter the keyword to analyze:',
        validate: (value) => {
          if (!value) return 'Please enter a keyword';
          return;
        },
      });
      if (typeof keyword === 'string') {
        analyzeKeywordUsage(document, keyword);
      }
    }
  },
  {
    name: 'Heading Structure & Hierarchy',
    value: 'headings',
    run: analyzeHeadings
  },
  {
    name: 'Image Alt Text & Optimization',
    value: 'images',
    run: analyzeImages
  },
  {
    name: 'Content Quality & Structure',
    value: 'content',
    run: analyzeContent
  },
  {
    name: 'Internal & External Links',
    value: 'links',
    run: analyzeLinks
  },
  {
    name: 'Lighthouse Performance Audit',
    value: 'lighthouse',
    run: async (document: Document, url: string) => {
      await runLighthouseAudit(url);
    }
  }
];

async function main() {
  intro('SEO Audit Tool');

  const url = await text({
    message: 'Enter the URL to analyze:',
    validate: (value) => {
      if (!value) return 'Please enter a URL';
      try {
        new URL(value);
        return;
      } catch (e) {
        return 'Please enter a valid URL';
      }
    },
  });

  const selectedAnalyzers = await multiselect({
    message: 'Select analyzers to run:',
    options: analyzers.map(a => ({
      value: a.value,
      label: a.name,
      hint: a.value === 'title' || a.value === 'metaDescription' ? 'recommended' : undefined
    })),
    required: true,
    defaultValue: ['title', 'metaDescription']
  });

  const s = spinner();
  s.start('Fetching and analyzing page...');

  try {
    const response = await fetch(url as string);
    const html = await response.text();
    const { document } = parseHTML(html);

    s.stop('Analysis complete');

    // Run selected analyzers
    for (const analyzer of analyzers) {
      if (selectedAnalyzers.includes(analyzer.value)) {
        log.step(`\n${analyzer.name}:`);
        await analyzer.run(document, url as string);
      }
    }

    outro('SEO audit completed!');
  } catch (error) {
    s.stop('Analysis failed');
    log.error(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    process.exit(1);
  }
}

main().catch(console.error);