import React, {useMemo, useState} from "react";
import {Building2, ChevronDown, ChevronRight, GripVertical, LockKeyhole, Plus, Save, ShieldCheck, Trash2, UserRound, Users} from "lucide-react";

const ROLES = ["Expert-comptable", "Chef de mission", "Collaborateur", "Collaboratrice"];

export default function Organization({cloudMode=false, companies, assignments={}, onAssignmentsChange, confidentialAccess={}, onConfidentialAccessChange, onToggleConfidential, users=[], onUsersChange}) {
  const [selectedUser, setSelectedUser] = useState(users[0]?.id || "");
  const [selectedCompany, setSelectedCompany] = useState(companies[0]?.id || "");
  const [expanded, setExpanded] = useState({root:true});
  const [notice, setNotice] = useState("");
  const [dragCompany, setDragCompany] = useState(null);
  const [newUser, setNewUser] = useState({name:"", role:"Collaborateur", managerId: users[0]?.id || ""});
  const selected = users.find(u => u.id === selectedUser) || users[0] || {id:"", name:"—", role:""};
  const children = id => users.filter(u => u.managerId === id);

  const assignedTo = userId => companies.filter(c => (assignments[c.id] || []).includes(userId));
  const teamIds = useMemo(() => {
    if (!selected.id) return [];
    const ids = [selected.id];
    const walk = id => users.filter(u => u.managerId === id).forEach(u => { ids.push(u.id); walk(u.id); });
    walk(selected.id);
    return ids;
  }, [selected.id, users]);

  const accessible = useMemo(() => companies.filter(c => {
    if (c.confidential) return (confidentialAccess[c.id] || []).includes(selected.id);
    if (selected.role === "Expert-comptable") return true;
    return teamIds.some(id => (assignments[c.id] || []).includes(id));
  }), [companies, assignments, confidentialAccess, selected, teamIds]);

  const saveNotice = text => { setNotice(text); window.clearTimeout(window.__nfiNotice); window.__nfiNotice = window.setTimeout(() => setNotice(""), 1800); };

  const assign = (companyId, userId) => {
    const current = assignments[companyId] || [];
    const next = current.includes(userId) ? current.filter(x => x !== userId) : [...current, userId];
    onAssignmentsChange({...assignments, [companyId]: next});
    saveNotice("Attribution enregistrée");
  };

  const dropOnUser = userId => {
    if (!dragCompany) return;
    const current = assignments[dragCompany] || [];
    if (!current.includes(userId)) onAssignmentsChange({...assignments, [dragCompany]: [...current, userId]});
    setDragCompany(null); saveNotice("Dossier affecté");
  };

  const toggleAccess = (companyId, userId) => {
    const current = confidentialAccess[companyId] || [];
    const next = current.includes(userId) ? current.filter(x => x !== userId) : [...current, userId];
    onConfidentialAccessChange({...confidentialAccess, [companyId]: next});
    saveNotice("Accès confidentiel enregistré");
  };

  const addUser = () => {
    if (cloudMode) { saveNotice("Les comptes collaborateurs se créent dans NOVACAB puis apparaissent automatiquement dans NFI."); return; }
    const name = newUser.name.trim();
    if (!name) return;
    const id = `u-${Date.now().toString(36)}${Math.random().toString(36).slice(2,5)}`;
    const next = [...users, {id, name, role: newUser.role, managerId: newUser.managerId || null}];
    onUsersChange(next);
    setNewUser({name:"", role:"Collaborateur", managerId: users[0]?.id || ""});
    saveNotice("Collaborateur ajouté");
  };

  const removeUser = id => {
    const person = users.find(u => u.id === id);
    if (!person) return;
    if (users.length <= 1) { saveNotice("Impossible : au moins un collaborateur est requis"); return; }
    if (!window.confirm(`Supprimer ${person.name} ? Ses éventuels subordonnés seront rattachés à son responsable.`)) return;
    const next = users
      .filter(u => u.id !== id)
      .map(u => u.managerId === id ? {...u, managerId: person.managerId} : u);
    onUsersChange(next);
    const cleanedAssignments = Object.fromEntries(Object.entries(assignments).map(([cId, ids]) => [cId, (ids||[]).filter(x => x !== id)]));
    onAssignmentsChange(cleanedAssignments);
    const cleanedConf = Object.fromEntries(Object.entries(confidentialAccess).map(([cId, ids]) => [cId, (ids||[]).filter(x => x !== id)]));
    onConfidentialAccessChange(cleanedConf);
    if (selectedUser === id) setSelectedUser(next[0]?.id || "");
    saveNotice("Collaborateur supprimé");
  };

  const render = u => {
    const kids = children(u.id), open = expanded[u.id];
    return <div className="orgNode" key={u.id}>
      <button className={`orgPerson ${selectedUser === u.id ? "selectedOrg" : ""}`} onClick={() => setSelectedUser(u.id)} onDragOver={e => e.preventDefault()} onDrop={() => dropOnUser(u.id)}>
        {kids.length ? <span onClick={e => {e.stopPropagation();setExpanded(x=>({...x,[u.id]:!open}))}}>{open?<ChevronDown size={14}/>:<ChevronRight size={14}/>}</span> : <span style={{width:14}}/>}
        <span className="userAvatar"><UserRound size={14}/></span><span><b>{u.name}</b><small>{u.role}</small></span>
        <span className="orgCount">{assignedTo(u.id).length}</span>
        <span onClick={e => {e.stopPropagation(); removeUser(u.id);}} title="Supprimer" style={{marginLeft:8,color:"#b23b3b",cursor:"pointer",display:"flex"}}><Trash2 size={13}/></span>
      </button>
      {open && kids.length > 0 && <div className="orgChildren">{kids.map(render)}</div>}
    </div>;
  };

  return <main className="content">
    <header className="pageHero"><div><div className="eyebrow">ADMINISTRATION · ORGANISATION</div><h1>Portefeuilles du cabinet</h1><p>Affectez les dossiers, visualisez les équipes et contrôlez les accès confidentiels.</p></div></header>
    {notice && <div className="saveNotice"><Save size={14}/>{notice}</div>}
    <section className="portfolioAdminBar panel">
      <div><b>Mode cabinet</b><p>Glissez un dossier vers un collaborateur pour l'affecter.</p></div>
      <div className="adminStats"><span><Users size={14}/>{users.length} utilisateurs</span><span><Building2 size={14}/>{companies.length} dossiers</span><span><LockKeyhole size={14}/>{companies.filter(c=>c.confidential).length} confidentiels</span></div>
    </section>
    <div className="orgLayout orgPremium">
      <section className="panel orgTree"><div className="panelHead"><div><h2>Organigramme</h2><p>Déposez un dossier sur une personne pour l'ajouter à son portefeuille.</p></div></div><div className="orgRoot"><Building2 size={15}/> CABINET</div>{users.length?render(users[0]):<div className="empty">Aucun collaborateur. Ajoutez-en un ci-dessous.</div>}
        <div className="detailBlock" style={{marginTop:16}}>
          <h3><Plus size={13}/> Ajouter un collaborateur</h3>
          <label className="forecastField">Nom<input value={newUser.name} onChange={e=>setNewUser({...newUser,name:e.target.value})} placeholder="Prénom Nom"/></label>
          <label className="forecastField">Rôle<select value={newUser.role} onChange={e=>setNewUser({...newUser,role:e.target.value})}>{ROLES.map(r=><option key={r}>{r}</option>)}</select></label>
          {users.length>0&&<label className="forecastField">Responsable<select value={newUser.managerId} onChange={e=>setNewUser({...newUser,managerId:e.target.value})}><option value="">Aucun (racine)</option>{users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>}
          <button className="primary" style={{marginTop:8}} onClick={addUser}><Plus size={14}/> {cloudMode?"Gérer dans NOVACAB":"Ajouter"}</button>
        </div>
      </section>
      <section className="panel orgDetails">
        <div className="eyebrow">PORTEFEUILLE</div><div className="bigUser"><span className="bigAvatar"><UserRound/></span><div><h2>{selected.name}</h2><p>{selected.role} · {assignedTo(selected.id).length} dossier(s) directement attribué(s)</p></div></div>
        <div className="detailBlock"><h3>Dossiers accessibles</h3><div className="assignedCount">{accessible.length}<span>visibles selon les droits</span></div><div className="miniAccessList">{accessible.slice(0,8).map(c=><div key={c.id}><span>{c.confidential?<><LockKeyhole size={11}/> Dossier confidentiel</>:c.name}</span><small>{c.sector}</small></div>)}{!accessible.length&&<div className="empty">Aucun dossier accessible.</div>}</div></div>
        <div className="detailBlock"><h3>Affecter un dossier</h3><select className="fullSelect" value={selectedCompany} onChange={e=>setSelectedCompany(e.target.value)}>{companies.map(c=><option key={c.id} value={c.id}>{c.confidential?"🔒 ":""}{c.name}</option>)}</select><div className="dragHint"><GripVertical size={13}/> Vous pouvez aussi glisser un dossier depuis la liste ci-dessous.</div><div className="userChecks">{users.filter(u=>u.role!=="Expert-comptable").map(u=><label key={u.id}><input type="checkbox" checked={(assignments[selectedCompany]||[]).includes(u.id)} onChange={()=>assign(selectedCompany,u.id)}/><span><b>{u.name}</b><small>{u.role}</small></span></label>)}</div></div>
        <div className="detailBlock"><h3><ShieldCheck size={13}/> Dossiers & confidentialité</h3><div className="adminCompanyList">{companies.map(c=><div className="adminCompany" key={c.id} draggable onDragStart={()=>setDragCompany(c.id)} onDragEnd={()=>setDragCompany(null)}><span className="dragHandle"><GripVertical size={15}/></span><span><b>{c.name}</b><small>{(assignments[c.id]||[]).length} attribution(s)</small></span><button className={`tinyLock ${c.confidential?"on":""}`} onClick={()=>onToggleConfidential(c.id)} title="Basculer la confidentialité"><LockKeyhole size={13}/></button>{c.confidential&&<button className="tinyAccess" onClick={()=>setSelectedCompany(c.id)}>Gérer les accès</button>}</div>)}</div>
                  {companies.find(c => c.id === selectedCompany)?.confidential && (
            <div className="confAccess">
              <b>Personnes autorisées</b>
              <p>
                Seules ces personnes peuvent ouvrir ce dossier confidentiel.
              </p>

              {users.map(u => (
                <label key={u.id}>
                  <input
                    type="checkbox"
                    checked={(confidentialAccess[selectedCompany] || []).includes(u.id)}
                    onChange={() => toggleAccess(selectedCompany, u.id)}
                  />
                  {u.name} <small>{u.role}</small>
                </label>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  </main>;
}
