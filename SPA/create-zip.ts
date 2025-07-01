import { $ } from "bun";
import { join } from "path";

const projectRoot = join(import.meta.dir, "../");
const outputFile = join(import.meta.dir, "public/create-bun-stack.zip");

console.log("📦 Creating create-bun-stack.zip...");

// Create a temporary directory
const tempDir = await $`mktemp -d`.text();
const tempDirPath = tempDir.trim();

try {
  // Copy the files we want to include
  await $`cp -r ${projectRoot}/cli.ts ${tempDirPath}/`;
  await $`cp -r ${projectRoot}/package.json ${tempDirPath}/`;
  await $`cp -r ${projectRoot}/README.md ${tempDirPath}/`;
  await $`cp -r ${projectRoot}/CLAUDE.md ${tempDirPath}/`;
  await $`cp -r ${projectRoot}/tsconfig.json ${tempDirPath}/`;
  await $`cp -r ${projectRoot}/LICENSE ${tempDirPath}/`;
  await $`cp -r ${projectRoot}/.gitignore ${tempDirPath}/ 2>/dev/null || true`;
  
  // Copy the executable binary if it exists (with correct name)
  await $`cp -p ${projectRoot}/.create-bun-stack ${tempDirPath}/create-bun-stack 2>/dev/null || true`;
  // Ensure executable permissions are preserved
  await $`chmod +x ${tempDirPath}/create-bun-stack 2>/dev/null || true`;
  
  // Create the zip file
  await $`cd ${tempDirPath} && zip -r ${outputFile} .`;
  
  console.log("✅ Successfully created create-bun-stack.zip");
  console.log(`📍 Location: ${outputFile}`);
} finally {
  // Clean up temp directory
  await $`rm -rf ${tempDirPath}`;
}