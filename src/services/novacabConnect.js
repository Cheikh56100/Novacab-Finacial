import * as XLSX from "xlsx";
import {nafCatalog} from "../data/naf";

/* ============================================================
   CONNECTEUR NOVACAB — intégration directe Supabase NOVACAB
   ============================================================
   Le fonctionnement principal de NFI ne dépend plus d'un export Excel :
   les dossiers, utilisateurs et portefeuilles viennent directement de
   Supabase NOVACAB. Ce module conserve uniquement le parser Excel pour
   les imports/anciens flux éventuellement utilisés par l'interface.

   Ce module lit le fichier .xlsx produit par Novacab
   (Outils → Exporter les informations générales), qui contient :
   - une feuille "Clients" (Nom, SIREN, Code NAF, Collaborateur/Expert/
     Chef de mission, ...)
   - une feuille "Équipe" (Nom, Rôle) si le cabinet l'a incluse.

   Aucune API, aucun identifiant technique partagé : le SIREN (déjà connu de
   Novacab) et déjà reconnu dans les noms de fichiers FEC par NFI est la seule
   clé de rapprochement nécessaire.
*/

function normKey(k) {
  return String(k || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
export function normSiren(v) {
  return String(v || "").replace(/\D/g, "").slice(0, 9);
}
function normName(v) {
  return String(v || "").trim().toLowerCase();
}
function normNaf(v) {
  return String(v || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
}
export function sectorForNaf(naf) {
  const found = nafCatalog.find(x => normNaf(x["Code NAF"]) === normNaf(naf));
  return found?.["Secteur d'activité"] || "";
}

const CLIENT_HEADER_MAP = {
  nom: ["nom", "client", "dossier", "raisonsociale"],
  siren: ["siren", "siret"],
  collab: ["collaborateur", "collab"],
  expert: ["expert"],
  chefMission: ["chefdemission", "chefmission"],
  activite: ["activite"],
  secteur: ["secteurauto", "secteur", "secteurdactivite"],
  naf: ["codenaf", "naf", "codeape", "ape"],
  novacabClientId: ["id", "clientid", "identifiant", "identifiantclient"],
};
const TEAM_HEADER_MAP = {
  nom: ["nom"],
  role: ["role"],
  email: ["email", "mail"],
};

function buildRow(raw, map) {
  const out = {};
  Object.entries(raw).forEach(([h, v]) => {
    const nk = normKey(h);
    for (const key of Object.keys(map)) {
      if (map[key].includes(nk)) { out[key] = typeof v === "string" ? v.trim() : v; return; }
    }
  });
  return out;
}

function mapNovacabRole(raw) {
  const k = normKey(raw);
  if (k.includes("expert")) return "Expert-comptable";
  if (k.includes("chef")) return "Chef de mission";
  if (k.includes("admin")) return "Expert-comptable";
  if (k.includes("paie")) return "Collaborateur";
  return "Collaborateur";
}

// Lit le classeur Novacab et retourne les lignes brutes des deux feuilles.
export async function parseNovacabWorkbook(file) {
  const wb = XLSX.read(await file.arrayBuffer(), {type: "array"});
  if (!wb.SheetNames.length) throw new Error("Le classeur ne contient aucune feuille exploitable.");
  const clientsSheetName = wb.SheetNames.find(n => /client|infos?\s*g[ée]n[ée]rale/i.test(n)) || wb.SheetNames[0];
  const teamSheetName = wb.SheetNames.find(n => /[ée]quipe|team/i.test(n));
  const clientsRaw = XLSX.utils.sheet_to_json(wb.Sheets[clientsSheetName], {defval: ""});
  const clients = clientsRaw.map(r => buildRow(r, CLIENT_HEADER_MAP)).filter(r => r.nom || r.siren);
  if (!clients.length) throw new Error("Aucune ligne client détectée. Utilisez l'export Novacab « Informations générales ».");
  const team = teamSheetName
    ? XLSX.utils.sheet_to_json(wb.Sheets[teamSheetName], {defval: ""}).map(r => buildRow(r, TEAM_HEADER_MAP)).filter(r => r.nom)
    : [];
  return {clients, team, fileName: file.name, clientsSheetName, teamSheetName: teamSheetName || null};
}

// Construit un plan de rapprochement (aperçu) sans rien modifier.
export function buildConnectionPlan({clients, team}, companies = [], users = []) {
  const bySiren = new Map(companies.filter(c => normSiren(c.siren)).map(c => [normSiren(c.siren), c]));

  const matches = [];       // dossiers NFI existants à enrichir (NAF/secteur)
  const newPending = [];    // nouveaux dossiers "en attente de FEC"
  const skipped = [];       // lignes sans SIREN exploitable
  const clientsForAssignment = [];

  clients.forEach(row => {
    const siren = normSiren(row.siren);
    if (siren.length !== 9) { skipped.push(row); return; }
    clientsForAssignment.push(row);
    const existing = bySiren.get(siren);
    const naf = row.naf ? row.naf.toUpperCase() : "";
    const sector = row.secteur || (naf ? sectorForNaf(naf) : "") || "";
    if (existing) {
      matches.push({
        company: existing,
        row,
        changes: {naf: naf || existing.naf || "", sector: sector || existing.sector || "", novacabClientId: row.novacabClientId || existing.novacabClientId || null}
      });
    } else {
      newPending.push(row);
    }
  });

  // Réconciliation des collaborateurs : feuille "Équipe" + noms mentionnés
  // sur les dossiers (Collaborateur/Expert/Chef de mission).
  const roleHints = new Map(); // normName -> {name, role}
  (team || []).forEach(t => { if (t.nom) roleHints.set(normName(t.nom), {name: t.nom.trim(), role: mapNovacabRole(t.role)}); });
  const noteRole = (name, role) => {
    if (!name) return;
    const key = normName(name);
    const cur = roleHints.get(key);
    if (!cur) roleHints.set(key, {name: String(name).trim(), role});
    else if (cur.role === "Collaborateur" && role !== "Collaborateur") cur.role = role;
  };
  clients.forEach(row => {
    noteRole(row.collab, "Collaborateur");
    noteRole(row.expert, "Expert-comptable");
    noteRole(row.chefMission, "Chef de mission");
  });

  const existingByName = new Map(users.map(u => [normName(u.name), u]));
  const teamMatched = [];
  const teamNew = [];
  roleHints.forEach(info => {
    const existing = existingByName.get(normName(info.name));
    if (existing) teamMatched.push({...info, existing});
    else teamNew.push(info);
  });

  return {matches, newPending, skipped, teamMatched, teamNew, clientsForAssignment};
}

// Applique le plan : renvoie les nouvelles listes companies/users/assignments.
// Ne touche jamais aux données financières (years, source, quality...) des
// dossiers déjà importés depuis un FEC — seuls NAF et secteur sont enrichis.
export function applyConnectionPlan(plan, {companies, users, assignments}) {
  const nextUsers = [...users];
  const nameToUserId = new Map(users.map(u => [normName(u.name), u.id]));
  const rootId = users[0]?.id || null;

  plan.teamNew.forEach(info => {
    const id = `u-nc-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    nextUsers.push({id, name: info.name, role: info.role, managerId: rootId});
    nameToUserId.set(normName(info.name), id);
  });
  plan.teamMatched.forEach(info => nameToUserId.set(normName(info.name), info.existing.id));

  let nextCompanies = companies.map(c => ({...c}));
  const sirenToCompanyId = new Map(nextCompanies.filter(c => normSiren(c.siren)).map(c => [normSiren(c.siren), c.id]));

  plan.newPending.forEach(row => {
    const siren = normSiren(row.siren);
    const id = crypto.randomUUID();
    const naf = row.naf ? row.naf.toUpperCase() : "";
    const sector = row.secteur || (naf ? sectorForNaf(naf) : "") || "À classer";
    nextCompanies.push({
      id, novacabClientId: row.novacabClientId || null, name: row.nom || `Société ${siren}`, siren, naf, sector,
      years: {}, source: "NOVACAB", pending: true, importedAt: new Date().toISOString()
    });
    sirenToCompanyId.set(siren, id);
  });

  const changeById = new Map(plan.matches.map(m => [m.company.id, m.changes]));
  nextCompanies = nextCompanies.map(c => {
    const changes = changeById.get(c.id);
    if (!changes) return c;
    return {...c, naf: changes.naf || c.naf, sector: changes.sector || c.sector, novacabClientId: changes.novacabClientId || c.novacabClientId || null};
  });

  const nextAssignments = {...assignments};
  const addAssignment = (companyId, userId) => {
    if (!companyId || !userId) return;
    const cur = nextAssignments[companyId] || [];
    if (!cur.includes(userId)) nextAssignments[companyId] = [...cur, userId];
  };
  plan.clientsForAssignment.forEach(row => {
    const companyId = sirenToCompanyId.get(normSiren(row.siren));
    if (!companyId) return;
    [row.collab, row.expert, row.chefMission].forEach(name => {
      if (!name) return;
      const uid = nameToUserId.get(normName(name));
      if (uid) addAssignment(companyId, uid);
    });
  });

  return {companies: nextCompanies, users: nextUsers, assignments: nextAssignments};
}
