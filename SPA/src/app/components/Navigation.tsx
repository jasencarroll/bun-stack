import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

export function Navigation() {
  const [isOpen, setIsOpen] = React.useState(false);
  const navigate = useNavigate();

  const handleSectionLink = (sectionId: string) => {
    navigate('/');
    // Small delay to ensure navigation completes before scrolling
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <nav className="fixed top-0 w-full z-50 glass-effect">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold gradient-text">
              BUN STACK
            </Link>
          </div>

          <div className="hidden md:block">
            <div className="flex items-center space-x-8">
              <Link to="/docs" className="hover:text-bun-accent transition-colors font-semibold">
                Docs
              </Link>
              <button onClick={() => handleSectionLink('features')} className="hover:text-bun-accent transition-colors">
                Features
              </button>
              <button onClick={() => handleSectionLink('comparison')} className="hover:text-bun-accent transition-colors">
                Compare
              </button>
              <button onClick={() => handleSectionLink('examples')} className="hover:text-bun-accent transition-colors">
                Examples
              </button>
              <button onClick={() => handleSectionLink('contact')} className="hover:text-bun-accent transition-colors">
                Contact
              </button>
              <a
                href="https://github.com/jasencarroll/create-bun-stack"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-bun-accent transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://jasenc.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-bun-accent transition-colors"
              >
                Portfolio
              </a>
              <button
                onClick={() => handleSectionLink('get-started')}
                className="bg-bun-accent text-bun-dark px-4 py-2 rounded-lg font-semibold hover:bg-purple-600 transition-colors"
              >
                Get Started
              </button>
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
            <Link to="/docs" className="block px-3 py-2 hover:text-bun-accent transition-colors font-semibold" onClick={() => setIsOpen(false)}>
              Docs
            </Link>
            <button onClick={() => { handleSectionLink('features'); setIsOpen(false); }} className="block w-full text-left px-3 py-2 hover:text-bun-accent transition-colors">
              Features
            </button>
            <button
              onClick={() => { handleSectionLink('comparison'); setIsOpen(false); }}
              className="block w-full text-left px-3 py-2 hover:text-bun-accent transition-colors"
            >
              Compare
            </button>
            <button onClick={() => { handleSectionLink('examples'); setIsOpen(false); }} className="block w-full text-left px-3 py-2 hover:text-bun-accent transition-colors">
              Examples
            </button>
            <button onClick={() => { handleSectionLink('contact'); setIsOpen(false); }} className="block w-full text-left px-3 py-2 hover:text-bun-accent transition-colors">
              Contact
            </button>
            <a
              href="https://github.com/jasencarroll/create-bun-stack"
              className="block px-3 py-2 hover:text-bun-accent transition-colors"
              onClick={() => setIsOpen(false)}
            >
              GitHub
            </a>
            <a
              href="https://jasenc.dev"
              className="block px-3 py-2 hover:text-bun-accent transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Portfolio
            </a>
            <button
              onClick={() => { handleSectionLink('get-started'); setIsOpen(false); }}
              className="block w-full text-left px-3 py-2 bg-bun-accent text-bun-dark rounded-lg font-semibold text-center"
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
