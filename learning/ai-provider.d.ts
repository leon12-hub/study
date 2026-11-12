export declare const AI_PROVIDER = "AI_PROVIDER";
export type AiProviderResponse = {
    content: unknown;
    inputTokens: number;
    outputTokens: number;
};
export interface AiProvider {
    generateJson(prompt: string): Promise<AiProviderResponse>;
}
