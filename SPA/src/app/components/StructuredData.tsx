import React from "react";
import { Helmet } from "react-helmet-async";

interface StructuredDataProps {
  type?: "WebSite" | "SoftwareApplication" | "Article" | "Organization";
  customData?: Record<string, any>;
}

export function StructuredData({ type = "WebSite", customData }: StructuredDataProps) {
  const getStructuredData = () => {
    const baseUrl = "https://bun-stack.jasenc.dev";
    
    switch (type) {
      case "WebSite":
        return {
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "Bun Stack",
          "description": "The Rails of the JavaScript world - A full-stack framework for building modern web applications",
          "url": baseUrl,
          "potentialAction": {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": `${baseUrl}/docs?search={search_term_string}`
            },
            "query-input": "required name=search_term_string"
          },
          "author": {
            "@type": "Person",
            "name": "Jasen Carroll",
            "url": baseUrl
          }
        };
        
      case "SoftwareApplication":
        return {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "create-bun-stack",
          "description": "A Rails-inspired fullstack application generator for Bun",
          "url": baseUrl,
          "applicationCategory": "DeveloperApplication",
          "operatingSystem": "Windows, macOS, Linux",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          },
          "author": {
            "@type": "Person",
            "name": "Jasen Carroll"
          },
          "softwareVersion": "1.0.0",
          "requirements": "Bun runtime",
          "screenshot": `${baseUrl}/og-image.png`
        };
        
      case "Organization":
        return {
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Bun Stack",
          "url": baseUrl,
          "logo": `${baseUrl}/icon-512x512.png`,
          "description": "The Rails of the JavaScript world",
          "sameAs": [
            "https://github.com/jasenc/bun-stack"
          ]
        };
        
      case "Article":
        return {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": customData?.title || "Bun Stack Documentation",
          "description": customData?.description || "Learn how to use Bun Stack",
          "url": customData?.url || baseUrl,
          "author": {
            "@type": "Person",
            "name": "Jasen Carroll"
          },
          "publisher": {
            "@type": "Organization",
            "name": "Bun Stack",
            "logo": {
              "@type": "ImageObject",
              "url": `${baseUrl}/icon-512x512.png`
            }
          },
          "datePublished": customData?.datePublished || "2025-07-06",
          "dateModified": customData?.dateModified || "2025-07-06",
          ...customData
        };
        
      default:
        return customData || {};
    }
  };
  
  const structuredData = getStructuredData();
  
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
}