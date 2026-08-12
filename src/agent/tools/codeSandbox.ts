import { tool } from "ai";
import { z } from "zod";
import fs from "node:fs/promises";
import nodePath from "node:path";
import { runInSandbox, type SandboxApi } from "./sandbox.ts";

// Read-only/compute API exposed INTO the sandbox (Code Mode). Only safe,
// side-effect-free capabilities go here — a re-run after a crash must be
// harmless. Anything that mutates the world (writeFile, deleteFile, runCmd)
// stays a normal top-level tool call, gated and run exactly once.
const sandboxApi: SandboxApi = {
  readFile: async (filePath: string) => {
    const absolutePath = nodePath.resolve(filePath);
    return fs.readFile(absolutePath, "utf-8");
  },
  listFiles: async (directoryPath: string = ".") => {
    const absolutePath = nodePath.resolve(directoryPath);
    const files = await fs.readdir(absolutePath, { withFileTypes: true });
    return files.map((entry) => ({
      name: entry.name,
      type: entry.isFile() ? "file" : entry.isDirectory() ? "directory" : "other",
    }));
  },
  now: async () => new Date().toISOString(),
};

export const runCode = tool({
  name: "runCode",
  description: [
    "Run a JavaScript program (an async function body) to fetch and analyze data,",
    "instead of chaining several tool calls. The program runs in a sandbox with",
    "no access to the host process — only the API below.",
    "Available inside the program:",
    "  • await tools.readFile(filePath) → string",
    "  • await tools.listFiles(directoryPath?) → { name, type }[]",
    "  • await tools.now() → ISO date string",
    "  • console.log(...) for debugging",
    "Use `return` to return your result (any JSON value).",
  ].join("\n"),
  inputSchema: z.object({
    code: z.string().describe("The JavaScript program body to run."),
  }),
  execute: async ({ code }) => {
    const result = await runInSandbox(code, sandboxApi);
    return result;
  },
});
