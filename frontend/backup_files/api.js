const BASE_URL = "http://localhost:8000";

async function get(path, params = {}) {
  const url = new URL(BASE_URL + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export const api = {
  getSummary: (gene, resultType) => get("/api/summary", { gene, result_type: resultType }),

  getDetail: (gene, resultType, comparison, page = 1, pageSize = 200) =>
    get("/api/detail", {
      gene,
      result_type: resultType,
      comparison,
      page,
      page_size: pageSize,
    }),

  getAggregates: (gene, resultType, comparison) =>
    get("/api/aggregates", { gene, result_type: resultType, comparison }),

  searchGenes: (q) => get("/api/genes", { q }),
};
