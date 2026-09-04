import React,{useMemo,useState} from "react";
import {scenario} from "../services/financialEngine";
import {recommendedForecast} from "../services/forecastEngine";
import {Sparkles,ShieldCheck,AlertTriangle,Target} from "lucide-react";
const eur=n=>new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0}).format(n||0)+" €";
export default function Scenarios({company}){
 const rec=useMemo(()=>recommendedForecast(company),[company]);
 const base=company.years[rec.year]||{};
 const [a,setA]=useState(rec.assumptions);
 const out=scenario(base,a);
 const set=(k,v)=>setA(x=>({...x,[k]:Number(v)}));
 const apply=()=>setA({...rec.assumptions});
 return <main className="content"><header className="pageHero"><div><div className="eyebrow">PRÉVISIONNEL NFI</div><h1>Prévisionnel recommandé</h1><p>{company.name} · proposition construite à partir de la situation financière</p></div></header>
 <section className="forecastHero panel"><div className="forecastIcon"><Sparkles size={22}/></div><div><span className="eyebrow">RECOMMANDATION NFI</span><h2>{rec.profile}</h2><p>{rec.reason}</p></div><div className="forecastScore"><b>{rec.score}</b><span>/100 · {rec.label}</span></div></section>
 <section className="analysisCards"><div className="panel"><div className="panelHead"><div><h2>Pourquoi ce scénario ?</h2><p>Interprétation financière automatique</p></div></div><div className="signalList">{rec.messages.map((m,i)=><div key={i}><span className="signalIcon good"><ShieldCheck size={15}/></span><div><p>{m}</p></div></div>)}</div></div>
 <div className="panel"><div className="panelHead"><div><h2>Hypothèses recommandées</h2><p>Tu peux les modifier avant de valider</p></div><button className="secondaryAction" onClick={apply}><Target size={14}/> Appliquer NFI</button></div>{[["ca","Variation CA (%)"],["margin","Variation marge (points)"],["bfr","Variation BFR (%)"],["investments","Investissements (€)"],["debtRepayment","Remboursement dette (€)"]].map(([k,l])=><label className="forecastField" key={k}>{l}<input type="number" value={a[k]} onChange={e=>set(k,e.target.value)}/></label>)}</div></section>
 <section className="panel"><div className="panelHead"><div><h2>Impact prévisionnel</h2><p>Projection calculée à partir du dernier exercice disponible</p></div></div><div className="scenarioCards">{[["CA projeté",out.ca],["EBE projeté",out.ebe],["BFR projeté",out.bfr],["Trésorerie estimée",out.treasury]].map(([l,v])=><div key={l}><span>{l}</span><b>{eur(v)}</b></div>)}</div><div className={out.treasury>0?"insight goodInsight":"insight badInsight"}><strong>{out.treasury>0?<><ShieldCheck size={15}/> Prévisionnel soutenable</>:<><AlertTriangle size={15}/> Prévisionnel à sécuriser</>}</strong><p>{out.treasury>0?`Selon ces hypothèses, la trésorerie resterait positive à ${eur(out.treasury)}. Le scénario peut servir de base de travail pour le budget.`:`Les hypothèses conduisent à une trésorerie négative de ${eur(Math.abs(out.treasury))}. Il faut revoir les investissements, le BFR ou le financement avant de retenir ce scénario.`}</p></div></section>
 </main>
}
