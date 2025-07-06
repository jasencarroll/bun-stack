import lunr from "lunr";
import { parseMarkdown, type ParsedDoc } from "./docs-parser";
import { join } from "path";

export interface SearchResult {
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

interface DocForIndex {
  id: string;
  title: string;
  description: string;
  content: string;
  headings: string;
  category: string;
}

let searchIndex: lunr.Index | null = null;
let documentsMap: Map<string, ParsedDoc> = new Map();

export async function buildSearchIndex(docsPath: string): Promise<void> {
  console.log("🔍 Building search index...");
  
  // Clear existing data
  documentsMap.clear();
  
  // Get all markdown files
  const glob = new Bun.Glob("**/*.md");
  const files = Array.from(glob.scanSync({ cwd: docsPath }));
  
  const documents: DocForIndex[] = [];
  
  for (const file of files) {
    const filePath = join(docsPath, file);
    const parsed = await parseMarkdown(filePath);
    
    // Create document ID (file path without .md)
    const id = file.replace(/\.md$/, "");
    
    // Store parsed document for later retrieval
    documentsMap.set(id, parsed);
    
    // Add to search index
    documents.push({
      id,
      title: parsed.meta.title,
      description: parsed.meta.description || "",
      content: parsed.content,
      headings: parsed.headings.map(h => h.text).join(" "),
      category: parsed.meta.category || "",
    });
  }
  
  // Build the search index
  searchIndex = lunr(function () {
    this.ref("id");
    this.field("title", { boost: 10 });
    this.field("description", { boost: 5 });
    this.field("headings", { boost: 3 });
    this.field("content");
    this.field("category", { boost: 2 });
    
    // Add documents to index
    documents.forEach((doc) => {
      this.add(doc);
    });
  });
  
  console.log(`✅ Search index built with ${documents.length} documents`);
}

export function search(query: string, limit: number = 10): SearchResult[] {
  if (!searchIndex) {
    throw new Error("Search index not built yet");
  }
  
  try {
    // Perform the search
    const results = searchIndex.search(query);
    
    // Map results to include document data
    return results.slice(0, limit).map((result) => {
      const doc = documentsMap.get(result.ref);
      if (!doc) {
        throw new Error(`Document not found: ${result.ref}`);
      }
      
      // Create highlighted excerpts
      const queryTerms = query.toLowerCase().split(/\s+/);
      const highlights: SearchResult["highlights"] = {};
      
      // Highlight title if it contains query terms
      let highlightedTitle = doc.meta.title;
      queryTerms.forEach((term) => {
        const regex = new RegExp(`(${term})`, "gi");
        highlightedTitle = highlightedTitle.replace(regex, "<mark>$1</mark>");
      });
      if (highlightedTitle !== doc.meta.title) {
        highlights.title = highlightedTitle;
      }
      
      // Find best content excerpt with query terms
      let bestExcerpt = doc.excerpt;
      const contentLower = doc.content.toLowerCase();
      
      for (const term of queryTerms) {
        const index = contentLower.indexOf(term);
        if (index !== -1) {
          // Extract context around the match
          const start = Math.max(0, index - 80);
          const end = Math.min(doc.content.length, index + term.length + 80);
          bestExcerpt = "..." + doc.content.slice(start, end) + "...";
          
          // Highlight the excerpt
          const regex = new RegExp(`(${term})`, "gi");
          bestExcerpt = bestExcerpt.replace(regex, "<mark>$1</mark>");
          highlights.content = bestExcerpt;
          break;
        }
      }
      
      return {
        ref: result.ref,
        score: result.score,
        title: doc.meta.title,
        description: doc.meta.description,
        excerpt: highlights.content || bestExcerpt,
        category: doc.meta.category,
        highlights,
      };
    });
  } catch (error) {
    console.error("Search error:", error);
    // If lunr throws an error (e.g., invalid query), return empty results
    return [];
  }
}

export function getDocument(id: string): ParsedDoc | undefined {
  return documentsMap.get(id);
}

// Rebuild index when files change (for development)
export async function rebuildIndex(docsPath: string): Promise<void> {
  await buildSearchIndex(docsPath);
}