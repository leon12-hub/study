import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { GeminiAiProvider } from './gemini-ai.provider.js';

describe('GeminiAiProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends a structured request and returns generated JSON with token usage', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: '{"questions":[]}' }],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 12,
            candidatesTokenCount: 18,
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const config = {
      get: vi.fn((name: string) =>
        name === 'GEMINI_API_KEY' ? 'test-api-key' : 'gemini-test',
      ),
    } as unknown as ConfigService;
    const provider = new GeminiAiProvider(config);

    await expect(provider.generateJson('Create a quiz.')).resolves.toEqual({
      content: { questions: [] },
      inputTokens: 12,
      outputTokens: 18,
    });

    const [url, options] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toContain('models/gemini-test:generateContent');
    expect(new Headers(options.headers).get('x-goog-api-key')).toBe(
      'test-api-key',
    );
    expect(JSON.parse(options.body as string)).toMatchObject({
      contents: [{ parts: [{ text: 'Create a quiz.' }] }],
      generationConfig: { responseMimeType: 'application/json' },
    });
  });

  it('fails explicitly when the API key is missing', async () => {
    const config = {
      get: vi.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const provider = new GeminiAiProvider(config);

    await expect(
      provider.generateJson('Create a quiz.'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('surfaces provider errors without returning fallback content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('unavailable', { status: 503 })),
    );
    const config = {
      get: vi.fn((name: string) =>
        name === 'GEMINI_API_KEY' ? 'test-api-key' : undefined,
      ),
    } as unknown as ConfigService;
    const provider = new GeminiAiProvider(config);

    await expect(
      provider.generateJson('Create a quiz.'),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });
});
