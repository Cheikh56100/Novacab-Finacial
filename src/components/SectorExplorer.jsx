import React,{useMemo,useState} from "react";
import {Search,Users,BarChart3,ArrowRight,Info} from "lucide-react";
import {ratios,portfolioBenchmark} from "../services/financialEngine";

const metrics=[["CA","ca","€"],["EBE","ebe","€"],["REX","rex","€"],["Valeur ajoutée","valueAdded","€"],["Capitaux propres (KP)","kp","€"],["BFR","bfr","€"],["Gearing","gearing","x"],["ROE","roe","%"],["ROCE","roce","%"],["Liquidité","liquidity","%"],["TMG","tmg","%"]];
const safe=(v)=>Number.isFinite(Number(v))?Number(v):null;
const fmt=(v,u)=>safe(v)===null?"—":`${safe(v).toFixed(1)} ${u}`;

export default function SectorExplorer({companies=[],onOpenCompany}){
 const [q,setQ]=useState(""); const [sector,setSector]=useState("");
 const sectors=useMemo(()=>[...new Set(companies.filter(c=>Object.keys(c?.years||{}).length>0).map(c=>String(c.sector||"").trim()).filter(s=>s&&s!=="À classer"))].sort((a,b)=>a.localeCompare(b,"fr")),[companies]);
 const filtered=useMemo(()=>sectors.filter(s=>s.toLowerCase().includes(q.toLowerCase())),[sectors,q]);
 const current=sector&&sectors.includes(sector)?sector:(filtered[0]||sectors[0]||"");
 const pool=useMemo(()=>companies.filter(c=>String(c.sector||"")===current&&Object.keys(c?.years||{}).length>0),[companies,current]);
 const bench=useMemo(()=>portfolioBenchmark(pool),[pool]);
 const hasData=bench.count>0; const robust=bench.count>=3;
 const metricRows=metrics.map(([name,key,u])=>({name,key,u,data:bench[key]||{q1:null,median:null,q3:null,count:0}}));
 return <main className="content">
  <header className="pageHero"><div><div className="eyebrow">ANALYSE SECTORIELLE</div><h1>Explorer un secteur</h1><p>Comprenez les niveaux de performance observés dans les sociétés de votre base Novacab.</p></div></header>
  <div className="sectorLayout cleanSectorLayout">
   <section className="panel sectorList"><div className="searchBox"><Search size={15}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher un secteur..."/></div><div className="sectorCount">{sectors.length} secteur{sectors.length>1?"s":""} dans votre base</div>{filtered.length?filtered.map(s=><button key={s} className={current===s?"sectorItem selected":"sectorItem"} onClick={()=>setSector(s)}><span>{s}</span><b>{companies.filter(c=>c.sector===s).length}</b></button>):<div className="emptyState compact">Aucun secteur correspondant.</div>}</section>
   <section className="sectorMain">
    <div className="sectorSummary panel"><div className="sectorIcon"><BarChart3 size={20}/></div><div><div className="eyebrow">SECTEUR SÉLECTIONNÉ</div><h2>{current||"Aucun secteur disponible"}</h2><p>{pool.length} société{pool.length>1?"s":""} dans le périmètre Novacab</p></div></div>
    {!current?<section className="panel emptyState"><Info size={18}/><div><b>Aucune donnée sectorielle</b><p>Synchronisez ou importez des sociétés avec un secteur renseigné pour commencer.</p></div></section>:<>
    <div className="kpis sectorKpis"><div className="kpi cleanKpi"><div className="kpiLabel">Sociétés</div><div className="kpiValue">{pool.length}</div><div className="kpiSub">périmètre analysé</div></div><div className="kpi cleanKpi"><div className="kpiLabel">Médiane EBE</div><div className="kpiValue">{fmt(bench.ebe?.median,"€")}</div><div className="kpiSub">référence sectorielle</div></div><div className="kpi cleanKpi"><div className="kpiLabel">Médiane ROCE</div><div className="kpiValue">{fmt(bench.roce?.median,"%")}</div><div className="kpiSub">référence sectorielle</div></div><div className="kpi cleanKpi"><div className="kpiLabel">Médiane TMG</div><div className="kpiValue">{fmt(bench.tmg?.median,"%")}</div><div className="kpiSub">référence sectorielle</div></div></div>
    {!hasData?<section className="panel emptyState"><Info size={18}/><div><b>Données insuffisantes</b><p>Les sociétés de ce secteur ne disposent pas encore de données financières exploitables.</p></div></section>:<><section className="panel"><div className="panelHead"><div><h2>Référentiel sectoriel</h2><p>Quartiles calculés sur les données financières disponibles.</p></div><span className="pill"><Users size={12}/> {bench.count}</span></div><div className="tableWrap"><table><thead><tr><th>Indicateur</th><th>Q1</th><th>Médiane</th><th>Q3</th></tr></thead><tbody>{metricRows.map(m=><tr key={m.key}><td><b>{m.name}</b></td><td>{fmt(m.data.q1,m.u)}</td><td><b>{fmt(m.data.median,m.u)}</b></td><td>{fmt(m.data.q3,m.u)}</td></tr>)}</tbody></table></div></section>
    <section className="panel interpretationPanel"><div className="panelHead"><div><h2>Lecture du secteur</h2><p>Une interprétation générée à partir de la population observée.</p></div></div><div className="interpretationText"><p>{!robust?`Le référentiel repose sur ${bench.count} société${bench.count>1?"s":""}. Il constitue une première indication ; une population plus large renforcera la robustesse statistique.`:`La médiane sectorielle de l'EBE est de ${fmt(bench.ebe.median,"€")}. La dispersion observée est comprise entre ${fmt(bench.ebe.q1,"€")} et ${fmt(bench.ebe.q3,"€")} pour la moitié centrale des sociétés.`}</p><p>Le ROCE médian ressort à {fmt(bench.roce?.median,"%")} et le gearing médian à {fmt(bench.gearing?.median,"x")}. Ces indicateurs permettent de lire simultanément la rentabilité et la structure financière du secteur.</p><p>Le TMG médian est de {fmt(bench.tmg?.median,"%")}. Il servira de référence directe lors de la comparaison d'une société avec son secteur.</p></div></section>
    <section className="panel"><div className="panelHead"><div><h2>Lecture par indicateur</h2><p>La médiane constitue le point de référence central du secteur.</p></div></div><div className="interpretationKpiGrid">{metricRows.map(m=>{const med=safe(m.data.median);const q1=safe(m.data.q1);const q3=safe(m.data.q3);const unit=m.u;const fmtVal=v=>safe(v)===null?"—":unit==="€"?new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0}).format(v)+" €":unit==="x"?Number(v).toFixed(2)+" x":Number(v).toFixed(1)+" %";return <article className="kpiInterpretCard" key={m.key}><div><span>{m.name}</span><b>{fmtVal(med)}</b></div><p>{med===null?`${m.name} : référence indisponible.`:`La médiane sectorielle est de ${fmtVal(med)}. La moitié centrale des sociétés se situe entre ${fmtVal(q1)} et ${fmtVal(q3)}.`}</p></article>})}</div></section>
    </>}
    <section className="panel"><div className="panelHead"><div><h2>Sociétés du secteur</h2><p>Accédez directement à l'analyse d'une société.</p></div></div>{pool.map(c=>{const ys=Object.keys(c.years||{}).map(Number).sort((a,b)=>a-b);const r=ratios(c.years?.[ys.at(-1)]||{});return <button className="sectorCompanyRow" key={c.id} onClick={()=>onOpenCompany?.(c)}><span className="avatar">{String(c.name||"S").slice(0,2).toUpperCase()}</span><span><b>{c.name||"Société sans nom"}</b><small>{c.naf||"NAF non renseigné"}</small></span><strong>{fmt(r.margin,"%")} <small>EBE</small></strong><ArrowRight size={16}/></button>})}</section>
    </>}
   </section>
  </div>
 </main>;
}
