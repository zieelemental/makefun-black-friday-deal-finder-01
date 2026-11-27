// DealSleuth rendering — turns deal data into DOM.
//
// No network and no images: product tiles are CSS gradients chosen by
// category, with a big discount badge, so the page renders identically
// offline. All money is formatted with Intl.NumberFormat.

import { deals, CATEGORIES, VERDICTS, CHECKED_LABEL } from "./deals.js";
import { discountOf, discountPct, savingsOf } from "./filters.js";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function categoryColor(category) {
  const found = CATEGORIES.find((c) => c.name === category);
  return found ? found.color : "#475569";
}

// A deterministic two-letter mark for a deal tile, from the title's words.
function tileMark(title) {
  const words = title.replace(/[^A-Za-z0-9 ]/g, "").split(" ").filter(Boolean);
  const first = words[0] ? words[0][0] : "?";
  const second = words[1] ? words[1][0] : words[0] ? words[0][1] || "" : "";
  return (first + second).toUpperCase();
}

export function verdictBadge(verdict) {
  const info = VERDICTS[verdict] || VERDICTS.routine;
  const span = el("span", "badge badge-" + verdict, info.label);
  span.title = info.hint;
  return span;
}

// One deal card. The whole card links to the detail view; the store link
// is a separate link so a click on it goes to the store.
export function dealCard(deal) {
  const card = el("article", "card");

  const tile = el("div", "tile");
  const color = categoryColor(deal.category);
  tile.style.background = "linear-gradient(135deg, " + color + ", #14161c)";
  const pct = el("span", "tile-pct", "−" + discountPct(deal) + "%");
  const mark = el("span", "tile-mark", tileMark(deal.title));
  tile.append(pct, mark);
  card.appendChild(tile);

  const body = el("div", "card-body");
  const cat = el("p", "card-cat", deal.category + " · " + deal.store);
  const title = el("h3", "card-title");
  const link = el("a", "card-link", deal.title);
  link.href = "#/deal/" + deal.id;
  title.appendChild(link);
  body.append(cat, title);

  const prices = el("p", "card-prices");
  const now = el("strong", "price-now", money.format(deal.price));
  const was = el("s", "price-was", money.format(deal.was));
  const save = el("span", "price-save", "Save " + money.format(savingsOf(deal)));
  prices.append(now, was, save);
  body.appendChild(prices);

  const meta = el("p", "card-meta");
  meta.append(verdictBadge(deal.verdict));
  const checked = el("span", "checked", "Checked " + CHECKED_LABEL);
  meta.appendChild(checked);
  body.appendChild(meta);

  const storeLink = el("a", "store-link", "See it at " + deal.store + " ↗");
  storeLink.href = deal.url;
  storeLink.target = "_blank";
  storeLink.rel = "noopener";
  body.appendChild(storeLink);

  card.appendChild(body);
  return card;
}

export function renderStats(bar, stats) {
  bar.innerHTML = "";
  const items = [
    [String(stats.count), stats.count === 1 ? "deal" : "deals"],
    [String(stats.stores), stats.stores === 1 ? "store" : "stores"],
    [stats.avgDiscount + "%", "avg. discount"],
    [money.format(stats.totalSavings), "total savings"],
  ];
  for (const [value, label] of items) {
    const cell = el("div", "stat");
    cell.append(el("strong", "stat-value", value), el("span", "stat-label", label));
    bar.appendChild(cell);
  }
}

export function renderCategoryChips(container, counts, active, onPick) {
  container.innerHTML = "";
  const all = el("button", "chip" + (active === "" ? " chip-active" : ""), "All · " + counts.total);
  all.type = "button";
  all.addEventListener("click", () => onPick(""));
  container.appendChild(all);
  for (const cat of CATEGORIES) {
    const n = counts[cat.name] || 0;
    if (n === 0) continue;
    const chip = el(
      "button",
      "chip" + (active === cat.name ? " chip-active" : ""),
      cat.name + " · " + n,
    );
    chip.type = "button";
    chip.addEventListener("click", () => onPick(cat.name));
    container.appendChild(chip);
  }
}

