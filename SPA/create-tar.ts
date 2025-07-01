import { $ } from "bun";
import { join } from "path";

const projectRoot = join(import.meta.dir, "../");
const outputFile = join(import.meta.dir, "public/create-bun-stack.tar.gz");

console.log("📦 Creating create-bun-stack.tar.gz...");

// Create a temporary directory
const tempDir = await $`mktemp -d`.text();
const tempDirPath = tempDir.trim();

try {
  // Create a subdirectory for the contents
  const contentDir = join(tempDirPath, "create-bun-stack");
  await $`mkdir -p ${contentDir}`;
  
  // Copy the files we want to include
  await $`cp ${projectRoot}/cli.ts ${contentDir}/`;
  await $`cp ${projectRoot}/package.json ${contentDir}/`;
  await $`cp ${projectRoot}/README.md ${contentDir}/`;
  await $`cp ${projectRoot}/CLAUDE.md ${contentDir}/`;
  await $`cp ${projectRoot}/tsconfig.json ${contentDir}/`;
  await $`cp ${projectRoot}/LICENSE ${contentDir}/`;
  await $`cp ${projectRoot}/.gitignore ${contentDir}/ 2>/dev/null || true`;
  
  // Copy the executable binary with preserved permissions
  await $`cp -p ${projectRoot}/.create-bun-stack ${contentDir}/create-bun-stack`;
  
  // Create the tar.gz file
  await $`cd ${tempDirPath} && tar -czf ${outputFile} create-bun-stack`;
  
  console.log("✅ Successfully created create-bun-stack.tar.gz");
  console.log(`📍 Location: ${outputFile}`);
} finally {
  // Clean up temp directory
  await $`rm -rf ${tempDirPath}`;
}