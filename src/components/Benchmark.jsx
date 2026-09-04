import React,{useMemo,useState} from "react";
import {ArrowDown,ArrowUp,Minus,Users,Scale,Search,Globe2,Trash2} from "lucide-react";
import {ratios,portfolioBenchmark,benchmarkComparison,globalBenchmarkInterpretation} from "../services/financialEngine";
import {marketBenchmark,MARKET_SOURCE} from "../services/marketBenchmark";
const metrics=[["CA","ca","€","value",true],["EBE","ebe","€","value",true],["REX","rex","€","value",true],["Valeur ajoutée","valueAdded","€","value",true],["Capitaux propres (KP)","kp","€","value",true],["BFR","bfr","€","value",false],["Gearing","gearing","x","ratio",false],["ROE","roe","%","ratio",true],["ROCE","roce","%","ratio",true],["Liquidité","liquidity","%","ratio",true],["TMG","tmg","%","ratio",true]];
const safe=v=>Number.isFinite(Number(v))?Number(v):null;
const fmt=(v,u)=>safe(v)===null?"—":u==="€"?new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0}).format(Number(v))+" €":u==="x"?`${Number(v).toFixed(2)} x`:`${Number(v).toFixed(1)} %`;
const val=(r,key)=>safe(r?.[key]);
function icon(d){return d>0?<ArrowUp size={12}/>:d<0?<ArrowDown size={12}/>:<Minus size={12}/>}
function latest(c){const ys=Object.keys(c?.years||{}).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);return c?.years?.[ys.at(-1)]||{};}
function marketValue(m,key){
 if(!m)return null;
 if(key==="ca"||key==="valueAdded")return m[key]?.q2??null;
 return null;
}
function marketLabel(key){
 return key==="ca"?"Médiane marché (CA / entreprise)":key==="valueAdded"?"Médiane marché (VA / entreprise)":"Marché · définition BDF différente";
}
function marketNote(key,m){
 if(!m)return "Aucune référence marché disponible pour ce secteur.";
 if(["ca","valueAdded"].includes(key))return `Référence Banque de France 2024 · ${m.label}.`;
 return "La source publique utilise une définition différente du KPI NFI : la référence BDF est affichée séparément, sans conversion artificielle.";
}
export default function Benchmark({company,allCompanies=[],setCompany,onDeleteCompany}){
 const [selected,setSelected]=useState(company?.id||allCompanies[0]?.id||""); const [q,setQ]=useState(""); const [peer,setPeer]=useState("");
 const current=allCompanies.find(c=>c.id===selected)||company||allCompanies[0]||null; const y=latest(current); const r=ratios(y);
 const analyzed=useMemo(()=>allCompanies.filter(c=>Object.keys(c?.years||{}).length>0),[allCompanies]);
 const peers=useMemo(()=>analyzed.filter(c=>c.id!==current?.id&&c.sector&&current?.sector&&c.sector===current.sector),[analyzed,current]);
 const internal=useMemo(()=>portfolioBenchmark(analyzed,current?.sector||""),[analyzed,current?.sector]);
 const market=useMemo(()=>marketBenchmark(current?.sector||""),[current?.sector]);
 const selectedPeer=peers.find(c=>c.id===peer); const peerR=ratios(latest(selectedPeer));
 const list=analyzed.filter(c=>(c.name+" "+c.sector+" "+c.naf).toLowerCase().includes(q.toLowerCase()));
 const diffs=useMemo(()=>benchmarkComparison(r,internal).map(x=>({...x,name:metrics.find(m=>m[1]===x.key)?.[0]||x.label,u:x.unit,type:x.type,positive:x.higher,company:x.value,median:x.median})),[r,internal]);
 const globalScore=diffs.filter(x=>x.status!=="unknown").reduce((a,x)=>a+(x.status==="good"?1:x.status==="bad"?-1:0),0); const globalText=globalBenchmarkInterpretation(current?.name||"Société",diffs,internal.count);
 return <main className="content">
  <header className="pageHero"><div><div className="eyebrow">COMPARAISONS</div><h1>Comparer les performances</h1><p>Une lecture à trois niveaux : société, portefeuille du cabinet et marché.</p></div></header>
  {!current?<div className="emptyState">Aucune société disponible.</div>:<>
  <section className="compareControls panel"><div className="selectField"><label>Société analysée</label><select value={current.id} onChange={e=>{setSelected(e.target.value);setPeer("")}}>{list.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="sectorReference"><Scale size={18}/><div><span>Secteur cabinet</span><b>{current.sector||"Secteur à classer"}</b></div></div><div className="sectorReference marketRef"><Globe2 size={18}/><div><span>Référence marché</span><b>{market?.label||"Référence à rechercher"}</b></div></div><div className="sectorCount"><Users size={14}/><b>{internal.count}</b> société{internal.count>1?"s":""} analysée{internal.count>1?"s":""}</div></section>
  <section className="compareHero"><div><div className="eyebrow">SOCIÉTÉ VS RÉFÉRENCES</div><h2>{current.name}</h2><p>{current.naf||"NAF à renseigner"} · {current.sector||"Secteur à classer"}</p></div><div className="compareHeroText">{internal.count<3?"Le benchmark cabinet reste indicatif avec une petite population.":globalScore>=3?"La société se positionne favorablement sur la majorité des indicateurs comparables.":globalScore<=-3?"Plusieurs indicateurs sont en retrait par rapport aux références.":"Le positionnement est contrasté : certains indicateurs sont favorables, d'autres nécessitent une vigilance."}</div></section>
  <section className="panel"><div className="panelHead"><div><h2>Comparaison KPI</h2><p>Le marché est affiché uniquement lorsque la définition publiée est suffisamment comparable au KPI NFI.</p></div></div><div className="comparisonTable"><div className="comparisonHeader"><div>KPI</div><div>Votre société</div><div>Médiane secteur<br/>cabinet</div><div>Médiane secteur<br/>marché</div></div>{diffs.map(m=>{const favorable=m.diff===null?false:(m.positive?m.diff>=0:m.diff<=0);const mv=marketValue(market,m.key);return <div className="comparisonRow" key={m.key}><div className="comparisonName"><b>{m.name}</b>{m.key==="tmg"&&<small>Diff. TMG cabinet</small>}</div><div><span>Votre société</span><strong>{fmt(m.company,m.u)}</strong></div><div><span>Médiane cabinet</span><strong>{fmt(m.median,m.u)}</strong></div><div className="marketCell"><span>{marketLabel(m.key)}</span><strong>{fmt(mv,m.u)}</strong>{mv!==null&&<small>Q1 {fmt(market[m.key].q1,m.u)} · Q3 {fmt(market[m.key].q3,m.u)}</small>}</div><div className={m.diff===null?"comparisonDiff":"comparisonDiff "+(favorable?"good":"bad")}>{m.diff===null?<Minus size={12}/>:<>{icon(m.diff)} {m.u==="€"?fmt(Math.abs(m.diff),"€"):m.u==="x"?`${Math.abs(m.diff).toFixed(2)} x`:`${Math.abs(m.diff).toFixed(1)} %`}</>}</div></div>})}</div></section>
  <section className="marketSource panel"><div><Globe2 size={17}/><div><b>Référence marché · {market?.label||"non disponible pour ce secteur"}</b><p>{MARKET_SOURCE}. Les données publiques sont utilisées sans inventer de conversion entre définitions comptables.</p></div></div>{market&&<span className="status good">2024</span>}</section>
  <section className="interpretationGrid comparisonInterpretation">{diffs.map(m=>{const mv=marketValue(market,m.key);return <article className="interpretationCard" key={m.key}><span>{m.name}</span><b>{m.diff===null?`${m.name} : comparaison cabinet indisponible faute de données suffisantes.`:`Cabinet : ${m.positive?(m.company>=m.median?"au-dessus":"en dessous"):(m.company<=m.median?"meilleur":"moins favorable")} de la médiane.`}</b><p className="marketInterpretation">Marché : {mv===null?marketNote(m.key,market):`${fmt(m.company,m.u)} vs médiane ${fmt(mv,m.u)}.`}</p>{m.key==="tmg"&&m.diff!==null&&<em className={m.diff>=0?"good":"bad"}>Diff. TMG cabinet : {m.diff>=0?"+":""}{m.diff.toFixed(1)} pts</em>}</article>})}</section>
  <section className="panel"><div className="panelHead"><div><h2>Analyse globale</h2><p>Lecture synthétique du positionnement de la société face au cabinet et au marché.</p></div></div><div className="globalCompareText"><p>{globalText}</p></div></section>
  <section className="panel"><div className="panelHead"><div><h2>Comparer deux sociétés</h2><p>Comparez les mêmes KPI entre deux dossiers du même secteur.</p></div><div className="searchBox"><Search size={14}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher une société..."/></div></div><div className="pairSelectors"><select value={current.id} onChange={e=>{setSelected(e.target.value);setPeer("")}}>{list.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><span>vs</span><select value={peer} onChange={e=>setPeer(e.target.value)}><option value="">Choisir une société</option>{peers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>{selectedPeer&&<><div className="pairTable"><div className="pairHead"><span>KPI</span><b>{current.name}</b><b>{selectedPeer.name}</b></div>{metrics.map(([name,key,u])=><div className="pairLine" key={key}><span>{name}</span><b>{fmt(val(r,key),u)}</b><b>{fmt(val(peerR,key),u)}</b></div>)}</div></>}{!selectedPeer&&<div className="emptyState compact">Sélectionnez une seconde société analysée du même secteur.</div>}</section>
  <section className="dangerZone panel"><div><b>Gestion du dossier</b><p>Vous pouvez retirer ce dossier et les exercices FEC associés si un fichier a été importé par erreur.</p></div><button className="deleteButton" onClick={()=>onDeleteCompany?.(current)}><Trash2 size={14}/> Supprimer le dossier et ses FEC</button></section>
  </>}
 </main>;
}
