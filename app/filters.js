// DealSleuth filtering, sorting and statistics.
//
// Pure functions only — no DOM, no network, no side effects — so the
// ranking the page shows can be checked by running this file alone.

import { deals } from "./deals.js";

// Verdict rank: a "new low" outranks a "strong" discount, and so on. Used
// by the default "Best deals" sort.
export const VERDICT_RANK = { "new-low": 4, strong: 3, good: 2, routine: 1 };

// Discount as a fraction, rounded to three decimals so 40% shows as 40%.
// price and was are dollars; (was - price) / was.
export function discountOf(deal) {
  if (!deal.was || deal.was <= 0 || deal.price >= deal.was) return 0;
  return Math.round(((deal.was - deal.price) / deal.was) * 1000) / 1000;
}

// Whole-dollar amount saved.
export function savingsOf(deal) {
  return Math.max(0, Math.round((deal.was - deal.price) * 100) / 100);
}

// Whole-percent discount shown on tiles, floored so the site never
// overstates a saving: a 24.5% cut shows as 24%, never 25%.
export function discountPct(deal) {
  return Math.floor(discountOf(deal) * 100);
}

// The list of deals is small; matching is a case-insensitive substring
// over product name, store and category.
export function matchesQuery(deal, query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return true;
  return [deal.title, deal.store, deal.category]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

// state = { query, category, store, minDiscount, sort }.
// minDiscount is a fraction (0, 0.2, 0.3, 0.4, 0.5).
export function filterDeals(state) {
  const min = state.minDiscount || 0;
  return deals.filter((deal) => {
    if (state.category && deal.category !== state.category) return false;
    if (state.store && deal.store !== state.store) return false;
    if (discountOf(deal) < min) return false;
    if (!matchesQuery(deal, state.query)) return false;
    return true;
  });
}

// sort keys: "best" (verdict rank, then discount, then savings),
// "discount" (biggest discount first), "price-asc", "price-desc", "name".
export function sortDeals(list, sort) {
  const sorted = [...list];
  const byDiscount = (a, b) => discountOf(b) - discountOf(a);
  switch (sort) {
    case "discount":
      sorted.sort((a, b) => byDiscount(a, b) || b.price - a.price);
      break;
    case "price-asc":
      sorted.sort((a, b) => a.price - b.price || byDiscount(a, b));
      break;
    case "price-desc":
      sorted.sort((a, b) => b.price - a.price || byDiscount(a, b));
      break;
    case "name":
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "best":
    default:
      sorted.sort(
        (a, b) =>
          VERDICT_RANK[b.verdict] - VERDICT_RANK[a.verdict] ||
          byDiscount(a, b) ||
          savingsOf(b) - savingsOf(a),
      );
      break;
  }
  return sorted;
}

// Live summary numbers for the stats bar, computed from the filtered list.
export function statsFor(list) {
  const count = list.length;
  const stores = new Set(list.map((d) => d.store)).size;
  const totalSavings = list.reduce((sum, d) => sum + savingsOf(d), 0);
  const avgDiscount =
    count === 0
      ? 0
      : Math.round(
          (list.reduce((sum, d) => sum + discountOf(d), 0) / count) * 100,
        );
  return { count, stores, totalSavings, avgDiscount };
}

export function storeList() {
  return [...new Set(deals.map((d) => d.store))].sort();
}

export function categoryList() {
  return [...new Set(deals.map((d) => d.category))];
}
