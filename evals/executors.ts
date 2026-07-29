import type {
  EvalData,
  SingleTurnResult,
  MultiTurnEvalData,
  MultiTurnResult,
} from "./types.ts";

import { generateText, stepCountIs, tool, type ToolSet } from "ai";

import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { buildMessages } from "./utils.ts";

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
