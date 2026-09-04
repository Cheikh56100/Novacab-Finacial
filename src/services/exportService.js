import * as XLSX from "xlsx";
import { ratios, financialScore, scoreLabel, n, diagnostics } from "./financialEngine";

const eur = value => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n(value))} €`;
const pct = value => `${n(value).toFixed(1)} %`;
const latestYear = company => Object.keys(company?.years || {}).map(Number).sort((a,b)=>a-b).at(-1);

export function exportCompanyExcel(company) {
  if (!company) return;
  const rows = Object.keys(company.years || {}).map(Number).sort((a,b)=>a-b).map(year => {
    const y = company.years[year] || {};
    const r = ratios(y);
    return {
      Exercice: year,
      "Chiffre d'affaires (€)": n(y.ca),
      "EBE (€)": n(y.ebe),
      "Résultat net (€)": n(y.net),
      "Trésorerie (€)": n(y.treasury),
      "Dette financière (€)": n(y.debt),
      "BFR (€)": n(y.bfr),
      "Capitaux propres (€)": n(y.equity),
      "Marge EBE (%)": Number(r.margin.toFixed(2)),
      "Marge nette (%)": Number(r.netMargin.toFixed(2)),
      "Dette / EBE": Number(r.debtEbe.toFixed(2)),
      "BFR / CA (%)": Number(r.bfrCa.toFixed(2)),
      "ROE (%)": Number(r.roe.toFixed(2)),
      "Score NFI": financialScore(r)
    };
  });
  const wb = XLSX.utils.book_new();
  const info = [
    ["NFI — NOVACAB Financial Intelligence"],
    ["Société", company.name],
    ["SIREN", company.siren || ""],
    ["NAF", company.naf || ""],
    ["Secteur", company.sector || ""],
    ["Source", company.source || ""],
    ["Exporté le", new Date().toLocaleString("fr-FR")],
    []
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(info), "Fiche");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Analyse annuelle");
  const y = company.years[latestYear(company)] || {};
  const r = ratios(y);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
    { Indicateur: "CA", Valeur: n(y.ca), Unite: "€" },
    { Indicateur: "EBE", Valeur: n(y.ebe), Unite: "€" },
    { Indicateur: "Marge EBE", Valeur: r.margin, Unite: "%" },
    { Indicateur: "Marge nette", Valeur: r.netMargin, Unite: "%" },
    { Indicateur: "Dette / EBE", Valeur: r.debtEbe, Unite: "x" },
    { Indicateur: "BFR / CA", Valeur: r.bfrCa, Unite: "%" },
    { Indicateur: "ROE", Valeur: r.roe, Unite: "%" },
    { Indicateur: "Score NFI", Valeur: financialScore(r), Unite: "/100" },
    { Indicateur: "Situation", Valeur: scoreLabel(financialScore(r)), Unite: "" }
  ]), "Synthèse NFI");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(diagnostics(company, latestYear(company)).map(x => ({ Niveau: x.level, Signal: x.title, Analyse: x.text }))), "Diagnostic");
  const filename = `NFI_${safe(company.name)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportPortfolioExcel(companies = []) {
  const rows = companies.map(company => {
    const year = latestYear(company);
    const y = company.years?.[year] || {};
    const r = ratios(y);
    const score = financialScore(r);
    return {
      Société: company.name,
      Secteur: company.sector || "À classer",
      NAF: company.naf || "",
      Exercice: year || "",
      "CA (€)": n(y.ca),
      "EBE (€)": n(y.ebe),
      "Marge EBE (%)": Number(r.margin.toFixed(2)),
      "Trésorerie (€)": n(y.treasury),
      "Dette / EBE": Number(r.debtEbe.toFixed(2)),
      "BFR / CA (%)": Number(r.bfrCa.toFixed(2)),
      "ROE (%)": Number(r.roe.toFixed(2)),
      "Score NFI": score,
      Situation: scoreLabel(score),
      Confidentialité: company.confidential ? "Confidentiel" : "Standard"
    };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Portefeuille");
  const totals = rows.reduce((a, r) => {
    a.ca += n(r["CA (€)"]); a.ebe += n(r["EBE (€)"]); a.treasury += n(r["Trésorerie (€)"]); a.count += 1; return a;
  }, {ca:0, ebe:0, treasury:0, count:0});
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["NFI — Export portefeuille"],
    ["Date", new Date().toLocaleString("fr-FR")],
    ["Dossiers exportés", totals.count],
    ["CA portefeuille (€)", totals.ca],
    ["EBE portefeuille (€)", totals.ebe],
    ["Trésorerie portefeuille (€)", totals.treasury]
  ]), "Synthèse");
  XLSX.writeFile(wb, `NFI_Portefeuille_${new Date().toISOString().slice(0,10)}.xlsx`);
}

