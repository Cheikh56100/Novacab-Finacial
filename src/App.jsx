import React,{useEffect,useState} from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Dashboard from "./components/Dashboard";
import Benchmark from "./components/Benchmark";
import Companies from "./components/Companies";
import SectorExplorer from "./components/SectorExplorer";
import Import from "./components/Import";
import ClientReport from "./components/ClientReport";
import PortfolioAlerts from "./components/PortfolioAlerts";
import ActionPlan from "./components/ActionPlan";
import Scenarios from "./components/Scenarios";
import {ratios,financialScore} from "./services/financialEngine";
import AuthGate from "./components/AuthGate";
import {supabase,supabaseReady} from "./services/supabaseClient";
import {getNfiSession,loadNfiState,getCurrentNovacabUser,saveCompany,deleteCompany} from "./services/nfiRepository";

export default function App(){
 useEffect(()=>{ document.documentElement.classList.remove('dark'); document.documentElement.dataset.theme='light'; localStorage.setItem('novacab-theme','light'); },[]);
 const params=new URLSearchParams(window.location.search); const clientParam=params.get("client"); const sirenParam=params.get("siren"); const handoffParam=params.get("nfi_handoff");
 const [page,setPage]=useState(clientParam?"analysis":"companies"); const [authUser,setAuthUser]=useState(null); const [novacabUser,setNovacabUser]=useState(null); const [standaloneUser,setStandaloneUser]=useState(null); const [authReady,setAuthReady]=useState(!supabaseReady); const [syncError,setSyncError]=useState("");
 const [companies,setCompanies]=useState([]); const [portfolios,setPortfolios]=useState([]); const [selectedPortfolioIds,setSelectedPortfolioIds]=useState([]);
 const [company,setCompany]=useState(null); const [year,setYear]=useState(null); const [pendingCompany,setPendingCompany]=useState(null);
 useEffect(()=>{let active=true;if(!supabase){setCompany(companies.find(c=>String(c.novacabClientId||"")===String(clientParam)||(sirenParam&&String(c.siren||"")===String(sirenParam)))||companies[0]||null);setAuthReady(true);return;}
   getNfiSession({handoffCode: handoffParam}).then(async({user,novacabUser})=>{
    if(!active)return;
    if(user){
      try{
        const linkedUser=novacabUser || await getCurrentNovacabUser();
        setNovacabUser(linkedUser);
        if(linkedUser?.portefeuille_id){
          setAuthUser(user);
          setStandaloneUser(null);
          const state=await loadNfiState();
          if(active&&state){
            setCompanies(state.companies); setPortfolios(state.portfolios||[]); setSelectedPortfolioIds(prev=>prev.length?prev:(state.portfolios||[]).map(p=>p.id));
            const found=state.companies.find(c=>String(c.novacabClientId||"")===String(clientParam)||(sirenParam&&String(c.siren||"")===String(sirenParam)))||state.companies[0]||null;
            setCompany(found);
            setYear(found?Number(Object.keys(found.years||{}).sort().at(-1)):null);
            setSyncError("");
          }
        } else {
          setAuthUser(user);
          setStandaloneUser(user);
          const state=await loadNfiState();
          if(active&&state){
            setCompanies(state.companies); setPortfolios(state.portfolios||[]); setSelectedPortfolioIds(prev=>prev.length?prev:(state.portfolios||[]).map(p=>p.id));
            const found=state.companies.find(c=>String(c.id)===String(clientParam)||(sirenParam&&String(c.siren||"")===String(sirenParam)))||state.companies[0]||null;
            setCompany(found);
            setYear(found?Number(Object.keys(found.years||{}).sort().at(-1)):null);
            setSyncError("");
          }
        }
      }catch(e){ if(active) setSyncError(e.message||"Impossible de synchroniser le compte NOVACAB."); }
    }
    if(active)setAuthReady(true);
  }).catch(e=>{if(active){setSyncError(e.message||"Connexion NOVACAB impossible");setAuthReady(true)}});
   const {data:{subscription}}=supabase.auth.onAuthStateChange(async(_event,session)=>{
     if(!active)return;
     setAuthUser(session?.user||null);
     if(session?.user){
       try{
         const novacabUser=await getCurrentNovacabUser();
         setNovacabUser(novacabUser);
         if(novacabUser?.portefeuille_id){ setStandaloneUser(null); } else { setStandaloneUser(session.user); }
         const state=await loadNfiState();
         if(state){
           setCompanies(state.companies);
           const found=state.companies.find(c=>String(c.novacabClientId||"")===String(clientParam)||(sirenParam&&String(c.siren||"")===String(sirenParam)))||state.companies[0]||null;
           setCompany(found);setYear(found?Number(Object.keys(found.years||{}).sort().at(-1)):null);setSyncError("");
         }
       }catch(e){setSyncError(e.message||"Synchronisation NOVACAB impossible")}
     }
   });
   return()=>{active=false;subscription.unsubscribe()};
 },[]);
 useEffect(()=>{if(company){const ys=Object.keys(company.years||{}).map(Number).sort((a,b)=>a-b);setYear(y=>ys.includes(y)?y:ys.at(-1)||null)}},[company]);

 // Synchronisation temps réel avec NOVACAB :
 // lorsqu'un FEC est importé (ou qu'un dossier est modifié) dans NOVACAB,
 // NOVACAB Insight recharge automatiquement les données financières sans déconnexion.
 useEffect(()=>{
   if(!supabase || !authUser || !novacabUser?.portefeuille_id) return;
   let timer=null;
   const refresh=async()=>{
     try{
       const state=await loadNfiState();
       if(!state)return;
       setCompanies(state.companies); setPortfolios(state.portfolios||[]);
       setCompany(current=>{
         const currentId=current?.novacabClientId||current?.id;
         const found=state.companies.find(c=>String(c.novacabClientId||c.id)===String(currentId))
           || state.companies.find(c=>sirenParam&&String(c.siren||"")===String(sirenParam))
           || state.companies[0]||null;
         return found;
       });
       setSyncError("");
     }catch(e){setSyncError(e.message||"Synchronisation NOVACAB impossible");}
   };
   const scheduleRefresh=()=>{clearTimeout(timer);timer=setTimeout(refresh,500);};
   const channel=supabase.channel("nfi-novacab-live")
     .on("postgres_changes",{event:"*",schema:"public",table:"clients"},scheduleRefresh)
     .on("postgres_changes",{event:"*",schema:"public",table:"financial_imports"},scheduleRefresh)
     .on("postgres_changes",{event:"*",schema:"public",table:"nfi_exercises"},scheduleRefresh)
     .subscribe();
   return()=>{clearTimeout(timer);supabase.removeChannel(channel)};
 },[authUser,novacabUser?.portefeuille_id]);
 const visibleCompanies=selectedPortfolioIds.length?companies.filter(c=>selectedPortfolioIds.includes(String(c.cabinetId))):companies;
 const openCompany=c=>{setCompany(c);setYear(Number(Object.keys(c.years||{}).sort().at(-1))||null);setPage("analysis")};
 const addCompany=async c=>{try{const saved=await saveCompany(c,authUser?.id);setCompanies(prev=>[...prev.filter(x=>x.id!==c.id&&x.siren!==c.siren),saved]);openCompany(saved)}catch(e){setSyncError(e.message)}};
 const removeCompany=async c=>{if(!c)return;const ok=window.confirm(`Retirer les données financières NOVACAB Insight de « ${c.name} » ?\n\nLe dossier NOVACAB sera conservé si ce compte est connecté à NOVACAB. Seuls les exercices, imports FEC, analyses et prévisions NOVACAB Insight seront supprimés. Cette action est irréversible.`);if(!ok)return;try{await deleteCompany(c.id);setCompanies(prev=>prev.filter(x=>x.id!==c.id));if(company?.id===c.id){setCompany(null);setPage("companies");}}catch(e){setSyncError(e.message)}};
 if(!authReady)return <div className="loadingScreen"><div className="loadingMark">NOVACAB Insight</div><p>Connexion à votre espace NOVACAB Insight…</p></div>;
 if(supabaseReady&&!authUser)return <AuthGate onAuthenticated={setAuthUser}/>;
 return <div className="app"><Sidebar page={page} setPage={setPage}/><div className="main">{syncError&&<div className="notice warningNotice topNotice">Synchronisation : {syncError}</div>}<Topbar novacabUser={novacabUser} standaloneUser={standaloneUser} onSignOut={async()=>{try{if(supabase) await supabase.auth.signOut();setAuthUser(null);setNovacabUser(null);setStandaloneUser(null);setCompany(null);setCompanies([]);setPage("dashboard")}catch(e){setSyncError(e.message);throw e}} } page={page} companies={companies} onOpenCompany={openCompany} setPage={setPage} authUser={authUser}/>
   {page==="dashboard"&&<Home companies={visibleCompanies} setPage={setPage} onOpenCompany={openCompany} novacabUser={novacabUser} portfolios={portfolios} selectedPortfolioIds={selectedPortfolioIds} onPortfolioChange={setSelectedPortfolioIds}/>} 
   {page==="companies"&&<Companies companies={visibleCompanies} setCompany={openCompany} onAdd={()=>{setPendingCompany(null);setPage("import")}} onImportCompany={c=>{setPendingCompany(c);setPage("import")}} onDeleteCompany={removeCompany}/>} 
   {page==="analysis"&&<Dashboard company={company||visibleCompanies[0]} year={year} setYear={setYear} setPage={setPage} allCompanies={visibleCompanies}/>} 
   {page==="sector"&&<SectorExplorer companies={visibleCompanies} onOpenCompany={openCompany}/>} 
   {page==="benchmark"&&<Benchmark company={company||visibleCompanies[0]} allCompanies={visibleCompanies} setCompany={openCompany}/>} 
   {page==="import"&&<Import companies={visibleCompanies} onImported={addCompany} pendingCompany={pendingCompany} standalone={!novacabUser?.portefeuille_id}/>}
   {page==="report"&&<ClientReport company={company||visibleCompanies[0]} companies={visibleCompanies} novacabUser={novacabUser}/>} {page==="alerts"&&<PortfolioAlerts companies={visibleCompanies} onOpen={openCompany}/>} {page==="plan"&&<ActionPlan company={company||visibleCompanies[0]} onOpenCompany={openCompany}/>} {page==="scenarios"&&<Scenarios company={company||visibleCompanies[0]}/>} 
 </div></div>;
}

