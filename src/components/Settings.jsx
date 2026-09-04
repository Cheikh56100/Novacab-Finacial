import React, {useState} from "react";
import {Building2, Save, Download, Trash2, AlertTriangle} from "lucide-react";

export default function Settings({cabinetName, onCabinetNameChange, companies, users, cloudMode=false}) {
  const [name, setName] = useState(cabinetName);
  const [notice, setNotice] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const save = () => {
    onCabinetNameChange(name.trim() || "Cabinet");
    setNotice("Enregistré");
    window.clearTimeout(window.__nfiSettingsNotice);
    window.__nfiSettingsNotice = window.setTimeout(() => setNotice(""), 1800);
  };

  const exportBackup = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      cabinetName,
      companies,
      users
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nfi-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetData = () => {
    localStorage.removeItem("nfi-companies-v3");
    localStorage.removeItem("nfi-assignments-v1");
    localStorage.removeItem("nfi-confidential-access-v2");
    localStorage.removeItem("nfi-users-v1");
    localStorage.removeItem("nfi-cabinet-v1");
    window.location.reload();
  };

  return (
    <main className="content">
      <header className="pageHero">
        <div>
          <div className="eyebrow">ADMINISTRATION · PARAMÈTRES</div>
          <h1>Paramètres</h1>
          <p>Identité du cabinet et gestion des données locales.</p>
        </div>
      </header>

      {notice && <div className="saveNotice"><Save size={14}/>{notice}</div>}

      <section className="panel" style={{padding: "24px", marginBottom: "20px"}}>
        <div className="panelHead">
          <div>
            <h2><Building2 size={16} style={{verticalAlign: "-3px", marginRight: "6px"}}/>Identité du cabinet</h2>
            <p>Ce nom apparaît dans la barre latérale et sur les exports.</p>
          </div>
        </div>
        <label className="forecastField" style={{maxWidth: "380px"}}>
          Nom du cabinet
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom du cabinet"/>
        </label>
        <button className="primary" style={{marginTop: "14px"}} onClick={save}><Save size={15}/> Enregistrer</button>
      </section>

      <section className="panel" style={{padding: "24px", marginBottom: "20px"}}>
        <div className="panelHead">
          <div>
            <h2>Données</h2>
            <p>{cloudMode ? "Vos dossiers, exercices et droits sont stockés dans Supabase." : "Mode local : les données restent dans ce navigateur tant que Supabase n’est pas configuré."}</p>
          </div>
        </div>
        <div className="adminStats" style={{marginBottom: "14px"}}>
          <span><Building2 size={14}/>{companies.length} dossier(s)</span>
          <span>{users.length} collaborateur(s)</span>
        </div>
        <button className="secondaryAction" onClick={exportBackup}><Download size={14}/> Exporter une sauvegarde (JSON)</button>
      </section>

      <section className="panel" style={{padding: "24px", borderColor: "#e8b4b4"}}>
        <div className="panelHead">
          <div>
            <h2 style={{color: "#b23b3b"}}><AlertTriangle size={16} style={{verticalAlign: "-3px", marginRight: "6px"}}/>Zone sensible</h2>
            <p>Réinitialise tous les dossiers, collaborateurs et droits d'accès enregistrés dans ce navigateur.</p>
          </div>
        </div>
        {!confirmReset
          ? <button className="secondaryAction" onClick={() => setConfirmReset(true)}><Trash2 size={14}/> Réinitialiser les données</button>
          : <div>
              <p style={{marginBottom: "10px"}}><b>Confirmez :</b> cette action est irréversible.</p>
              <button className="secondaryAction" onClick={resetData} style={{marginRight: "10px"}}>Oui, tout réinitialiser</button>
              <button className="secondaryAction" onClick={() => setConfirmReset(false)}>Annuler</button>
            </div>
        }
      </section>
    </main>
  );
}
