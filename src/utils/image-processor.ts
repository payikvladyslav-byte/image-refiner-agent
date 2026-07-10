import type { RefinedImage } from '../types';

export class ImageProcessor {
    private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024;
    private imageCache = new WeakMap<object, string>();

  async fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
        if (file.size > ImageProcessor.MAX_FILE_SIZE) {
                throw new Error(`File exceeds maximum size`);
        }

      return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                        const result = reader.result as string;
                        const base64 = result.split(',')[1] || result;
                        resolve({
                                    base64,
                                    mimeType: file.type || 'image/jpeg'
                        });
              };
              reader.onerror = () => reject(new Error('Failed to read file'));
              reader.readAsDataURL(file);
      });
  }

  base64ToBlob(base64: string, mimeType: string): Blob {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
        }
        return new Blob([bytes], { type: mimeType });
  }

  async getImageMetadata(base64: string, mimeType: string): Promise<{
        width: number;
        height: number;
  }> {
        return new Promise((resolve, reject) => {
                const blob = this.base64ToBlob(base64, mimeType);
                const url = URL.createObjectURL(blob);
                const img = new Image();

                                 img.onload = () => {
                                           URL.revokeObjectURL(url);
                                           resolve({ width: img.width, height: img.height });
                                 };

                                 img.onerror = () => {
                                           URL.revokeObjectURL(url);
                                           reject(new Error('Failed to load image'));
                                 };

                                 img.src = url;
        });
  }

  async compressBase64(
        base64: string,
        mimeType: string,
        quality: number = 0.8
      ): Promise<string> {
        return new Promise((resolve, reject) => {
                const blob = this.base64ToBlob(base64, mimeType);
                const url = URL.createObjectURL(blob);
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                                 if (!ctx) {
                                           reject(new Error('Canvas context not available'));
                                           return;
                                 }

                                 const img = new Image();

                                 img.onload = () => {
                                           canvas.width = img.width;
                                           canvas.height = img.height;
                                           ctx.drawImage(img, 0, 0);

                                           canvas.toBlob(
                                                       (compressedBlob) => {
                                                                     if (!compressedBlob) {
                                                                                     reject(new Error('Compression failed'));
                                                                                     return;
                                                                     }

                                                         const reader = new FileReader();
                                                                     reader.onload = () => {
                                                                                     const result = reader.result as string;
                                                                                     const compressedBase64 = result.split(',')[1];
                                                                                     URL.revokeObjectURL(url);
                                                                                     resolve(compressedBase64);
                                                                     };
                                                                     reader.readAsDataURL(compressedBlob);
                                                       },
                                                       'image/jpeg',
                                                       quality
                                                     );
                                 };

                                 img.onerror = () => {
                                           URL.revokeObjectURL(url);
                                           reject(new Error('Image loading failed'));
                                 };

                                 img.src = url;
        });
  }

  async cacheImageToIndexedDB(key: string, base64: string): Promise<void> {
        return new Promise((resolve, reject) => {
                const request = indexedDB.open('ImageRefinerDB', 1);
                request.onerror = () => reject(new Error('IndexedDB open failed'));
                request.onsuccess = (event) => {
                          const db = (event.target as IDBOpenDBRequest).result;
                          const transaction = db.transaction(['images'], 'readwrite');
                          const store = transaction.objectStore('images');
                          store.put({ key, base64, timestamp: Date.now() });
                          resolve();
                };
        });
  }

  clearCache(): void {
        this.imageCache = new WeakMap();
  }
}

export const imageProcessor = new ImageProcessor();
