# aigile-ecommerce

A simplified e-commerce: a product catalog, a shopping cart, discount coupons and orders. Code uses the English term; the Portuguese term in parentheses is the one used in the course docs.

## Language

### Catalog

**Product** (Produto):
An item offered for sale in the catalog, with a name, description, price and stock.
_Avoid_: Item, SKU, article

**Stock** (Estoque):
The number of units of a Product still available for sale.
_Avoid_: Inventory, quantity on hand

### Cart

**Shopper** (Comprador):
The anonymous person using one browser. A Shopper has no account; they are recognised only for as long as their browser remembers them, and a Shopper who clears it becomes a new Shopper.
_Avoid_: User, customer, client

**Cart** (Carrinho de Compras):
A collection of Cart Items a Shopper is preparing to purchase. A Shopper uses one Cart per purchase.
_Avoid_: Basket, bag

**Subtotal** (Subtotal):
The sum of quantity times unit price over a Cart's or Order's items, before any discount.

**Cart Item** (Item do Carrinho):
One Product in a Cart, with its quantity and unit price. A Cart holds at most one Cart Item per Product; adding the same Product again increases its quantity. The unit price is the Product's price when it was first added, and does not follow later price changes.
_Avoid_: Line, entry

**Cart Status** (Estado do Carrinho):
Where a Cart is in its lifecycle: Empty, With Items, In Checkout, Order Created or Abandoned. Order Created and Abandoned are final.
_Avoid_: Cart state, phase

**Empty** (Vazio):
A Cart with no Cart Items. Every Cart starts here.

**With Items** (Com Itens):
A Cart with at least one Cart Item, open for editing.

**In Checkout** (Em Checkout):
A Cart the Shopper is reviewing before confirming the Order. Its Cart Items are locked; the Shopper must go back to editing to change them.
_Avoid_: Locked, pending

**Order Created** (Pedido Criado):
A Cart that has been converted into an Order. Final.

**Abandoned** (Abandonado):
A Cart with items that the Shopper gave up on, either explicitly or by leaving it unchanged for 24 hours (only looking at it does not count). Final; the Shopper starts a new Cart. An Empty Cart is never Abandoned.
_Avoid_: Expired, cancelled

### Ordering

**Order** (Pedido):
A purchase created from a Cart, carrying its items, Subtotal, Discount, Total and status. It records the Coupon as it was when the Order was created, so later changes to the Coupon do not alter it.
_Avoid_: Purchase, sale, transaction

**Order Item** (Item do Pedido):
One Product in an Order, with its quantity and unit price.
_Avoid_: Order line

**Coupon** (Cupom de Desconto):
A code that grants a percentage or fixed Discount until its expiration date. A Cart carries at most one Coupon, and each Shopper can use a given Coupon in only one Order. Coupons do not stack and have no overall usage limit.
_Avoid_: Voucher, promo code, discount code

**Discount** (Desconto):
The amount a Coupon takes off the Subtotal. A percentage Discount is rounded down to the cent; a fixed Discount never exceeds the Subtotal.
_Avoid_: Rebate, deduction

**Total** (Total):
The Subtotal minus the Discount; never negative.
