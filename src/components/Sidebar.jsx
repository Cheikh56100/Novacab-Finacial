import React from "react";
import { BarChart3, BriefcaseBusiness, GitCompare, Network, FileText, BellRing, ListChecks, SlidersHorizontal } from "lucide-react";

export default function Sidebar({page,setPage}) {
  const items = [
    ["dashboard","Accueil",BarChart3],
    ["companies","Mes dossiers",BriefcaseBusiness],
    ["sector","Secteur",Network],
    ["benchmark","Comparer",GitCompare],
    ["alerts","Alertes portefeuille",BellRing],
    ["plan","Plan d’action",ListChecks],
    ["scenarios","Simuler",SlidersHorizontal],
    ["report","Rapport client",FileText],
  ];
  return <aside className="sidebar">
    <button className="brand" onClick={()=>setPage("dashboard")} aria-label="Accueil NOVACAB Insight">
      <div className="brandVisual"><img src="/novacab-mark.png" alt="NOVACAB" /></div>
      <div><div className="brandWord"><span className="brandNOVA">NOVA</span><span className="brandCAB">CAB</span></div><div className="brandSub">Insight · Intelligence financière</div></div>
    </button>
    <div className="navCaption">ANALYSE FINANCIÈRE</div>
    <nav>{items.map(([id,label,Icon])=><button key={id} className={page===id?"nav active":"nav"} onClick={()=>setPage(id)}><Icon size={17}/><span>{label}</span></button>)}</nav>
    <div className="sidebarBottom"><div className="cabinetBadge"><span className="onlineDot"/> NOVACAB Insight</div><small>Intelligence financière</small></div>
  </aside>;
}
