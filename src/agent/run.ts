import "../instrumentation.ts";
import { streamText, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { Laminar, getTracer, observe } from "@lmnr-ai/lmnr";
import { tools } from "./tools/index.ts";
import { SYSTEM_PROMPT } from "./system/prompt.ts";
import type { AgentCallbacks, ToolCallInfo } from "../types.ts";
import { filterCompatibleMessages } from "./system/filterMessages.ts";
import {
  estimateMessagesTokens,
  getModelLimits,
  isOverThreshold,
  calculateUsagePercentage,
  compactConversation,
  DEFAULT_THRESHOLD,
} from "./context/index.ts";

const MODEL_NAME = "gpt-5-mini";

export const runAgent = async (
  userMessage: string,
  conversationHistory: ModelMessage[],
  callbacks: AgentCallbacks,
): Promise<ModelMessage[]> => {
  // get model limits we copied verbatim from OpenAI website
  const modelLimits = getModelLimits(MODEL_NAME);

  // this conversation history comes from the ui,
  // and will need to be filtered first
  const workingHistory = filterCompatibleMessages(conversationHistory);
  let messages: ModelMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...workingHistory,
    { role: "user", content: userMessage },
  ];

  const precheckTokens = estimateMessagesTokens(messages);
  // compact if we need to
  if (isOverThreshold(precheckTokens.total, modelLimits.contextWindow)) {
    messages = await compactConversation(workingHistory, MODEL_NAME);
  }

  let fullResponse = "";

  while (true) {
    const res = streamText({
      model: openai(MODEL_NAME),
      messages,
      tools,
      experimental_telemetry: {
        isEnabled: true,
        tracer: getTracer(),
      },
    });

    // call this function after any signifigant change to messages,
    // so the ui can update token usage
    const reportTokenUsage = () => {
      if (callbacks.onTokenUsage) {
        const usage = estimateMessagesTokens(messages);
        callbacks.onTokenUsage({
          inputTokens: usage.input,
          outputTokens: usage.output,
          totalTokens: usage.total,
          contextWindow: modelLimits.contextWindow,
          threshold: DEFAULT_THRESHOLD,
          percentage: calculateUsagePercentage(
            usage.total,
            modelLimits.contextWindow,
          ),
        });
      }
    };

    // track tool calls
    const toolCalls: ToolCallInfo[] = [];
    let currText = "";
    let streamError: Error | null = null;

    try {
      for await (const chunk of res.fullStream) {
        if (chunk.type === "text-delta") {
          currText += chunk.text;
          // stream to ui
          callbacks.onToken(chunk.text);
        }
        if (chunk.type === "tool-call") {
          const input = "input" in chunk ? chunk.input : {};
          toolCalls.push({
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            args: input as any,
          });
          // streams to ui
          callbacks.onToolCallStart(chunk.toolName, input);
        }
        if (chunk.type === "tool-result") {
          // tools auto-execute (they define `execute`); this is the real result
          const output = "output" in chunk ? chunk.output : undefined;
          const value =
            output && typeof output === "object" && "value" in output
              ? (output as any).value
              : output;
          callbacks.onToolCallEnd(chunk.toolName, String(value));
        }
      }
    } catch (e) {
      streamError = e as Error;
      // ai-sdk captures errors with this 'No output generated'
      if (!currText && !streamError.message.includes("No output generated")) {
        throw streamError;
      }
    }

    fullResponse += currText;

    // error, break the agent loop
    if (streamError && !currText) {
      fullResponse = "Sorry about that, we got an error somewhere in the chain";
      callbacks.onToken(fullResponse);
      break;
    }

    // either done or another tool call
    const finishReason = await res.finishReason;

    // tool results are already included by streamText (tools auto-execute)
    const responseMessages = await res.response;
    messages.push(...responseMessages.messages);
    reportTokenUsage();

    // done
    if (finishReason !== "tool-calls" || toolCalls.length === 0) {
      break;
    }
  }
  // update ui
  callbacks.onComplete(fullResponse);
  return messages;
};

runAgent("Yo", [], {
  onToken: () => {},
  onToolCallStart: () => {},
  onToolCallEnd: () => {},
  onComplete: (response: string) => console.log(response),
  onToolApproval: async () => true,
}).then(() => Laminar.flush());
