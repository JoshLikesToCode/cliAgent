import React, { useState, useCallback } from "react";
import { Box, Text, useApp, useInput } from "ink";
import type { ModelMessage } from "ai";
import { runAgent } from "../agent/run.ts";
import { MessageList, type Message } from "./components/MessageList.tsx";
import { ToolCall, type ToolCallProps } from "./components/ToolCall.tsx";
import { Spinner } from "./components/Spinner.tsx";
import { Input } from "./components/Input.tsx";
import { ToolApproval } from "./components/ToolApproval.tsx";
import { TokenUsage } from "./components/TokenUsage.tsx";
import type { ToolApprovalRequest, TokenUsageInfo } from "../types.ts";

interface ActiveToolCall extends ToolCallProps {
  id: string;
}

export function App() {
  const { exit } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationHistory, setConversationHistory] = useState<
    ModelMessage[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [activeToolCalls, setActiveToolCalls] = useState<ActiveToolCall[]>([]);
  const [pendingApproval, setPendingApproval] =
    useState<ToolApprovalRequest | null>(null);
  const [approvalSelectedIndex, setApprovalSelectedIndex] = useState(0);
  const [tokenUsage, setTokenUsage] = useState<TokenUsageInfo | null>(null);
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = useCallback(
    async (userInput: string) => {
      if (
        userInput.toLowerCase() === "exit" ||
        userInput.toLowerCase() === "quit"
      ) {
        exit();
        return;
      }

      setMessages((prev) => [...prev, { role: "user", content: userInput }]);
      setIsLoading(true);
      setStreamingText("");
      setActiveToolCalls([]);

      try {
        const newHistory = await runAgent(userInput, conversationHistory, {
          onToken: (token) => {
            setStreamingText((prev) => prev + token);
          },
          onToolCallStart: (name, args) => {
            setActiveToolCalls((prev) => [
              ...prev,
              {
                id: `${name}-${Date.now()}`,
                name,
                args,
                status: "pending",
              },
            ]);
          },
          onToolCallEnd: (name, result) => {
            setActiveToolCalls((prev) =>
              prev.map((tc) =>
                tc.name === name && tc.status === "pending"
                  ? { ...tc, status: "complete", result }
                  : tc,
              ),
            );
          },
          onComplete: (response) => {
            if (response) {
              setMessages((prev) => [
                ...prev,
                { role: "assistant", content: response },
              ]);
            }
            setStreamingText("");
            setActiveToolCalls([]);
          },
          onToolApproval: (name, args) => {
            return new Promise<boolean>((resolve) => {
              setPendingApproval({ toolName: name, args, resolve });
            });
          },
          onTokenUsage: (usage) => {
            setTokenUsage(usage);
          },
        });

        setConversationHistory(newHistory);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${errorMessage}` },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [conversationHistory, exit],
  );

  const resolveApproval = useCallback(
    (approved: boolean) => {
      setPendingApproval((current) => {
        current?.resolve(approved);
        return null;
      });
      setApprovalSelectedIndex(0);
    },
    [],
  );

  // Single top-level input listener for the whole app. Keeping raw-mode
  // stdin handling in one place (rather than mounting/unmounting a useInput
  // per component as focus moves between the text input and the approval
  // prompt) avoids the stdin listener churn that was causing keystrokes
  // (like the Enter that approves a tool call) to get dropped.
  useInput((input, key) => {
    if (pendingApproval) {
      if (key.leftArrow || key.rightArrow) {
        setApprovalSelectedIndex((prev) => (prev === 0 ? 1 : 0));
        return;
      }
      if (key.return) {
        resolveApproval(approvalSelectedIndex === 0);
      }
      return;
    }

    if (isLoading) return;

    if (key.return) {
      if (inputValue.trim()) {
        const value = inputValue;
        setInputValue("");
        handleSubmit(value);
      }
      return;
    }

    if (key.backspace || key.delete) {
      setInputValue((prev) => prev.slice(0, -1));
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      setInputValue((prev) => prev + input);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="magenta">
          🤖 AI Agent
        </Text>
        <Text dimColor> (type "exit" to quit)</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <MessageList messages={messages} />

        {streamingText && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="green" bold>
              › Assistant
            </Text>
            <Box marginLeft={2}>
              <Text>{streamingText}</Text>
              <Text color="gray">▌</Text>
            </Box>
          </Box>
        )}

        {activeToolCalls.length > 0 && !pendingApproval && (
          <Box flexDirection="column" marginTop={1}>
            {activeToolCalls.map((tc) => (
              <ToolCall
                key={tc.id}
                name={tc.name}
                args={tc.args}
                status={tc.status}
                result={tc.result}
              />
            ))}
          </Box>
        )}

        {isLoading && !streamingText && activeToolCalls.length === 0 && !pendingApproval && (
          <Box marginTop={1}>
            <Spinner />
          </Box>
        )}

        {pendingApproval && (
          <ToolApproval
            toolName={pendingApproval.toolName}
            args={pendingApproval.args}
            selectedIndex={approvalSelectedIndex}
          />
        )}
      </Box>

      {!pendingApproval && (
        <Input value={inputValue} disabled={isLoading} />
      )}

      <TokenUsage usage={tokenUsage} />
    </Box>
  );
}
