import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(ROOT, 'src/content/chapters');

const manifest = JSON.parse(readFileSync(resolve(__dirname, 'chapters.json'), 'utf-8'));

if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}

function convertQuotes(text) {
  // Split by fenced code blocks, inline code, and code lines in tables
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]+`)/);
  return parts.map((part, i) => {
    // Odd indices are code — leave untouched
    if (i % 2 === 1) return part;
    // Even indices are text — replace English quotes containing Chinese
    return part.split('\n').map(line => {
      const quote = /^\s*>/.test(line) ? '‘’' : '“”';
      return line.replace(
        /"([^"\n]*[\u{4e00}-\u{9fff}\u{3000}-\u{303f}\u{ff00}-\u{ffef}][^"\n]*)"/gu,
        (_, content) => `${quote[0]}${content}${quote[1]}`
      );
    }).join('\n');
  }).join('');
}

for (const [id, meta] of Object.entries(manifest)) {
  const sourceFile = resolve(ROOT, `content/${id}.md`);

  if (!existsSync(sourceFile)) {
    console.log(`  SKIP ${id}: source file not found`);
    continue;
  }

  let body = readFileSync(sourceFile, 'utf-8');

  // Strip the first H1 heading (layout renders title from frontmatter)
  body = body.replace(/^#\s+.+\n*/, '');

  // Rewrite relative image paths to include base path
  const BASE = '/deepagents-in-action';
  body = body.replace(/!\[([\s\S]*?)\]\(\.\.\/public\/imgs\//g, `![$1](${BASE}/imgs/`);

  // Convert English quotes to Chinese quotes in non-code text
  body = convertQuotes(body);

  const frontmatter = [
    '---',
    `title: "${meta.title.replace(/"/g, '\\"')}"`,
    `chapter: ${meta.chapter}`,
    `section: "${meta.section}"`,
    `order: ${meta.order}`,
    `description: "${meta.description.replace(/"/g, '\\"')}"`,
    ...(meta.slides && meta.slides.length > 0
      ? [`slides:`, ...meta.slides.map(s => {
          let slideYaml = `  - id: "${s.id}"\n    title: "${s.title}"`;
          if (s.bilibili) slideYaml += `\n    bilibili: "${s.bilibili}"`;
          if (s.xhs) slideYaml += `\n    xhs: "${s.xhs}"`;
          return slideYaml;
        })]
      : [`slides: []`]),
    `published: ${meta.published}`,
  ];

  if (meta.pubDate) frontmatter.push(`pubDate: "${meta.pubDate}"`);
  if (meta.bilibili) frontmatter.push(`bilibili: "${meta.bilibili}"`);
  if (meta.xhs) frontmatter.push(`xhs: "${meta.xhs}"`);

  frontmatter.push('---', '');

  const output = frontmatter.join('\n') + body.trimStart();
  const outPath = resolve(OUT_DIR, `${id}.md`);
  writeFileSync(outPath, output, 'utf-8');
  console.log(`  OK   ${id}`);
}

console.log('\nContent prep done.');
