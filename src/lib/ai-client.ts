import { getOpenAIClient } from "./openai";
import { getAnthropicClient } from "./anthropic";

export function isAnthropicModel(model: string): boolean {
  return model.startsWith("claude-");
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionResult {
  content: string;
  promptTokens: number;
  completionTokens: number;
}

/**
 * Unified chat completion — routes to OpenAI or Anthropic based on model name.
 */
export async function chatCompletion(
  model: string,
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number; jsonMode?: boolean } = {}
): Promise<ChatCompletionResult> {
  const { temperature = 0.7, maxTokens = 8192, jsonMode = false } = options;

  if (isAnthropicModel(model)) {
    const client = await getAnthropicClient();

    // Extract system message
    const systemMsg = messages.find((m) => m.role === "system")?.content || "";
    const userMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemMsg,
      messages: userMessages,
    });

    const content = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    return {
      content,
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
    };
  }

  // OpenAI
  const openai = await getOpenAIClient();
  const response = await openai.chat.completions.create({
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    temperature,
    max_tokens: maxTokens,
    ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
  });

  return {
    content: response.choices[0]?.message?.content || "",
    promptTokens: response.usage?.prompt_tokens || 0,
    completionTokens: response.usage?.completion_tokens || 0,
  };
}

/**
 * Unified streaming chat completion — routes to OpenAI or Anthropic.
 * Returns an async iterable of text chunks + usage getter.
 */
export async function chatCompletionStream(
  model: string,
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<{
  stream: AsyncIterable<string>;
  getUsage: () => { promptTokens: number; completionTokens: number } | null;
}> {
  const { temperature = 0.7, maxTokens = 4096 } = options;
  let usage: { promptTokens: number; completionTokens: number } | null = null;

  if (isAnthropicModel(model)) {
    const client = await getAnthropicClient();
    const systemMsg = messages.find((m) => m.role === "system")?.content || "";
    const userMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const anthropicStream = client.messages.stream({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemMsg,
      messages: userMessages,
    });

    const stream = (async function* () {
      for await (const event of anthropicStream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield event.delta.text;
        }
      }
      const finalMessage = await anthropicStream.finalMessage();
      usage = {
        promptTokens: finalMessage.usage.input_tokens,
        completionTokens: finalMessage.usage.output_tokens,
      };
    })();

    return { stream, getUsage: () => usage };
  }

  // OpenAI
  const openai = await getOpenAIClient();
  const openaiStream = await openai.chat.completions.create({
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    stream: true,
    stream_options: { include_usage: true },
    temperature,
    max_tokens: maxTokens,
  });

  const stream = (async function* () {
    for await (const chunk of openaiStream) {
      if (chunk.usage) {
        usage = {
          promptTokens: chunk.usage.prompt_tokens || 0,
          completionTokens: chunk.usage.completion_tokens || 0,
        };
      }
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) yield text;
    }
  })();

  return { stream, getUsage: () => usage };
}
