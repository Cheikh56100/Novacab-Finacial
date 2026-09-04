import React,{useMemo} from "react";
import {Activity,ArrowDownRight,ArrowUpRight,Info,ShieldCheck} from "lucide-react";
import {detailedAnalysis,ratios,n,compare} from "../services/financialEngine";
const eur=v=>`${Math.round(n(v)).toLocaleString("fr-FR")} €`;
export default function AnalysisDeepDive({company,year}){
 const a=useMemo(()=>detailedAnalysis(company,year),[company,year]);
 const y=company.years?.[a.year]||{}, prev=company.years?.[a.year-1], r=a.ratios;
 const rows=[
  ["CAF (proxy)", n(y.ebe)+n(y.depr), "Capacité interne de génération de ressources, approchée ici à partir de l'EBE et des dotations disponibles."],
  ["FRNG reconstruit", y.frng, "Reconstruction indicative à partir des capitaux permanents et des actifs d'exploitation disponibles."],
  ["BFR", y.bfr, "Besoin de financement lié au cycle d'exploitation, reconstruit à partir des comptes clients, stocks, fournisseurs et autres postes détectés."],
  ["Trésorerie nette", y.treasury, "Position de trésorerie issue des comptes de banque/caisse détectés."],
  ["Liquidité courante", r.currentRatio, "Capacité apparente à couvrir les dettes courantes avec les disponibilités détectées."]
 ];
 return <section className="panel deepAnalysis"><div className="panelHead"><div><h2>Analyse financière approfondie</h2><p>Exercice {a.year} · interprétation NFI</p></div><span className="pill"><Activity size={12}/> Moteur V1.1</span></div>
 <div className="deepGrid">{rows.map(([label,value,text])=><div className="deepMetric" key={label}><span>{label}</span><b>{label==="Liquidité courante"?`${n(value).toFixed(2)} x`:eur(value)}</b><p>{text}</p></div>)}</div>
 <div className="interpretationBlock"><div className="interpretationTitle"><ShieldCheck size={15}/> Lecture NFI</div>
 <p>{a.interpretation.profitability}</p><p>{a.interpretation.workingCapital}</p><p>{a.interpretation.debt}</p><p>{a.interpretation.cash}</p>
 {prev&&<p>{(()=>{const c=compare(prev,y);return c.caGrowth>=0?<><ArrowUpRight size={13}/> Le chiffre d'affaires progresse de {c.caGrowth.toFixed(1)} % sur un an.</>:<><ArrowDownRight size={13}/> Le chiffre d'affaires recule de {Math.abs(c.caGrowth).toFixed(1)} % sur un an.</>})()}</p>}
 </div>
 <div className="notice"><Info size={14}/> Les indicateurs portant la mention « reconstruit » sont calculés à partir des comptes disponibles dans le FEC. Ils doivent être validés avec les états financiers du dossier avant d'être utilisés comme conclusion définitive.</div>
 </section>
}
