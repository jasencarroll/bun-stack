import React from "react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

export function Navigation() {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 glass-effect">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <a href="/" className="text-xl font-bold gradient-text">
              BUN STACK
            </a>
          </div>

          <div className="hidden md:block">
            <div className="flex items-center space-x-8">
              <a href="#features" className="hover:text-bun-accent transition-colors">
                Features
              </a>
              <a href="#comparison" className="hover:text-bun-accent transition-colors">
                Compare
              </a>
              <a href="#examples" className="hover:text-bun-accent transition-colors">
                Examples
              </a>
              <a href="#contact" className="hover:text-bun-accent transition-colors">
                Contact
              </a>
              <a
                href="https://github.com/jasencarroll/create-bun-stack"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-bun-accent transition-colors"
              >
                GitHub
              </a>
              <a
                href="#get-started"
                className="bg-bun-accent text-bun-dark px-4 py-2 rounded-lg font-semibold hover:bg-purple-600 transition-colors"
              >
                Get Started
              </a>
            </div>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-bun-light hover:text-bun-accent"
              aria-label={isOpen ? "Close menu" : "Open menu"}
              aria-expanded={isOpen}
            >
              {isOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden glass-effect">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <a href="#features" className="block px-3 py-2 hover:text-bun-accent transition-colors">
              Features
            </a>
            <a
              href="#comparison"
              className="block px-3 py-2 hover:text-bun-accent transition-colors"
            >
              Compare
            </a>
            <a href="#examples" className="block px-3 py-2 hover:text-bun-accent transition-colors">
              Examples
            </a>
            <a href="#contact" className="block px-3 py-2 hover:text-bun-accent transition-colors">
              Contact
            </a>
            <a
              href="https://github.com/jasencarroll/create-bun-stack"
              className="block px-3 py-2 hover:text-bun-accent transition-colors"
            >
              GitHub
            </a>
            <a
              href="#get-started"
              className="block px-3 py-2 bg-bun-accent text-bun-dark rounded-lg font-semibold text-center"
            >
              Get Started
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
