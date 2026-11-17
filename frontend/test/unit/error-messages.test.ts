import { describe, expect, it } from "vitest";
import { errorMessage } from "../../src/domain/error-messages.ts";

describe("errorMessage", () => {
  it("explains each Cart error code in Portuguese", () => {
    expect(errorMessage("INSUFFICIENT_STOCK")).toBe(
      "Não há estoque suficiente para essa quantidade.",
    );
    expect(errorMessage("QUANTITY_LIMIT_EXCEEDED")).toBe(
      "O carrinho aceita no máximo 99 unidades de cada produto.",
    );
    expect(errorMessage("PRODUCT_NOT_FOUND")).toBe("Este produto não está mais disponível.");
    expect(errorMessage("CART_NOT_FOUND")).toBe("Seu carrinho não foi encontrado.");
    expect(errorMessage("COUPON_ALREADY_USED")).toBe("Você já usou este cupom em outro pedido.");
  });

  it("explains a rejected input", () => {
    expect(errorMessage("VALIDATION_ERROR")).toBe("Confira os dados informados.");
  });

  it("falls back to a generic message for an unknown code or no code at all", () => {
    const generic = "Não foi possível concluir a operação. Tente novamente.";
    expect(errorMessage("SOMETHING_NEW")).toBe(generic);
    expect(errorMessage(undefined)).toBe(generic);
  });
});
