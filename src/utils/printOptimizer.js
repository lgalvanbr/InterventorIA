/**
 * printOptimizer.js
 * Utility to downscale images in memory for ultra-lightweight PDF exports (< 10MB)
 * and prevent memory/spooler bloat in browser print engines.
 */

const printImageCache = new Map();

/**
 * Downsamples a single image URL into a lightweight WebP/JPEG data URI
 * @param {string} url - Source image URL
 * @param {number} maxDim - Maximum width/height in pixels (default: 640px)
 * @param {number} quality - JPEG quality 0.0 - 1.0 (default: 0.70)
 * @returns {Promise<string>} - Downscaled data URI or original URL as fallback
 */
export async function downsampleImageForPrint(url, maxDim = 640, quality = 0.70) {
  if (!url) return url;
  
  // Return cached result if already optimized
  const cacheKey = `${url}_${maxDim}_${quality}`;
  if (printImageCache.has(cacheKey)) {
    return printImageCache.get(cacheKey);
  }

  // If already a small SVG or data URI, return as-is
  if (url.startsWith('data:image/svg')) {
    return url;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Enable CORS where available

    // Timeout in case image hangs
    const timer = setTimeout(() => {
      resolve(url);
    }, 4000);

    img.onload = () => {
      clearTimeout(timer);
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          resolve(url);
          return;
        }

        // Calculate aspect-ratio scale
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(url);
          return;
        }

        // Draw image smoothly
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to lightweight JPEG (typically 30kB - 50kB)
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        printImageCache.set(cacheKey, dataUrl);
        resolve(dataUrl);
      } catch (err) {
        // Fallback gracefully on tainted canvas or security exception
        resolve(url);
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve(url);
    };

    img.src = url;
  });
}

/**
 * Optimizes an array of photo objects concurrently
 * @param {Array<{url: string, id: string}>} photos
 * @param {number} maxDim
 * @param {number} quality
 * @returns {Promise<Map<string, string>>} - Map of photo.url -> optimizedDataUri
 */
export async function optimizePhotoListForPrint(photos = [], maxDim = 640, quality = 0.70) {
  const resultMap = new Map();
  const uniqueUrls = Array.from(new Set(photos.map(p => p.url).filter(Boolean)));

  // Process in batches of 6 for fast parallel downloading
  const BATCH_SIZE = 6;
  for (let i = 0; i < uniqueUrls.length; i += BATCH_SIZE) {
    const batch = uniqueUrls.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (u) => {
      try {
        const optimized = await downsampleImageForPrint(u, maxDim, quality);
        resultMap.set(u, optimized);
      } catch {
        resultMap.set(u, u);
      }
    });
    await Promise.all(promises);
  }

  return resultMap;
}
