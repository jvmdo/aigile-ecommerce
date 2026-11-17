import { CartPage } from "./cart-page.ts";
import { CatalogPage } from "./catalog-page.ts";
import { OrderPage } from "./order-page.ts";

type Route = { title: string; createPage: () => HTMLElement };

const catalogRoute: Route = { title: "Catálogo", createPage: () => new CatalogPage() };

/** Hash routes (ADR 0003: no routing library). An unknown hash shows the catalog. */
const routes: Record<string, Route> = {
  "#/": catalogRoute,
  "#/carrinho": { title: "Carrinho", createPage: () => new CartPage() },
};

/** `#/pedido/:id`: the confirmation of one Order. */
const orderHash = /^#\/pedido\/([^/]+)$/;

function routeFor(hash: string): Route {
  const orderId = orderHash.exec(hash)?.[1];
  if (orderId !== undefined) {
    return {
      title: "Pedido confirmado",
      createPage: () => {
        const page = new OrderPage();
        page.orderId = decodeURIComponent(orderId);
        return page;
      },
    };
  }
  return routes[hash] ?? catalogRoute;
}

/** `<app-router>`: shows the page for the current hash, with its heading, and swaps it on navigation. */
export class AppRouter extends HTMLElement {
  private readonly render = (): void => {
    const route = routeFor(location.hash);
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
