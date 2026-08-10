import { generateText, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { extractMessageText } from "./tokenEstimator.ts";

const SUMMARIZATION_PROMPT = `You are a helpful assistant that summarizes conversations. 
Given the following conversation, provide a concise summary that captures the key points 
and context. The summary should be clear and informative, suitable for someone who 
has not seen the original conversation. The summary should prioritize and include:

1. Key decisions and conclusions reached during the conversation.
2. Important context and facts mentioned that are necessary to understand the summary.
3. Any pending tasks or questions.
4. The overall goal and purpose of the conversation.

Be concise but complete. The summary should allow the conversation to continue naturally.

Conversation to summarize: 
`;

/**
 * Format messages array as readable text for summarization
 */
function messagesToText(messages: ModelMessage[]): string {
  return messages
    .map((msg) => {
      const role = msg.role.toUpperCase();
      const content = extractMessageText(msg);
      return `[${role}]: ${content}`;
    })
    .join("\n\n");
}

/**
 * Compact a conversation by summarizing it with an LLM.
 *
 * Takes the current messages (excluding system prompt) and returns a new
 * messages array with:
 * - A user message containing the summary
 * - An assistant acknowledgment
 *
 * The system prompt should be prepended by the caller.
 */
export async function compactConversation(
  messages: ModelMessage[],
  model: string = "gpt-5-mini",
): Promise<any> {
  // We don't want to include the system prompt in the summary, so filter it out
  const conversationMessages = messages.filter((msg) => msg.role !== "system");

  if (conversationMessages.length === 0) {
    return [];
  }

  // grabs role and content from each message and formats it as readable text
  const conversationText = messagesToText(conversationMessages);

  const { text: summary } = await generateText({
    model: openai(model),
    prompt: SUMMARIZATION_PROMPT + conversationText,
  });

  // return new, compacted messages array with summary and acknowledgment
  return [
    {
      role: "user",
      content: `[CONVERSATION SUMMARY]\n The following content is a summaery of the conversation so far:\n\n${summary}`,
    },
    {
      role: "assistant",
      content: "Acknowledged. The conversation has been summarized.",
    },
  ];
}
