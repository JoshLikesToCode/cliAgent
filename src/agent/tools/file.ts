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

export const listFiles = tool({
  name: "listFiles",
  description:
    "List all files in a directory at the specified given path. It will return an array of file names.",
  inputSchema: z.object({
    directoryPath: z
      .string()
      .describe("The path to the directory to list files in.")
      .default("."),
  }),
  execute: async ({ directoryPath }) => {
    try {
      const absolutePath = nodePath.resolve(directoryPath);
      const files = await fs.readdir(absolutePath, { withFileTypes: true });
      const items = files.map((entry) => ({
        name: entry.name,
        isFile: entry.isFile(),
        isDirectory: entry.isDirectory(),
        type: entry.isFile()
          ? "file"
          : entry.isDirectory()
            ? "directory"
            : "other",
      }));
      return items.length > 0
        ? items
        : `No files found in the directory at path: ${absolutePath}`;
    } catch (error) {
      return `There was an error listing the files, here is the native error from node.js: ${error}`;
    }
  },
});

export const deleteFile = tool({
  name: "deleteFile",
  description:
    "Delete a file at the specified given path. It will return a success message if the file was deleted. Use with caution as this is very destructive and will permanently delete the file.",
  inputSchema: z.object({
    filePath: z.string().describe("The path to the file to delete."),
  }),
  execute: async ({ filePath }) => {
    try {
      const absolutePath = nodePath.resolve(filePath);
      await fs.unlink(absolutePath);
      return `Successfully deleted the file at path: ${absolutePath}`;
    } catch (error) {
      return `There was an error deleting the file, here is the native error from node.js: ${error}`;
    }
  },
});
