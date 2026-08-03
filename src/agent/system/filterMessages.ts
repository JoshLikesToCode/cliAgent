import type { ModelMessage, TextPart, ToolCallPart } from "ai";

const hasKeepableContent = (part: TextPart | ToolCallPart | unknown) => {
  if (typeof part !== "object" || part === null || !("type" in part)) {
    return false;
  }
  if (part.type === "tool-call") {
    return true;
  }
  if (part.type === "text") {
    return Boolean((part as TextPart).text.trim());
  }
  return false;
};

/**
 * Filter conversation history to only include compatible message formats.
 * Provider tools (like webSearch) may return messages with formats that
 * cause issues when passed back to subsequent API calls.
 */
export const filterCompatibleMessages = (
  messages: ModelMessage[],
): ModelMessage[] => {
  return messages.filter((msg) => {
    // Keep user and system messages
    if (msg.role === "user" || msg.role === "system") {
      return true;
    }

    // Keep assistant messages that have text content or a tool call.
    // A tool-call-only message must be kept, or its paired tool-result
    // message becomes orphaned and the provider rejects the request.
    if (msg.role === "assistant") {
      const content = msg.content;
      if (typeof content === "string") {
        return Boolean(content.trim());
      }
      return content.some(hasKeepableContent);
    }

    // Keep tool messages
    if (msg.role === "tool") {
      return true;
    }

    return false;
  });
};
