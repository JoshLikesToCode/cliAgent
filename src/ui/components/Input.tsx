import React from 'react';
import { Box, Text } from 'ink';

interface InputProps {
  value: string;
  disabled?: boolean;
}

// Purely presentational: keystrokes are handled by the single top-level
// useInput in App, so this never mounts/unmounts its own stdin listener.
export function Input({ value, disabled = false }: InputProps) {
  return (
    <Box>
      <Text color="blue" bold>
        {'> '}
      </Text>
      <Text>{value}</Text>
      {!disabled && <Text color="gray">▌</Text>}
    </Box>
  );
}
