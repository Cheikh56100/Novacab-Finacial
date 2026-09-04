import React from "react";
import {ResponsiveContainer,LineChart,Line,XAxis,YAxis,Tooltip} from "recharts";
import {ArrowDownRight,ArrowUpRight,Minus,TrendingUp} from "lucide-react";
import {ratios,yoy,detailedAnalysis} from "../services/financialEngine";

const eur=n=>new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0}).format(Number(n)||0)+" €";
const fmt=(v,u="%")=>Number.isFinite(Number(v))?`${Number(v).toFixed(1)}${u}`:"—";
const fmtX=v=>Number.isFinite(Number(v))?`${Number(v).toFixed(2)} x`:"—";
const metrics=[
  ["Chiffre d'affaires","ca","€","value"], ["EBE","ebe","€","value"], ["Résultat d'exploitation (REX)","rex","€","value"],
  ["Valeur ajoutée","valueAdded","€","value"], ["Capitaux propres (KP)","kp","€","value"], ["BFR","bfr","€","value"],
  ["Gearing","gearing","x","ratio"], ["ROE","roe","%","ratio"], ["ROCE","roce","%","ratio"],
  ["Liquidité","liquidity","%","ratio"], ["TMG","tmg","%","ratio"]
];

function interpretation(name,v){
 const x=Number(v); if(!Number.isFinite(x)) return `${name} : donnée indisponible pour cet exercice.`;
 const p={
  "Chiffre d'affaires":`Le chiffre d'affaires s'établit à ${eur(x)}.`,
  "EBE":`L'EBE ressort à ${eur(x)} et mesure la performance générée par l'exploitation avant amortissements et éléments financiers.`,
  "Résultat d'exploitation (REX)":`Le REX ressort à ${eur(x)}. Il traduit la rentabilité de l'activité après prise en compte des dotations d'exploitation.`,
  "Valeur ajoutée":`La valeur ajoutée atteint ${eur(x)}. Elle mesure la richesse créée par l'entreprise après consommation des biens et services externes.`,
  "Capitaux propres (KP)":`Les capitaux propres s'élèvent à ${eur(x)} et constituent le socle de financement durable de l'entreprise.`,
  "BFR":`Le BFR représente ${eur(x)}. Un BFR élevé mobilise davantage de trésorerie dans le cycle d'exploitation.`,
  "Gearing":`Le gearing ressort à ${fmtX(x)}. Plus il est élevé, plus la structure financière dépend de la dette par rapport aux capitaux propres.`,
  "ROE":`Le ROE ressort à ${fmt(x)}. Il mesure la rentabilité des capitaux propres.`,
  "ROCE":`Le ROCE ressort à ${fmt(x)}. Il mesure la rentabilité des capitaux engagés dans l'activité.`,
  "Liquidité":`La liquidité ressort à ${fmt(x)}. Elle compare les actifs liquides disponibles aux dettes à court terme selon les données disponibles.`,
  "TMG":`Le TMG ressort à ${fmt(x)}. Il donne une lecture de la marge globale rapportée au chiffre d'affaires.`
 };
 return p[name];
}

