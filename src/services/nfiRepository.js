import { supabase } from "./supabaseClient";

const uuid = () => crypto.randomUUID();
const UUID_RE = /^[0-9a-f-]{36}$/i;

function clientData(client) {
  const d = client?.data || {};
  const pick = (...keys) => {
    for (const k of keys) {
      if (d?.[k] !== undefined && d?.[k] !== null && String(d[k]).trim() !== "") return d[k];
      if (client?.[k] !== undefined && client?.[k] !== null && String(client[k]).trim() !== "") return client[k];
    }
    return "";
  };
  return {
    name: String(pick("nom","raisonSociale","raison_sociale","denomination","name","societe") || `Dossier ${client?.id || ""}`).trim(),
    siren: String(pick("siren","SIREN") || "").replace(/\D/g,"").slice(0,9),
    naf: String(pick("naf","codeNaf","code_naf","NAF") || "").trim().toUpperCase(),
    sector: String(pick("secteur","sector","secteurActivite","secteur_activite","activite","activité") || "").trim(),
    portefeuilleId: pick("portefeuille_id","portefeuilleId") || null,
    collab: String(pick("collab","collaborateur") || "").trim(),
    expert: String(pick("expert") || "").trim(),
    chefMission: String(pick("chefMission","chef_mission") || "").trim(),
  };
}

function dbClientToUi(row, exercises) {
  const meta = clientData(row);
  const years = Object.fromEntries((exercises || []).map(e => {
    const k=e.quality?.account_balances||{}; const bal=(prefixes)=>Object.entries(k).filter(([a])=>prefixes.some(p=>String(a).startsWith(p))).reduce((s,[,v])=>s+Number(v||0),0);
    const equity=e.equity ?? (-bal(["10","11","12","13","14"]));
    const debt=e.debt ?? (-bal(["16"]));
    const treasury=e.treasury ?? bal(["512","53"]);
    const client=e.client ?? Math.max(bal(["41"]),0); const stock=e.stock ?? Math.max(bal(["3"]),0);
    const supplier=e.supplier ?? Math.max(-bal(["40"]),0);
    const otherReceivables=e.other_operating_receivables ?? Math.max(bal(["42","43","44","45","46","48"]),0);
    const otherLiabilities=e.other_operating_liabilities ?? Math.max(-bal(["42","43","44","45","46","48"]),0);
    const currentAssets=e.current_assets ?? client+stock+otherReceivables+treasury; const currentLiabilities=e.current_liabilities ?? supplier+otherLiabilities;
    const bfr=e.bfr ?? (client+stock+otherReceivables-supplier-otherLiabilities);
    return [String(e.fiscal_year), {ca:e.ca, ebe:e.ebe, rex:e.rex, valueAdded:e.value_added, net:e.net, treasury, debt, bfr, frng:e.frng, equity, client, stock, otherOperatingReceivables:otherReceivables, otherOperatingLiabilities:otherLiabilities, currentAssets, supplier, currentLiabilities, quality:e.quality || {}, source:e.source, import_id:e.import_id}];
  }));
  return {
    id: String(row.id),
    cabinetId: meta.portefeuilleId,
    novacabClientId: String(row.id),
    name: meta.name, siren: meta.siren, naf: meta.naf,
    sector: meta.sector || "À classer",
    confidential: false,
    source: (exercises || []).length ? "NOVACAB / FEC" : "NOVACAB",
    pending: !(exercises || []).length,
    importedAt: (exercises || []).length ? exercises[0]?.created_at : null,
    years, availableYears: Object.keys(years).map(Number).sort((a,b)=>a-b),
    _novacab: meta
  };
}

export async function getNfiSession({ handoffCode = null } = {}) {
  if (!supabase) return { session: null, user: null, novacabUser: null };

  // SSO NOVACAB -> NFI : le code est à usage unique et ne contient aucun secret.
  // L'Edge Function génère un magic-link token côté Supabase puis NFI le consomme
  // immédiatement pour établir sa propre session.
  if (handoffCode) {
    const { data, error } = await supabase.functions.invoke("nfi-sso-handoff", {
      body: { action: "exchange", code: handoffCode }
    });
    if (error) throw error;
    if (!data?.token_hash || !data?.email) throw new Error("Le lien de connexion NOVACAB est invalide ou expiré.");
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: data.token_hash
    });
    if (verifyError) throw verifyError;
    window.history.replaceState({}, document.title, `${window.location.pathname}?${new URLSearchParams([...new URLSearchParams(window.location.search)].filter(([k]) => k !== "nfi_handoff"))}`.replace(/\?$/, ""));
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const user = data.session?.user || null;
  const novacabUser = user ? await getCurrentNovacabUser() : null;
  return { session: data.session, user, novacabUser };
}