export function printCompanyPdf(company) {
  if (!company) return;
  const years = Object.keys(company.years || {}).map(Number).sort((a,b)=>a-b);
  const rows = years.map(year => {
    const y = company.years[year] || {}; const r = ratios(y); const score = financialScore(r);
    return `<tr><td>${year}</td><td>${eur(y.ca)}</td><td>${eur(y.ebe)}</td><td>${pct(r.margin)}</td><td>${eur(y.treasury)}</td><td>${r.debtEbe.toFixed(1)}x</td><td>${score}/100</td></tr>`;
  }).join("");
  const latest = company.years[years.at(-1)] || {}; const r = ratios(latest); const score = financialScore(r);
  openPrintWindow(`Analyse NFI — ${escapeHtml(company.name)}`, `
    <div class="brand">NFI <span>NOVACAB Financial Intelligence</span></div>
    <h1>${escapeHtml(company.name)}</h1>
    <p class="muted">${escapeHtml(company.sector || "Secteur non renseigné")} · NAF ${escapeHtml(company.naf || "—")}</p>
    <div class="hero"><div><small>SCORE NFI</small><strong>${score}<em>/100</em></strong><p>${scoreLabel(score)}</p></div><div><small>EXERCICE</small><strong>${years.at(-1) || "—"}</strong></div></div>
    <div class="grid">${card("Chiffre d'affaires", eur(latest.ca))}${card("EBE", eur(latest.ebe))}${card("Trésorerie", eur(latest.treasury))}${card("Dette / EBE", `${r.debtEbe.toFixed(1)} x`)}</div>
    <h2>Évolution financière</h2><table><thead><tr><th>Exercice</th><th>CA</th><th>EBE</th><th>Marge EBE</th><th>Trésorerie</th><th>Dette / EBE</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table>
    <h2>Diagnostic</h2><div class="diagnostic"><p><b>Rentabilité :</b> marge EBE ${pct(r.margin)}.</p><p><b>BFR / CA :</b> ${pct(r.bfrCa)}.</p><p><b>ROE :</b> ${pct(r.roe)}.</p><p><b>Lecture NFI :</b> ${r.margin >= 10 ? "La rentabilité opérationnelle constitue un point fort." : "La rentabilité mérite une analyse approfondie."} ${r.debtEbe < 2 ? "L'endettement reste maîtrisé." : "Le niveau de dette nécessite une surveillance particulière."}</p></div>
  `);
}

export function printPortfolioPdf(companies = [], title = "Portefeuille NFI") {
  const rows = companies.map(company => {
    const year = latestYear(company); const y = company.years?.[year] || {}; const r = ratios(y); const score = financialScore(r);
    return `<tr><td>${escapeHtml(company.name)}</td><td>${escapeHtml(company.sector || "À classer")}</td><td>${eur(y.ca)}</td><td>${pct(r.margin)}</td><td>${eur(y.treasury)}</td><td>${score}/100</td></tr>`;
  }).join("");
  const total = companies.reduce((sum,c)=>sum+n(c.years?.[latestYear(c)]?.ca),0);
  openPrintWindow(title, `
    <div class="brand">NFI <span>NOVACAB Financial Intelligence</span></div><h1>${escapeHtml(title)}</h1>
    <p class="muted">Export du ${new Date().toLocaleString("fr-FR")} · ${companies.length} dossier(s) accessibles</p>
    <div class="hero"><div><small>DOSSIERS</small><strong>${companies.length}</strong></div><div><small>CA PORTEFEUILLE</small><strong>${eur(total)}</strong></div></div>
    <h2>Portefeuille</h2><table><thead><tr><th>Société</th><th>Secteur</th><th>CA</th><th>Marge EBE</th><th>Trésorerie</th><th>Score NFI</th></tr></thead><tbody>${rows}</tbody></table>
  `);
}

function card(label,value){return `<div class="card"><small>${label}</small><strong>${value}</strong></div>`;}
function safe(name){return String(name || "societe").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9_-]+/g,"_").slice(0,70);}
function escapeHtml(value){return String(value ?? "").replace(/[&<>\"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function openPrintWindow(title, body){
  const win = window.open("", "_blank", "width=1100,height=800");
  if(!win){alert("Autorisez les fenêtres contextuelles pour générer le PDF.");return;}
  win.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title><style>
    @page{size:A4;margin:16mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#1e3046;margin:0;font-size:11px}.brand{font-size:22px;font-weight:900;color:#1979b7;margin-bottom:26px}.brand span{font-size:10px;color:#8291a3;font-weight:600;margin-left:7px}h1{font-size:27px;margin:0 0 5px}h2{font-size:15px;margin:28px 0 12px}.muted{color:#7c8b9c}.hero{display:flex;gap:12px;margin:22px 0}.hero>div{flex:1;background:#f5f9fc;border:1px solid #e1ebf3;border-radius:12px;padding:15px}.hero small,.card small{display:block;color:#8090a2;text-transform:uppercase;letter-spacing:.7px;font-size:8px;font-weight:700}.hero strong{display:block;font-size:25px;margin-top:6px}.hero em{font-size:11px;color:#8a98a8;font-style:normal}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.card{border:1px solid #e5ebf1;border-radius:10px;padding:13px}.card strong{display:block;font-size:16px;margin-top:8px}table{width:100%;border-collapse:collapse}th,td{padding:9px 7px;border-bottom:1px solid #e8edf2;text-align:left}th{font-size:8px;color:#78899b;text-transform:uppercase}td{font-size:10px}.diagnostic{background:#f7fafc;border-radius:10px;padding:13px}.diagnostic p{margin:7px 0}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
  </style></head><body>${body}<script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body></html>`);
  win.document.close();
}