export default function Dashboard({company,year,setYear,setPage}){
 const years=Object.keys(company?.years||{}).map(Number).filter(Number.isFinite).sort((a,b)=>a-b); const currentYear=year||years.at(-1); const y=company?.years?.[currentYear]||{}; const prev=company?.years?.[currentYear-1]; const r=ratios(y); const analysis=detailedAnalysis(company,currentYear); const growth=prev?yoy(y.ca,prev.ca):null;
 const chartData=years.map(x=>({year:x,margin:ratios(company.years[x]).margin,ca:Math.round((company.years[x]?.ca||0)/1000)}));
 if(!company) return <main className="content"><div className="emptyState">Sélectionnez une société.</div></main>;
 const global=`${company.name} présente un chiffre d'affaires de ${eur(r.ca)}, un EBE de ${eur(r.ebe)} et un REX de ${eur(r.rex)}. ${r.roe>=10?"La rentabilité des capitaux propres est favorable.":"La rentabilité des capitaux propres mérite d'être surveillée."} ${r.gearing<=1.5?"La structure d'endettement reste contenue.":"Le niveau de gearing appelle une vigilance sur la structure financière."}`;
 return <main className="content">
  <header className="pageHero analysisHero"><div><div className="eyebrow">ANALYSE FINANCIÈRE · {currentYear}</div><h1>{company.name}</h1><p>{company.naf||"NAF à renseigner"} · {company.sector||"Secteur à classer"}</p></div><div className="heroActions"><button className="secondaryAction" onClick={()=>setPage("benchmark")}>Comparer au secteur</button><label className="yearSelect"><span>Exercice</span><select value={currentYear} onChange={e=>setYear(Number(e.target.value))}>{years.map(x=><option key={x}>{x}</option>)}</select></label></div></header>
  <section className="diagnosisHero"><div><div className="eyebrow">LECTURE NFI</div><h2>{r.roe>=10&&r.gearing<=1.5?"Situation financière favorable":r.roe<0||r.gearing>3?"Points de vigilance identifiés":"Situation financière à surveiller"}</h2><p>{global}</p></div><button className="ghostAction" onClick={()=>setPage("benchmark")}>Voir le positionnement sectoriel <TrendingUp size={15}/></button></section>
  <section className="kpis cleanKpis">{[["CA",eur(r.ca),growth===null?"Premier exercice":`${growth>=0?"+":""}${growth.toFixed(1)} % vs ${currentYear-1}`],["EBE",eur(r.ebe),fmt(r.margin)+" du CA"],["REX",eur(r.rex),"Résultat d'exploitation"],["VA",eur(r.valueAdded),fmt(r.ca?r.valueAdded/r.ca*100:NaN)+" du CA"],["KP",eur(r.kp),"Capitaux propres"],["BFR",eur(r.bfr),fmt(r.bfrCa)+" du CA"]].map(([label,value,sub])=><Kpi key={label} label={label} value={value} sub={sub}/>)}</section>
  <section className="panel"><div className="panelHead"><div><h2>Rentabilité & structure financière</h2><p>Les indicateurs demandés, calculés sur l'exercice sélectionné.</p></div></div><div className="ratioTable richRatioTable">{[["Gearing",fmtX(r.gearing)],["ROE",fmt(r.roe)],["ROCE",fmt(r.roce)],["Liquidité",fmt(r.liquidity)],["TMG",fmt(r.tmg)]].map(([n,v])=><Metric name={n} value={v}/>)}</div></section>
  <section className="analysisLayout"><div className="panel chartPanel"><div className="panelHead"><div><h2>Évolution</h2><p>CA et marge EBE sur les exercices disponibles.</p></div></div><div className="chartBox"><ResponsiveContainer width="100%" height={250}><LineChart data={chartData}><XAxis dataKey="year" axisLine={false} tickLine={false}/><YAxis yAxisId="left" axisLine={false} tickLine={false}/><YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false}/><Tooltip formatter={(v,name)=>name==="ca"?[`${v} k€`,"CA"]:[`${Number(v).toFixed(1)} %`,"Marge EBE"]}/><Line yAxisId="left" type="monotone" dataKey="ca" stroke="#2587cf" strokeWidth={2.5} dot={{r:3}}/><Line yAxisId="right" type="monotone" dataKey="margin" stroke="#273c59" strokeWidth={2} dot={{r:3}}/></LineChart></ResponsiveContainer></div></div><div className="panel interpretationPanel"><div className="panelHead"><div><h2>Analyse globale</h2><p>Une lecture synthétique des principaux indicateurs.</p></div></div><div className="interpretationText"><p>{global}</p><p>{interpretation("EBE",r.ebe)} {interpretation("ROE",r.roe)}</p><p>{interpretation("Gearing",r.gearing)} {interpretation("BFR",r.bfr)}</p><p>{interpretation("Liquidité",r.liquidity)} {interpretation("ROCE",r.roce)}</p></div></div></section>
  <section className="panel"><div className="panelHead"><div><h2>Interprétation de chaque KPI</h2><p>Chaque indicateur est accompagné d'une lecture métier.</p></div></div><div className="interpretationKpiGrid">{metrics.map(([name,key,u,type])=><article className="kpiInterpretCard" key={key}><div><span>{name}</span><b>{type==="value"?eur(r[key]):u==="x"?fmtX(r[key]):fmt(r[key])}</b></div><p>{interpretation(name,r[key])}</p></article>)}</div></section>
 </main>;
}
function Kpi({label,value,sub}){return <div className="kpi cleanKpi"><div className="kpiLabel">{label}</div><div className="kpiValue">{value}</div><div className="kpiSub">{sub}</div></div>}
function Metric({name,value}){return <div className="ratioMetric"><span>{name}</span><b>{value}</b></div>}
