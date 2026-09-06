import React,{useMemo} from "react";
import {AlertTriangle,ArrowRight,ShieldCheck} from "lucide-react";
import {diagnostics,financialScore,ratios} from "../services/financialEngine";

const eur=v=>Number.isFinite(Number(v))?`${Math.round(Number(v)).toLocaleString("fr-FR")} €`:"—";
const latest=c=>{const ys=Object.keys(c?.years||{}).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);return ys.length?ys.at(-1):null;};
export default function PortfolioAlerts({companies=[],onOpen}){
 const rows=useMemo(()=>companies.map(c=>{
   const year=latest(c), y=c?.years?.[year]||{}, r=ratios(y), score=financialScore(r);
   const ds=diagnostics(c,year)||[];
   const critical=ds.filter(d=>d.level==="bad"), warnings=ds.filter(d=>d.level==="warning");
   const level=critical.length?"critical":warnings.length?"watch":"stable";
   return {c,year,y,r,score,level,items:[...critical,...warnings].slice(0,2)};
 }).filter(x=>x.level!=="stable").sort((a,b)=>a.score-b.score),[]);
 return <main className="content"><header className="pageHero"><div><div className="eyebrow">NOVACAB INSIGHT · SURVEILLANCE</div><h1>Alertes portefeuille</h1><p>Les dossiers qui nécessitent une attention, classés par priorité.</p></div></header>
 <section className="kpis cleanKpis"><div className="kpi cleanKpi"><div className="kpiLabel">Priorités critiques</div><div className="kpiValue">{rows.filter(x=>x.level==="critical").length}</div><div className="kpiSub">à traiter en premier</div></div><div className="kpi cleanKpi"><div className="kpiLabel">Vigilances</div><div className="kpiValue">{rows.filter(x=>x.level==="watch").length}</div><div className="kpiSub">à revoir</div></div><div className="kpi cleanKpi"><div className="kpiLabel">Dossiers analysés</div><div className="kpiValue">{companies.length}</div><div className="kpiSub">dans le périmètre courant</div></div></section>
 <section className="panel"><div className="panelHead"><div><h2>File de priorité</h2><p>Le score oriente le classement ; les causes restent à vérifier dans le dossier.</p></div></div>
 {rows.length?<div className="alertList">{rows.map(x=><article className={`portfolioAlert ${x.level}`} key={x.c.id}><div className="alertIcon">{x.level==="critical"?<AlertTriangle size={18}/>:<ShieldCheck size={18}/>}</div><div className="alertMain"><div className="alertTitle"><b>{x.c.name}</b><span>Score {x.score}/100</span></div><small>Exercice {x.year||"—"} · {x.level==="critical"?"Priorité critique":"Vigilance"}</small><div className="alertReasons">{x.items.map(d=><p key={d.title}><strong>{d.title}</strong> — {d.text}</p>)}</div></div><button className="ghostAction" onClick={()=>onOpen?.(x.c)}>Voir le dossier <ArrowRight size={14}/></button></article>)}</div>:<div className="emptyState"><ShieldCheck size={20}/><b>Aucune alerte prioritaire</b><p>Le portefeuille ne présente pas de signal critique ou de vigilance selon le moteur actuel.</p></div>}
 </section></main>;
}