export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Checks if content contains the specified tag, excluding tags in code blocks.
 * This function:
 * - Detects tags in regular text (e.g., #tag)
 * - Detects tags in YAML frontmatter (e.g., tags: [tag1, tag2] or tags: tag1)
 * - Does NOT detect tags in inline code blocks (e.g., `#tag`)
 * - Does NOT detect tags in fenced code blocks
 * 
 * @param content The markdown content to search
 * @param tag The tag name to search for (without the # prefix)
 * @returns true if the tag is found outside of code blocks
 */
export function containsTag(content: string, tag: string): boolean {
  // First, check for tag in YAML frontmatter
  const frontmatterMatch = /^---\s*\n([\s\S]*?)\n---/m.exec(content);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    // Check for tags in frontmatter:
    // - tags: [tag1, tag2]
    // - tags: tag1
    // - tags:
    //   - tag1
    //   - tag2
    const tagPattern = new RegExp(
      `(?:tags:\\s*\\[.*?\\b${escapeRegex(tag)}\\b.*?\\]|` +
      `tags:\\s*${escapeRegex(tag)}\\b|` +
      `tags:\\s*\\n\\s*-\\s*${escapeRegex(tag)}\\b)`,
      'i'
    );
    if (tagPattern.test(frontmatter)) {
      return true;
    }
  }

  // Remove frontmatter from content before checking body
  let bodyContent = content;
  if (frontmatterMatch) {
    bodyContent = content.slice(frontmatterMatch[0].length);
  }

  // Remove fenced code blocks (``` ... ```)
  let withoutCodeBlocks = bodyContent.replace(/```[\s\S]*?```/g, '');

  // Remove inline code blocks (` ... `)
  withoutCodeBlocks = withoutCodeBlocks.replace(/`[^`]*`/g, '');

  // Now check for the tag in the remaining content
  const tagRegex = new RegExp(`#${escapeRegex(tag)}(?:\\s|$)`, 'i');
  return tagRegex.test(withoutCodeBlocks);
}
