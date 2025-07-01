import React from "react";

export function Footer() {
  return (
    <footer className="border-t border-gray-800 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-4 gradient-text">BUN STACK</h3>
            <p className="text-gray-300">
              The Rails of the JavaScript world. Build production-ready apps with convention over
              configuration.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a
                  href="https://github.com/jasencarroll/bun-stack"
                  className="hover:text-bun-accent transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/jasencarroll/bun-stack#readme"
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
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Community</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a
                  href="https://bun.sh/discord"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-bun-accent transition-colors"
                >
                  Discord
                </a>
              </li>
              <li>
                <a
                  href="https://twitter.com/bunjavascript"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-bun-accent transition-colors"
                >
                  Twitter
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/jasencarroll/bun-stack/issues"
                  className="hover:text-bun-accent transition-colors"
                >
                  Report Issues
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-400">
          <p>Built with ❤️ by Jasen Carroll with Claude Code</p>
          <p className="mt-2">MIT License © {new Date().getFullYear()}</p>
        </div>
      </div>
    </footer>
  );
}
