# Frontend without a UI framework: Vite, TypeScript and native Web Components

The course architecture forbids UI frameworks (React, Vue, etc.) so the Presentation, Domain and API layers stay visible. We still use Vite and TypeScript for tooling, and build the Presentation layer with native custom elements rather than Lit, which could be read as a UI library. The production image builds static files with Vite and serves them from nginx, which also proxies `/api` to the backend.

## Considered Options

- **Lit**: less boilerplate, but arguably a UI library.
- **Alpine.js**: puts logic in HTML attributes, blurring Presentation and Domain.
- **htmx** and server-side templates: both expect the server to return HTML, but the architecture requires a JSON API and a separate frontend container.
