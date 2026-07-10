export interface ImageRefinerConfig {
  apiKey: string;
    apiProvider: 'openai' | 'local' | 'huggingface';
      maxImageSize: number;
        outputFormat: 'jpeg' | 'png' | 'webp';
          compressionQuality: number;
          }

          export interface ImageProcessingOptions {
            enhanceContrast?: boolean;
              enhanceSharpness?: boolean;
                adjustExposure?: boolean;
                  denoise?: boolean;
                  }

                  export interface RefinedImage {
                    base64: string;
                      mimeType: string;
                        originalSize: number;
                          refinedSize: number;
                            processingTime: number;
                              metadata?: {
                                  width: number;
                                      height: number;
                                          colorSpace: string;
                                            };
                                            }

                                            export interface ImageRefinerError extends Error {
                                              code: string;
                                                details?: Record<string, unknown>;
                                                }
