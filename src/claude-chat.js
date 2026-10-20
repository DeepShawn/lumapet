import Anthropic from '@anthropic-ai/sdk';

export const CLAUDE_DEFAULT_MODEL = 'claude-opus-5-5';
export const CLAUDE_DEFAULT_BASE_URL = 'https://api.anthropic.com';

// Shared by the browser (device-direct mode) and the Node proxy so both send
// the same request shape. `messages` uses the app's {role, content} history.
export async function claudeChat({ apiKey, baseURL, model, system, messages, browser = false, signal }) {
  const client = new Anthropic({
    apiKey,
    baseURL: baseURL || CLAUDE_DEFAULT_BASE_URL,
    dangerouslyAllowBrowser: browser,
    maxRetries: 1
  });
  // The Messages API needs the conversation to open with a user turn; the
  // pet's greeting bubbles are assistant messages, so drop any leading ones.
  const history = messages
    .filter((message) => (message.role === 'user' || message.role === 'assistant') && String(message.content || '').trim())
    .map(({ role, content }) => ({ role, content: String(content) }));
  while (history.length && history[0].role !== 'user') history.shift();
  if (!history.length) throw new Error('没有可以发送的用户消息');

  let response;
  try {
    response = await client.beta.messages.create({
      model: model || CLAUDE_DEFAULT_MODEL,
      max_tokens: 16000,
      system,
      messages: history,
      // Chatty companion replies do not need deep reasoning.
      output_config: { effort: 'low' },
      // On a safety decline the API retries on its default fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default'
    }, { signal });
  } catch (error) {
    // Surface the API's own message instead of the raw JSON body.
    if (error instanceof Anthropic.APIError && error.error?.error?.message) {
      const friendly = new Error(`${error.status ?? ''} ${error.error.error.message}`.trim());
      friendly.status = error.status;
      throw friendly;
    }
    throw error;
  }

  if (response.stop_reason === 'refusal') {
    throw new Error(response.stop_details?.explanation || 'Claude 拒绝了这次请求');
  }
  const text = response.content.filter((block) => block.type === 'text').map((block) => block.text).join('\n').trim();
  if (!text) throw new Error('Claude 没有返回可读内容');
  return text;
}
