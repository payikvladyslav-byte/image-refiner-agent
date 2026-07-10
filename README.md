# Image-Refiner-Agent

AI-powered image optimization agent using Base64 encoding, OpenAI Vision API, and TypeScript.

## Features

- Base64 Image Processing
- - Multi-Provider Support (OpenAI, Hugging Face, Local)
  - - Smart Optimization (Contrast, Sharpness, Exposure)
    - - Memory-Efficient Processing
      - - Batch Processing Support
        - - IndexedDB Caching
          - - Progress Tracking
           
            - ## Quick Start
           
            - ```bash
              npm install
              cp .env.example .env
              npm run dev
              ```

              ## Project Structure

              ```
              src/
                agents/
                  base64-refiner.ts
                utils/
                  image-processor.ts
                  api-client.ts
                types/
                  index.ts
                config/
                  env.ts
              ```

              ## Configuration

              Create .env file with:
              - REACT_APP_IMAGE_REFINER_API_KEY
              - - REACT_APP_IMAGE_PROVIDER
               
                - ## Usage
               
                - See documentation in src/ folder.
               
                - ## License
               
                - MIT