export async function signIn(email, password) {
  if (!supabase) throw new Error("Supabase n'est pas configuré. Utilisez les mêmes VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY que NOVACAB.");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email, password, fullName="") {
  if (!supabase) throw new Error("Supabase n'est pas configuré.");
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, nfi_account_type: "personal" } } });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

/**
 * Retourne le collaborateur NOVACAB correspondant à la session Supabase.
 * Aucun profil NFI n'est créé : team est la source de vérité.
 */
export async function getCurrentNovacabUser() {
  if (!supabase) return null;
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return null;
  const { data, error } = await supabase.from("team")
    .select("id,nom,email,role,statut,portefeuille_id,auth_user_id,cabinet_nom")
    .eq("auth_user_id", user.id)
    .eq("statut", "actif")
    .order("cabinet_nom", { ascending: true });
  if (error) throw error;
  if (!data?.length) return null;
  // Compatibilité avec le reste de l'application : on conserve une fiche
  // principale, mais loadNfiState travaille désormais sur TOUS les cabinets
  // auxquels l'utilisateur est rattaché.
  return {...data[0], accessiblePortfolios:data};
}

export async function loadNfiState() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const novacabUser = await getCurrentNovacabUser();
  if (!novacabUser?.portefeuille_id) return loadPersonalState(user.id);

  const [
    { data: clientRows, error: clientError },
    { data: portfolios, error: portfolioError },
    { data: financialImports, error: importError },
    { data: exercises, error: exerciseError },
    { data: team, error: teamError },
    { data: confidential, error: confError }
  ] = await Promise.all([
    supabase.rpc("nfi_list_clients"),
    supabase.rpc("nfi_list_portfolios"),
    supabase.from("financial_imports").select("id,client_id,portefeuille_id,exercice,source_type,file_name,kpis,created_at").order("created_at", { ascending: false }),
    supabase.from("nfi_exercises").select("*").order("fiscal_year", { ascending: false }),
    supabase.rpc("nfi_list_team"),
    supabase.from("nfi_confidential_access").select("client_id,user_id")
  ]);

  const firstError = clientError || portfolioError || importError || exerciseError || teamError || confError;
  if (firstError) throw firstError;

  // Source financière de vérité : les imports déjà présents dans NOVACAB.
  // On garde nfi_exercises en compatibilité pour les anciennes analyses NFI,
  // mais un dossier qui possède déjà un FEC NOVACAB est immédiatement visible.
  const byClient = new Map();
  (financialImports || []).forEach(fi => {
    const clientId = String(fi.client_id);
    const year = Number(fi.exercice || fi.kpis?.exercice || String(fi.kpis?.period_end || '').slice(0,4));
    if (!Number.isFinite(year)) return;
    const k = fi.kpis || {};
    const arr = byClient.get(clientId) || [];
    // Le premier import est le plus récent grâce au tri descendant.
    if (!arr.some(x => Number(x.fiscal_year) === year)) arr.push({
      fiscal_year: year, ca:k.ca ?? null, ebe:k.ebe ?? null, rex:k.rex ?? null,
      value_added:k.valeur_ajoutee ?? k.value_added ?? null, net:k.resultat_net ?? k.net ?? null,
      treasury:k.tresorerie_nette ?? k.treasury ?? null, debt:k.debt ?? null, bfr:k.bfr ?? null,
      frng:k.frng ?? null, equity:k.equity ?? null, client:k.client ?? null, stock:k.stock ?? null,
      other_operating_receivables:k.other_operating_receivables ?? null,
      other_operating_liabilities:k.other_operating_liabilities ?? null, current_assets:k.current_assets ?? null,
      supplier:k.supplier ?? null, current_liabilities:k.current_liabilities ?? null,
      quality:{...(k.quality||{}), source:fi.file_name, source_type:fi.source_type, imported_at:fi.created_at,
        lines:k.lines, parsed_lines:k.parsed_lines, accounts_detected:k.accounts_detected,
        months_covered:k.months_covered, period_start:k.period_start, period_end:k.period_end,
        account_balances:k.account_balances||{}, monthly_metrics:k.monthly_metrics||{}},
      source:fi.file_name, import_id:fi.id
    });
    byClient.set(clientId, arr);
  });
  // Fallback uniquement pour les exercices NFI historiques qui n'existent pas encore
  // dans financial_imports.
  (exercises || []).forEach(e => {
    const clientId=String(e.client_id); const arr=byClient.get(clientId)||[];
    if(!arr.some(x=>Number(x.fiscal_year)===Number(e.fiscal_year))) arr.push(e);
    byClient.set(clientId,arr);
  });

  const clients = clientRows || [];
  const uiCompanies = clients.map(c => dbClientToUi(c, byClient.get(String(c.id))));

  const uiPortfolios = (portfolios || []).map(p => ({ id:String(p.id), name:p.name || `Cabinet ${p.id}`, role:roleLabel(p.role), teamId:p.team_id || null }));
  const portfolioNames = new Map(uiPortfolios.map(p=>[String(p.id),p.name]));
  for (const c of uiCompanies) { c.cabinetName = portfolioNames.get(String(c.cabinetId)) || "Cabinet"; }

  const uiUsers = (team || [])
    .filter(t => t.statut !== "inactif")
    .map(t => ({
      id: t.auth_user_id || t.id,
      teamId: t.id,
      name: t.nom || t.email || "Utilisateur",
      email: t.email || "",
      role: roleLabel(t.role),
      managerId: null,
      portefeuilleId: t.portefeuille_id || null
    }));

  const uiConf = {};
  (confidential || []).forEach(a => { (uiConf[String(a.client_id)] ||= []).push(a.user_id); });

  // Les affectations de dossiers sont celles de NOVACAB : elles sont lues
  // depuis le JSON du dossier et ne sont jamais recopiées dans une table NFI.
  const uiAssignments = {};
  for (const c of clients || []) {
    const meta = clientData(c);
    const ids = [];
    const byName = new Map(uiUsers.map(u => [u.name.trim().toLowerCase(), u.id]));
    for (const name of [meta.collab, meta.expert, meta.chefMission]) {
      const id = byName.get(String(name || "").trim().toLowerCase());
      if (id) ids.push(id);
    }
    if (ids.length) uiAssignments[String(c.id)] = [...new Set(ids)];
  }

  return { companies: uiCompanies, users: uiUsers, assignments: uiAssignments, confidentialAccess: uiConf, portfolios: uiPortfolios };
}


