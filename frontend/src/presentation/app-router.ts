import { CartPage } from "./cart-page.ts";
import { CatalogPage } from "./catalog-page.ts";

type Route = { title: string; createPage: () => HTMLElement };

const catalogRoute: Route = { title: "Catálogo", createPage: () => new CatalogPage() };

/** Hash routes (ADR 0003: no routing library). An unknown hash shows the catalog. */
const routes: Record<string, Route> = {
  "#/": catalogRoute,
  "#/carrinho": { title: "Carrinho", createPage: () => new CartPage() },
};

/** `<app-router>`: shows the page for the current hash, with its heading, and swaps it on navigation. */
export class AppRouter extends HTMLElement {
  private readonly render = (): void => {
    const route = routes[location.hash] ?? catalogRoute;
    const heading = document.createElement("h1");
    heading.textContent = route.title;
    document.title = `${route.title} | aigile-ecommerce`;
    this.replaceChildren(heading, route.createPage());
  };

  connectedCallback(): void {
    window.addEventListener("hashchange", this.render);
    this.render();
  }

  disconnectedCallback(): void {
    window.removeEventListener("hashchange", this.render);
  }
}

customElements.define("app-router", AppRouter);
