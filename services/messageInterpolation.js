const Company = require("../models/masterModels/Company");
const Site = require("../models/masterModels/Site");

// Shared by whatsappFlowEngine.js and sequenceEngine.js. "name" comes
// straight off the Lead record. "company_name"/"site_name" are looked up
// lazily — only when a message's text actually references them — so
// messages that don't use them (the common case) don't pay for an extra
// query. Only resolved here, not stored anywhere, since they're derived
// from live data (the Company row, the lead's assigned Site) rather than
// something the lead said.
async function interpolate(text, variables, lead) {
  if (!text) return "";
  const scope = { name: lead?.leadFirstName || "there", ...variables };

  if (/\{\{\s*company_name\s*\}\}/.test(text)) {
    const company = await Company.findOne().select("companyName").lean();
    scope.company_name = company?.companyName || "";
  }
  if (/\{\{\s*site_name\s*\}\}/.test(text) && lead?.leadSiteId) {
    const site = await Site.findById(lead.leadSiteId).select("sitename").lean();
    scope.site_name = site?.sitename || "";
  }

  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => (scope[key] ?? ""));
}

module.exports = { interpolate };
