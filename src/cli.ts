#!/usr/bin/env node
import "dotenv/config";
import "./instrumentation.ts";
import React from "react";
import { render } from "ink";
import { App } from "./ui/index.tsx";

render(React.createElement(App));
