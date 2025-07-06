import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { DocumentIcon } from "@heroicons/react/24/outline";

interface SearchResult {
  ref: string;
  score: number;
  title: string;
  description?: string;
  excerpt: string;
  category?: string;
  highlights: {
    title?: string;
    content?: string;
  };
}

export function DocsSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Cmd/Ctrl + K to open search
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }

      // Navigation in results
      if (isOpen && results.length > 0) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
        } else if (event.key === "Enter") {
          event.preventDefault();
          const selected = results[selectedIndex];
          if (selected) {
            navigate(`/docs/${selected.ref}`);
            setIsOpen(false);
            setQuery("");
          }
        }
      }

      // Escape to close
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, navigate]);

  // Search debounce
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/docs/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setResults(data.results || []);
        setSelectedIndex(0);
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <MagnifyingGlassIcon className="h-5 w-5 text-bun-light/40" aria-hidden="true" />
        </div>
        <input
          ref={inputRef}
          type="search"
          className="block w-full rounded-md border-0 bg-white/5 py-1.5 pl-10 pr-3 text-bun-light ring-1 ring-inset ring-white/10 placeholder:text-bun-light/40 focus:ring-2 focus:ring-inset focus:ring-bun-accent sm:text-sm sm:leading-6 backdrop-blur-sm"
          placeholder="Search docs... (⌘K)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {/* Search results dropdown */}
      {isOpen && (query || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 z-10 mt-2 max-h-96 overflow-auto rounded-md bg-bun-dark/95 backdrop-blur-lg border border-white/10 py-1 shadow-xl">
          {loading ? (
            <div className="px-4 py-2 text-sm text-bun-light/50">Searching...</div>
          ) : results.length > 0 ? (
            results.map((result, index) => (
              <button
                key={result.ref}
                className={`block w-full px-4 py-2 text-left text-sm ${
                  index === selectedIndex
                    ? "bg-bun-accent text-bun-dark"
                    : "text-bun-light hover:bg-white/5"
                } transition-colors`}
                onClick={() => {
                  navigate(`/docs/${result.ref}`);
                  setIsOpen(false);
                  setQuery("");
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex items-start gap-3">
                  <DocumentIcon
                    className={`h-5 w-5 flex-shrink-0 ${
                      index === selectedIndex ? "text-bun-dark" : "text-bun-light/40"
                    }`}
                  />
                  <div className="flex-1 overflow-hidden">
                    <div
                      className={`font-medium ${
                        index === selectedIndex ? "text-bun-dark" : "text-bun-light"
                      }`}
                      dangerouslySetInnerHTML={{
                        __html: result.highlights.title || result.title,
                      }}
                    />
                    {result.category && (
                      <div
                        className={`text-xs ${
                          index === selectedIndex ? "text-bun-dark/70" : "text-bun-light/50"
                        }`}
                      >
                        {result.category}
                      </div>
                    )}
                    <div
                      className={`mt-1 text-xs line-clamp-2 ${
                        index === selectedIndex ? "text-bun-dark/70" : "text-bun-light/50"
                      }`}
                      dangerouslySetInnerHTML={{
                        __html: result.highlights.content || result.excerpt,
                      }}
                    />
                  </div>
                </div>
              </button>
            ))
          ) : query ? (
            <div className="px-4 py-2 text-sm text-bun-light/50">
              No results found for "{query}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}