import { tool } from "ai";
import { z } from "zod";
import shell from "shelljs";

export const runCmd = tool({
  description: "Run a shell or terminal command and return the output",
  inputSchema: z.object({
    cmd: z.string().describe("The shell command to run"),
  }),
  execute: async ({ cmd }) => {
    const result = shell.exec(cmd, { silent: true });
    let output = "";
    if (result.stdout) {
      output += result.stdout;
    }
    if (result.stderr) {
      output += result.stderr;
    }
    if (result.code !== 0) {
      return `Command failed (exit code ${result.code}): ${output}`;
    }
    return output || "Command completed succesfully (no output)";
  },
});
