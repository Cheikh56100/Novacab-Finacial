// Référentiel marché public — Banque de France / FIBEN, année 2024.
// Les valeurs ne sont utilisées que lorsqu'elles sont méthodologiquement comparables.
const DATA = {
  construction: { label:"Construction de bâtiments (NAF 41)", sourceYear:2024, ca:{q1:2106000,q2:3484000,q3:8082000}, valueAdded:{q1:545000,q2:943000,q3:2015000}, roe:{q1:6.1,q2:18.5,q3:37.0}, marginVa:{q1:8.9,q2:20.3,q3:36.4}, bfrDays:{q1:-19.6,q2:7.2,q3:38.5}, grossDebtEquity:{q1:6.4,q2:25.2,q3:66.4} },
  restauration: { label:"Restauration (NAF 56)", sourceYear:2024, ca:{q1:1672000,q2:2327000,q3:3637000}, valueAdded:{q1:786000,q2:1080000,q3:1635000}, roe:{q1:9.8,q2:26.1,q3:54.7}, marginVa:{q1:7.6,q2:16.5,q3:26.3}, bfrDays:{q1:-41.0,q2:-28.4,q3:-18.8}, grossDebtEquity:{q1:20.5,q2:57.2,q3:161.3} },
  commerce: { label:"Commerce de détail (NAF 47)", sourceYear:2024, ca:{q1:1870000,q2:2749000,q3:5008000}, valueAdded:{q1:397000,q2:600000,q3:1018000}, roe:{q1:4.8,q2:12.2,q3:24.3}, marginVa:{q1:12.0,q2:24.0,q3:35.6}, bfrDays:{q1:-11.0,q2:0.9,q3:19.2}, grossDebtEquity:{q1:13.8,q2:45.4,q3:116.1} },
  conseil: { label:"Sièges sociaux / conseil de gestion (NAF 70)", sourceYear:2024, ca:{q1:1969000,q2:3297000,q3:7265000}, valueAdded:{q1:943000,q2:1716000,q3:3677000}, roe:{q1:5.9,q2:21.8,q3:45.1}, marginVa:{q1:3.2,q2:13.9,q3:33.1}, bfrDays:{q1:-22.5,q2:7.1,q3:42.6}, grossDebtEquity:{q1:0.9,q2:18.0,q3:72.1} }
};
function keyFor(sector="") { const s=String(sector).toLowerCase(); if(s.includes("construction")||s.includes("bâtiment"))return "construction"; if(s.includes("restauration")||s.includes("hébergement"))return "restauration"; if(s.includes("commerce"))return "commerce"; if(s.includes("conseil")||s.includes("juridique")||s.includes("comptable")||s.includes("siège"))return "conseil"; return null; }
export function marketBenchmark(sector="") { const key=keyFor(sector); return key?{key,...DATA[key]}:null; }
export function marketMetric(market,key){ if(!market)return null; return market[key]||null; }
export const MARKET_SOURCE="Banque de France — Fascicules d'indicateurs sectoriels, base FIBEN, données 2024";
