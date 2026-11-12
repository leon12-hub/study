import { ConfigService } from '@nestjs/config';
import type { AiProvider, AiProviderResponse } from './ai-provider.js';
export declare class GeminiAiProvider implements AiProvider {
    private readonly config;
    constructor(config: ConfigService);
    generateJson(prompt: string): Promise<AiProviderResponse>;
}
