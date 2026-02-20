/**
 * Removes markdown code fences and trims whitespace from generated HTML.
 */
export function cleanHtml(html: string): string {
  let cleaned = html.trim();

  // Remove markdown code fences (```html ... ``` or ``` ... ```)
  cleaned = cleaned.replace(/^```(?:html)?\s*\n?/i, "");
  cleaned = cleaned.replace(/\n?```\s*$/i, "");

  return cleaned.trim();
}

/**
 * Counts words in HTML content by stripping all HTML tags first.
 */
export function countWords(html: string): number {
  // Remove all HTML tags
  const textOnly = html.replace(/<[^>]*>/g, " ");

  // Normalize whitespace and split into words
  const words = textOnly
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((word) => word.length > 0);

  return words.length;
}