function Home({companies,setPage,onOpenCompany,novacabUser,portfolios,selectedPortfolioIds,onPortfolioChange}){
 const scored=companies.map(c=>{const ys=Object.keys(c.years||{}).map(Number).sort((a,b)=>a-b);const year=ys.at(-1);if(!year)return {...c,score:null,year:null};const r=ratios(c.years[year]);return {...c,score:financialScore(r),year};});
 const attention=scored.filter(c=>c.score!==null&&c.score<65).sort((a,b)=>a.score-b.score).slice(0,3);
 const missingFec=companies.filter(c=>!(c.quality?.rowCount));
 const controlled=companies.filter(c=>c.quality?.rowCount&&c.quality?.balanceBalanced).length;
 return <main className="content homePage">
  <header className="homeHero"><div><div className="eyebrow">NOVACAB INSIGHT · INTELLIGENCE FINANCIÈRE</div><h1>Le portefeuille du cabinet, en un coup d'œil.</h1><p>Identifiez immédiatement les dossiers à surveiller, comparez les entreprises et lancez les analyses utiles.</p></div><div className="novacabConnection"><span className="onlineDot"/><div><b>{novacabUser ? "NOVACAB connecté" : "Espace personnel"}</b><small>{companies.length} dossier{companies.length>1?"s":""} disponible{companies.length>1?"s":""}</small></div></div></header>
  <section className="portfolioCommandBar"><div><b>{portfolios?.length>1?"Pilotage multi-cabinets":"Pilotage du portefeuille cabinet"}</b><span>{attention.length?`${attention.length} dossier(s) prioritaire(s) à revoir aujourd'hui.`:"Aucune priorité critique détectée automatiquement."}</span></div><div className="portfolioQuick"><span>🔴 {attention.length} à surveiller</span><span>⚠ {missingFec.length} données à compléter</span><span>✓ {controlled} FEC contrôlé{controlled>1?"s":""}</span></div>{portfolios?.length>1&&<div className="portfolioPicker"><span>Comparaison</span><button className={selectedPortfolioIds?.length===portfolios.length?"selected":""} onClick={()=>onPortfolioChange?.(portfolios.map(p=>p.id))}>Tous mes cabinets</button>{portfolios.map(p=><button key={p.id} className={selectedPortfolioIds?.includes(p.id)?"selected":""} onClick={()=>{const next=selectedPortfolioIds?.includes(p.id)?selectedPortfolioIds.filter(x=>x!==p.id):[...(selectedPortfolioIds||[]),p.id];onPortfolioChange?.(next.length?next:[p.id])}}>{p.name}</button>)}</div>}</section>
  <section className="portfolioAttention">{attention.length?attention.map(c=><button key={c.id} className="attentionCard" onClick={()=>onOpenCompany(c)}><div><span>PRIORITÉ</span><b>{c.name}</b><small>{c.year} · {c.sector||"Secteur à classer"}</small></div><strong>{c.score}/100</strong></button>):<div className="emptyState compactEmpty">Aucun dossier sous 65/100. Continuez la revue des données et benchmarks.</div>}</section>
  {portfolios?.length>1&&<CabinetComparison companies={companies} portfolios={portfolios}/>}
  <section className="homeCards"><HomeCard icon="01" title="Analyser une société" text="Calculez les KPI, comprenez les causes et identifiez les comptes à contrôler." action={()=>setPage("companies")} label="Choisir une société"/><HomeCard icon="02" title="Explorer un secteur" text="Construisez une référence à partir des sociétés de votre portefeuille." action={()=>setPage("sector")} label="Explorer les secteurs"/><HomeCard icon="03" title="Comparer" text="Positionnez une société face au portefeuille et au marché." action={()=>setPage("benchmark")} label="Lancer une comparaison"/></section>
  <section className="homeRecent panel"><div className="panelHead"><div><h2>Derniers dossiers</h2><p>Accès rapide aux dossiers synchronisés depuis NOVACAB.</p></div><button className="linkButton" onClick={()=>setPage("companies")}>Voir toutes</button></div>{scored.slice(0,6).map(c=><button className="recentRow" key={c.id} onClick={()=>onOpenCompany(c)}><span className="avatar">{c.name.slice(0,2).toUpperCase()}</span><span><b>{c.name}</b><small>{c.naf||"NAF à renseigner"} · {c.sector||"Secteur à classer"}</small></span><span className="recentScore">{c.score===null?"—":`${c.score}/100`}</span><span className="recentArrow">→</span></button>)}</section>
 </main>
}
function HomeCard({icon,title,text,action,label}){return <article className="homeCard"><span className="homeCardNumber">{icon}</span><h2>{title}</h2><p>{text}</p><button onClick={action}>{label} →</button></article>}

