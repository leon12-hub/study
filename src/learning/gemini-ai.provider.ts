import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiProvider, AiProviderResponse } from './ai-provider.js';

@Injectable()
export class GeminiAiProvider implements AiProvider {
  constructor(private readonly config: ConfigService) {}

  async generateJson(prompt: string): Promise<AiProviderResponse> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'AI generation is not configured for this deployment.',
      );
    }

    const model =
      this.config.get<string>('GEMINI_MODEL')?.trim() || 'gemini-2.5-flash';
    const url = new URL(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    );
    let response: Response;
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
    } catch (error) {
      if (error instanceof Error) {
        throw new ServiceUnavailableException(
          'The AI provider could not be reached.',
        );
      }
      throw error;
    }

    if (!response.ok) {
      throw new BadGatewayException(
        `The AI provider returned status ${response.status}.`,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new BadGatewayException('The AI provider returned invalid JSON.');
      }
      throw error;
    }
    if (!isRecord(payload)) {
      throw new BadGatewayException(
        'The AI provider returned an invalid response.',
      );
    }
    const candidates = payload.candidates;
    const candidate = Array.isArray(candidates) ? candidates[0] : null;
    const content = isRecord(candidate) ? candidate.content : null;
    const parts = isRecord(content) ? content.parts : null;
    const firstPart = Array.isArray(parts) ? parts[0] : null;
    if (!isRecord(firstPart) || typeof firstPart.text !== 'string') {
      throw new BadGatewayException(
        'The AI provider returned no generated content.',
      );
    }

    let generated: unknown;
    try {
      generated = JSON.parse(firstPart.text);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new BadGatewayException(
          'The AI provider returned malformed JSON.',
        );
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
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asNonNegativeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}
