import React,{useMemo,useState} from "react";
import {Search,Users,BarChart3,ArrowRight,Info,Globe2} from "lucide-react";
import {ratios,portfolioBenchmark} from "../services/financialEngine";
import {SECTOR_CATALOG} from "../data/sectorCatalog";
import {marketBenchmark,MARKET_SOURCE} from "../services/marketBenchmark";

const metrics=[
 ["CA","ca","€"],["EBE","ebe","€"],["REX","rex","€"],["Valeur ajoutée","valueAdded","€"],
 ["Capitaux propres (KP)","kp","€"],["BFR","bfr","€"],["Gearing","gearing","x"],
 ["ROE","roe","%"],["ROCE","roce","%"],["Liquidité","liquidity","%"],["TMG","tmg","%"]
];
const safe=(v)=>Number.isFinite(Number(v))?Number(v):null;
const fmt=(v,u)=>safe(v)===null?"—":u==="€"?new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0}).format(Number(v))+" €":u==="x"?Number(v).toFixed(2)+" x":u==="j"?Number(v).toFixed(1)+" j":Number(v).toFixed(1)+" %";

export default function SectorExplorer({companies=[],onOpenCompany}){
 const [q,setQ]=useState(""); const [sector,setSector]=useState("");
 const sectors=useMemo(()=>SECTOR_CATALOG.map(s=>s.name).sort((a,b)=>a.localeCompare(b,"fr")),[ ]);
 const filtered=useMemo(()=>sectors.filter(s=>s.toLowerCase().includes(q.toLowerCase())),[sectors,q]);
 const current=sector&&sectors.includes(sector)?sector:(filtered[0]||sectors[0]||"");
 const pool=useMemo(()=>companies.filter(c=>String(c.sector||"").trim()===current&&Object.keys(c?.years||{}).length>0),[companies,current]);
 const bench=useMemo(()=>portfolioBenchmark(pool),[pool]);
 const market=useMemo(()=>marketBenchmark(current),[current]);
 const hasInternal=bench.count>0; const robust=bench.count>=3;
 const metricRows=metrics.map(([name,key,u])=>({name,key,u,data:bench[key]||{q1:null,median:null,q3:null,count:0}}));

 return <main className="content">
  <header className="pageHero"><div>
   <div className="eyebrow">ANALYSE SECTORIELLE</div>
   <h1>Explorer un secteur</h1>
   <p>88 secteurs NAF sont disponibles. Les KPI cabinet apparaissent dès que des sociétés du secteur disposent de données financières.</p>
  </div></header>

  <div className="sectorLayout cleanSectorLayout">
   <section className="panel sectorList">
    <div className="searchBox"><Search size={15}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher un secteur..."/></div>
    <div className="sectorCount">{filtered.length} / {sectors.length} secteurs NAF</div>
    {filtered.length?filtered.map(s=><button key={s} className={current===s?"sectorItem selected":"sectorItem"} onClick={()=>setSector(s)}>
      <span>{s}</span><b>{companies.filter(c=>String(c.sector||"").trim()===s).length}</b>
    </button>):<div className="emptyState compact">Aucun secteur correspondant.</div>}
   </section>

   <section className="sectorMain">
    <div className="sectorSummary panel">
      <div className="sectorIcon"><BarChart3 size={20}/></div>
      <div><div className="eyebrow">SECTEUR SÉLECTIONNÉ</div><h2>{current||"Aucun secteur disponible"}</h2>
      <p>{pool.length} société{pool.length>1?"s":""} analysée{pool.length>1?"s":""} dans le périmètre Novacab</p></div>
    </div>

    {!current?<section className="panel emptyState"><Info size={18}/><div><b>Aucun secteur</b><p>Le référentiel NAF est indisponible.</p></div></section>:<>
      <div className="kpis sectorKpis">
       <div className="kpi cleanKpi"><div className="kpiLabel">Sociétés</div><div className="kpiValue">{pool.length}</div><div className="kpiSub">périmètre analysé</div></div>
       <div className="kpi cleanKpi"><div className="kpiLabel">Médiane EBE</div><div className="kpiValue">{fmt(bench.ebe?.median,"€")}</div><div className="kpiSub">référence cabinet</div></div>
       <div className="kpi cleanKpi"><div className="kpiLabel">Médiane ROCE</div><div className="kpiValue">{fmt(bench.roce?.median,"%")}</div><div className="kpiSub">référence cabinet</div></div>
       <div className="kpi cleanKpi"><div className="kpiLabel">Médiane TMG</div><div className="kpiValue">{fmt(bench.tmg?.median,"%")}</div><div className="kpiSub">référence cabinet</div></div>
      </div>

      {!hasInternal&&<section className="panel emptyState">
        <Info size={18}/><div><b>Aucune donnée financière cabinet pour ce secteur</b>
        <p>Le secteur reste visible. Importez un FEC pour calculer automatiquement les quartiles et la médiane des KPI NFI.</p></div>
      </section>}

      {hasInternal&&<section className="panel">
        <div className="panelHead"><div><h2>Référentiel KPI cabinet</h2><p>Quartiles calculés sur les données financières disponibles.</p></div><span className="pill"><Users size={12}/> {bench.count}</span></div>
        <div className="tableWrap"><table><thead><tr><th>Indicateur</th><th>Q1</th><th>Médiane</th><th>Q3</th></tr></thead>
        <tbody>{metricRows.map(m=><tr key={m.key}><td><b>{m.name}</b></td><td>{fmt(m.data.q1,m.u)}</td><td><b>{fmt(m.data.median,m.u)}</b></td><td>{fmt(m.data.q3,m.u)}</td></tr>)}</tbody></table></div>
      </section>}

      <section className="panel">
       <div className="panelHead"><div><h2>Référence marché</h2><p>Banque de France / FIBEN, année 2024. Les indicateurs affichés respectent la définition publiée.</p></div><Globe2 size={18}/></div>
       {market?<div className="tableWrap"><table><thead><tr><th>Indicateur marché</th><th>Q1</th><th>Médiane</th><th>Q3</th></tr></thead><tbody>
         {market.valueAdded&&<tr><td><b>Valeur ajoutée / entreprise (€)</b></td><td>{fmt(market.valueAdded.q1,"€")}</td><td><b>{fmt(market.valueAdded.q2,"€")}</b></td><td>{fmt(market.valueAdded.q3,"€")}</td></tr>}
         {market.ca&&<tr><td><b>CA / entreprise (€)</b></td><td>{fmt(market.ca.q1,"€")}</td><td><b>{fmt(market.ca.q2,"€")}</b></td><td>{fmt(market.ca.q3,"€")}</td></tr>}
         {market.ebgMargin&&<tr><td><b>Taux d'excédent brut global (%)</b></td><td>{fmt(market.ebgMargin.q1,"%")}</td><td><b>{fmt(market.ebgMargin.q2,"%")}</b></td><td>{fmt(market.ebgMargin.q3,"%")}</td></tr>}
         {market.roe&&<tr><td><b>Rentabilité financière des capitaux propres (%)</b></td><td>{fmt(market.roe.q1,"%")}</td><td><b>{fmt(market.roe.q2,"%")}</b></td><td>{fmt(market.roe.q3,"%")}</td></tr>}
         {market.bfrDays&&<tr><td><b>Poids du BFR d'exploitation (jours)</b></td><td>{fmt(market.bfrDays.q1,"j")}</td><td><b>{fmt(market.bfrDays.q2,"j")}</b></td><td>{fmt(market.bfrDays.q3,"j")}</td></tr>}
         {market.grossDebtRate&&<tr><td><b>Taux brut d'endettement financier (%)</b></td><td>{fmt(market.grossDebtRate.q1,"%")}</td><td><b>{fmt(market.grossDebtRate.q2,"%")}</b></td><td>{fmt(market.grossDebtRate.q3,"%")}</td></tr>}
       </tbody></table></div>:<div className="emptyState compact"><Globe2 size={16}/><div><b>Référence marché BDF non disponible à ce niveau de secteur</b><p>Le référentiel NAF reste disponible ; NFI n'invente pas de valeur de marché lorsqu'une statistique officielle n'est pas publiée à ce niveau.</p></div></div>}
       <div className="marketSource"><small>{MARKET_SOURCE}</small></div>
      </section>

      <section className="panel interpretationPanel">
       <div className="panelHead"><div><h2>Lecture du secteur</h2><p>Les données cabinet et les références marché sont séparées.</p></div></div>
       <div className="interpretationText">
        <p>{!hasInternal?`Aucune société financièrement analysée n'est encore rattachée à « ${current} ». Le secteur reste néanmoins disponible dans le référentiel NAF.`:!robust?`Le référentiel cabinet repose sur ${bench.count} société${bench.count>1?"s":""}. Il constitue une indication ; une population plus large renforcera la robustesse statistique.`:`La médiane cabinet est calculée sur ${bench.count} société${bench.count>1?"s":""} disposant d'un exercice analysé.`}</p>
        {market&&<p>La référence marché affichée provient des fascicules sectoriels Banque de France / FIBEN 2024. Elle est présentée avec sa définition propre et ne remplace pas automatiquement un KPI NFI de définition différente.</p>}
       </div>
      </section>

      <section className="panel">
       <div className="panelHead"><div><h2>Sociétés du secteur</h2><p>Accédez directement à l'analyse d'une société.</p></div></div>
       {pool.length?pool.map(c=>{const ys=Object.keys(c.years||{}).map(Number).sort((a,b)=>a-b);const r=ratios(c.years?.[ys.at(-1)]||{});return <button className="sectorCompanyRow" key={c.id} onClick={()=>onOpenCompany?.(c)}>
        <span className="avatar">{String(c.name||"S").slice(0,2).toUpperCase()}</span><span><b>{c.name||"Société sans nom"}</b><small>{c.naf||"NAF non renseigné"}</small></span><strong>{fmt(r.margin,"%")} <small>EBE</small></strong><ArrowRight size={16}/>
       </button>}):<div className="emptyState compact">Aucune société analysée dans ce secteur.</div>}
      </section>
    </>}
   </section>
  </div>
 </main>;
}
