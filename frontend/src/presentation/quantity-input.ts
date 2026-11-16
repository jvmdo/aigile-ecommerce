import { MAX_ITEM_QUANTITY } from "@aigile/shared";
import { ApiError } from "../api/http.ts";
import { errorMessage } from "../domain/error-messages.ts";

/**
 * A number field for a Cart Item quantity (1 to `MAX_ITEM_QUANTITY`). Its form must set
 * `noValidate`: the Domain validates the quantity, so the browser's own bubbles stay off.
 */
export function createQuantityInput(value: number): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "number";
  input.name = "quantity";
  input.min = "1";
  input.max = String(MAX_ITEM_QUANTITY);
  input.step = "1";
  input.value = String(value);
  return input;
}

/** The Portuguese message for a failed API call: by error code, or generic when the API was unreachable. */
export function apiErrorMessage(error: unknown): string {
  return errorMessage(error instanceof ApiError ? error.code : undefined);
}
