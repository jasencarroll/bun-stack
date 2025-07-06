import React from "react";
import { CheckIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";

export function GetStarted() {
  const [copied, setCopied] = React.useState(false);
  const command = "bunx create-bun-stack";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="get-started" className="py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Get started in <span className="gradient-text">seconds</span>
          </h2>
          <p className="text-xl text-gray-300">
            One command is all you need to create a production-ready fullstack app.
          </p>
        </div>

        <div className="glass-effect rounded-xl p-8 mb-8">
          <div className="flex items-center justify-between bg-black/50 rounded-lg p-4 mb-6">
            <code className="text-lg text-bun-accent font-mono flex-1">
              <span className="text-green-400">$</span> {command}
            </code>
            <button
              onClick={copyToClipboard}
              className="ml-4 p-2 hover:bg-white/10 rounded transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <CheckIcon className="h-5 w-5 text-green-400" />
              ) : (
                <DocumentDuplicateIcon className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <span className="text-bun-accent font-bold">1.</span>
              <div>
                <p className="font-semibold">Run the command</p>
                <p className="text-gray-300 text-sm">
                  This will create a new directory with your app name and install all dependencies.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="text-bun-accent font-bold">2.</span>
              <div>
                <p className="font-semibold">Start developing</p>
                <p className="text-gray-300 text-sm">
                  Navigate to your project and run <code className="bg-black/50 px-2 py-1 rounded">bun run dev</code>
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <span className="text-bun-accent font-bold">3.</span>
              <div>
                <p className="font-semibold">Ship to production</p>
                <p className="text-gray-300 text-sm">
                  Deploy to Railway, Fly.io, or any platform that supports Docker.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center space-y-6">
          <p className="text-gray-400">Requires Bun v1.0 or later</p>
          <a
            href="https://bun.sh/docs/installation"
            target="_blank"
            rel="noopener noreferrer"
            className="text-bun-accent hover:underline inline-block"
          >
            Don't have Bun? Install it here →
          </a>
          
          <div className="pt-8 border-t border-gray-800">
            <p className="text-gray-400 mb-4">
              Built to accelerate your development workflow
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="https://github.com/jasencarroll/create-bun-stack"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg hover:bg-white/10 transition-all"
              >
                <span>⭐</span>
                <span>Star on GitHub</span>
              </a>
              <a
                href="/docs"
                className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg hover:bg-white/10 transition-all"
              >
                <span>📚</span>
                <span>Read the Docs</span>
              </a>
              <a
                href="https://jasenc.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-bun-accent/10 text-bun-accent px-4 py-2 rounded-lg hover:bg-bun-accent/20 transition-all"
              >
                <span>👤</span>
                <span>Meet the Creator</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
