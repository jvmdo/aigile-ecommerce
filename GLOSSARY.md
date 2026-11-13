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

**Cart** (Carrinho de Compras):
A collection of Cart Items a shopper is preparing to purchase.
_Avoid_: Basket, bag

**Cart Item** (Item do Carrinho):
One Product in a Cart, with its quantity and unit price.
_Avoid_: Line, entry

### Ordering

**Order** (Pedido):
A purchase created from a Cart, carrying its items, total, applied discount and status.
_Avoid_: Purchase, sale, transaction

**Order Item** (Item do Pedido):
One Product in an Order, with its quantity and unit price.
_Avoid_: Order line

**Coupon** (Cupom de Desconto):
A code that grants a percentage or fixed discount until its expiration date.
_Avoid_: Voucher, promo code, discount code
