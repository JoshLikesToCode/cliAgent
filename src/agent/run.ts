import "../instrumentation.ts";
import { generateText, toolModelMessageSchema, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { Laminar, getTracer, observe } from "@lmnr-ai/lmnr";
import { tools } from "./tools/index.ts";
import { executeTool } from "./executeTools.ts";
import { SYSTEM_PROMPT } from "./system/prompt";
import type { AgentCallbacks } from "../types";

const MODEL_NAME = "gpt-5-mini";

const runAgentImpl = async (
  userMessage: string,
  conversationHistory: ModelMessage[],
  callBaclks: AgentCallbacks,
) => {
  const { text, toolCalls } = await generateText({
    model: openai(MODEL_NAME),
    prompt: userMessage,
    system: SYSTEM_PROMPT,
    tools,
    experimental_telemetry: {
      isEnabled: true,
      tracer: getTracer(),
    },
  });
  console.log(text, toolCalls);
  toolCalls.forEach(async (tc) => {
    console.log(await executeTool(tc.toolName, tc.input));
  });
};

export const runAgent = (
  userMessage: string,
  conversationHistory: ModelMessage[],
  callBaclks: AgentCallbacks,
) =>
  observe(
    { name: "agent.run" },
    runAgentImpl,
    userMessage,
    conversationHistory,
    callBaclks,
  );

runAgent("What is the current time right now?", [], {} as AgentCallbacks).then(
  () => Laminar.flush(),
);

