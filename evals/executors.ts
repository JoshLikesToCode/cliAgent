import type {
  EvalData,
  SingleTurnResult,
  MultiTurnEvalData,
  MultiTurnResult,
} from "./types.ts";

import {
  generateText,
  stepCountIs,
  tool,
  type ModelMessage,
  type ToolSet,
} from "ai";

import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { buildMessages, buildMockedTools } from "./utils.ts";
import { SYSTEM_PROMPT } from "../dist/agent/system/prompt.js";

// Mocked out tool definitions for our evals
const TOOL_DEFINITIONS: any = {
  readFile: {
    description: "Reads the contents of a file at the specified path",
    parameters: z.object({
      path: z
        .string()
        .describe("The path to specified file that you want to read"),
    }),
  },
  writeFile: {
    description: "Write to a file at the specified path",
    parameters: z.object({
      path: z
        .string()
        .describe("The path to specified file that you want to write to"),
      content: z
        .string()
        .describe("The content that you want to write to the file."),
    }),
  },
  listFiles: {
    description:
      "Lists all the files in the directory given in the specified path",
    parameters: z.object({
      path: z
        .string()
        .describe(
          "The path to specified directory which you want to list all the files of",
        ),
    }),
  },
  deleteFile: {
    description: "Delete the file at the specified path",
    parameters: z.object({
      path: z
        .string()
        .describe("The path to specified file that you want to delete"),
    }),
  },
  runCommand: {
    description: "Runs a specified shell command and returns its output",
    parameters: z.object({
      cmd: z.string().describe("The shell command that you would like to run"),
    }),
  },
};

export const singleTurnExecutor = async (data: EvalData) => {
  const messages = buildMessages(data);

  const tools: ToolSet = {};
  for (const toolName of data.tools) {
    const def = TOOL_DEFINITIONS[toolName];
    if (def) {
      tools[toolName] = tool({
        description: def.description,
        inputSchema: def.parameters,
      });
    }
  }
  const { toolCalls } = await generateText({
    model: openai(data.config?.model ?? "gpt-5-mini"),
    messages,
    tools,
    stopWhen: stepCountIs(1),
    // omitted from api call if undefined
    temperature: data.config?.temperature ?? undefined,
  });

  const calls = toolCalls.map((tc) => ({
    toolName: tc.toolName,
    args: "args" in tc ? tc.args : {},
  }));

  const toolNames = toolCalls.map((tc) => tc.toolName);

  return {
    toolCalls,
    toolNames,
    selectedAny: toolNames.length > 0,
  };
};

/**
 * Multi-turn executor with mocked tools.
 * Runs a complete agent loop with tools returning fixed values.
 */
export const multiTurnWithMocks = async (data: MultiTurnEvalData) => {
  const tools = buildMockedTools(data.mockTools);
  const messages: ModelMessage[] = data.messages ?? [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: data.prompt ?? "" },
  ];

  const res = await generateText({
    model: openai(data.config?.model ?? "gpt-5-mini"),
    messages: messages,
    tools,
    stopWhen: stepCountIs(data.config?.maxSteps ?? 20),
  });

  const allTools: string[] = [];
  const steps = res.steps.map((step) => {
    const stepToolCalls = (step.toolCalls ?? []).map((tc) => {
      allTools.push(tc.toolName);
      return {
        toolName: tc.toolName,
        args: "args" in tc ? tc.args : {},
      };
    });

    const toolsUsed = [new Set(allTools)];

    const stepToolResults = (step.staticToolResults ?? []).map((tr) => {
      return {
        toolName: tr.toolName,
        result: "results" in tr ? tr.results : tr,
      };
    });

    return {
      toolCalls: stepToolCalls.length > 0 ? stepToolCalls : undefined,
      toolResults: stepToolResults.length > 0 ? stepToolResults : undefined,
      text: step.text || undefined,
    };
  });

  const toolsUsed = [new Set(allTools)];

  return {
    text: res.text,
    steps,
    toolsUsed,
    toolCallOrder: allTools,
  };
};
