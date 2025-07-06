import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DocsContent } from "../components/docs/DocsContent";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { SEO } from "../components/SEO";
import { StructuredData } from "../components/StructuredData";

interface DocData {
  meta: {
    title: string;
    description?: string;
  };
  html: string;
  headings: Array<{ text: string; level: number; id: string }>;
}

export function DocViewerPage() {
  const { category, slug } = useParams<{ category?: string; slug?: string }>();
  const [doc, setDoc] = useState<DocData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const docPath = slug ? `${category}/${slug}` : category;
    
    if (!docPath) {
      setError("Invalid document path");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/docs/${docPath}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(res.status === 404 ? "Document not found" : "Failed to load document");
        }
        return res.json();
      })
      .then((data) => {
        setDoc(data);
        setLoading(false);
        // Update page title
        document.title = `${data.meta.title} - Create Bun Stack Docs`;
      })
      .catch((err) => {
        console.error("Failed to load doc:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [category, slug]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-800 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-800 rounded w-2/3 mb-8"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-800 rounded"></div>
          <div className="h-4 bg-gray-800 rounded w-5/6"></div>
          <div className="h-4 bg-gray-800 rounded w-4/6"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-900/20 border border-red-900/50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-400">{error}</h3>
            <div className="mt-2 text-sm text-red-300">
              <p>
                The document you're looking for could not be found. It may have been moved or
                deleted.
              </p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => navigate("/docs")}
                className="rounded-md bg-red-900/50 px-2 py-1.5 text-sm font-medium text-red-300 hover:bg-red-900/70 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-900"
              >
                Go back to docs home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!doc) {
    return null;
  }

  return (
    <>
      <SEO
        title={doc.meta.title}
        description={doc.meta.description || `Learn about ${doc.meta.title} in Bun Stack documentation`}
        url={`https://bun-stack.jasenc.dev/docs/${slug ? `${category}/${slug}` : category}`}
      />
      <StructuredData 
        type="Article" 
        customData={{
          title: doc.meta.title,
          description: doc.meta.description || `Learn about ${doc.meta.title} in Bun Stack documentation`,
          url: `https://bun-stack.jasenc.dev/docs/${slug ? `${category}/${slug}` : category}`,
          datePublished: "2025-07-06",
          dateModified: "2025-07-06"
        }}
      />
      <div>
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-bun-light sm:text-4xl">
            {doc.meta.title}
          </h1>
          {doc.meta.description && (
            <p className="mt-2 text-lg leading-8 text-bun-light/70">{doc.meta.description}</p>
          )}
        </header>
        <DocsContent html={doc.html || ""} headings={doc.headings || []} />
      </div>
    </>
  );
}