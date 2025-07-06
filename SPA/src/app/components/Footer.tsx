import React from "react";

export function Footer() {
  return (
    <footer className="border-t border-gray-800 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <h3 className="font-bold text-lg mb-4 gradient-text">BUN STACK</h3>
            <p className="text-gray-300">
              The Rails of the JavaScript world. Build production-ready apps with convention over
              configuration.
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-400">
                Created by an engineer combining AI insights, business strategy, and full-stack expertise.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:col-span-2 gap-8">
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-300 text-sm sm:text-base">
                <li>
                  <a
                    href="https://github.com/jasencarroll/create-bun-stack"
                    className="hover:text-bun-accent transition-colors"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.bun-stack.jasenc.dev/docs"
                    className="hover:text-bun-accent transition-colors"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="https://bun.sh"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-bun-accent transition-colors"
                  >
                    Bun Runtime
                  </a>
                </li>
                <li>
                  <a
                    href="https://anthropic.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-bun-accent transition-colors"
                  >
                    Anthropic
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-gray-300 text-sm sm:text-base">
                <li>
                  <a
                    href="https://jasenc.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-bun-accent transition-colors flex items-center gap-2"
                  >
                    <span>View Portfolio</span>
                    <span className="text-xs text-gray-500">→</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.linkedin.com/in/jasenc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-bun-accent transition-colors flex items-center gap-2"
                  >
                    <span>LinkedIn</span>
                    <span className="text-xs text-gray-500">→</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/jasencarroll"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-bun-accent transition-colors flex items-center gap-2"
                  >
                    <span>GitHub Profile</span>
                    <span className="text-xs text-gray-500">→</span>
                  </a>
                </li>
                <li>
                  <a
                    href="#contact"
                    className="hover:text-bun-accent transition-colors flex items-center gap-2"
                  >
                    <span>Contact</span>
                    <span className="text-xs text-gray-500">→</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="text-center text-gray-400 mb-6">
            <p>Built with ❤️ by Jasen Carroll with Claude Code</p>
            <p className="mt-2">MIT License © {new Date().getFullYear()}</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <a
              href="https://github.com/jasencarroll/create-bun-stack"
              className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg hover:bg-white/10 transition-all"
            >
              <span>⭐</span>
              <span>Star on GitHub</span>
            </a>
            <a
              href="https://jasenc.dev"
              className="inline-flex items-center gap-2 bg-bun-accent/10 text-bun-accent px-4 py-2 rounded-lg hover:bg-bun-accent/20 transition-all"
            >
              <span>🚀</span>
              <span>Explore More Projects</span>
            </a>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg hover:bg-white/10 transition-all"
            >
              <span>💬</span>
              <span>Get in Touch</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