export async function refreshNfiState() {
  const state = await loadNfiState();
  if (!state) return null;
  return state;
}

export function roleLabel(role) {
  return ({admin:"Expert-comptable",super_admin:"Expert-comptable",expert:"Expert-comptable",expert_comptable:"Expert-comptable",chef_mission:"Chef de mission",collaborateur:"Collaborateur",gestionnaire_paie:"Collaborateur"}[role] || "Collaborateur");
}
export function roleDb(role) {
  return ({"Expert-comptable":"expert","Chef de mission":"chef_mission","Collaborateur":"collaborateur"}[role] || "collaborateur");
}

export async function saveCompany(company, userId) {
  if (!supabase) return company;
  const novacabUser = await getCurrentNovacabUser();
  if (!novacabUser?.portefeuille_id) return savePersonalCompany(company, userId);
  const clientId = company.novacabClientId || company.id;
  if (!clientId) throw new Error("Le dossier NFI doit être rattaché à un dossier NOVACAB.");

  // NFI n'écrit plus dans une table companies : le dossier maître reste NOVACAB.
  const { data: clientRows, error: clientError } = await supabase.rpc("nfi_get_client", { p_client_id: String(clientId) });
  const client = clientRows?.[0] || null;
  if (clientError) throw clientError;
  if (!client) throw new Error("Dossier NOVACAB introuvable. NOVACAB Insight ne crée pas de second registre de sociétés.");

  const years = Object.entries(company.years || {}).map(([year, y]) => ({
    client_id: String(clientId), fiscal_year:Number(year), ca:y.ca ?? null, ebe:y.ebe ?? null, rex:y.rex ?? null,
    value_added:y.valueAdded ?? null, net:y.net ?? null, treasury:y.treasury ?? null, debt:y.debt ?? null, bfr:y.bfr ?? null,
    frng:y.frng ?? null, equity:y.equity ?? null, client:y.client ?? null, stock:y.stock ?? null,
    other_operating_receivables:y.otherOperatingReceivables ?? null, other_operating_liabilities:y.otherOperatingLiabilities ?? null,
    current_assets:y.currentAssets ?? null, supplier:y.supplier ?? null, current_liabilities:y.currentLiabilities ?? null,
    quality:y.quality || {}, updated_by:userId || null
  }));

  if (years.length) {
    // Compatibilité historique NFI : on conserve les exercices analytiques.
    const { error } = await supabase.from("nfi_exercises").upsert(years,{onConflict:"client_id,fiscal_year"});
    if (error) throw error;
  }

  // IMPORTANT : tout FEC importé depuis NFI doit également devenir un import
  // NOVACAB. Ainsi le FEC est visible dans Révision NOVACAB et NFI après rechargement.
  if (company.novacabFinancialKpis || company.fecRows || company.fileName || company.quality) {
    const kpisByYear = company.novacabFinancialKpis || Object.fromEntries(
      Object.entries(company.years || {}).map(([y,v]) => [y, {
        source: company.fileName || "FEC importé", imported_at:new Date().toISOString(),
        lines: company.fecRows || company.quality?.rowCount || null, ca:v.ca ?? null,
        valeur_ajoutee:v.valueAdded ?? null, ebe:v.ebe ?? null, rex:v.rex ?? null,
        resultat_net:v.net ?? null, tresorerie_nette:v.treasury ?? null, bfr:v.bfr ?? null,
        quality:v.quality || company.quality || {}
      }])
    );
    for (const [year, kpis] of Object.entries(kpisByYear)) {
      const { data: existing, error: existingError } = await supabase.from("financial_imports")
        .select("id").eq("client_id",String(clientId)).eq("exercice",Number(year)).limit(1);
      if (existingError) throw existingError;
      if (existing?.length) {
        const {error}=await supabase.from("financial_imports").update({
          portefeuille_id:client?.portefeuille_id || null, source_type:"fec", file_name:company.fileName || kpis.source || "FEC importé", kpis
        }).eq("id",existing[0].id);
        if(error) throw error;
      } else {
        const {error}=await supabase.from("financial_imports").insert({
          client_id:String(clientId), portefeuille_id:client?.portefeuille_id || null, exercice:Number(year),
          source_type:"fec", file_name:company.fileName || kpis.source || "FEC importé", kpis
        });
        if(error) throw error;
      }
    }
    const { error } = await supabase.from("nfi_fec_imports").insert({
      client_id:String(clientId), file_name:company.fileName || "FEC importé",
      row_count:company.fecRows || company.quality?.rowCount || null,
      exercise_count:Object.keys(kpisByYear).length, quality:company.quality || {}, imported_by:userId || null
    });
    if (error) throw error;
  }

  return {...company,id:String(clientId),novacabClientId:String(clientId),pending:false};
}

