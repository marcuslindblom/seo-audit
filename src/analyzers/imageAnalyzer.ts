import { log } from '@clack/prompts';

export function analyzeImages(document: Document) {
  const images = document.querySelectorAll('img');

  if (images.length === 0) {
    log.info('No images found on the page');
    return;
  }

  log.info(`Found ${images.length} images`);

  const imagesWithoutAlt = Array.from(images).filter(img => !img.hasAttribute('alt'));
  if (imagesWithoutAlt.length > 0) {
    log.error(`${imagesWithoutAlt.length} images missing alt text`);
    imagesWithoutAlt.forEach(img => {
      log.info(`   Missing alt: ${img.getAttribute('src')}`);
    });
  }

  // Check for large images
  Array.from(images).forEach(img => {
    const width = parseInt(img.getAttribute('width') || '0');
    const height = parseInt(img.getAttribute('height') || '0');
    if (width > 1920 || height > 1080) {
      log.warn(`Large image found: ${img.getAttribute('src')} (${width}x${height})`);
    }
  });
}