// Detail view for one deal, including the cross-store comparison when
// other deals share its group (same product at another store).
export function renderDetail(container, deal) {
  container.innerHTML = "";
  const wrap = el("section", "detail");

  const back = el("a", "back-link", "← All deals");
  back.href = "#/";
  wrap.appendChild(back);

  const head = el("div", "detail-head");
  const tile = el("div", "tile tile-large");
  const color = categoryColor(deal.category);
  tile.style.background = "linear-gradient(135deg, " + color + ", #14161c)";
  tile.append(
    el("span", "tile-pct", "−" + discountPct(deal) + "%"),
    el("span", "tile-mark", tileMark(deal.title)),
  );
  head.appendChild(tile);

  const info = el("div", "detail-info");
  info.append(el("p", "card-cat", deal.category + " · " + deal.store));
  info.append(el("h2", "detail-title", deal.title));
  const prices = el("p", "card-prices detail-prices");
  prices.append(
    el("strong", "price-now", money.format(deal.price)),
    el("s", "price-was", money.format(deal.was)),
    el("span", "price-save", "Save " + money.format(savingsOf(deal)) + " (" + discountPct(deal) + "% off)"),
  );
  info.appendChild(prices);
  const meta = el("p", "card-meta");
  meta.append(verdictBadge(deal.verdict));
  meta.appendChild(el("span", "checked", "Checked " + CHECKED_LABEL));
  info.appendChild(meta);
  info.appendChild(el("p", "detail-blurb", deal.blurb));
  const storeLink = el("a", "store-link store-link-big", "See it at " + deal.store + " ↗");
  storeLink.href = deal.url;
  storeLink.target = "_blank";
  storeLink.rel = "noopener";
  info.appendChild(storeLink);
  head.appendChild(info);
  wrap.appendChild(head);

  const proof = el("div", "proof");
  proof.appendChild(el("h3", null, "Why this is a deal"));
  proof.appendChild(el("p", null, deal.evidence));
  proof.appendChild(
    el("p", "proof-source", "Source: " + deal.source + " · Price checked " + CHECKED_LABEL + ". Prices change — confirm at the store before buying."),
  );
  wrap.appendChild(proof);

  const others = deals.filter(
    (d) => deal.group && d.group === deal.group && d.id !== deal.id,
  );
  if (others.length > 0) {
    const compare = el("div", "compare");
    compare.appendChild(el("h3", null, "Same product at another store"));
    const table = el("table", "compare-table");
    const headRow = el("tr");
    for (const h of ["Store", "Price", "Was", "Discount"]) {
      headRow.appendChild(el("th", null, h));
    }
    table.appendChild(headRow);
    const all = [deal, ...others].sort((a, b) => a.price - b.price);
    for (const d of all) {
      const row = el("tr", d.id === deal.id ? "compare-current" : "");
      row.appendChild(el("td", null, d.store + (d.id === deal.id ? " (this deal)" : "")));
      row.appendChild(el("td", null, money.format(d.price)));
      row.appendChild(el("td", null, money.format(d.was)));
      row.appendChild(el("td", null, "−" + discountPct(d) + "%"));
      table.appendChild(row);
    }
    compare.appendChild(table);
    wrap.appendChild(compare);
  }

  container.appendChild(wrap);
}

export function renderEmpty(container, query) {
  container.innerHTML = "";
  const box = el("div", "empty");
  box.appendChild(el("p", "empty-title", "No deals match that search."));
  box.appendChild(
    el(
      "p",
      null,
      query
        ? "Try a different word, or clear a filter to see all 49 deals."
        : "Clear a filter to see all 49 deals.",
    ),
  );
  const clear = el("button", "chip", "Show all deals");
  clear.type = "button";
  clear.addEventListener("click", () => {
    window.location.hash = "#/";
  });
  box.appendChild(clear);
  container.appendChild(box);
}
