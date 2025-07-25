import React from "react";
import { ArrowDownIcon, CheckIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";

export function Hero() {
  const [copied, setCopied] = React.useState(false);
  const command = "bunx create-bun-stack";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mobileAsciiArt = `╔════════════════════════════════════════════╗
║                                            ║
║  ██████╗ ██╗   ██╗███╗  ██╗                ║
║  ██╔══██╗██║   ██║████╗ ██║                ║
║  ██████╔╝██║   ██║██╔██╗██║                ║
║  ██╔══██╗██║   ██║██║╚████║                ║
║  ██████╔╝╚██████╔╝██║ ╚███║                ║
║  ╚═════╝  ╚═════╝ ╚═╝  ╚══╝                ║
║                                            ║
║  ███████╗████████╗ █████╗  ██████╗██╗  ██╗ ║
║  ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝ ║
║  ███████╗   ██║   ███████║██║     █████╔╝  ║
║  ╚════██║   ██║   ██╔══██║██║     ██╔═██╗  ║
║  ███████║   ██║   ██║  ██║╚██████╗██║  ██╗ ║
║  ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝ ║
║                                            ║
╚════════════════════════════════════════════╝`;

  const desktopAsciiArt = `╔═══════════════════════════════════════════════════════════════╗
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
╚═══════════════════════════════════════════════════════════════╝`;

  return (
    <section className="min-h-screen flex items-center justify-center relative pt-16">
      <div className="text-center px-4 max-w-5xl mx-auto">
        <div className="mb-8 animate-float">
          <pre className="text-bun-accent text-xs sm:text-sm md:text-base font-mono inline-block md:hidden">
            {mobileAsciiArt}
          </pre>
          <pre className="text-bun-accent text-sm md:text-base font-mono hidden md:inline-block">
            {desktopAsciiArt}
          </pre>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-6">
          The <span className="gradient-text">Rails</span> of the JavaScript world
        </h1>

        <p className="text-lg sm:text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto">
          Build production-ready fullstack apps in seconds, not hours. Convention over configuration
          meets modern JavaScript.
        </p>
        
        <p className="text-base sm:text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
          Identified the gap between Rails productivity and modern JS tooling.<br />
          Perfect for MVPs, hackathons, and rapid prototyping.<br />
          <span className="text-bun-accent"> 30-second setup instead of 30 minutes.</span>
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


        <div className="flex flex-col items-center gap-4 mb-12">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#get-started"
              className="bg-bun-accent text-bun-dark px-6 sm:px-8 py-3 rounded-lg font-semibold text-base sm:text-lg hover:bg-purple-600 transition-colors"
            >
              Get Started
            </a>
            <a
              href="https://github.com/jasencarroll/create-bun-stack"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-effect px-6 sm:px-8 py-3 rounded-lg font-semibold text-base sm:text-lg hover:bg-white/10 transition-colors"
            >
              View on GitHub
            </a>
          </div>
          <a
            href="https://railway.com/deploy/create-bun-stack?referralCode=2oHJjn"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block hover:opacity-90 transition-opacity"
            style={{ height: '48px' }}
          >
            <img src="https://railway.com/button.svg" alt="Deploy on Railway" style={{ height: '100%', width: 'auto' }} />
          </a>
        </div>
        
        <div className="text-sm text-gray-500">
          Created by <a href="https://jasenc.dev" className="text-bun-accent hover:text-purple-400 transition-colors">an engineer with AI and business background</a>, 
          accelerating software development for teams and startups.
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce hidden md:block">
        <ArrowDownIcon className="h-6 w-6 text-gray-400" />
      </div>
    </section>
  );
}
