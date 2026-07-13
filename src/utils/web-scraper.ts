/**
 * Web Scraper Skill for Image-Refiner-Agent
 * Handles web scraping, data extraction, and image downloading
 */

export interface ScrapedContent {
    title?: string;
    description?: string;
    content: string;
    images: ImageData[];
    links: LinkData[];
    metadata: Record<string, string>;
}

export interface ImageData {
    url: string;
    alt?: string;
    title?: string;
    base64?: string;
    mimeType?: string;
}

export interface LinkData {
    url: string;
    text: string;
    title?: string;
}

export interface ScrapingOptions {
    includeImages?: boolean;
    includeLinks?: boolean;
    downloadImages?: boolean;
    maxImages?: number;
    timeout?: number;
    userAgent?: string;
}

export async function scrapeWebPage(
    url: string,
    options: ScrapingOptions = {}
  ): Promise<ScrapedContent> {
    const {
          includeImages = true,
          includeLinks = true,
          downloadImages = false,
          maxImages = 50,
          timeout = 30000,
          userAgent = 'Mozilla/5.0 Image-Refiner'
    } = options;

  try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
              signal: controller.signal,
              headers: { 'User-Agent': userAgent }
      });

      clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

      return {
              title: doc.querySelector('title')?.textContent || '',
              description: doc.querySelector('meta[name="description"]')?.getAttribute('content') || '',
              content: extractMainContent(doc),
              images: includeImages ? await extractImages(doc, maxImages, downloadImages) : [],
              links: includeLinks ? extractLinks(doc) : [],
              metadata: extractMetadata(doc)
      };
  } catch (error) {
        throw new Error(`Scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function extractMainContent(doc: Document): string {
    const selectors = ['main', 'article', '[role="main"]', '.content', '#content'];
    for (const selector of selectors) {
          const element = doc.querySelector(selector);
          if (element) return element.textContent?.trim() || '';
    }
    return doc.body?.textContent?.trim() || '';
}

async function extractImages(
    doc: Document,
    maxImages: number,
    downloadImages: boolean
  ): Promise<ImageData[]> {
    const images: ImageData[] = [];
    const imgElements = doc.querySelectorAll('img');

  for (let i = 0; i < Math.min(imgElements.length, maxImages); i++) {
        const img = imgElements[i];
        const url = img.src || img.getAttribute('data-src') || '';
        if (!url) continue;

      const imageData: ImageData = {
              url: resolveUrl(url, new URL(doc.URL).origin),
              alt: img.alt || undefined,
              title: img.title || undefined
      };

      if (downloadImages) {
              try {
                        imageData.base64 = await downloadImageAsBase64(imageData.url);
                        imageData.mimeType = detectMimeType(imageData.url);
              } catch (error) {
                        console.warn(`Failed to download image ${imageData.url}`);
              }
      }
        images.push(imageData);
  }
    return images;
}

      export async function downloadImageAsBase64(imageUrl: string): Promise<string> {
          try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                                  const base64 = reader.result as string;
                                  resolve(base64);
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                });
          } catch (error) {
                throw new Error(`Failed to download image: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
      }

export async function downloadMultipleImages(
    imageUrls: string[]
  ): Promise<ImageData[]> {
    const results = await Promise.allSettled(
          imageUrls.map(async (url) => ({
                  url,
                  base64: await downloadImageAsBase64(url),
                  mimeType: detectMimeType(url)
          }))
        );

  return results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<ImageData>).value);
}

function extractLinks(doc: Document): LinkData[] {
    const links: LinkData[] = [];
    doc.querySelectorAll('a').forEach((link) => {
          const href = link.href;
          const text = link.textContent?.trim() || '';
          if (href && text) {
                  links.push({ url: href, text, title: link.title || undefined });
          }
    });
    return links;
}

function extractMetadata(doc: Document): Record<string, string> {
    const metadata: Record<string, string> = {};
    const metaTags = doc.querySelectorAll('meta');
    metaTags.forEach((tag) => {
          const name = tag.getAttribute('name') || tag.getAttribute('property');
          const content = tag.getAttribute('content');
          if (name && content) metadata[name] = content;
    });
    return metadata;
}

function resolveUrl(url: string, baseUrl: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('//')) return `https:${url}`;
    try { return new URL(url, baseUrl).href; }
    catch { return url; }
}

function detectMimeType(url: string): string {
    const ext = url.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
          jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
          gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml'
    };
    return mimeTypes[ext] || 'image/unknown';
}

export async function scrapeMultiplePages(
    urls: string[], options: ScrapingOptions = {}
  ): Promise<ScrapedContent[]> {
    const results = await Promise.allSettled(
          urls.map((url) => scrapeWebPage(url, options))
        );
    return results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<ScrapedContent>).value);
}

export function extractStructuredData(doc: Document): Record<string, unknown>[] {
    const data: Record<string, unknown>[] = [];
    doc.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
          try { data.push(JSON.parse(script.textContent || '{}')); }
          catch (e) { console.warn('JSON-LD parse error'); }
    });
    return data;
}

export function exportScrapedData(
    data: ScrapedContent, format: 'json'|'csv'|'html' = 'json'
  ): string {
    switch (format) {
      case 'json': return JSON.stringify(data, null, 2);
      case 'csv': return exportAsCSV(data);
      case 'html': return exportAsHTML(data);
      default: return JSON.stringify(data);
    }
}

function exportAsCSV(data: ScrapedContent): string {
    const headers = ['URL', 'Alt Text', 'Title'];
    const rows = data.images.map((img) => [img.url, img.alt || '', img.title || '']);
    return [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
}

function exportAsHTML(data: ScrapedContent): string {
    return `<!DOCTYPE html><html><head><title>${data.title || 'Scraped Data'}</title></head><body>
    <h1>${data.title || 'Scraped Content'}</h1>
    ${data.description ? `<p>${data.description}</p>` : ''}
    <h2>Images</h2>
    ${data.images.map((img) => `<img src="${img.url}" alt="${img.alt || ''}">`).join('\n')}
    <h2>Links</h2>
    <ul>${data.links.map((link) => `<li><a href="${link.url}">${link.text}</a></li>`).join('\n')}</ul>
    </body></html>`;
}
