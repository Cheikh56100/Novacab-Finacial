import React,{useMemo,useState} from "react";
import {ArrowDown,ArrowUp,Minus,Users,Scale,Search,Globe2,Trash2} from "lucide-react";
import {ratios,portfolioBenchmark,benchmarkComparison,globalBenchmarkInterpretation} from "../services/financialEngine";
import {marketBenchmark,MARKET_SOURCE} from "../services/marketBenchmark";
import {sectorForNaf} from "../services/novacabConnect";
const metrics=[["CA","ca","€","value",true],["EBE","ebe","€","value",true],["REX","rex","€","value",true],["Valeur ajoutée","valueAdded","€","value",true],["Capitaux propres (KP)","kp","€","value",true],["BFR","bfr","€","value",false],["Gearing","gearing","x","ratio",false],["ROE","roe","%","ratio",true],["ROCE","roce","%","ratio",true],["Liquidité","liquidity","%","ratio",true],["TMG","tmg","%","ratio",true]];
const safe=v=>Number.isFinite(Number(v))?Number(v):null;
const n=v=>Number(v)||0;
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
 return "La source publique utilise une définition différente du KPI NOVACAB Insight : la la référence BDF est affichée séparément, sans conversion artificielle.";
}
export default function Benchmark({company,allCompanies=[],setCompany,onDeleteCompany}){
 const [selected,setSelected]=useState(company?.id||allCompanies[0]?.id||""); const [q,setQ]=useState(""); const [peer,setPeer]=useState("");
 const current=allCompanies.find(c=>c.id===selected)||company||allCompanies[0]||null;
 const resolvedSector=sectorForNaf(current?.naf||"") || current?.sector || "";
 const y=latest(current); const r=ratios(y);
 const analyzed=useMemo(()=>allCompanies.filter(c=>Object.keys(c?.years||{}).length>0),[allCompanies]);
 const peers=useMemo(()=>analyzed.filter(c=>c.id!==current?.id&&(sectorForNaf(c?.naf||"")||c?.sector)===resolvedSector),[analyzed,current,resolvedSector]);
 const internal=useMemo(()=>portfolioBenchmark(analyzed,resolvedSector),[analyzed,resolvedSector]);
 const market=useMemo(()=>marketBenchmark(resolvedSector),[resolvedSector]);
 const selectedPeer=peers.find(c=>c.id===peer); const peerR=ratios(latest(selectedPeer));
 const list=analyzed.filter(c=>(c.name+" "+c.sector+" "+c.naf).toLowerCase().includes(q.toLowerCase()));
 const diffs=useMemo(()=>benchmarkComparison(r,internal).map(x=>({...x,name:metrics.find(m=>m[1]===x.key)?.[0]||x.label,u:x.unit,type:x.type,positive:x.higher,company:x.value,median:x.median})),[r,internal]);
 const globalScore=diffs.filter(x=>x.status!=="unknown").reduce((a,x)=>a+(x.status==="good"?1:x.status==="bad"?-1:0),0); const globalText=globalBenchmarkInterpretation(current?.name||"Société",diffs,internal.count);
 const narrative=useMemo(()=>{
   const usable=diffs.filter(x=>x.status!=="unknown"&&x.diff!==null);
   const good=usable.filter(x=>x.status==="good").sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff));
   const bad=usable.filter(x=>x.status==="bad").sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff));
   const euro=x=>fmt(Math.abs(x.diff),"€"), pct=x=>fmt(Math.abs(x.diff),"%"), mult=x=>fmt(Math.abs(x.diff),"x");
   const phrase=x=>{
     const d=x.diff;
     if(x.u==="€") return `${x.name} est ${euro(x)} ${x.positive?(d>=0?"au-dessus":"en dessous"):(d<=0?"plus favorable":"moins favorable")} de la médiane du cabinet.`;
     if(x.u==="x") return `${x.name} présente un écart de ${mult(x)} par rapport à la médiane du cabinet.`;
     return `${x.name} présente un écart de ${pct(x)} par rapport à la médiane du cabinet.`;
   };
   const years=Object.keys(current?.years||{}).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
   const latestY=years.length?current.years[years.at(-1)]:null;
   const previousY=years.length>1?current.years[years.at(-2)]:null;
   const growth=(a,b)=>a!=null&&b!=null&&Number(b)!==0?(Number(a)-Number(b))/Math.abs(Number(b))*100:null;
   const caGrowth=growth(latestY?.ca,previousY?.ca);
   const ebeGrowth=growth(latestY?.ebe,previousY?.ebe);
   const rexGrowth=growth(latestY?.rex,previousY?.rex);
   const equity=Number(latestY?.equity||0);
   const severity=equity<0||bad.length>=4?"Élevée":bad.length>=2?"Modérée":"Faible";
   const score=Math.max(0,Math.min(100,50+good.length*8-bad.length*10-(equity<0?15:0)));
   const actionNames=bad.slice(0,3).map(x=>x.name);
   return {
     good,bad,years,caGrowth,ebeGrowth,rexGrowth,severity,score,
     profile:severity==="Élevée"?"Sous surveillance":severity==="Modérée"?"À surveiller":"Plutôt favorable",
     synthesis:`${current?.name||"La société"} présente un profil ${severity.toLowerCase()} par rapport aux références disponibles. ${equity<0?"Les capitaux propres négatifs constituent un signal structurel prioritaire. ":""}${bad[0]?phrase(bad[0]):good[0]?phrase(good[0]):""}`,
     strengths:good.length?good.slice(0,4).map(phrase).join(" "):"Aucun avantage sectoriel net n'est identifié.",
     risks:bad.length?bad.slice(0,4).map(phrase).join(" "):"Aucun point de vigilance sectoriel majeur n'est identifié.",
     actions:actionNames.length?`Prioriser ${actionNames.join(", ")}. Identifier la cause opérationnelle de chaque écart, définir un objectif chiffré et suivre son évolution sur les prochains exercices.`:"Préserver les indicateurs favorables et mettre en place un suivi périodique des KPI.",
     trends:years.length>1?[
       `Chiffre d'affaires : ${caGrowth===null?"évolution indisponible":(caGrowth>=0?"+":"")+caGrowth.toLocaleString("fr-FR",{maximumFractionDigits:1})+" % sur le dernier exercice."}`,
       `EBE : ${ebeGrowth===null?"évolution indisponible":(ebeGrowth>=0?"+":"")+ebeGrowth.toLocaleString("fr-FR",{maximumFractionDigits:1})+" % sur le dernier exercice."}`,
       `Résultat d'exploitation : ${rexGrowth===null?"évolution indisponible":(rexGrowth>=0?"+":"")+rexGrowth.toLocaleString("fr-FR",{maximumFractionDigits:1})+" % sur le dernier exercice."}`
     ]:["Un seul exercice est disponible : l'évolution historique ne peut pas encore être établie."]
   };
 },[diffs,current]);

 return <main className="content">
  <header className="pageHero"><div><div className="eyebrow">COMPARAISONS</div><h1>Comparer les performances</h1><p>Une lecture à trois niveaux : société, portefeuille du cabinet et marché.</p></div></header>
  {!current?<div className="emptyState">Aucune société disponible.</div>:<>
  <section className="compareControls panel"><div className="selectField"><label>Société analysée</label><select value={current.id} onChange={e=>{setSelected(e.target.value);setPeer("")}}>{list.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="sectorReference"><Scale size={18}/><div><span>Secteur cabinet</span><b>{resolvedSector||"Secteur à classer"}</b></div></div><div className="sectorReference marketRef"><Globe2 size={18}/><div><span>Référence marché</span><b>{market?.label||"Référence à rechercher"}</b></div></div><div className="sectorCount"><Users size={14}/><b>{internal.count}</b> société{internal.count>1?"s":""} analysée{internal.count>1?"s":""}</div></section>
  <section className="compareHero"><div><div className="eyebrow">SOCIÉTÉ VS RÉFÉRENCES</div><h2>{current.name}</h2><p>{current.naf||"NAF à renseigner"} · {resolvedSector||"Secteur à classer"}</p></div><div className="compareHeroText">{internal.count<3?"Le benchmark cabinet reste indicatif avec une petite population.":globalScore>=3?"La société se positionne favorablement sur la majorité des indicateurs comparables.":globalScore<=-3?"Plusieurs indicateurs sont en retrait par rapport aux références.":"Le positionnement est contrasté : certains indicateurs sont favorables, d'autres nécessitent une vigilance."}</div></section>
  <section className="panel"><div className="panelHead"><div><h2>Comparaison KPI</h2><p>Le marché est affiché uniquement lorsque la définition publiée est suffisamment comparable au KPI NOVACAB Insight.</p></div></div><div className="comparisonTable"><div className="comparisonHeader"><div>KPI</div><div>Votre société</div><div>Médiane secteur<br/>cabinet</div><div>Médiane secteur<br/>marché</div></div>{diffs.map(m=>{const favorable=m.diff===null?false:(m.positive?m.diff>=0:m.diff<=0);const mv=marketValue(market,m.key);return <div className="comparisonRow" key={m.key}><div className="comparisonName"><b>{m.name}</b>{m.key==="tmg"&&<small>Diff. TMG cabinet</small>}</div><div><span>Votre société</span><strong>{fmt(m.company,m.u)}</strong></div><div><span>Médiane cabinet</span><strong>{fmt(m.median,m.u)}</strong></div><div className="marketCell"><span>{marketLabel(m.key)}</span><strong>{fmt(mv,m.u)}</strong>{mv!==null&&<small>Q1 {fmt(market[m.key].q1,m.u)} · Q3 {fmt(market[m.key].q3,m.u)}</small>}</div><div className={m.diff===null?"comparisonDiff":"comparisonDiff "+(favorable?"good":"bad")}>{m.diff===null?<Minus size={12}/>:<>{icon(m.diff)} {m.u==="€"?fmt(Math.abs(m.diff),"€"):m.u==="x"?`${Math.abs(m.diff).toFixed(2)} x`:`${Math.abs(m.diff).toFixed(1)} %`}</>}</div></div>})}</div></section>
  <section className="marketSource panel"><div><Globe2 size={17}/><div><b>Référence marché · {market?.label||"non disponible pour ce secteur"}</b><p>{MARKET_SOURCE}. Les données publiques sont utilisées sans inventer de conversion entre définitions comptables.</p></div></div>{market&&<span className="status good">2024</span>}</section>
  <section className="interpretationGrid comparisonInterpretation">{diffs.map(m=>{const mv=marketValue(market,m.key);return <article className="interpretationCard" key={m.key}><span>{m.name}</span><b>{m.diff===null?`${m.name} : comparaison cabinet indisponible faute de données suffisantes.`:`Cabinet : ${m.positive?(m.company>=m.median?"au-dessus":"en dessous"):(m.company<=m.median?"meilleur":"moins favorable")} de la médiane.`}</b><p className="marketInterpretation">Marché : {mv===null?marketNote(m.key,market):`${fmt(m.company,m.u)} vs médiane ${fmt(mv,m.u)}.`}</p>{m.key==="tmg"&&m.diff!==null&&<em className={m.diff>=0?"good":"bad"}>Diff. TMG cabinet : {m.diff>=0?"+":""}{m.diff.toFixed(1)} pts</em>}</article>})}</section>
  
  <section className="panel sectorDetailPanel">
    <div className="panelHead">
      <div>
        <h2>Analyse sectorielle détaillée</h2>
        <p>Référentiel marché 2024 · comparaison de la société avec la médiane, le 1er quartile et le 3e quartile du secteur. Les indicateurs non comparables restent explicitement signalés.</p>
      </div>
    </div>
    {market ? <div className="sectorDetailGrid">
      {[
        ["Taux de marge commerciale","commercialMargin","%","Taux de marge commerciale"],
        ["Taux de marge","margin","%","Taux de marge"],
        ["Taux de valeur ajoutée","valueAddedRate","%","Taux de valeur ajoutée"],
        ["BFR d'exploitation","bfrDays","j","Poids du BFR d'exploitation"],
        ["Délai clients","customerDays","j","Délai net de règlement des clients"],
        ["Délai fournisseurs","supplierDays","j","Délai net de règlement aux fournisseurs"],
        ["Poids des stocks","stockDays","j","Poids des stocks"],
        ["Taux d'investissement","investmentRate","%","Taux d'investissement d'exploitation"],
        ["Rendement de la main-d'œuvre","labourYield","m €","Rendement de la main d'oeuvre"],
        ["Coût apparent de la main-d'œuvre","labourCost","m €","Coût apparent de la main d'oeuvre"],
        ["Rendement du capital d'exploitation","capitalYield","%","Rendement du capital d'exploitation"],
        ["Taux brut d'endettement financier","grossDebtRate","%","Taux brut d'endettement financier"]
      ].map(([label,key,unit,marketKey]) => {
        const mm = market?.excelMetrics?.[marketKey];
        let companyValue = null;
        if (key==="commercialMargin") companyValue = r.ca ? (n(y.ca)-n(y.purchases))/n(y.ca)*100 : null;
        if (key==="margin") companyValue = r.ca ? (n(y.ebe))/n(y.ca)*100 : null;
        if (key==="valueAddedRate") companyValue = r.ca ? n(y.valueAdded)/n(y.ca)*100 : null;
        if (key==="bfrDays") companyValue = r.ca ? n(y.bfr)/n(y.ca)*365 : null;
        if (key==="customerDays") companyValue = r.ca ? n(y.client)/n(y.ca)*365 : null;
        if (key==="supplierDays") companyValue = r.ca ? n(y.supplier)/n(y.ca)*365 : null;
        if (key==="stockDays") companyValue = r.ca ? n(y.stock)/n(y.ca)*365 : null;
        if (key==="investmentRate") companyValue = r.ca ? (n(y.depr)/n(y.ca))*100 : null;
        if (key==="labourYield") companyValue = n(y.personnel) ? n(y.ca)/n(y.personnel) : null;
        if (key==="labourCost") companyValue = n(y.personnel) ? n(y.personnel)/Math.max(1,n(y.ca))*100 : null;
        if (key==="capitalYield") companyValue = (n(y.equity)+n(y.debt)-n(y.treasury)) ? n(y.rex)/(n(y.equity)+n(y.debt)-n(y.treasury))*100 : null;
        if (key==="grossDebtRate") companyValue = r.ca ? n(y.debt)/n(y.ca)*100 : null;
        const med = mm?.q2 ?? null, q1 = mm?.q1 ?? null, q3 = mm?.q3 ?? null;
        const fmtD = v => v===null || v===undefined || !Number.isFinite(Number(v)) ? "—" : `${Number(v).toLocaleString("fr-FR",{maximumFractionDigits:1})} ${unit}`;
        const gap = companyValue!==null && med!==null ? companyValue-med : null;
        const direction = ["bfrDays","customerDays","supplierDays","stockDays","labourCost","grossDebtRate"].includes(key) ? -1 : 1;
        const status = gap===null ? "" : (gap*direction >= 0 ? "good" : "bad");
        return <article className="sectorMetricCard" key={key}>
          <div className="sectorMetricHead"><b>{label}</b><span>{status==="good"?"Favorable":status==="bad"?"À surveiller":"Indicatif"}</span></div>
          <div className="sectorMetricMain"><strong>{fmtD(companyValue)}</strong><small>Société</small></div>
          <div className="sectorMetricRef"><span>Q1 {fmtD(q1)}</span><b>Médiane {fmtD(med)}</b><span>Q3 {fmtD(q3)}</span></div>
          {gap!==null && <p>{gap>=0?"+":""}{gap.toLocaleString("fr-FR",{maximumFractionDigits:1})} {unit} vs médiane. {direction>0 ? (gap>=0?"La société se situe au-dessus du niveau médian.":"La société se situe sous le niveau médian.") : (gap<=0?"La société présente un niveau inférieur à la médiane, généralement favorable pour cet indicateur.":"La société présente un niveau supérieur à la médiane, à surveiller.")}</p>}
        </article>;
      })}
    </div> : <div className="emptyState compact">Aucune donnée de référence marché disponible pour ce secteur.</div>}
  </section>

  
  <section className="panel narrativePanel">
    <div className="panelHead"><div>
      <h2>Diagnostic financier automatique</h2>
      <p>Lecture rédigée à partir des KPI comparables, de la médiane du cabinet et du référentiel sectoriel.</p>
    </div><span className={"status "+(narrative.profile==="Plutôt favorable"?"good":narrative.profile==="Sous surveillance"?"bad":"")}>{narrative.profile}</span></div>
    <div className="narrativeSummary"><h3>Synthèse dirigeant</h3><p>{narrative.synthesis}</p></div>
    <div className="narrativeGrid">
      <article><h3>Forces</h3><p>{narrative.strengths}</p></article>
      <article><h3>Points de vigilance</h3><p>{narrative.risks}</p></article>
      <article><h3>Priorités d'action</h3><p>{narrative.actions}</p></article>
      <article><h3>Qualité de comparaison</h3><p>{internal.count<3?"La comparaison cabinet reste indicative car la population comparable est faible. ":""}Les références marché ne sont utilisées que lorsque leur définition est suffisamment comparable au KPI NOVACAB Insight. Les indicateurs Banque de France peuvent avoir des populations différentes selon le dénominateur.</p></article>
    </div>
  </section>


  <section className="panel reportPanel">
    <div className="panelHead"><div>
      <h2>Rapport de diagnostic financier</h2>
      <p>Pré-diagnostic automatique pour préparer l'analyse du dossier et l'entretien avec le dirigeant.</p>
    </div><span className={"riskBadge "+(narrative.severity==="Élevée"?"high":narrative.severity==="Modérée"?"medium":"low")}>{narrative.profile}</span></div>

    <div className="reportKpis">
      <div><span>Indice NOVACAB Insight</span><strong>{narrative.score}/100</strong><small>indicateur interne de hiérarchisation, pas une note bancaire</small></div>
      <div><span>Risque structurel</span><strong>{narrative.severity}</strong><small>à confirmer avec le contexte du dossier</small></div>
      <div><span>Exercices disponibles</span><strong>{narrative.years.length}</strong><small>pour l'analyse historique</small></div>
    </div>

    <div className="reportSection"><h3>1 · Situation et verdict</h3><p>{narrative.synthesis}</p><p>{globalText}</p></div>

    <div className="reportColumns">
      <article className="reportBox"><h3>2 · Forces à valoriser</h3><p>{narrative.strengths}</p></article>
      <article className="reportBox"><h3>3 · Risques à traiter</h3><p>{narrative.risks}</p></article>
    </div>

    <div className="reportSection"><h3>4 · Évolution historique</h3>
      <div className="trendList">{narrative.trends.map((t,i)=><div key={i}>{t}</div>)}</div>
    </div>

    <div className="reportSection"><h3>5 · Plan d'action priorisé</h3>
      <ol className="actionList">
        <li>{narrative.actions}</li>
        <li>Comparer les écarts aux exercices précédents afin de distinguer un accident ponctuel d'une tendance structurelle.</li>
        <li>Documenter avec le dirigeant les causes des principaux écarts et les mesures correctrices prévues.</li>
      </ol>
    </div>

    <div className="reportSection methodology"><h3>6 · Avis et limites</h3>
      <p>L'avis NOVACAB Insight est un outil d'aide à la décision. Il ne constitue ni une notation bancaire ni une conclusion d'audit. Les références sectorielles sont utilisées uniquement lorsqu'elles sont suffisamment comparables aux KPI NOVACAB Insight. Les données FEC et les exercices atypiques doivent être contrôlés avant diffusion au client.</p>
    </div>
  </section>

<section className="panel"><div className="panelHead"><div><h2>Analyse globale</h2><p>Lecture synthétique du positionnement de la société face au cabinet et au marché.</p></div></div><div className="globalCompareText"><p>{globalText}</p></div></section>
  <section className="panel"><div className="panelHead"><div><h2>Comparer deux sociétés</h2><p>Comparez les mêmes KPI entre deux dossiers du même secteur.</p></div><div className="searchBox"><Search size={14}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher une société..."/></div></div><div className="pairSelectors"><select value={current.id} onChange={e=>{setSelected(e.target.value);setPeer("")}}>{list.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><span>vs</span><select value={peer} onChange={e=>setPeer(e.target.value)}><option value="">Choisir une société</option>{peers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>{selectedPeer&&<><div className="pairTable"><div className="pairHead"><span>KPI</span><b>{current.name}</b><b>{selectedPeer.name}</b></div>{metrics.map(([name,key,u])=><div className="pairLine" key={key}><span>{name}</span><b>{fmt(val(r,key),u)}</b><b>{fmt(val(peerR,key),u)}</b></div>)}</div></>}{!selectedPeer&&<div className="emptyState compact">Sélectionnez une seconde société analysée du même secteur.</div>}</section>
  <section className="dangerZone panel"><div><b>Gestion du dossier</b><p>Vous pouvez retirer ce dossier et les exercices FEC associés si un fichier a été importé par erreur.</p></div><button className="deleteButton" onClick={()=>onDeleteCompany?.(current)}><Trash2 size={14}/> Supprimer le dossier et ses FEC</button></section>
  </>}
 </main>;
}
