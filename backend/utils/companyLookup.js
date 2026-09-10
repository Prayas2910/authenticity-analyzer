const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const CSV_PATHS = [
  path.join(__dirname, "..", "data", "company_urls_deduped.csv"),
  path.join(__dirname, "..", "..", "organisation_dataset.csv"),
];
let COMPANIES = null;

function normalizeName(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .trim()
    .toLowerCase()
    .replace(/[‘’“”"'`·••–—_–,.;:()\[\]{}\/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  try {
    const normalized = new URL(rawUrl.trim());
    normalized.hash = "";
    normalized.search = "";
    let href = normalized.toString().replace(/\/+$/, "");
    return href;
  } catch (e) {
    const trimmed = rawUrl.trim().replace(/\s+/g, "");
    return trimmed.replace(/\/+$/, "");
  }
}

function loadCompanies() {
  if (COMPANIES) return COMPANIES;
  const csvPath = CSV_PATHS.find((candidate) => fs.existsSync(candidate));
  if (!csvPath) {
    throw new Error(`Company CSV not found at any of: ${CSV_PATHS.join(", ")}`);
  }

  const raw = fs.readFileSync(csvPath, "utf-8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true });
  COMPANIES = rows.map((row) => {
    const name = row.company_name || row.companyName || "";
    const url = row.url || "";
    return {
      companyName: name,
      url,
      source: row.origin_source || row.source || "organisation_dataset.csv",
      datasetLabel: row.label_name || null,
      normName: normalizeName(name),
      normUrl: normalizeUrl(url),
    };
  });
  return COMPANIES;
}

function findCompanyByUrl(rawUrl) {
  const url = normalizeUrl(rawUrl);
  if (!url) return null;
  const companies = loadCompanies();
  return companies.find((c) => c.normUrl === url) || null;
}

function searchCompaniesByName(query, limit = 20) {
  const normalized = normalizeName(query);
  if (!normalized) return [];
  const tokens = normalized.split(" ").filter(Boolean);
  const companies = loadCompanies();

  const exact = companies.filter((company) => company.normName === normalized);
  if (exact.length > 0) {
    return exact.slice(0, limit);
  }

  const contains = companies.filter((company) => company.normName.includes(normalized));
  if (contains.length > 0) {
    return contains.slice(0, limit);
  }

  const tokenMatches = companies
    .map((company) => {
      const score = tokens.reduce((sum, token) => {
        return sum + (company.normName.includes(token) ? 1 : 0);
      }, 0);
      return { company, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.company)
    .slice(0, limit);

  return tokenMatches;
}

function findCompaniesForWorkplace(workplace, limit = 5) {
  if (!workplace || typeof workplace !== "string") return [];
  const regex = /\bat\s+(.+)$/i;
  const match = workplace.match(regex);
  const query = match ? match[1] : workplace;
  return searchCompaniesByName(query, limit);
}

module.exports = {
  loadCompanies,
  findCompanyByUrl,
  searchCompaniesByName,
  findCompaniesForWorkplace,
};
