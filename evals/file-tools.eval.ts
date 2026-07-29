import { evaluate } from "@lmnr-ai/lmnr";
import { toolSelectionScore, toolsAvoided } from "./evaluators.ts";
import type { EvalData, EvalTarget } from "./types.ts";
import dataset from "./data/file-tools.json" with { type: "json" };
import { singleTurnExecutor } from "./executors";

const executor = async (data: EvalData) => {
  return singleTurnExecutor(data);
};

evaluate({
  data: dataset as any,
  executor,
  evaluators: {
    selectionScore: (output: any, target: any) => {
      if (target?.category === "secondary") return 1;

      return toolSelectionScore(output, target);
    },
    toolsAvoided: (output: any, target: any) => toolsAvoided(output, target),
  },
  groupName: "file-tools-selection",
});
