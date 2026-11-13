"use strict";

const products = [
  { id: "cap", name: "Road Cap", price: 2800, alt: "Navy baseball cap mockup" },
  { id: "black-tee", name: "Second Mile Tee", price: 3200, sizes: true, alt: "Black cotton tee mockup" },
  { id: "bottle", name: "Mile Two Bottle", price: 2400, alt: "Charcoal stainless steel bottle mockup" }
];

const sizes = ["S", "M", "L", "XL", "XXL"];
const variants = new Map();
for (const product of products) {
  for (const size of product.sizes ? sizes : [""]) {
    variants.set(size ? product.id + "-" + size : product.id, {
      ...product,
      title: size ? product.name + " · " + size : product.name
    });
  }
}

const storageKey = "2mp-demo-cart";
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const money = cents => currency.format(cents / 100);
const byId = id => document.getElementById(id);

function loadCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    return new Map(Object.entries(stored ?? {}).filter(([key, quantity]) =>
      variants.has(key) && Number.isInteger(quantity) && quantity > 0 && quantity <= 99
    ));
  } catch {
    return new Map();
  }
}

const cart = loadCart();
const dialog = byId("cart");
const shopStatus = byId("shop-status");
const cartStatus = byId("cart-status");

// Product and variant strings are defined above. Storage contributes only validated quantities.
byId("products").innerHTML = products.map(product => `
  <article class="product">
    <div class="product-photo ${product.id}" role="img" aria-label="${product.alt}"></div>
    <div class="product-info">
      <h3>${product.name}</h3>
      <p>${money(product.price)}</p>
      ${product.sizes ? `
        <label class="size">Size
          <select id="size-${product.id}" aria-label="${product.name} size">
            ${sizes.map(size => `<option${size === "M" ? " selected" : ""}>${size}</option>`).join("")}
          </select>
        </label>` : ""}
      <button class="button" type="button" data-product="${product.id}" aria-label="Add ${product.name} to cart">Add to cart</button>
    </div>
  </article>
`).join("");

function renderCart() {
  let total = 0;
  let count = 0;
  const rows = [];
  for (const [key, quantity] of cart) {
    const variant = variants.get(key);
    const lineTotal = variant.price * quantity;
    total += lineTotal;
    count += quantity;
    rows.push(`
      <div class="cart-line">
        <p><strong>${variant.title}</strong> · ${money(lineTotal)}</p>
        <div class="cart-controls">
          <button type="button" class="button outline" data-key="${key}" data-change="-1" aria-label="Decrease ${variant.title}">−</button>
          <span aria-label="Quantity ${quantity}">${quantity}</span>
          <button type="button" class="button outline" data-key="${key}" data-change="1" aria-label="Increase ${variant.title}" ${quantity === 99 ? "disabled" : ""}>+</button>
          <button type="button" class="button outline" data-key="${key}" data-change="remove" aria-label="Remove ${variant.title}">Remove</button>
        </div>
      </div>`);
  }
  byId("cart-count").textContent = count;
  byId("cart-lines").innerHTML = rows.join("") || "<p>Your cart is empty.</p>";
  byId("subtotal").textContent = money(total);
  byId("cart-summary").hidden = count === 0;
}

function saveCart() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(cart)));
  } catch {
    // The cart still works in memory when browser storage is unavailable.
  }
  renderCart();
}

byId("products").addEventListener("click", event => {
  const button = event.target.closest("button[data-product]");
  if (!button) return;
  const id = button.dataset.product;
  const size = byId("size-" + id)?.value;
  const key = size ? id + "-" + size : id;
  const quantity = cart.get(key) ?? 0;
  const { title } = variants.get(key);
  if (quantity === 99) {
    shopStatus.textContent = "Your cart already has 99 of " + title + ".";
    return;
  }
  cart.set(key, quantity + 1);
  saveCart();
  shopStatus.textContent = title + " added. Cart quantity for this item: " + (quantity + 1) + ".";
});

byId("open-cart").addEventListener("click", () => {
  cartStatus.textContent = "";
  dialog.showModal();
});

byId("cart-lines").addEventListener("click", event => {
  const button = event.target.closest("button[data-key]");
  if (!button) return;
  const { key, change } = button.dataset;
  const quantity = change === "remove" ? 0 : cart.get(key) + Number(change);
  if (quantity > 0) {
    cart.set(key, quantity);
  } else {
    cart.delete(key);
  }
  saveCart();
  const next = dialog.querySelector(`[data-key="${key}"][data-change="${change}"]:not(:disabled)`);
  (next ?? dialog.querySelector(".cart-controls button, .cart-head button")).focus();
  cartStatus.textContent = quantity
    ? variants.get(key).title + " quantity: " + quantity + "."
    : variants.get(key).title + " removed.";
});

byId("checkout").addEventListener("click", () => {
  const total = byId("subtotal").textContent;
  cart.clear();
  saveCart();
  cartStatus.textContent = "Demo checkout complete for " + total + ". No payment was taken.";
  dialog.querySelector(".cart-head button").focus();
});

const givingForm = byId("giving-form");
const customAmount = givingForm.elements.customAmount;

function syncGivingAmount() {
  const custom = givingForm.elements.preset.value === "custom";
  byId("custom-wrap").hidden = !custom;
  customAmount.disabled = !custom;
}

givingForm.addEventListener("change", () => {
  syncGivingAmount();
  byId("giving-status").textContent = "";
});

givingForm.addEventListener("submit", event => {
  event.preventDefault();
  const preset = givingForm.elements.preset.value;
  const amount = Number(preset === "custom" ? customAmount.value : preset);
  const frequency = givingForm.elements.frequency.value;
  byId("giving-status").textContent =
    "Simulated " + frequency + " gift of " + money(Math.round(amount * 100)) + ". No payment was taken.";
});

syncGivingAmount();
renderCart();
