import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { frontmatterClose, parseEdges, scanElements, scanHeadings, splitFrontmatter } from '../src/index.js';

describe('splitFrontmatter closing fence', () => {
  it('keeps an indented --- or ... inside a block scalar as content', () => {
    const text = '---\ntype: question\nrationale: |\n  First paragraph.\n  ---\n  Second paragraph.\n  ...\nconcept:\n  - "[[topic]]"\n---\nBody.\n';
    const { yaml, body } = splitFrontmatter(text);
    expect(parseYaml(yaml!)).toEqual({
      type: 'question',
      rationale: 'First paragraph.\n---\nSecond paragraph.\n...\n',
      concept: ['[[topic]]'],
    });
    expect(body).toBe('Body.\n');
  });

  it('still closes at a column-0 fence with trailing spaces or tabs', () => {
    expect(splitFrontmatter('---\ntype: a\n--- \t\nBody.\n')).toEqual({ yaml: 'type: a', body: 'Body.\n' });
    expect(splitFrontmatter('---\ntype: a\n...\nBody.\n')).toEqual({ yaml: 'type: a', body: 'Body.\n' });
  });
});

describe('readers that skip frontmatter agree on where it ends', () => {
  // An MCQ-style note: the indented --- sits inside a block scalar, and keys with links follow it.
  const note = '---\ntype: mcq\nrationale: |-\n  First part.\n\n  ---\n\n  # Not a heading\n  <aside>\n  Second part.\nconcept:\n  - "[[topic]]"\n---\n# Question\n\nBody with [[other]].\n';

  it('frontmatterClose returns the column-0 fence', () => {
    expect(frontmatterClose(note.split('\n'))).toBe(12);
    expect(frontmatterClose(['no', 'frontmatter'])).toBe(-1);
    expect(frontmatterClose(['---', 'type: a'])).toBe(-1);
  });

  it('parseEdges does not read frontmatter after an indented --- as prose', () => {
    const { edges } = parseEdges(note, 'n.md', { linkEdges: true });
    expect(edges.map((e) => e.target)).toEqual(['other']);
  });

  it('scanHeadings and scanElements skip the whole frontmatter', () => {
    expect(scanHeadings(note).map((h) => h.text)).toEqual(['Question']);
    expect(scanElements(note)).toEqual([]);
  });
});
