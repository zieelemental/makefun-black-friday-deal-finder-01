// DealSleuth app — state, hash routing and wiring.
//
// State lives in the URL hash so a filtered view or a deal detail can be
// linked and screenshotted directly:
//   #/                              — all deals, best-deals sort
//   #/?cat=Audio&min=0.4&sort=discount&q=sony
//   #/deal/airpods-pro-3-amazon

import { deals, CHECKED_LABEL } from "./deals.js";
import {
  filterDeals,
  sortDeals,
  statsFor,
  storeList,
} from "./filters.js";
import {
  dealCard,
  renderStats,
  renderCategoryChips,
  renderDetail,
  renderEmpty,
} from "./render.js";

const DEFAULT_STATE = {
  query: "",
  category: "",
  store: "",
  minDiscount: 0,
  sort: "best",
};

const MIN_OPTIONS = [
  { value: 0, label: "Any discount" },
  { value: 0.2, label: "20% off or more" },
  { value: 0.3, label: "30% off or more" },
  { value: 0.4, label: "40% off or more" },
  { value: 0.5, label: "50% off or more" },
];

const SORT_OPTIONS = [
  { value: "best", label: "Best deals first" },
  { value: "discount", label: "Biggest discount" },
  { value: "price-asc", label: "Lowest price" },
  { value: "price-desc", label: "Highest price" },
  { value: "name", label: "Name A–Z" },
];

function parseHash() {
  const raw = window.location.hash.replace(/^#/, "");
  const [path, queryString] = raw.split("?");
  const params = new URLSearchParams(queryString || "");
  const state = { ...DEFAULT_STATE };
  if (params.get("cat")) state.category = params.get("cat");
  if (params.get("store")) state.store = params.get("store");
  const min = Number(params.get("min"));
  if ([0, 0.2, 0.3, 0.4, 0.5].includes(min)) state.minDiscount = min;
  if (SORT_OPTIONS.some((o) => o.value === params.get("sort"))) {
    state.sort = params.get("sort");
  }
  if (params.get("q")) state.query = params.get("q");
  const detailId = path.startsWith("/deal/") ? path.slice(6) : null;
  return { state, detailId };
}

function stateToHash(state) {
  const params = new URLSearchParams();
  if (state.category) params.set("cat", state.category);
  if (state.store) params.set("store", state.store);
  if (state.minDiscount) params.set("min", String(state.minDiscount));
  if (state.sort !== "best") params.set("sort", state.sort);
  if (state.query) params.set("q", state.query);
  const q = params.toString();
  return "#/" + (q ? "?" + q : "");
}

function fillSelect(select, options, value) {
  select.innerHTML = "";
  for (const opt of options) {
    const option = document.createElement("option");
    option.value = String(opt.value);
    option.textContent = opt.label;
    if (String(opt.value) === String(value)) option.selected = true;
    select.appendChild(option);
  }
}

function render(state) {
  const { detailId } = parseHash();
  const listView = document.getElementById("list-view");
  const detailView = document.getElementById("detail-view");
  const grid = document.getElementById("grid");
  const resultCount = document.getElementById("result-count");

  // The detail page is about one deal: hide the list's intro, stats and
  // controls so the deal, its proof and its store comparison fit on screen.
  const listChrome = ["intro", "stats", "controls"].map((id) =>
    document.getElementById(id),
  );
  for (const section of listChrome) section.hidden = Boolean(detailId);

  if (detailId) {
    const deal = deals.find((d) => d.id === detailId);
    listView.hidden = true;
    detailView.hidden = false;
    if (deal) {
      renderDetail(detailView, deal);
    } else {
      detailView.innerHTML = "";
      const box = document.createElement("div");
      box.className = "empty";
      const title = document.createElement("p");
      title.className = "empty-title";
      title.textContent = "That deal was not found.";
      box.appendChild(title);
      const back = document.createElement("a");
      back.className = "chip";
      back.href = "#/";
      back.textContent = "Back to all deals";
      box.appendChild(back);
      detailView.appendChild(box);
    }
    return;
  }

  listView.hidden = false;
  detailView.hidden = true;

  const filtered = filterDeals(state);
  const sorted = sortDeals(filtered, state.sort);
  renderStats(document.getElementById("stats"), statsFor(filtered));

  // Category chips always show the full catalogue's counts, so the whole
  // category set stays visible even while a filter is active.
  const counts = { total: deals.length };
  for (const d of deals) counts[d.category] = (counts[d.category] || 0) + 1;
  renderCategoryChips(
    document.getElementById("chips"),
    counts,
    state.category,
    (cat) => {
      state.category = cat;
      window.location.hash = stateToHash(state);
    },
  );

  resultCount.textContent =
    sorted.length === deals.length
      ? sorted.length + " deals"
      : sorted.length + " of " + deals.length + " deals";

  grid.innerHTML = "";
  if (sorted.length === 0) {
    renderEmpty(grid, state.query);
  } else {
    for (const deal of sorted) grid.appendChild(dealCard(deal));
  }
}

function init() {
  document.getElementById("checked-label").textContent =
    "Prices checked " + CHECKED_LABEL;

  const { state } = parseHash();
  const search = document.getElementById("search");
  const storeSelect = document.getElementById("store");
  const minSelect = document.getElementById("min");
  const sortSelect = document.getElementById("sort");

  search.value = state.query;
  fillSelect(storeSelect, [{ value: "", label: "All stores" }, ...storeList().map((s) => ({ value: s, label: s }))], state.store);
  fillSelect(minSelect, MIN_OPTIONS, state.minDiscount);
  fillSelect(sortSelect, SORT_OPTIONS, state.sort);

  let debounce = 0;
  search.addEventListener("input", () => {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(() => {
      state.query = search.value;
      window.location.hash = stateToHash(state);
    }, 150);
  });
  storeSelect.addEventListener("change", () => {
    state.store = storeSelect.value;
    window.location.hash = stateToHash(state);
  });
  minSelect.addEventListener("change", () => {
    state.minDiscount = Number(minSelect.value);
    window.location.hash = stateToHash(state);
  });
  sortSelect.addEventListener("change", () => {
    state.sort = sortSelect.value;
    window.location.hash = stateToHash(state);
  });

  window.addEventListener("hashchange", () => {
    const parsed = parseHash();
    Object.assign(state, parsed.state);
    search.value = state.query;
    storeSelect.value = state.store;
    minSelect.value = String(state.minDiscount);
    sortSelect.value = state.sort;
    render(state);
  });

  render(state);
}

document.addEventListener("DOMContentLoaded", init);
