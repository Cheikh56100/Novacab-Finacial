import React from "react";
import {Search,LogOut,ChevronDown,CheckCircle2} from "lucide-react";

export default function Topbar({onSignOut,page,companies=[],onOpenCompany,authUser}){
 const [q,setQ]=React.useState("");
 const [accountOpen,setAccountOpen]=React.useState(false);
 const [signingOut,setSigningOut]=React.useState(false);
 const accountRef=React.useRef(null);
 const results=q.trim()?companies.filter(c=>(c.name+" "+c.siren+" "+c.naf+" "+c.sector).toLowerCase().includes(q.toLowerCase())).slice(0,6):[];
 const title={dashboard:"Accueil",companies:"Mes dossiers",sector:"Analyse sectorielle",benchmark:"Comparaisons"}[page]||"NFI";
 React.useEffect(()=>{
   const close=e=>{if(accountRef.current&&!accountRef.current.contains(e.target))setAccountOpen(false)};
   document.addEventListener("mousedown",close);
   return()=>document.removeEventListener("mousedown",close);
 },[]);
 const handleSignOut=async()=>{
   if(signingOut)return;
   setSigningOut(true);
   try{await onSignOut?.();}finally{setSigningOut(false);setAccountOpen(false)}
 };
 const email=authUser?.email||"Compte Novacab";
 const initials=(email.split("@")[0]||"N").slice(0,2).toUpperCase();
 return <header className="topbar">
   <div className="topbarTitle"><span className="topbarBrand">NFI</span><span className="topbarDivider"/><b>{title}</b></div>
   <div className="topSearch"><Search size={15}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher une société..."/><kbd>⌘ K</kbd>
   {results.length>0&&<div className="searchDropdown">{results.map(c=><button key={c.id} onClick={()=>{onOpenCompany(c);setQ("")}}><span className="searchAvatar">{c.name.slice(0,2).toUpperCase()}</span><span><b>{c.name}</b><small>{c.naf||"NAF"} · {c.sector}</small></span></button>)}</div>}
   </div>
   <div className="topbarRight">
     <button className="syncPill syncPillButton" onClick={()=>setAccountOpen(v=>!v)} aria-expanded={accountOpen} title="Ouvrir le compte Novacab">
       <span className="onlineDot"/><span>Novacab connecté</span><ChevronDown size={13}/>
     </button>
     <div className="accountWrap" ref={accountRef}>
       <button className="profileButton topProfileButton" onClick={()=>setAccountOpen(v=>!v)} aria-expanded={accountOpen} title="Compte Novacab">
         <span className="profileAvatar">{initials}</span>
         <span><b>{authUser?.email?"Compte Novacab":"Compte Novacab"}</b><small>{authUser?.email||"Session active"}</small></span>
         <ChevronDown size={13}/>
       </button>
       {accountOpen&&<div className="accountMenu">
         <div className="accountMenuHead"><span className="profileAvatar">{initials}</span><div><b>Compte Novacab</b><small>{email}</small></div></div>
         <div className="accountStatus"><CheckCircle2 size={14}/><span>Connexion active</span></div>
         <button className="accountLogout" onClick={handleSignOut} disabled={signingOut}><LogOut size={14}/><span>{signingOut?"Déconnexion…":"Se déconnecter"}</span></button>
       </div>}
     </div>
   </div>
 </header>;
}
