# agi

A terminal AI agent, built from scratch in TypeScript. No agent framework — just a model API, a tool-calling loop, and a conversation history I manage myself.

The goal is to understand how the pieces actually fit together: how tool calls get selected and dispatched, how a run loop decides when to keep going versus stop, how context gets managed as a conversation grows, and how to add guardrails around anything risky. Everything here is being built up incrementally, one piece at a time.

## Stack

- TypeScript, ES modules
- [Vercel AI SDK](https://sdk.vercel.ai/) (`ai` + `@ai-sdk/openai`) for the model calls
- [Ink](https://github.com/vadimdemedes/ink) for the terminal UI (React, rendered to the terminal)
- Zod for tool schemas
- Biome for lint/format

## Running it

```bash
npm install
npm run dev     # watch mode
npm run start   # run once
```

You'll need an `OPENAI_API_KEY` (or equivalent) in a `.env` file.

To install it globally as a CLI:

```bash
npm run build
npm install -g .
agi
```

## Evals

```bash
npm run eval
npm run eval:file-tools
npm run eval:shell-tools
npm run eval:agent
```

## Layout

```
src/
├── index.ts       # dev entry point
├── cli.ts         # CLI entry point (global install)
├── types.ts       # shared types
├── agent/
│   ├── run.ts     # the agent loop
│   ├── context/   # context/compaction handling
│   ├── system/    # system prompt + message filtering
│   └── tools/     # tool implementations
└── ui/            # Ink terminal UI
```