export async function saveAssignments() {
  // Les affectations sont gérées exclusivement dans NOVACAB.
  return;
}

export async function saveConfidentialAccess(access={}) {
  if (!supabase) return;
  const rows = Object.entries(access).flatMap(([clientId, ids]) =>
    (ids || []).filter(id => UUID_RE.test(String(id))).map(userId => ({client_id:String(clientId),user_id:userId}))
  );
  const { data: current, error: readError } = await supabase.from("nfi_confidential_access").select("client_id,user_id");
  if (readError) throw readError;
  const wanted = new Set(rows.map(r=>`${r.client_id}:${r.user_id}`));
  for (const r of (current || []).filter(r=>!wanted.has(`${r.client_id}:${r.user_id}`))) {
    const {error} = await supabase.from("nfi_confidential_access").delete().eq("client_id",r.client_id).eq("user_id",r.user_id);
    if (error) throw error;
  }
  if (rows.length) {
    const {error} = await supabase.from("nfi_confidential_access").upsert(rows,{onConflict:"client_id,user_id"});
    if (error) throw error;
  }
}

export async function deleteCompany(clientId) {
  if (!supabase) return;
  const novacabUser = await getCurrentNovacabUser();
  if (!novacabUser?.portefeuille_id) {
    const { error } = await supabase.from("nfi_personal_companies").delete().eq("id",String(clientId));
    if (error) throw error;
    return;
  }
  // Sécurité : supprimer les données financières NOVACAB Insight, jamais le dossier NOVACAB.
  const { error } = await supabase.from("nfi_exercises").delete().eq("client_id",String(clientId));
  if (error) throw error;
  const { error: fecError } = await supabase.from("nfi_fec_imports").delete().eq("client_id",String(clientId));
  if (fecError) throw fecError;
  const { error: analysisError } = await supabase.from("nfi_financial_analyses").delete().eq("client_id",String(clientId));
  if (analysisError) throw analysisError;
  const { error: forecastError } = await supabase.from("nfi_forecasts").delete().eq("client_id",String(clientId));
  if (forecastError) throw forecastError;
}


