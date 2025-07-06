import { join } from "path";
import { getDocsTree, parseMarkdown } from "../lib/docs-parser";
import { search, getDocument, buildSearchIndex } from "../lib/search-index";

const docsDir = join(import.meta.dir, "../../../docs");

// Build search index on startup
buildSearchIndex(docsDir).catch(console.error);

// Rebuild index in development mode when files change
if (process.env.DEV_MODE === "true") {
  // Watch for changes in docs directory
  console.log("👀 Watching docs directory for changes...");
  
  // Simple debounce to avoid multiple rebuilds
  let rebuildTimeout: Timer | null = null;
  
  // Use a simple polling approach for file watching
  // Check for changes every 2 seconds
  setInterval(async () => {
    try {
      // This is a simple approach - in production you might want to use
      // a more sophisticated file watching solution
      const needsRebuild = await checkIfDocsChanged();
      
      if (needsRebuild) {
        // Debounce rebuilds
        if (rebuildTimeout) clearTimeout(rebuildTimeout);
        rebuildTimeout = setTimeout(() => {
          console.log("📝 Docs changed, rebuilding search index...");
          buildSearchIndex(docsDir).catch(console.error);
        }, 500);
      }
    } catch (error) {
      console.error("Error checking for doc changes:", error);
    }
  }, 2000);
}

// Simple change detection (you can improve this with file timestamps)
let lastCheckTime = Date.now();
async function checkIfDocsChanged(): Promise<boolean> {
  const glob = new Bun.Glob("**/*.md");
  const files = Array.from(glob.scanSync({ cwd: docsDir }));
  
  for (const file of files) {
    const filePath = join(docsDir, file);
    const stats = await Bun.file(filePath).stat();
    
    if (stats.mtime > lastCheckTime) {
      lastCheckTime = Date.now();
      return true;
    }
  }
  
  return false;
}

export const docs = {
  "/": {
    // Get documentation tree structure
    GET: async () => {
      try {
        const tree = await getDocsTree(docsDir);
        return Response.json({ tree });
      } catch (error) {
        console.error("Error getting docs tree:", error);
        return Response.json({ error: "Failed to get documentation" }, { status: 500 });
      }
    },
  },
  "/search": {
    // Search documentation
    GET: async (req: Request) => {
      const url = new URL(req.url);
      const query = url.searchParams.get("q");
      
      if (!query) {
        return Response.json({ error: "Query parameter 'q' is required" }, { status: 400 });
      }
      
      try {
        const results = search(query);
        return Response.json({ results, query });
      } catch (error) {
        console.error("Search error:", error);
        return Response.json({ error: "Search failed" }, { status: 500 });
      }
    },
  },
  "/*": {
    // Get specific document
    GET: async (req: Request) => {
      const url = new URL(req.url);
      // Extract path after /api/docs/
      const docPath = url.pathname.replace(/^\/api\/docs\//, "");
      
      if (!docPath) {
        return Response.json({ error: "Document path is required" }, { status: 400 });
      }
      
      try {
        // Try to get from cache first
        let doc = getDocument(docPath);
        
        if (!doc) {
          // If not in cache, parse it directly
          const filePath = join(docsDir, `${docPath}.md`);
          const file = Bun.file(filePath);
          
          if (!(await file.exists())) {
            // Try with README.md for category indices
            const readmePath = join(docsDir, docPath, "README.md");
            const readmeFile = Bun.file(readmePath);
            
            if (await readmeFile.exists()) {
              doc = await parseMarkdown(readmePath);
            } else {
              return Response.json({ error: "Document not found" }, { status: 404 });
            }
          } else {
            doc = await parseMarkdown(filePath);
          }
        }
        
        return Response.json({
          meta: doc.meta,
          html: doc.html,
          headings: doc.headings,
          excerpt: doc.excerpt,
        });
      } catch (error) {
        console.error("Error getting document:", error);
        return Response.json({ error: "Failed to get document" }, { status: 500 });
      }
    },
  },
};