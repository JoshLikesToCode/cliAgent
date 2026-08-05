import { tool } from "ai";
import { z } from "zod";
import fs from "node:fs/promises";
import nodePath from "node:path";

export const readFile = tool({
  name: "readFile",
  description:
    "Read the full contents of a file at the given path, always use this to read a file",
  inputSchema: z.object({
    filePath: z.string().describe("The path to the file to read."),
  }),
  outputSchema: z.object({
    content: z.string().describe("The content of the file."),
  }),
  execute: async ({ filePath }) => {
    try {
      const absolutePath = nodePath.resolve(filePath);
      const content = await fs.readFile(absolutePath, "utf-8");
      return { content };
    } catch (error) {
      return `There was an error reading the file, here is the native error from node.js: ${error}`;
    }
  },
});

export const writeFile = tool({
  name: "writeFile",
  description:
    "Write content to a file at the specified given path. Create the file if it does not exist and it will overwrite if it does",
  inputSchema: z.object({
    filePath: z.string().describe("The path to the file to write."),
    content: z.string().describe("The content to write to the file."),
  }),
  execute: async ({ filePath, content }) => {
    try {
      const absolutePath = nodePath.resolve(filePath);
      await fs.writeFile(absolutePath, content, "utf-8");
      return `Successfully wrote ${content.length} characters to the file at path: ${absolutePath}`;
    } catch (error) {
      return `There was an error writing to the file, here is the native error from node.js: ${error}`;
    }
  },
});