async function loadPersonalState(userId) {
  const [{data:companies,error:cError},{data:exercises,error:eError}] = await Promise.all([
    supabase.from("nfi_personal_companies").select("*").eq("user_id",userId).order("created_at",{ascending:false}),
    supabase.from("nfi_personal_exercises").select("*").eq("user_id",userId)
  ]);
  if(cError) throw cError; if(eError) throw eError;
  const byClient=new Map(); (exercises||[]).forEach(e=>{const a=byClient.get(String(e.company_id))||[];a.push(e);byClient.set(String(e.company_id),a);});
  return {companies:(companies||[]).map(c=>dbPersonalCompanyToUi(c,byClient.get(String(c.id))||[])),users:[],assignments:{},confidentialAccess:{}};
}

function dbPersonalCompanyToUi(row, exercises=[]) {
  const years=Object.fromEntries(exercises.map(e=>[String(e.fiscal_year),{ca:e.ca,ebe:e.ebe,rex:e.rex,valueAdded:e.value_added,net:e.net,treasury:e.treasury,debt:e.debt,bfr:e.bfr,frng:e.frng,equity:e.equity,client:e.client,stock:e.stock,otherOperatingReceivables:e.other_operating_receivables,otherOperatingLiabilities:e.other_operating_liabilities,currentAssets:e.current_assets,supplier:e.supplier,currentLiabilities:e.current_liabilities,quality:e.quality||{}}]));
  return {id:String(row.id),cabinetId:null,novacabClientId:null,name:row.name,siren:row.siren||"",naf:row.naf||"",sector:row.sector||"À classer",confidential:false,source:"Espace personnel",pending:!exercises.length,importedAt:exercises[0]?.created_at||null,years,availableYears:Object.keys(years).map(Number).sort((a,b)=>a-b)};
}

async function savePersonalCompany(company,userId) {
  const {data:row,error}=await supabase.from("nfi_personal_companies").upsert({id:UUID_RE.test(String(company.id||""))?company.id:uuid(),user_id:userId,name:company.name||"Société",siren:String(company.siren||"").replace(/\D/g,"").slice(0,9),naf:company.naf||"",sector:company.sector||"À classer"},{onConflict:"id"}).select().single();
  if(error) throw error;
  const years=Object.entries(company.years||{}).map(([year,y])=>({company_id:row.id,user_id:userId,fiscal_year:Number(year),ca:y.ca??null,ebe:y.ebe??null,rex:y.rex??null,value_added:y.valueAdded??null,net:y.net??null,treasury:y.treasury??null,debt:y.debt??null,bfr:y.bfr??null,frng:y.frng??null,equity:y.equity??null,client:y.client??null,stock:y.stock??null,other_operating_receivables:y.otherOperatingReceivables??null,other_operating_liabilities:y.otherOperatingLiabilities??null,current_assets:y.currentAssets??null,supplier:y.supplier??null,current_liabilities:y.currentLiabilities??null,quality:y.quality||{}}));
  if(years.length){const {error:e}=await supabase.from("nfi_personal_exercises").upsert(years,{onConflict:"company_id,fiscal_year"});if(e)throw e;}
  return dbPersonalCompanyToUi(row,years);
}
