import { remark } from "remark";
import html from "remark-html";
import gfm from "remark-gfm";

/**
 * Process Markdown to HTML using remark with GFM support
 * GFM (GitHub Flavored Markdown) adds: tables, strikethrough, task lists, auto-links
 */
export async function markdownToHtml(markdown: string): Promise<string> {
  if (!markdown) return "";

  const result = await remark()
    .use(gfm) // GitHub Flavored Markdown (tables, strikethrough, task lists, autolinks)
    .use(html, { sanitize: false }) // Don't sanitize to preserve our custom elements
    .process(markdown);

  return result.toString();
}

/**
 * Calculate reading time based on word count
 * Average reading speed: ~200-250 words per minute
 */
export function calculateReadingTime(content: string): number {
  if (!content) return 0;
  
  // Strip Markdown syntax for more accurate word count
  const plainText = content
    .replace(/```[\s\S]*?```/g, "") // Remove code blocks
    .replace(/`[^`]+`/g, "") // Remove inline code
    .replace(/!\[.*?\]\(.*?\)/g, "") // Remove images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Keep link text only
    .replace(/[#*_~`>-]/g, "") // Remove markdown symbols
    .replace(/\n+/g, " ") // Replace newlines with spaces
    .trim();

  const words = plainText.split(/\s+/).filter(word => word.length > 0);
  const wordsPerMinute = 200;
  const minutes = Math.ceil(words.length / wordsPerMinute);

  return Math.max(1, minutes); // Minimum 1 minute
}

/**
 * Extract headings from Markdown for Table of Contents
 * Returns array of { level, text, id }
 */
export function extractHeadings(markdown: string): Array<{ level: number; text: string; id: string }> {
  if (!markdown) return [];

  const headingRegex = /^(#{1,4})\s+(.+)$/gm;
  const headings: Array<{ level: number; text: string; id: string }> = [];
  
  let match;
  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    // Create URL-friendly id from heading text
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    
    headings.push({ level, text, id });
  }

  return headings;
}

/**
 * Add id attributes to headings in HTML for anchor links
 */
export function addHeadingIds(htmlContent: string): string {
  // Match h1-h4 tags and add id attributes
  return htmlContent.replace(
    /<h([1-4])>([^<]+)<\/h[1-4]>/g,
    (match, level, text) => {
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      return `<h${level} id="${id}">${text}</h${level}>`;
    }
  );
}

/**
 * Process Markdown content with all enhancements
 * Returns: { html, readingTime, headings }
 */
export async function processMarkdown(markdown: string): Promise<{
  html: string;
  readingTime: number;
  headings: Array<{ level: number; text: string; id: string }>;
}> {
  const [htmlContent, readingTime, headings] = await Promise.all([
    markdownToHtml(markdown),
    Promise.resolve(calculateReadingTime(markdown)),
    Promise.resolve(extractHeadings(markdown)),
  ]);

  // Add ids to headings for anchor links
  const htmlWithIds = addHeadingIds(htmlContent);

  return {
    html: htmlWithIds,
    readingTime,
    headings,
  };
}
