import React,{useState} from "react";
import {Search,ChevronRight,Database,UploadCloud,Trash2} from "lucide-react";

export default function Companies({companies=[],setCompany,onAdd,onImportCompany,onDeleteCompany}){
 const [q,setQ]=useState("");
 const list=companies.filter(c=>(c.name+" "+c.sector+" "+c.naf+" "+c.siren).toLowerCase().includes(q.toLowerCase()));
 return <main className="content">
   <header className="pageHero"><div><div className="eyebrow">DOSSIERS NOVACAB</div><h1>Mes dossiers</h1><p>Les dossiers accessibles avec votre compte Novacab.</p></div><button className="secondaryAction" onClick={onAdd}><UploadCloud size={15}/> Importer un FEC</button></header>
   <div className="toolbar"><div className="searchBox large"><Search size={16}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher une société, un secteur ou un SIREN..."/></div><span className="toolbarHint"><Database size={13}/> {companies.length} dossier{companies.length>1?"s":""}</span></div>
   <div className="companyGrid cleanCompanyGrid">{list.map(c=>{
      const years=Object.keys(c.years||{}).map(Number).sort((a,b)=>a-b); const latest=years.at(-1);
      return <article className="companyCard cleanCompanyCard" key={c.id}>
        <button className="cardMain" onClick={()=>setCompany(c)}><div className="avatar largeAvatar">{c.name.slice(0,2).toUpperCase()}</div><div className="cardText"><h3>{c.name}</h3><p>{c.naf||"NAF à renseigner"} · {c.sector||"Secteur à classer"}</p><small>{c.pending?"Dossier Novacab · données financières à importer":latest?`Dernier exercice : ${latest}`:"Dossier Novacab · aucun exercice"}</small></div><ChevronRight size={17}/></button>
        <div className="cardFooter cleanCardFooter"><span>{c.siren?`SIREN ${c.siren}`:"SIREN non renseigné"}</span><div className="cardFooterActions"><span className="sourceTag">{c.pending?"FEC à importer":"FEC disponible"}</span>{<button className="miniAction" onClick={(e)=>{e.stopPropagation();onImportCompany?.(c)}}><UploadCloud size={12}/> Importer FEC</button>}{!c.pending&&<button className="miniDelete" title="Supprimer ce FEC et ce dossier NFI" onClick={e=>{e.stopPropagation();onDeleteCompany?.(c)}}><Trash2 size={12}/> Supprimer</button>}</div></div>
      </article>})}</div>
   {!list.length&&<div className="emptyState">Aucune société ne correspond à votre recherche.</div>}
 </main>;
}
