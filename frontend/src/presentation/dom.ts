/** Creates an element with an optional class and plain text content (never parsed as HTML). */
export function createTextElement(tag: string, className: string, text: string): HTMLElement {
  const node = document.createElement(tag);
  if (className !== "") {
    node.className = className;
  }
  node.textContent = text;
  return node;
}
