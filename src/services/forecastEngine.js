import { ratios, financialScore, scoreLabel } from "./financialEngine";

function latestYear(company) {
  const years = Object.keys(company?.years || {}).map(Number).sort((a, b) => a - b);
  return years.at(-1);
}

function pickYearData(company, year) {
  const years = Object.keys(company?.years || {}).map(Number).sort((a, b) => a - b);
  return company?.years?.[year] || company?.years?.[years.at(-1)] || {};
}

// Traduit les chiffres d'un exercice en quelques phrases lisibles pour le Dashboard.
export function interpretFinancials(company = {}, year) {
  const y = pickYearData(company, year);
  const r = ratios(y);
  const messages = [];

  if (r.margin >= 10) {
    messages.push(
      `La marge d'exploitation est solide à ${r.margin.toFixed(1)} %, ce qui traduit une bonne capacité de l'activité à générer de la rentabilité.`
    );
  } else if (r.margin >= 5) {
    messages.push(
      `La marge d'exploitation ressort à ${r.margin.toFixed(1)} %. Elle reste correcte mais doit être surveillée pour préserver la rentabilité.`
    );
  } else if (r.margin >= 0) {
    messages.push(
      `La marge d'exploitation est faible (${r.margin.toFixed(1)} %). Une amélioration de la productivité et du niveau de marge est recommandée.`
    );
  } else {
    messages.push(
      `La marge d'exploitation est négative (${r.margin.toFixed(1)} %). L'activité ne couvre actuellement pas suffisamment ses charges d'exploitation.`
    );
  }

  if ((y.treasury || 0) >= 0) {
    messages.push(
      `La trésorerie nette est positive (${Math.round(y.treasury || 0).toLocaleString("fr-FR")} €), ce qui constitue un élément favorable pour la stabilité financière.`
    );
  } else {
    messages.push(
      `La trésorerie nette est négative (${Math.round(y.treasury || 0).toLocaleString("fr-FR")} €). La liquidité doit faire l'objet d'une surveillance renforcée.`
    );
  }

  if (Number.isFinite(r.debtEbe)) {
    if (r.debtEbe <= 2) {
      messages.push(
        `L'endettement représente environ ${r.debtEbe.toFixed(1)} année(s) d'EBE, un niveau compatible avec une structure financière maîtrisée.`
      );
    } else if (r.debtEbe <= 4) {
      messages.push(
        `La dette représente environ ${r.debtEbe.toFixed(1)} année(s) d'EBE. Le niveau d'endettement mérite une surveillance particulière.`
      );
    } else {
      messages.push(
        `La dette représente environ ${r.debtEbe.toFixed(1)} année(s) d'EBE. Le levier financier apparaît élevé.`
      );
    }
  }

  if (r.bfrCa > 0) {
    messages.push(
      `Le BFR représente ${r.bfrCa.toFixed(1)} % du CA : une partie des ressources est mobilisée par le cycle d'exploitation.`
    );
  } else if (r.bfrCa < 0) {
    messages.push(
      `Le BFR est négatif (${r.bfrCa.toFixed(1)} % du CA), ce qui constitue un facteur favorable pour la trésorerie d'exploitation.`
    );
  }

  const conclusion =
    r.margin >= 10 && (y.treasury || 0) >= 0 && r.debtEbe <= 2
      ? "La situation financière apparaît globalement saine. L'entreprise dispose de fondamentaux permettant d'envisager son développement tout en conservant une discipline financière."
      : r.margin < 5 || (y.treasury || 0) < 0 || r.debtEbe > 4
      ? "La situation financière présente plusieurs points de vigilance. La priorité doit être donnée à la rentabilité, à la trésorerie et à la maîtrise du besoin en fonds de roulement."
      : "La situation financière est globalement maîtrisée mais plusieurs points doivent être surveillés afin de préserver la rentabilité et la trésorerie.";

  messages.push(conclusion);

  return {
    year: year || latestYear(company),
    metrics: { ...r, ca: y.ca || 0, ebe: y.ebe || 0, treasury: y.treasury || 0, debt: y.debt || 0, bfr: y.bfr || 0 },
    messages,
    conclusion
  };
}

// Construit un scénario prévisionnel recommandé à partir du dernier exercice disponible.
export function recommendedForecast(company = {}) {
  const year = latestYear(company);
  const y = pickYearData(company, year);
  const r = ratios(y);

  const ca = Number(y.ca || 0);
  const ebe = Number(y.ebe || 0);
  const debt = Number(y.debt || 0);
  const treasury = Number(y.treasury || 0);
  const bfr = Number(y.bfr || 0);
  const margin = r.margin;
  const debtEbe = Number.isFinite(r.debtEbe) ? r.debtEbe : 999;

  let profile, reason, assumptions;

  if (margin < 5 || treasury < 0 || debtEbe > 4) {
    profile = "Redressement / trésorerie";
    assumptions = { ca: 0, margin: 1.5, bfr: -15, investments: 0, debtRepayment: Math.max(0, debt * 0.05) };
    reason =
      "La priorité est de restaurer la trésorerie, améliorer la marge et réduire la pression du BFR avant d'accélérer les investissements.";
  } else if (margin >= 10 && debtEbe <= 2 && treasury > 0) {
    profile = "Développement maîtrisé";
    assumptions = { ca: 8, margin: 0.5, bfr: -5, investments: Math.max(0, ebe * 0.25), debtRepayment: Math.max(0, debt * 0.1) };
    reason =
      "La structure financière permet d'envisager une croissance plus ambitieuse tout en conservant une discipline sur le BFR et la dette.";
  } else if (margin >= 10 && treasury >= 0) {
    profile = "Croissance maîtrisée";
    assumptions = { ca: 5, margin: 0.3, bfr: -3, investments: Math.max(0, ebe * 0.15), debtRepayment: Math.max(0, debt * 0.08) };
    reason =
      "L'entreprise présente des fondamentaux satisfaisants. Une croissance progressive semble adaptée tout en conservant une vigilance sur la trésorerie.";
  } else {
    profile = "Consolidation";
    assumptions = { ca: 2, margin: 0.2, bfr: -5, investments: Math.max(0, ebe * 0.1), debtRepayment: Math.max(0, debt * 0.1) };
    reason =
      "La priorité est de consolider les performances actuelles avant d'accélérer la croissance ou les investissements.";
  }

  const score = financialScore(r);
  const label = scoreLabel(score);

  const messages = [
    reason,
    `Hypothèse de croissance du CA : ${assumptions.ca >= 0 ? "+" : ""}${assumptions.ca} %.`,
    `Variation de marge visée : ${assumptions.margin >= 0 ? "+" : ""}${assumptions.margin} point(s).`,
    `Effort de désendettement proposé : ${Math.round(assumptions.debtRepayment).toLocaleString("fr-FR")} €.`
  ];

  return {
    year,
    profile,
    label,
    score,
    reason,
    messages,
    assumptions,
    current: { ca, ebe, debt, treasury, bfr }
  };
}
