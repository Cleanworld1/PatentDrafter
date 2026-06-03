export interface LlmJsonClient {
  generateJson(prompt: string): Promise<string>;
}

export class MockLlmClient implements LlmJsonClient {
  async generateJson(prompt: string): Promise<string> {
    return JSON.stringify({ prompt_preview: prompt.slice(0, 120), mock: true });
  }
}

export function getOpenAiConfig() {
  return {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini"
  };
}

export function createLlmClient(): LlmJsonClient {
  return new MockLlmClient();
}
