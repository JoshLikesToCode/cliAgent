import type { Tool } from "ai";

// Wraps the given tools so that a call is only executed after
// `onToolApproval` resolves true. A denial returns a message instead of
// running the tool, so the model can read it and adjust.
export const withApproval = <T extends Record<string, Tool>>(
  toolset: T,
  gatedNames: (keyof T)[],
  onToolApproval: (name: string, args: unknown) => Promise<boolean>,
): T => {
  const gated = { ...toolset };
  for (const name of gatedNames) {
    const original = toolset[name];
    if (!original?.execute) continue;
    gated[name] = {
      ...original,
      execute: async (args, context) => {
        const approved = await onToolApproval(String(name), args);
        if (!approved) {
          return "User denied this tool call, do not attempt it again without asking.";
        }
        return original.execute!(args, context);
      },
    } as T[keyof T];
  }
  return gated;
};
