import React,{useEffect,useMemo,useState} from "react";
import {CheckCircle2,Circle,Plus,Trash2} from "lucide-react";
import {diagnostics} from "../services/financialEngine";
const key=c=>`nfi-action-plan:${c?.id||"none"}`;
export default function ActionPlan({company,onOpenCompany}){
 const suggestions=useMemo(()=>diagnostics(company)||[],[company]);
 const defaults=suggestions.slice(0,4).map((d,i)=>({id:`diag-${i}`,priority:d.level==="bad"?"Haute":d.level==="warning"?"Moyenne":"Basse",action:d.title,responsable:"À définir",due:"",status:"À faire",source:"Diagnostic NOVACAB Insight"}));
 const [items,setItems]=useState(()=>{try{return JSON.parse(localStorage.getItem(key(company)))||defaults}catch{return defaults}});
 useEffect(()=>{try{localStorage.setItem(key(company),JSON.stringify(items))}catch{}},[items,company]);
 useEffect(()=>{if(!items.length&&defaults.length)setItems(defaults)},[company?.id]);
 const update=(id,patch)=>setItems(xs=>xs.map(x=>x.id===id?{...x,...patch}:x));
 const add=()=>setItems(xs=>[...xs,{id:`manual-${Date.now()}`,priority:"Moyenne",action:"Nouvelle action",responsable:"À définir",due:"",status:"À faire",source:"Manuel"}]);
 return <main className="content"><header className="pageHero"><div><div className="eyebrow">NOVACAB INSIGHT · DÉCISION</div><h1>Plan d'action</h1><p>{company?.name||"Dossier"} · transformer le diagnostic en actions suivies.</p></div><button className="secondaryAction" onClick={add}><Plus size={14}/> Ajouter une action</button></header>
 <section className="panel"><div className="panelHead"><div><h2>Actions prioritaires</h2><p>Les premières actions sont proposées automatiquement à partir du diagnostic.</p></div></div>
 <div className="actionTable"><div className="actionRow actionHead"><span>Priorité</span><span>Action</span><span>Responsable</span><span>Échéance</span><span>Statut</span><span></span></div>{items.map(x=><div className="actionRow" key={x.id}><select value={x.priority} onChange={e=>update(x.id,{priority:e.target.value})}><option>Haute</option><option>Moyenne</option><option>Basse</option></select><input value={x.action} onChange={e=>update(x.id,{action:e.target.value})}/><input value={x.responsable} onChange={e=>update(x.id,{responsable:e.target.value})}/><input type="date" value={x.due||""} onChange={e=>update(x.id,{due:e.target.value})}/><select value={x.status} onChange={e=>update(x.id,{status:e.target.value})}><option>À faire</option><option>En cours</option><option>Terminé</option></select><button className="iconButton" aria-label="Supprimer l'action" onClick={()=>setItems(xs=>xs.filter(y=>y.id!==x.id))}><Trash2 size={15}/></button></div>)}</div>
 {items.length===0&&<div className="emptyState"><Circle size={18}/><b>Aucune action</b><p>Ajoutez une action ou ouvrez un dossier avec un diagnostic.</p></div>}</section>
 </main>;
}