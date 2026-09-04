import React,{useState} from "react";
import * as XLSX from "xlsx";
import {UploadCloud,FileCheck2,AlertCircle,Building2,ArrowRight,ShieldCheck} from "lucide-react";
import {parseFecRows,fecToCompany} from "../services/financialEngine";
import {nafCatalog} from "../data/naf";

function parseText(text){
 const lines=text.replace(/^\uFEFF/,"").split(/\r?\n/).filter(Boolean); if(!lines.length)return [];
 const first=lines[0], delimiter=first.includes("\t")?"\t":first.includes("|")?"|":first.includes(";")?";":",";
 const split=line=>line.split(delimiter).map(x=>x.trim().replace(/^"|"$/g,""));
 const headers=split(first); return lines.slice(1).map(line=>{const values=split(line);return Object.fromEntries(headers.map((h,i)=>[h,values[i]??""]));});
}
export default function Import({onImported,pendingCompany,companies=[],standalone=false}){
 const [status,setStatus]=useState(null),[company,setCompany]=useState(null),[selectedId,setSelectedId]=useState(pendingCompany?.id||"");
 const selectedCompany=companies.find(c=>String(c.id)===String(selectedId))||pendingCompany||null;
 const [meta,setMeta]=useState({name:selectedCompany?.name||"",siren:selectedCompany?.siren||"",naf:selectedCompany?.naf||"",sector:selectedCompany?.sector&&selectedCompany.sector!=="À classer"?selectedCompany.sector:""});
 const handle=async e=>{const f=e.target.files?.[0];if(!f)return;try{
   if(!standalone && !selectedCompany) throw new Error("Sélectionnez d'abord un dossier NOVACAB.");
   let rows=[];if(/\.(txt|csv)$/i.test(f.name))rows=parseText(await f.text());else{const wb=XLSX.read(await f.arrayBuffer(),{type:"array",cellDates:false});rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:""});}
   if(!rows.length)throw new Error("Aucune écriture détectée.");
   const result=parseFecRows(rows);
   const detected=fecToCompany(result,f.name,{siren:"",name:selectedCompany?.name||"",naf:selectedCompany?.naf||"",sector:selectedCompany?.sector||""});
   const fecSiren=String(detected.siren||"").replace(/\D/g,"").slice(0,9);
   const expectedSiren=String(selectedCompany?.siren||"").replace(/\D/g,"").slice(0,9);
   if(fecSiren && expectedSiren && fecSiren!==expectedSiren) throw new Error(`Le SIREN du FEC (${fecSiren}) ne correspond pas au dossier NOVACAB sélectionné (${expectedSiren}).`);
   const c={...detected,...(selectedCompany?{id:selectedCompany.id,novacabClientId:selectedCompany.id}:{}),name:selectedCompany?.name||detected.name||"Société",siren:expectedSiren||fecSiren,naf:selectedCompany?.naf||detected.naf||"",sector:selectedCompany?.sector&&selectedCompany.sector!=="À classer"?selectedCompany.sector:(detected.sector||"À classer")};
   setCompany(c);setMeta({name:c.name,siren:c.siren,naf:c.naf,sector:c.sector});
   setStatus({type:"success",text:`${rows.length.toLocaleString("fr-FR")} lignes · ${result.accountCount} comptes · ${Object.keys(result.years).length} exercice(s) détecté(s)`});
 }catch(err){setStatus({type:"error",text:err.message});}e.target.value="";};
 const save=()=>{if(!company)return;if(!standalone&&!selectedCompany)return;const c=standalone?{...company,pending:false}:{...company,id:selectedCompany.id,novacabClientId:selectedCompany.id,name:selectedCompany.name,siren:selectedCompany.siren,naf:selectedCompany.naf,sector:selectedCompany.sector||"À classer",pending:false};onImported(c);setCompany(c);setStatus({type:"success",text:standalone?"FEC enregistré dans votre espace personnel.":"FEC enregistré dans le dossier NOVACAB sélectionné."});};
 const sectorOptions=[...new Set(nafCatalog.map(x=>x["Secteur d'activité"]).filter(Boolean))].sort();
 return <main className="content"><header className="pageHero"><div><div className="eyebrow">DONNÉES · IMPORT FEC</div><h1>Importer un FEC</h1><p>{standalone?"Le FEC sera enregistré dans votre espace personnel, isolé des données NOVACAB.":"Le FEC est rattaché à un dossier existant de votre portefeuille NOVACAB."}</p></div></header>
 <section className="panel" style={{marginBottom:14}}><div className="eyebrow">DOSSIER NOVACAB</div><label style={{display:"block",marginTop:8,fontWeight:700}}>Sélectionner le dossier à analyser<select value={selectedId} onChange={e=>{setSelectedId(e.target.value);setCompany(null);const c=companies.find(x=>String(x.id)===String(e.target.value));if(c)setMeta({name:c.name,siren:c.siren||"",naf:c.naf||"",sector:c.sector&&c.sector!=="À classer"?c.sector:""});setStatus(null)}} style={{width:"100%",marginTop:6}}><option value="">Choisir un dossier NOVACAB…</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}{c.siren?` — ${c.siren}`:""}</option>)}</select></label>{selectedCompany&&<div className="notice qualityOk" style={{marginTop:10}}>Le FEC sera enregistré uniquement dans <b>{selectedCompany.name}</b>. NFI ne crée aucun nouveau dossier NOVACAB.</div>}</section>
 <section className="importHero panel"><div className="uploadIcon"><UploadCloud size={30}/></div><h2>Importer un FEC</h2><p>TXT, CSV, XLS ou XLSX · traitement local dans votre navigateur.</p><label className="uploadButton"><UploadCloud size={16}/> Choisir le fichier<input type="file" accept=".txt,.csv,.xlsx,.xls" onChange={handle}/></label>{status&&<div className={status.type==="success"?"importStatus success":"importStatus error"}>{status.type==="success"?<FileCheck2 size={17}/>:<AlertCircle size={17}/>} {status.text}</div>}</section>
 {company&&<section className="panel recognized"><div className="eyebrow">SOCIÉTÉ RECONNUE · À VALIDER</div><div className="recognizedRow"><span className="bigAvatar"><Building2/></span><div><h2>{company.name}</h2><p>{company.fecRows?.toLocaleString("fr-FR")} écritures · {Object.keys(company.years||{}).length} exercice(s)</p></div><span className="status good"><FileCheck2 size={13}/> FEC analysé</span></div>
 <div className="metadataGrid"><label>Nom / raison sociale<input value={meta.name} readOnly/></label><label>SIREN<input value={meta.siren} readOnly/></label><label>Code NAF<input value={meta.naf.toUpperCase()} readOnly/></label><label>Secteur<select value={meta.sector} onChange={e=>setMeta({...meta,sector:e.target.value})}><option value="">À classer</option>{sectorOptions.map(s=><option key={s}>{s}</option>)}</select></label></div>
 <div className="fecSummary"><div><b>{Object.keys(company.years).length}</b><span>exercices</span></div><div><b>{company.accountCount}</b><span>comptes</span></div><div><b>{company.periodStart||"—"}</b><span>première date</span></div><div><b>{company.periodEnd||"—"}</b><span>dernière date</span></div></div>
 <div className={`notice ${company.quality?.status==="OK"?"qualityOk":"warningNotice"}`}>
 <div><b>Contrôle qualité FEC : {company.quality?.status||"À contrôler"}</b>
 <div>{company.quality?.rowCount?.toLocaleString("fr-FR")} écritures · Débit {Math.round(company.quality?.debitTotal||0).toLocaleString("fr-FR")} € · Crédit {Math.round(company.quality?.creditTotal||0).toLocaleString("fr-FR")} €</div>
 {company.quality?.balanceBalanced?<div>✓ Balance débit/crédit équilibrée à la tolérance de contrôle.</div>:<div>⚠ Écart débit/crédit : {Math.round(company.quality?.balanceGap||0).toLocaleString("fr-FR")} €. Vérifiez le FEC avant d'utiliser les indicateurs.</div>}
 </div></div>
 {company.validation?.warnings?.length>0&&<div className="notice warningNotice"><AlertCircle size={14}/><div>{company.validation.warnings.map(w=><div key={w}>{w}</div>)}</div></div>}
 <button className="primary fullButton" disabled={!company||!selectedCompany} onClick={save}><ShieldCheck size={15}/> Enregistrer le FEC et lancer l'analyse <ArrowRight size={15}/></button></section>}
 </main>;
}
