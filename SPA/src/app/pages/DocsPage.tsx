import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpenIcon, MagnifyingGlassIcon, RocketLaunchIcon } from "@heroicons/react/24/outline";
import { DocsContent } from "../components/docs/DocsContent";

interface DocData {
  meta: {
    title: string;
    description?: string;
  };
  html: string;
  headings: Array<{ text: string; level: number; id: string }>;
}

export function DocsPage() {
  const [indexDoc, setIndexDoc] = useState<DocData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to load README.md as the index page
    fetch("/api/docs/README")
      .then((res) => res.json())
      .then((data) => {
        setIndexDoc(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load docs index:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-800 rounded w-2/3 mb-8"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-800 rounded"></div>
          <div className="h-4 bg-gray-800 rounded"></div>
          <div className="h-4 bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (indexDoc) {
    return <DocsContent html={indexDoc.html || ""} headings={indexDoc.headings || []} />;
  }

  // Fallback welcome page if no README
  return (
    <div className="py-12">
      <div className="text-center">
        <BookOpenIcon className="mx-auto h-12 w-12 text-bun-light/40" />
        <h2 className="mt-2 text-lg font-semibold text-bun-light">Documentation</h2>
        <p className="mt-1 text-sm text-bun-light/70">
          Welcome to the Create Bun Stack documentation.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/docs/getting-started"
          className="group relative rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:border-bun-accent transition-all hover:bg-white/10"
        >
          <div>
            <span className="inline-flex rounded-lg bg-bun-accent/10 p-3 text-bun-accent group-hover:bg-bun-accent/20">
              <RocketLaunchIcon className="h-6 w-6" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-medium text-bun-light">Getting Started</h3>
            <p className="mt-2 text-sm text-bun-light/70">
              Learn how to create your first application with Create Bun Stack.
            </p>
          </div>
          <span
            className="pointer-events-none absolute right-6 top-6 text-bun-light/20 group-hover:text-bun-light/40"
            aria-hidden="true"
          >
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
            </svg>
          </span>
        </Link>

        <Link
          to="/docs/guide"
          className="group relative rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:border-bun-accent transition-all hover:bg-white/10"
        >
          <div>
            <span className="inline-flex rounded-lg bg-bun-accent/10 p-3 text-bun-accent group-hover:bg-bun-accent/20">
              <BookOpenIcon className="h-6 w-6" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-medium text-bun-light">User Guide</h3>
            <p className="mt-2 text-sm text-bun-light/70">
              Deep dive into features and learn best practices for development.
            </p>
          </div>
          <span
            className="pointer-events-none absolute right-6 top-6 text-bun-light/20 group-hover:text-bun-light/40"
            aria-hidden="true"
          >
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
            </svg>
          </span>
        </Link>

        <Link
          to="/docs/api"
          className="group relative rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:border-bun-accent transition-all hover:bg-white/10"
        >
          <div>
            <span className="inline-flex rounded-lg bg-bun-accent/10 p-3 text-bun-accent group-hover:bg-bun-accent/20">
              <MagnifyingGlassIcon className="h-6 w-6" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-medium text-bun-light">API Reference</h3>
            <p className="mt-2 text-sm text-bun-light/70">
              Complete reference for all CLI commands and APIs.
            </p>
          </div>
          <span
            className="pointer-events-none absolute right-6 top-6 text-bun-light/20 group-hover:text-bun-light/40"
            aria-hidden="true"
          >
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
            </svg>
          </span>
        </Link>
      </div>
    </div>
  );
}