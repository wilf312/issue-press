import { CSS, render } from "@deno/gfm";

export const GFM_CSS = CSS;

export function renderMarkdown(markdown: string): string {
  return render(markdown);
}
