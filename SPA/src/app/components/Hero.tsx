import React from "react";
import { ArrowDownIcon, CheckIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";

export function Hero() {
  const [copied, setCopied] = React.useState(false);
  const command = "bun create jasencarroll/bun-stack my-app";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="min-h-screen flex items-center justify-center relative pt-16">
      <div className="text-center px-4 max-w-5xl mx-auto">
        <div className="mb-8 animate-float">
          <pre className="text-bun-accent text-sm md:text-base font-mono inline-block">
            {`╔═══════════════════════════════════════════════════════════════╗
║        ██████╗ ██╗   ██╗███╗   ██╗                            ║
║        ██╔══██╗██║   ██║████╗  ██║                            ║
║        ██████╔╝██║   ██║██╔██╗ ██║                            ║
║        ██╔══██╗██║   ██║██║╚██╗██║                            ║
║        ██████╔╝╚██████╔╝██║ ╚████║                            ║
║        ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝                            ║
║                                                               ║
║        ███████╗████████╗ █████╗  ██████╗██╗  ██╗              ║
║        ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝              ║
║        ███████╗   ██║   ███████║██║     █████╔╝               ║
║        ╚════██║   ██║   ██╔══██║██║     ██╔═██╗               ║
║        ███████║   ██║   ██║  ██║╚██████╗██║  ██╗              ║
║        ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝              ║
╚═══════════════════════════════════════════════════════════════╝`}
          </pre>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          The <span className="gradient-text">Rails</span> of the JavaScript world
        </h1>

        <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
          Build production-ready fullstack apps in seconds, not hours. Convention over configuration
          meets modern JavaScript.
        </p>

        <div className="flex justify-center mb-12">
          <div className="relative group">
            <div className="code-block flex items-center gap-2">
              <code className="flex-1">
                <span className="text-green-400">$</span> {command}
              </code>
              <button
                onClick={copyToClipboard}
                className="ml-2 p-1.5 hover:bg-white/10 rounded transition-colors"
                title="Copy to clipboard"
              >
                {copied ? (
                  <CheckIcon className="h-4 w-4 text-green-400" />
                ) : (
                  <DocumentDuplicateIcon className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            {copied && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-sm text-green-400">
                Copied!
              </div>
            )}
          </div>
        </div>


        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#get-started"
            className="bg-bun-accent text-bun-dark px-8 py-3 rounded-lg font-semibold text-lg hover:bg-pink-500 transition-colors"
          >
            Get Started
          </a>
          <a
            href="https://github.com/jasencarroll/bun-stack"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-effect px-8 py-3 rounded-lg font-semibold text-lg hover:bg-white/10 transition-colors"
          >
            View on GitHub
          </a>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <ArrowDownIcon className="h-6 w-6 text-gray-400" />
      </div>
    </section>
  );
}
