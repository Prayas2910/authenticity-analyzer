const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const CSV_PATHS = [
  // Prioritise organisation_dataset.csv as it contains both legitimate and fraud companies
  path.join(__dirname, "..", "data", "organisation_dataset.csv"),
];

// Clear cache on load
delete require.cache[require.resolve("./companyLookup")];

let COMPANIES = null;

function normalizeName(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .trim()
    .toLowerCase()
    .replace(/[''""'`·••–—_–,.;:()[\]{}/\\]/g, " ")
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
      category: row.category || "",
      impersonationTarget: row.impersonation_target || "",
      modusOperandi: row.modus_operandi || "",
      redFlags: row.red_flags || "",
      outreachVector: row.outreach_vector || "",
      riskSeverity: row.risk_severity || "",
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

function findCompanyByName(name) {
  const normalizedName = normalizeName(name);
  if (!normalizedName) return null;
  return loadCompanies().find((company) => company.normName === normalizedName) || null;
}

function searchCompaniesByName(query, limit = 20) {
  const normalized = normalizeName(query);
  if (!normalized) return [];
  const tokens = normalized.split(" ").filter(Boolean);
  const companies = loadCompanies();

  // Normalize the query for comparison
  const queryNorm = normalized;

  // Direct exact match on normalized name
  const exact = companies.filter((company) => company.normName === queryNorm);
  if (exact.length > 0) {
    return exact.slice(0, limit);
  }

  // Check if query is contained in company name
  const contains = companies.filter((company) => company.normName.includes(queryNorm));
  if (contains.length > 0) {
    return contains.slice(0, limit);
  }

  // Token-based matching
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
  findCompanyByName,
  searchCompaniesByName,
  findCompaniesForWorkplace,
};