function CabinetComparison({companies,portfolios}){
 const rows=portfolios.map(p=>{
   const cs=companies.filter(c=>String(c.cabinetId)===String(p.id)&&Object.keys(c.years||{}).length);
   const vals=cs.map(c=>{const ys=Object.keys(c.years||{}).map(Number).sort((a,b)=>a-b);const y=c.years[ys.at(-1)]||{};return {ca:Number(y.ca)||0,ebe:Number(y.ebe)||0,margin:y.ca?((Number(y.ebe)||0)/(Number(y.ca)||1))*100:null};});
   const med=k=>{const a=vals.map(v=>v[k]).filter(v=>Number.isFinite(v)).sort((a,b)=>a-b);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
   return {id:p.id,name:p.name,count:cs.length,ca:med("ca"),ebe:med("ebe"),margin:med("margin")};
 }).filter(r=>r.count);
 const f=v=>v==null?"—":new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0}).format(v)+" €";
 const fp=v=>v==null?"—":v.toLocaleString("fr-FR",{maximumFractionDigits:1})+" %";
 return <section className="panel cabinetComparisonPanel"><div className="panelHead"><div><div className="eyebrow">BENCHMARK INTER-CABINETS</div><h2>Comparer mes cabinets</h2><p>Les médianes sont calculées sur les dossiers analysés du périmètre sélectionné.</p></div><span className="pill">{rows.length} cabinet{rows.length>1?"s":""}</span></div><div className="cabinetComparisonGrid">{rows.map(r=><article key={r.id}><div><b>{r.name}</b><span>{r.count} dossier{r.count>1?"s":""}</span></div><dl><div><dt>CA médian</dt><dd>{f(r.ca)}</dd></div><div><dt>EBE médian</dt><dd>{f(r.ebe)}</dd></div><div><dt>Marge EBE médiane</dt><dd>{fp(r.margin)}</dd></div></dl></article>)}</div></section>;
}
