import React, { useEffect } from "react";
import { CodeBlock } from "./CodeBlock";
import Prism from "prismjs";

// Import Prism languages
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-css";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-markdown";

interface DocsContentProps {
  html: string;
  headings: Array<{ text: string; level: number; id: string }>;
}

export function DocsContent({ html, headings = [] }: DocsContentProps) {
  useEffect(() => {
    // Apply syntax highlighting
    Prism.highlightAll();
    
    // Add copy buttons to code blocks after render
    const codeBlocks = document.querySelectorAll("pre code");
    codeBlocks.forEach((block) => {
      const pre = block.parentElement;
      if (pre && !pre.querySelector(".copy-button")) {
        const button = document.createElement("button");
        button.className = "copy-button";
        button.textContent = "Copy";
        button.onclick = () => {
          navigator.clipboard.writeText(block.textContent || "");
          button.textContent = "Copied!";
          setTimeout(() => {
            button.textContent = "Copy";
          }, 2000);
        };
        pre.style.position = "relative";
        pre.appendChild(button);
      }
    });

    // Handle anchor links with offset for fixed header
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        const element = document.getElementById(hash);
        if (element) {
          // Account for fixed header height
          const yOffset = -80; 
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }
    };

    // Handle clicks on table of contents links
    const handleTocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('#')) {
        e.preventDefault();
        const hash = target.getAttribute('href')?.slice(1);
        if (hash) {
          const element = document.getElementById(hash);
          if (element) {
            const yOffset = -80;
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
            // Update URL hash
            window.history.pushState(null, '', `#${hash}`);
          }
        }
      }
    };

    // Add click listener to document
    document.addEventListener('click', handleTocClick);

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      document.removeEventListener("click", handleTocClick);
    };
  }, [html]);

  return (
    <div className="flex gap-8">
      {/* Main content */}
      <div className="flex-1 min-w-0 max-w-full overflow-hidden">
        <div 
          className="prose prose-invert max-w-none 
            prose-headings:scroll-mt-28 prose-headings:font-display prose-headings:font-normal prose-headings:text-bun-light
            lg:prose-headings:scroll-mt-[8.5rem] 
            prose-lead:text-bun-light/70 
            prose-p:text-bun-light/80 prose-p:text-[0.95rem] prose-p:leading-relaxed
            prose-li:text-bun-light/80 prose-li:text-[0.95rem]
            prose-h2:text-[1.7rem] prose-h3:text-[1.4rem] prose-h4:text-[1.2rem] prose-h5:text-[1.1rem] prose-h6:text-[1rem]
            prose-a:font-semibold prose-a:text-bun-accent prose-a:no-underline hover:prose-a:underline 
            prose-code:font-mono prose-code:text-bun-light/90 prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-[''] prose-code:after:content-[''] prose-code:text-[0.85rem]
            prose-pre:bg-transparent prose-pre:p-0
            prose-blockquote:border-l-bun-accent prose-blockquote:bg-white/5 prose-blockquote:rounded-r-lg prose-blockquote:text-bun-light/80
            prose-strong:text-bun-light prose-strong:font-semibold
            prose-em:text-bun-light/90
            prose-hr:border-white/10
            prose-table:border-white/10 prose-th:border-white/10 prose-td:border-white/10 prose-th:text-bun-light prose-td:text-bun-light/80
            prose-ol:text-bun-light/80 prose-ul:text-bun-light/80"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      {/* Table of contents */}
      {headings.length > 0 && (
        <div className="hidden xl:block w-64 flex-shrink-0">
          <div className="sticky top-24">
            <h4 className="text-sm font-semibold text-bun-light mb-4">On This Page:</h4>
            <nav className="space-y-3">
              {headings.map((heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  className={`
                    block text-sm hover:text-bun-accent transition-colors toc-link
                    ${heading.level === 2 ? "text-bun-light/70" : ""}
                    ${heading.level === 3 ? "text-bun-light/50 pl-4" : ""}
                    ${heading.level === 4 ? "text-bun-light/50 pl-8" : ""}
                  `}
                >
                  {heading.text}
                </a>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}