import React from "react";
import { BarChart3, BriefcaseBusiness, GitCompare, Network } from "lucide-react";

export default function Sidebar({page,setPage}) {
  const items = [
    ["dashboard","Accueil",BarChart3],
    ["companies","Mes dossiers",BriefcaseBusiness],
    ["sector","Secteur",Network],
    ["benchmark","Comparer",GitCompare],
  ];
  return <aside className="sidebar">
    <button className="brand" onClick={()=>setPage("dashboard")} aria-label="Accueil NFI">
      <div className="brandMark">NFI</div>
      <div className="brandSub">Financial Intelligence</div>
    </button>
    <div className="navCaption">ANALYSE FINANCIÈRE</div>
    <nav>{items.map(([id,label,Icon])=><button key={id} className={page===id?"nav active":"nav"} onClick={()=>setPage(id)}><Icon size={17}/><span>{label}</span></button>)}</nav>
    <div className="sidebarBottom"><div className="cabinetBadge"><span className="onlineDot"/> NFI</div><small>Analyse financière indépendante</small></div>
  </aside>;
}
