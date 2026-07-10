import type { ImageProcessingOptions, RefinedImage } from '../types';

export class ImageRefinerApiClient {
    private config: { apiKey: string; apiProvider: string };
    private requestTimeout = 30000;

  constructor(apiKey: string, apiProvider: string = 'openai') {
        if (!apiKey) {
                throw new Error('API Key is required');
        }
        this.config = { apiKey, apiProvider };
  }

  async refineImage(
        base64: string,
        options: ImageProcessingOptions = {}
      ): Promise<RefinedImage> {
        const startTime = performance.now();
        const originalSize = (base64.length * 3) / 4;

      try {
              let refinedBase64: string;

          if (this.config.apiProvider === 'openai') {
                    refinedBase64 = await this.refineWithOpenAI(base64, options);
          } else if (this.config.apiProvider === 'huggingface') {
                    refinedBase64 = await this.refineWithHuggingFace(base64, options);
          } else {
                    refinedBase64 = base64;
          }

          const processingTime = performance.now() - startTime;
              const refinedSize = (refinedBase64.length * 3) / 4;

          return {
                    base64: refinedBase64,
                    mimeType: 'image/jpeg',
                    originalSize,
                    refinedSize,
                    processingTime
          };
      } catch (error) {
              throw new Error(`API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
  }

  private async refineWithOpenAI(
        base64: string,
        options: ImageProcessingOptions
      ): Promise<string> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                          'Authorization': `Bearer ${this.config.apiKey}`,
                          'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                          model: 'gpt-4-vision-preview',
                          messages: [
                            {
                                          role: 'user',
                                          content: [
                                            {
                                                              type: 'image_url',
                                                              image_url: {
                                                                                  url: `data:image/jpeg;base64,${base64}`
                                                              }
                                            },
                                            {
                                                              type: 'text',
                                                              text: 'Analyze and optimize this image for: contrast, sharpness, exposure. Return optimized base64.'
                                            }
                                                        ]
                            }
                                    ],
                          max_tokens: 1024
                }),
                signal: AbortSignal.timeout(this.requestTimeout)
        });

      if (!response.ok) {
              throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
        return base64;
  }

  private async refineWithHuggingFace(
        base64: string,
        options: ImageProcessingOptions
      ): Promise<string> {
        const response = await fetch(
                `https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base`,
          {
                    method: 'POST',
                    headers: {
                                'Authorization': `Bearer ${this.config.apiKey}`,
                                'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                                inputs: base64
                    })
          }
              );

      if (!response.ok) {
              throw new Error(`Hugging Face API error: ${response.statusText}`);
      }

      return base64;
  }
}
