import React,{useEffect,useState} from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Dashboard from "./components/Dashboard";
import Benchmark from "./components/Benchmark";
import Companies from "./components/Companies";
import SectorExplorer from "./components/SectorExplorer";
import Import from "./components/Import";
import AuthGate from "./components/AuthGate";
import {supabase,supabaseReady} from "./services/supabaseClient";
import {getNfiSession,loadNfiState,getCurrentNovacabUser,saveCompany,deleteCompany} from "./services/nfiRepository";

export default function App(){
 const params=new URLSearchParams(window.location.search); const clientParam=params.get("client"); const sirenParam=params.get("siren"); const handoffParam=params.get("nfi_handoff");
 const [page,setPage]=useState(clientParam?"analysis":"dashboard"); const [authUser,setAuthUser]=useState(null); const [novacabUser,setNovacabUser]=useState(null); const [standaloneUser,setStandaloneUser]=useState(null); const [authReady,setAuthReady]=useState(!supabaseReady); const [syncError,setSyncError]=useState("");
 const [companies,setCompanies]=useState([]);
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
            setCompanies(state.companies);
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
            setCompanies(state.companies);
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
 const openCompany=c=>{setCompany(c);setYear(Number(Object.keys(c.years||{}).sort().at(-1))||null);setPage("analysis")};
 const addCompany=async c=>{try{const saved=await saveCompany(c,authUser?.id);setCompanies(prev=>[...prev.filter(x=>x.id!==c.id&&x.siren!==c.siren),saved]);openCompany(saved)}catch(e){setSyncError(e.message)}};
 const removeCompany=async c=>{if(!c)return;const ok=window.confirm(`Retirer les données financières NFI de « ${c.name} » ?\n\nLe dossier NOVACAB sera conservé si ce compte est connecté à NOVACAB. Seuls les exercices, imports FEC, analyses et prévisions NFI seront supprimés. Cette action est irréversible.`);if(!ok)return;try{await deleteCompany(c.id);setCompanies(prev=>prev.filter(x=>x.id!==c.id));if(company?.id===c.id){setCompany(null);setPage("companies");}}catch(e){setSyncError(e.message)}};
 if(!authReady)return <div className="loadingScreen"><div className="loadingMark">NFI</div><p>Connexion à votre espace Novacab…</p></div>;
 if(supabaseReady&&!authUser)return <AuthGate onAuthenticated={setAuthUser}/>;
 return <div className="app"><Sidebar page={page} setPage={setPage}/><div className="main">{syncError&&<div className="notice warningNotice topNotice">Synchronisation : {syncError}</div>}<Topbar novacabUser={novacabUser} standaloneUser={standaloneUser} onSignOut={async()=>{try{if(supabase) await supabase.auth.signOut();setAuthUser(null);setNovacabUser(null);setStandaloneUser(null);setCompany(null);setCompanies([]);setPage("dashboard")}catch(e){setSyncError(e.message);throw e}} } page={page} companies={companies} onOpenCompany={openCompany} setPage={setPage} authUser={authUser}/>
   {page==="dashboard"&&<Home companies={companies} setPage={setPage} onOpenCompany={openCompany} novacabUser={novacabUser}/>} 
   {page==="companies"&&<Companies companies={companies} setCompany={openCompany} onAdd={()=>{setPendingCompany(null);setPage("import")}} onImportCompany={c=>{setPendingCompany(c);setPage("import")}} onDeleteCompany={removeCompany}/>} 
   {page==="analysis"&&<Dashboard company={company||companies[0]} year={year} setYear={setYear} setPage={setPage}/>} 
   {page==="sector"&&<SectorExplorer companies={companies} onOpenCompany={openCompany}/>} 
   {page==="benchmark"&&<Benchmark company={company||companies[0]} allCompanies={companies} setCompany={openCompany}/>} 
   {page==="import"&&<Import companies={companies} onImported={addCompany} pendingCompany={pendingCompany} standalone={!novacabUser?.portefeuille_id}/>} 
 </div></div>;
}

function Home({companies,setPage,onOpenCompany,novacabUser}){return <main className="content homePage"><header className="homeHero"><div><div className="eyebrow">NFI · FINANCIAL INTELLIGENCE</div><h1>L'analyse financière, simplement.</h1><p>NFI calcule vos KPI, analyse votre secteur et positionne chaque société par rapport à ses pairs.</p></div><div className="novacabConnection"><span className="onlineDot"/><div><b>{novacabUser ? "NOVACAB connecté" : "Espace personnel"}</b><small>{companies.length} dossier{companies.length>1?"s":""} disponible{companies.length>1?"s":""}</small></div></div></header><section className="homeCards"><HomeCard icon="01" title="Analyser une société" text="Calculez les KPI financiers d'un dossier et obtenez une interprétation claire." action={()=>setPage("companies")} label="Choisir une société"/><HomeCard icon="02" title="Explorer un secteur" text="Construisez une référence à partir des sociétés de votre portefeuille Novacab." action={()=>setPage("sector")} label="Explorer les secteurs"/><HomeCard icon="03" title="Comparer" text="Comparez une société à son secteur ou plusieurs dossiers entre eux." action={()=>setPage("benchmark")} label="Lancer une comparaison"/></section><section className="homeRecent panel"><div className="panelHead"><div><h2>Mes dernières sociétés</h2><p>Accès rapide aux dossiers synchronisés depuis Novacab</p></div><button className="linkButton" onClick={()=>setPage("companies")}>Voir toutes</button></div>{companies.slice(0,5).map(c=><button className="recentRow" key={c.id} onClick={()=>onOpenCompany(c)}><span className="avatar">{c.name.slice(0,2).toUpperCase()}</span><span><b>{c.name}</b><small>{c.naf||"NAF à renseigner"} · {c.sector||"Secteur à classer"}</small></span><span className="recentArrow">→</span></button>)}</section></main>}
function HomeCard({icon,title,text,action,label}){return <article className="homeCard"><span className="homeCardNumber">{icon}</span><h2>{title}</h2><p>{text}</p><button onClick={action}>{label} →</button></article>}
