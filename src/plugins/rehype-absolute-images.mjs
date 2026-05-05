import { visit } from 'unist-util-visit';

export default function rehypeAbsoluteImages() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName === 'img' && node.properties?.src) {
        const src = node.properties.src;
        if (src.startsWith('imgs/') || src.startsWith('infographic/')) {
          node.properties.src = '/' + src;
        }
      }
    });
  };
}