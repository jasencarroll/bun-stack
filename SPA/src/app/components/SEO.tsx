import React from "react";
import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  author?: string;
  image?: string;
  url?: string;
  type?: string;
}

export function SEO({
  title = "Bun Stack",
  description = "The Rails of the JavaScript world. A full-stack framework for building modern web applications with Bun, React, and TypeScript.",
  keywords = "bun, react, typescript, fullstack, framework, web development, javascript, rails",
  author = "Jasen Carroll",
  image = "https://bun-stack.jasenc.dev/og-image.png",
  url = "https://bun-stack.jasenc.dev",
  type = "website",
}: SEOProps) {
  const fullTitle = title === "Bun Stack" ? title : `${title} | Bun Stack`;
  const currentUrl = url || window.location.href;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />

      {/* Open Graph Tags */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={currentUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Canonical URL */}
      <link rel="canonical" href={currentUrl} />
    </Helmet>
  );
}