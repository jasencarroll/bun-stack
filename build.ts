#!/usr/bin/env bun

import { $ } from "bun";

console.log("🔨 Building create-bun-stack...");

// Build the executable
await $`bun build cli.ts --compile --outfile .create-bun-stack`;

// Make it executable
await $`chmod +x .create-bun-stack`;

console.log("✅ Build complete! Executable created: ./.create-bun-stack");
console.log("\n📦 You can now run: ./.create-bun-stack");
