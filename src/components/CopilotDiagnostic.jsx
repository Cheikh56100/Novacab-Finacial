import React,{useMemo} from "react";
import {ArrowRight,ShieldCheck,AlertTriangle,Info} from "lucide-react";
import {diagnostics,detailedAnalysis,fecCausalInsights,portfolioBenchmark,ratios,n,dataReliability,copilotTopInsights,gapToTarget} from "../services/financialEngine";
const eur=v=>Number.isFinite(Number(v))?`${Math.round(Number(v)).toLocaleString("fr-FR")} €`:"—";
const pct=v=>Number.isFinite(Number(v))?`${Number(v).toFixed(1)} %`:"—";
export default function CopilotDiagnostic({company,year,setPage,allCompanies=[]}){
 const a=useMemo(()=>detailedAnalysis(company,year),[company,year]);
 const reliability=useMemo(()=>dataReliability(company,a.year),[company,a.year]);
 const benchmark=useMemo(()=>portfolioBenchmark(allCompanies,company?.sector||""),[allCompanies,company?.sector]);
 const copilot=useMemo(()=>copilotTopInsights(company,a.year,benchmark),[company,a.year,benchmark]);
 const fec=useMemo(()=>fecCausalInsights(company,a.year),[company,a.year]);
 const y=company?.years?.[a.year]||{}, r=a.ratios;
 const gap=useMemo(()=>gapToTarget(company,benchmark,a.year),[company,benchmark,a.year]);
 const eur=v=>Number.isFinite(Number(v))?`${Math.round(Number(v)).toLocaleString("fr-FR")} €`:"—";
 const pct=v=>Number.isFinite(Number(v))?`${Number(v).toFixed(1)} %`:"—";
 return <section className="copilotBlock">
  <div className="panel copilotHero"><div className="panelHead"><div><div className="eyebrow">COPILOTE FINANCIER</div><h2>3 choses à savoir sur cette entreprise</h2><p>Le moteur distingue les constats documentés des éléments à confirmer. Chaque conclusion affiche son niveau de confiance.</p></div><span className={`confidenceBadge ${reliability.level}`}><ShieldCheck size={14}/> Confiance {reliability.level} · {reliability.score}/100</span></div>
  <div className="copilotCards">{copilot.items.map((d,i)=><article className={`copilotCard ${d.level}`} key={`${d.title}-${i}`}><span className="copilotNum">{i+1}</span><div><div className="copilotLabel">{d.title}</div><p>{d.why}</p><small>Importance : {d.importance}</small><b>→ Action : {d.action}</b></div></article>)}</div>
  <div className="evidenceLine"><span>Mode : {reliability.calculationMode}</span><span>Source : {company?.quality?.rowCount?"FEC + données calculées":"données de dossier / reconstruction"}</span><span>Exercice {a.year||"—"}</span>{gap.available&&<span>Gap médiane : {gap.gapPoints.toFixed(1)} pts · {eur(gap.ebePotential)} d'EBE potentiel</span>}<button className="ghostAction" onClick={()=>setPage?.("report")}>Rapport client <ArrowRight size={14}/></button></div></div>
  <div className="analysisLayout"><section className="panel"><div className="panelHead"><div><h2>Pourquoi ?</h2><p>Causes détectées dans les données disponibles.</p></div></div>{fec.insights?.length?fec.insights.slice(0,4).map(x=><div className={`causeItem ${x.level}`} key={x.title}><strong>{x.title}</strong><p>{x.text}</p><small>{x.source} · confiance {x.confidence}</small></div>):<div className="emptyState"><Info size={18}/><p>Pas de cause automatique suffisamment documentée.</p></div>}</section>
  <section className="panel"><div className="panelHead"><div><h2>Impact & décision</h2><p>Les montants constatés restent séparés des potentiels simulés.</p></div></div><div className="impactRows"><div><span>CA</span><b>{eur(y.ca)}</b></div><div><span>EBE</span><b>{eur(y.ebe)} · marge {pct(r.margin)}</b></div><div><span>BFR</span><b>{eur(y.bfr)} · {pct(r.bfrCa)} du CA</b></div><div><span>Trésorerie</span><b>{eur(y.treasury)}</b></div></div><div className="reliabilityMini"><b>Fiabilité</b><span>{reliability.checks.filter(x=>x.ok).length}/{reliability.checks.length} contrôles validés</span></div><button className="primaryAction" onClick={()=>setPage?.("scenarios")}>Simuler avant décision <ArrowRight size={14}/></button></section></div>
 </section>;
}
