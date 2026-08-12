import React from "react";
import { Box, Text } from "ink";

interface ToolApprovalProps {
  toolName: string;
  args: unknown;
  selectedIndex: number;
}

const MAX_PREVIEW_LINES = 5;
export const APPROVAL_OPTIONS = ["Yes", "No"] as const;

function formatArgs(args: unknown): { preview: string; extraLines: number } {
  const formatted = JSON.stringify(args, null, 2);
  const lines = formatted.split("\n");

  if (lines.length <= MAX_PREVIEW_LINES) {
    return { preview: formatted, extraLines: 0 };
  }

  const preview = lines.slice(0, MAX_PREVIEW_LINES).join("\n");
  const extraLines = lines.length - MAX_PREVIEW_LINES;
  return { preview, extraLines };
}

function getArgsSummary(args: unknown): string {
  if (typeof args !== "object" || args === null) {
    return String(args);
  }

  const obj = args as Record<string, unknown>;
  // Try to find a meaningful key to show inline
  const meaningfulKeys = ["path", "filePath", "command", "query", "code", "content"];
  for (const key of meaningfulKeys) {
    if (key in obj && typeof obj[key] === "string") {
      const value = obj[key] as string;
      // Truncate long values
      if (value.length > 50) {
        return value.slice(0, 50) + "...";
      }
      return value;
    }
  }

  // Fall back to first string key
  const keys = Object.keys(obj);
  if (keys.length > 0 && typeof obj[keys[0]] === "string") {
    const value = obj[keys[0]] as string;
    if (value.length > 50) {
      return value.slice(0, 50) + "...";
    }
    return value;
  }

  return "";
}

// Purely presentational: selection + submission are driven by the single
// top-level useInput in App, so this never mounts/unmounts its own stdin
// listener (that churn was causing the double-Enter issue).
export function ToolApproval({ toolName, args, selectedIndex }: ToolApprovalProps) {
  const argsSummary = getArgsSummary(args);
  const { preview, extraLines } = formatArgs(args);

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="yellow" bold>
        Tool Approval Required
      </Text>
      <Box marginLeft={2} flexDirection="column">
        <Text>
          <Text color="cyan" bold>{toolName}</Text>
          {argsSummary && (
            <Text dimColor>({argsSummary})</Text>
          )}
        </Text>
        <Box marginLeft={2} flexDirection="column">
          <Text dimColor>{preview}</Text>
          {extraLines > 0 && (
            <Text color="gray">... +{extraLines} more lines</Text>
          )}
        </Box>
      </Box>
      <Box marginTop={1} marginLeft={2} flexDirection="row" gap={2}>
        {APPROVAL_OPTIONS.map((option, index) => (
          <Text
            key={option}
            color={selectedIndex === index ? "green" : "gray"}
            bold={selectedIndex === index}
          >
            {selectedIndex === index ? "› " : "  "}
            {option}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
