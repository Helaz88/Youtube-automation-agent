const Anthropic = require('@anthropic-ai/sdk');

class ClaudeAIService {
  constructor(apiKey) {
    this.client = new Anthropic({ apiKey });
  }

  async generateContent(prompt) {
    const response = await this.client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    return response.content[0].text;
  }

  async generateContentStreaming(prompt, onChunk) {
    const stream = await this.client.messages.stream({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });

    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta' &&
        onChunk
      ) {
        onChunk(chunk.delta.text);
      }
    }

    return (await stream.finalMessage()).content[0].text;
  }
}

module.exports = { ClaudeAIService };
