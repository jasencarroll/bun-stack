import { marked } from "marked";
import matter from "gray-matter";
import { join } from "path";

export interface DocMeta {
  title: string;
  description?: string;
  order?: number;
  tags?: string[];
  category?: string;
  slug?: string;
}

// Helper function to format category names
function formatCategoryName(name: string): string {
  return name
    .split("-")
    .map((word) => {
      // Special case for common acronyms
      if (word.toLowerCase() === "api") return "API";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export interface ParsedDoc {
  meta: DocMeta;
  content: string;
  html: string;
  headings: { text: string; level: number; id: string }[];
  excerpt: string;
}

export interface DocTreeItem {
  name: string;
  path: string;
  meta: DocMeta;
  children?: DocTreeItem[];
}

// Configure marked without Prism for now
marked.setOptions({
  gfm: true,
  breaks: true,
  langPrefix: 'language-',
});

export async function parseMarkdown(filePath: string): Promise<ParsedDoc> {

  const file = Bun.file(filePath);
  const content = await file.text();

  // Parse frontmatter and content
  const { data, content: markdownContent } = matter(content);

  // Create a new renderer instance for thread safety
  const localRenderer = new marked.Renderer();
  const localHeadings: { text: string; level: number; id: string }[] = [];
  
  localRenderer.heading = function ({ tokens, depth }) {
    // Parse the tokens to get the text content
    const text = this.parser.parseInline(tokens);
    
    // Strip HTML tags and emoji for the plain text version used in TOC
    let plainText = text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu, '') // Remove common emoji ranges
      .trim();
    
    // Decode HTML entities
    plainText = plainText
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ");
    
    const id = plainText
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
    
    localHeadings.push({ text: plainText, level: depth, id });
    
    // Skip rendering H1 headings in content (they're shown in page header)
    if (depth === 1) {
      return '';
    }
    
    return `<h${depth} id="${id}" class="scroll-mt-20">${text}</h${depth}>`;
  };

  // Parse markdown to HTML
  const html = marked(markdownContent, { renderer: localRenderer });

  // Extract excerpt (first paragraph or first 200 chars)
  const excerptMatch = markdownContent.match(/^(.+?)(\n\n|$)/);
  const excerpt = excerptMatch
    ? excerptMatch[1].substring(0, 200)
    : markdownContent.substring(0, 200);

  // Extract category and slug from file path
  const docsDir = join(import.meta.dir, "../../../docs");
  const relativePath = filePath.replace(docsDir + "/", "");
  const parts = relativePath.split("/");
  
  let category = "";
  let slug = "";
  
  if (parts.length > 1) {
    category = parts[0];
    slug = parts[parts.length - 1].replace(/\.md$/, "");
  } else {
    slug = parts[0].replace(/\.md$/, "");
  }

  // Extract title from first H1 if not in frontmatter
  let title = data.title;
  if (!title) {
    const h1Match = markdownContent.match(/^#\s+(.+)$/m);
    title = h1Match ? h1Match[1] : slug.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  }

  // Create meta object with defaults
  const meta: DocMeta = {
    title,
    description: data.description,
    order: data.order || 999,
    tags: data.tags || [],
    category,
    slug,
  };

  return {
    meta,
    content: markdownContent,
    html,
    headings: [...localHeadings], // Copy headings array
    excerpt,
  };
}

// Define category order
const CATEGORY_ORDER: Record<string, number> = {
  "getting-started": 1,
  "guide": 2,
  "features": 3,
  "api": 4,
  "deployment": 5,
  "advanced": 6,
};

// Define document order within categories
const DOC_ORDER: Record<string, Record<string, number>> = {
  "getting-started": {
    "installation": 1,
    "system-requirements": 2,
    "quick-start": 3,
    "first-app": 4,
  },
  "guide": {
    "project-structure": 1,
    "configuration": 2,
    "development": 3,
    "testing": 4,
    "deployment": 5,
  },
  "features": {
    "routing": 1,
    "database": 2,
    "authentication": 3,
    "frontend": 4,
    "security": 5,
    "testing": 6,
  },
  "api": {
    "cli": 1,
    "server-api": 2,
    "middleware": 3,
    "utilities": 4,
  },
  "deployment": {
    "docker": 1,
    "railway": 2,
    "fly-io": 3,
    "vps": 4,
  },
  "advanced": {
    "customization": 1,
    "performance": 2,
    "migrations": 3,
    "security": 4,
  },
};

export async function getDocsTree(docsPath: string): Promise<DocTreeItem[]> {
  const glob = new Bun.Glob("**/*.md");
  const files = Array.from(glob.scanSync({ cwd: docsPath })).sort();

  const tree: DocTreeItem[] = [];
  const categoryMap: Map<string, DocTreeItem> = new Map();

  // First pass: Create categories
  const categoryDirs = new Set<string>();
  for (const file of files) {
    const parts = file.split("/");
    if (parts.length > 1) {
      categoryDirs.add(parts[0]);
    }
  }

  // Process each category
  for (const category of categoryDirs) {
    // Try to get README for category metadata
    const categoryReadmePath = join(docsPath, category, "README.md");
    let categoryTitle = formatCategoryName(category);
    let categoryMeta: DocMeta = {
      title: categoryTitle,
      category,
      slug: category,
      order: CATEGORY_ORDER[category] || 999,
    };

    try {
      const categoryReadme = await parseMarkdown(categoryReadmePath);
      // Use the README's title if it exists
      categoryTitle = categoryReadme.meta.title || categoryTitle;
      categoryMeta = {
        ...categoryMeta,
        ...categoryReadme.meta,
        order: CATEGORY_ORDER[category] || categoryReadme.meta.order || 999,
      };
    } catch (e) {
      // No README or error reading it, use defaults
    }

    const categoryItem: DocTreeItem = {
      name: categoryTitle,
      path: category,
      meta: categoryMeta,
      children: [],
    };
    
    categoryMap.set(category, categoryItem);
  }

  // Second pass: Process all files
  for (const file of files) {
    const filePath = join(docsPath, file);
    const parsed = await parseMarkdown(filePath);
    const parts = file.split("/");

    if (parts.length === 1) {
      // Root level file (not README.md)
      if (file !== "README.md") {
        tree.push({
          name: parsed.meta.title,
          path: file.replace(/\.md$/, ""),
          meta: parsed.meta,
        });
      }
    } else {
      // File in a category
      const category = parts[0];
      const filename = parts[parts.length - 1];
      
      // Skip category README files (already used for category metadata)
      if (filename === "README.md") {
        continue;
      }

      const categoryItem = categoryMap.get(category);
      if (categoryItem) {
        // Get document order
        const docSlug = filename.replace(/\.md$/, "");
        const docOrder = DOC_ORDER[category]?.[docSlug] || parsed.meta.order || 999;
        
        categoryItem.children!.push({
          name: parsed.meta.title,
          path: file.replace(/\.md$/, ""),
          meta: {
            ...parsed.meta,
            order: docOrder,
          },
        });
      }
    }
  }

  // Add all categories to tree
  tree.push(...Array.from(categoryMap.values()));

  // Sort tree items by order
  const sortByOrder = (a: DocTreeItem, b: DocTreeItem) => 
    (a.meta.order || 999) - (b.meta.order || 999);

  tree.sort(sortByOrder);
  tree.forEach((item) => {
    if (item.children) {
      item.children.sort(sortByOrder);
    }
  });

  return tree;
}