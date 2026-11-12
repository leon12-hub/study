var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { BadGatewayException, Injectable, ServiceUnavailableException, } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
let GeminiAiProvider = class GeminiAiProvider {
    config;
    constructor(config) {
        this.config = config;
    }
    async generateJson(prompt) {
        const apiKey = this.config.get('GEMINI_API_KEY')?.trim();
        if (!apiKey) {
            throw new ServiceUnavailableException('AI generation is not configured for this deployment.');
        }
        const model = this.config.get('GEMINI_MODEL')?.trim() || 'gemini-2.5-flash';
        const url = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`);
        let response;
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-goog-api-key': apiKey,
                },
                signal: AbortSignal.timeout(30_000),
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseMimeType: 'application/json',
                        temperature: 0.3,
                    },
                }),
            });
        }
        catch (error) {
            if (error instanceof Error) {
                throw new ServiceUnavailableException('The AI provider could not be reached.');
            }
            throw error;
        }
        if (!response.ok) {
            throw new BadGatewayException(`The AI provider returned status ${response.status}.`);
        }
        let payload;
        try {
            payload = await response.json();
        }
        catch (error) {
            if (error instanceof SyntaxError) {
                throw new BadGatewayException('The AI provider returned invalid JSON.');
            }
            throw error;
        }
        if (!isRecord(payload)) {
            throw new BadGatewayException('The AI provider returned an invalid response.');
        }
        const candidates = payload.candidates;
        const candidate = Array.isArray(candidates) ? candidates[0] : null;
        const content = isRecord(candidate) ? candidate.content : null;
        const parts = isRecord(content) ? content.parts : null;
        const firstPart = Array.isArray(parts) ? parts[0] : null;
        if (!isRecord(firstPart) || typeof firstPart.text !== 'string') {
            throw new BadGatewayException('The AI provider returned no generated content.');
        }
        let generated;
        try {
            generated = JSON.parse(firstPart.text);
        }
        catch (error) {
            if (error instanceof SyntaxError) {
                throw new BadGatewayException('The AI provider returned malformed JSON.');
            }
            throw error;
        }
        const usage = isRecord(payload.usageMetadata) ? payload.usageMetadata : {};
        return {
            content: generated,
            inputTokens: asNonNegativeInteger(usage.promptTokenCount),
            outputTokens: asNonNegativeInteger(usage.candidatesTokenCount),
        };
    }
};
GeminiAiProvider = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ConfigService])
], GeminiAiProvider);
export { GeminiAiProvider };
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function asNonNegativeInteger(value) {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
        ? value
        : 0;
}
//# sourceMappingURL=gemini-ai.provider.js.map