export type NoteInlineNode =
  | { type: "text"; text: string }
  | { type: "bold"; children: NoteInlineNode[] }
  | { type: "italic"; children: NoteInlineNode[] };

export type NoteBlockNode =
  | { type: "paragraph"; children: NoteInlineNode[] }
  | { type: "quote"; children: NoteInlineNode[] }
  | { type: "list"; items: NoteInlineNode[][] };

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}

function parseInlineUntil(
  value: string,
  startIndex: number,
  stopMarker?: string,
): { nodes: NoteInlineNode[]; nextIndex: number; closed: boolean } {
  const nodes: NoteInlineNode[] = [];
  let buffer = "";
  let index = startIndex;

  function flushBuffer() {
    if (!buffer) return;
    nodes.push({ type: "text", text: buffer });
    buffer = "";
  }

  while (index < value.length) {
    if (stopMarker && value.startsWith(stopMarker, index)) {
      flushBuffer();
      return { nodes, nextIndex: index + stopMarker.length, closed: true };
    }

    if (value.startsWith("**", index)) {
      const parsed = parseInlineUntil(value, index + 2, "**");
      if (parsed.closed) {
        flushBuffer();
        nodes.push({ type: "bold", children: parsed.nodes });
        index = parsed.nextIndex;
        continue;
      }
    }

    if (value[index] === "*" && !value.startsWith("**", index)) {
      const parsed = parseInlineUntil(value, index + 1, "*");
      if (parsed.closed) {
        flushBuffer();
        nodes.push({ type: "italic", children: parsed.nodes });
        index = parsed.nextIndex;
        continue;
      }
    }

    buffer += value[index];
    index += 1;
  }

  flushBuffer();
  return { nodes, nextIndex: index, closed: false };
}

export function parseNoteInlineMarkdown(value: string): NoteInlineNode[] {
  return parseInlineUntil(value, 0).nodes;
}

export function parseNoteMarkdown(markdown: string): NoteBlockNode[] {
  const normalized = markdown.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];

  const blocks: NoteBlockNode[] = [];
  const lines = normalized.split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].startsWith("> ")) {
        quoteLines.push(lines[index].slice(2));
        index += 1;
      }
      blocks.push({
        type: "quote",
        children: parseNoteInlineMarkdown(quoteLines.join("\n")),
      });
      continue;
    }

    if (line.startsWith("- ")) {
      const items: NoteInlineNode[][] = [];
      while (index < lines.length && lines[index].startsWith("- ")) {
        items.push(parseNoteInlineMarkdown(lines[index].slice(2)));
        index += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].startsWith("> ") &&
      !lines[index].startsWith("- ")
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    blocks.push({
      type: "paragraph",
      children: parseNoteInlineMarkdown(paragraphLines.join("\n")),
    });
  }

  return blocks;
}

function inlineNodesToHtml(nodes: NoteInlineNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === "text") return escapeHtml(node.text).replace(/\n/g, "<br>");
      if (node.type === "bold") return `<strong>${inlineNodesToHtml(node.children)}</strong>`;
      return `<em>${inlineNodesToHtml(node.children)}</em>`;
    })
    .join("");
}

export function noteMarkdownToEditorHtml(markdown: string): string {
  const blocks = parseNoteMarkdown(markdown);
  if (blocks.length === 0) return "";

  return blocks
    .map((block) => {
      if (block.type === "quote") {
        return `<blockquote>${inlineNodesToHtml(block.children)}</blockquote>`;
      }

      if (block.type === "list") {
        const items = block.items
          .map((item) => `<li>${inlineNodesToHtml(item)}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }

      return `<p>${inlineNodesToHtml(block.children)}</p>`;
    })
    .join("");
}
