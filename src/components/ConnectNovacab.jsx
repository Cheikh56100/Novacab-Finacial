import React, {useState} from "react";
import {UploadCloud, FileCheck2, AlertCircle, Building2, ArrowRight, ShieldCheck, Users, Link2, PlusCircle, RefreshCcw} from "lucide-react";
import {parseNovacabWorkbook, buildConnectionPlan, applyConnectionPlan} from "../services/novacabConnect";
import {saveCompany} from "../services/nfiRepository";

export default function ConnectNovacab({companies, users, assignments, onCompaniesChange, onUsersChange, onAssignmentsChange, onDone, cloudUserId}) {
  const [status, setStatus] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [plan, setPlan] = useState(null);
  const [applied, setApplied] = useState(false);

  const handle = async e => {
    const f = e.target.files?.[0];
    if (!f) return;
    setApplied(false);
    try {
      const data = await parseNovacabWorkbook(f);
      const nextPlan = buildConnectionPlan(data, companies, users);
      setParsed(data);
      setPlan(nextPlan);
      setStatus({type: "success", text: `${data.clients.length} ligne(s) client lue(s)${data.teamSheetName ? ` · feuille "${data.teamSheetName}" détectée` : " · pas de feuille Équipe"}.`});
    } catch (err) {
      setParsed(null); setPlan(null);
      setStatus({type: "error", text: err.message});
    }
    e.target.value = "";
  };

  const validate = async () => {
    if (!plan) return;
    try {
      const result = applyConnectionPlan(plan, {companies, users, assignments});
      let savedCompanies = result.companies;
      if (cloudUserId) {
        const byId = new Map(companies.map(c => [c.id, c]));
        for (const c of result.companies) {
          if (!byId.has(c.id) || c.naf || c.sector || c.novacabClientId) {
            const saved = await saveCompany(c, cloudUserId);
            savedCompanies = savedCompanies.map(x => x.id === c.id ? saved : x);
          }
        }
      }
      onCompaniesChange(savedCompanies);
      onUsersChange(result.users);
      onAssignmentsChange(result.assignments);
      setApplied(true);
      setStatus({type: "success", text: "Connexion appliquée : dossiers, NAF et organigramme mis à jour."});
    } catch (err) {
      setStatus({type:"error", text:err.message || "Synchronisation impossible."});
    }
  };

  return <main className="content">
    <header className="pageHero">
      <div>
        <div className="eyebrow">DONNÉES · CONNECTEUR</div>
        <h1>Compléter la connexion Novacab</h1>
        <p>NFI est déjà connecté au même Supabase que Novacab : les dossiers et collaborateurs du cabinet sont chargés automatiquement. Cet import Excel reste disponible uniquement pour enrichir ou reprendre un ancien rapprochement.</p>
      </div>
    </header>

    <section className="importHero panel">
      <div className="uploadIcon"><Link2 size={30}/></div>
      <h2>Import complémentaire Novacab</h2>
      <p>.xlsx · optionnel · utilisé seulement pour enrichir des données historiques ou compléter un ancien rapprochement.</p>
      <label className="uploadButton"><UploadCloud size={16}/> Choisir le fichier<input type="file" accept=".xlsx,.xls" onChange={handle}/></label>
      {status && <div className={status.type === "success" ? "importStatus success" : "importStatus error"}>{status.type === "success" ? <FileCheck2 size={17}/> : <AlertCircle size={17}/>} {status.text}</div>}
    </section>

    {plan && <section className="panel recognized">
      <div className="eyebrow">APERÇU DU RAPPROCHEMENT · À VALIDER</div>
      <div className="fecSummary">
        <div><b>{plan.matches.length}</b><span>dossier(s) enrichi(s) (NAF/secteur)</span></div>
        <div><b>{plan.newPending.length}</b><span>nouveau(x) dossier(s) en attente de FEC</span></div>
        <div><b>{plan.teamMatched.length}</b><span>collaborateur(s) reconnu(s)</span></div>
        <div><b>{plan.teamNew.length}</b><span>nouveau(x) collaborateur(s)</span></div>
      </div>

      {plan.skipped.length > 0 && <div className="notice warningNotice"><AlertCircle size={14}/><div>{plan.skipped.length} ligne(s) ignorée(s) : SIREN absent ou invalide (9 chiffres attendus).</div></div>}

      {plan.matches.length > 0 && <div className="detailBlock">
        <h3><ShieldCheck size={13}/> Dossiers existants enrichis</h3>
        <div className="miniAccessList">
          {plan.matches.slice(0, 12).map(m => <div key={m.company.id}><span>{m.company.name}</span><small>NAF {m.changes.naf || "—"} · {m.changes.sector || "À classer"}</small></div>)}
        </div>
        {plan.matches.length > 12 && <p style={{fontSize: 10, color: "#8a98aa", marginTop: 6}}>+ {plan.matches.length - 12} autre(s) dossier(s)</p>}
      </div>}

      {plan.newPending.length > 0 && <div className="detailBlock">
        <h3><PlusCircle size={13}/> Nouveaux dossiers en attente de FEC</h3>
        <div className="miniAccessList">
          {plan.newPending.slice(0, 12).map(row => <div key={row.siren}><span>{row.nom || `Société ${row.siren}`}</span><small>SIREN {row.siren} · NAF {row.naf || "—"}</small></div>)}
        </div>
        {plan.newPending.length > 12 && <p style={{fontSize: 10, color: "#8a98aa", marginTop: 6}}>+ {plan.newPending.length - 12} autre(s) dossier(s)</p>}
      </div>}

      {(plan.teamMatched.length > 0 || plan.teamNew.length > 0) && <div className="detailBlock">
        <h3><Users size={13}/> Organigramme</h3>
        <div className="miniAccessList">
          {plan.teamMatched.map(t => <div key={`m-${t.name}`}><span>{t.name}</span><small>{t.role} · déjà présent dans NFI</small></div>)}
          {plan.teamNew.map(t => <div key={`n-${t.name}`}><span>{t.name}</span><small>{t.role} · à créer</small></div>)}
        </div>
      </div>}

      <button className="primary fullButton" onClick={validate}><Building2 size={15}/> Valider la connexion <ArrowRight size={15}/></button>
    </section>}

    {applied && <section className="panel">
      <div className="notice qualityOk"><FileCheck2 size={14}/><div>Les dossiers, le NAF et l'organigramme sont à jour. Les nouveaux dossiers "en attente de FEC" apparaissent dans <b>Mes dossiers</b> ; ouvrez-les pour importer leur FEC dès qu'il sera disponible.</div></div>
      <div style={{display: "flex", gap: 10, marginTop: 12}}>
        <button className="secondaryAction" onClick={() => onDone?.("companies")}><Building2 size={14}/> Voir mes dossiers</button>
        <button className="secondaryAction" onClick={() => onDone?.("organization")}><Users size={14}/> Voir l'organigramme</button>
        <button className="secondaryAction" onClick={() => { setPlan(null); setParsed(null); setApplied(false); setStatus(null); }}><RefreshCcw size={14}/> Nouvelle connexion</button>
      </div>
    </section>}
  </main>;
}
