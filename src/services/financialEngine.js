export function n(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  let s = String(v ?? "").trim();
  if (!s) return 0;
  s = s.replace(/\u00a0/g, " ").replace(/\s/g, "").replace(/€/g, "");
  if (s.includes(",") && s.includes(".")) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else s = s.replace(",", ".");
  const x = Number(s.replace(/[^0-9+\-.]/g, ""));
  return Number.isFinite(x) ? x : 0;
}

const round = (x, d=2) => Number.isFinite(Number(x)) ? Number(Number(x).toFixed(d)) : 0;

export function ratios(y = {}) {
  const ca=n(y.ca), ebe=n(y.ebe), rex=n(y.rex ?? (n(y.ebe)-n(y.depr))), equity=n(y.equity), debt=n(y.debt);
  const liquidAssets=n(y.treasury), currentLiabilities=n(y.currentLiabilities);
  const currentAssets=n(y.currentAssets ?? (n(y.client)+n(y.stock)+n(y.otherOperatingReceivables)+n(y.treasury)));
  const valueAdded=n(y.valueAdded ?? (ca-n(y.purchases)-n(y.external)));
  const capitalEmployed=equity+debt-liquidAssets;
  const tmg=ca ? (ca-n(y.purchases))/ca*100 : 0;
  return {
    ca, ebe, rex, valueAdded, kp:equity,
    margin: ca ? ebe/ca*100 : 0,
    netMargin: ca ? n(y.net)/ca*100 : 0,
    debtEbe: ebe>0 ? debt/ebe : (debt>0 ? Infinity : 0),
    bfr: n(y.bfr),
    bfrCa: ca ? n(y.bfr)/ca*100 : 0,
    gearing: equity ? debt/equity : (debt>0 ? Infinity : 0),
    roe: equity ? n(y.net)/equity*100 : 0,
    roce: capitalEmployed ? rex/capitalEmployed*100 : 0,
    treasury: liquidAssets,
    autonomy: (equity+debt) ? equity/(equity+debt)*100 : 0,
    liquidity: currentLiabilities ? currentAssets/currentLiabilities*100 : 0,
    treasuryCa: ca ? liquidAssets/ca*100 : 0,
    currentRatio: currentLiabilities ? liquidAssets/currentLiabilities : 0,
    debtEquity: equity ? debt/equity : 0,
    tmg,
    cashCoverage: ca ? liquidAssets/ca*100 : 0,
    liquidityImmediate: currentLiabilities ? liquidAssets/currentLiabilities*100 : 0,
    tmgDefinition:"(CA - achats de marchandises et matières) / CA"
  };
}

export function compare(a={},b={}) {
  return {
    caGrowth:n(a.ca)?(n(b.ca)/n(a.ca)-1)*100:0,
    ebeGrowth:n(a.ebe)?(n(b.ebe)/n(a.ebe)-1)*100:0,
    netGrowth:n(a.net)?(n(b.net)/n(a.net)-1)*100:0,
    treasuryDelta:n(b.treasury)-n(a.treasury),
    bfrGrowth:n(a.bfr)?(n(b.bfr)/n(a.bfr)-1)*100:0,
    debtDelta:n(b.debt)-n(a.debt),
    equityGrowth:n(a.equity)?(n(b.equity)/n(a.equity)-1)*100:0
  };
}

export function scenario(base={}, assumptions={}) {
  const ca=n(base.ca)*(1+n(assumptions.ca)/100);
  const baseMargin=n(base.ca)?n(base.ebe)/n(base.ca):0;
  const ebe=ca*baseMargin*(1+n(assumptions.margin)/100);
  const bfrBase=n(base.ca)?n(base.bfr)/n(base.ca):0;
  const bfr=ca*bfrBase*(1+n(assumptions.bfr)/100);
  const treasury=n(base.treasury)+(ebe-n(base.ebe))-(bfr-n(base.bfr))-n(assumptions.investments)-n(assumptions.debtRepayment);
  return {ca,ebe,bfr,treasury};
}

function normalizeKey(k){return String(k??"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");}
function getField(row,names){
  const map=Object.fromEntries(Object.entries(row).map(([k,v])=>[normalizeKey(k),v]));
  for(const name of names){const value=map[normalizeKey(name)];if(value!==undefined&&value!=="")return value;}
  return "";
}
function extractYear(value){
  const s=String(value??"");
  const iso=s.match(/(?:^|[^0-9])(20\d{2})(?:[^0-9]|$)/); if(iso)return Number(iso[1]);
  const d=s.match(/(\d{2})[/-](\d{2})[/-](\d{4})/); return d?Number(d[3]):null;
}
function accountNumber(row){return String(getField(row,["CompteNum","Compte","Account","Compte numéro"])).replace(/\D/g,"");}
function accountMapForRows(rows){
  const out=new Map();
  for(const r of rows){const acc=accountNumber(r);if(!acc)continue;const debit=n(getField(r,["Debit","Débit"])),credit=n(getField(r,["Credit","Crédit"]));out.set(acc,(out.get(acc)||0)+debit-credit);}
  return out;
}

function computeRows(rows){
  let ca=0,purchases=0,external=0,personnel=0,taxes=0,incomeTax=0,financialCharges=0,financialProducts=0,otherCharges=0,otherProducts=0,depr=0,treasury=0,debt=0,equity=0;
  let client=0,stock=0,supplier=0,otherOperatingReceivables=0,otherOperatingLiabilities=0;
  const accounts=accountMapForRows(rows),dates=[]; let debitTotal=0,creditTotal=0;
  for(const r of rows){
    const acc=accountNumber(r); if(!acc)continue;
    const debit=n(getField(r,["Debit","Débit"])),credit=n(getField(r,["Credit","Crédit"])),net=debit-credit;
    debitTotal+=debit; creditTotal+=credit;
    const date=getField(r,["EcritureDate","Date","DateEcriture"]); if(date)dates.push(String(date));
    if(/^(70|71|72|73|74|75)/.test(acc)) ca-=net;
    else if(/^60/.test(acc)) purchases+=net;
    else if(/^(61|62)/.test(acc)) external+=net;
    else if(/^64/.test(acc)) personnel+=net;
    else if(/^63/.test(acc)) taxes+=net;
    else if(/^69/.test(acc)) incomeTax+=net;
    else if(/^66/.test(acc)) financialCharges+=net;
    else if(/^76/.test(acc)) financialProducts-=net;
    else if(/^67/.test(acc)) otherCharges+=net;
    else if(/^77/.test(acc)) otherProducts-=net;
    else if(/^68/.test(acc)) depr+=net;
  }
  for(const [acc,bal] of accounts){
    const abs=Math.abs(bal);
    if(/^(512|53)/.test(acc)) treasury+=bal;
    if(/^16/.test(acc)) debt+=-bal;
    if(/^(10|11|12|13|14)/.test(acc)) equity+=-bal;
    if(/^41/.test(acc)) client+=Math.max(bal,0);
    if(/^3/.test(acc)) stock+=Math.max(bal,0);
    if(/^40/.test(acc)) supplier+=Math.max(-bal,0);
    if(/^(42|43|44|45|46|48)/.test(acc)) {
      if(bal>0) otherOperatingReceivables+=bal;
      else otherOperatingLiabilities+=-bal;
    }
  }
  // FRNG/BFR are reconstructed from available balance accounts. If the FEC does not
  // contain opening/closing balances, these remain indicative rather than statutory.
  const operatingAssets=client+stock+otherOperatingReceivables;
  const currentAssets=operatingAssets+treasury;
  const operatingLiabilities=supplier+otherOperatingLiabilities;
  const bfr=operatingAssets-operatingLiabilities;
  const ebe=ca-purchases-external-personnel-taxes;
  const valueAdded=ca-purchases-external;
  const operatingResult=ebe-depr;
  const rex=operatingResult;
  const net=operatingResult-financialCharges+financialProducts-otherCharges+otherProducts-incomeTax;
  const currentLiabilities=supplier+otherOperatingLiabilities;
  const workingCapital=equity+debt; // proxy before non-current asset detail is available
  const frng=workingCapital-(stock+client+otherOperatingReceivables);
  const balanceGap=Math.abs(debitTotal-creditTotal), balanceBalanced=balanceGap<0.01;
  dates.sort();
  const accountSummary=[...accounts.entries()].map(([account,balance])=>({account,balance})).sort((a,b)=>Math.abs(b.balance)-Math.abs(a.balance));
  const pnlSummary=[
    {key:"ca",label:"Chiffre d'affaires",value:ca},{key:"purchases",label:"Achats",value:purchases},
    {key:"external",label:"Charges externes",value:external},{key:"personnel",label:"Charges de personnel",value:personnel},
    {key:"taxes",label:"Impôts et taxes",value:taxes},{key:"depr",label:"Dotations",value:depr},
    {key:"financialCharges",label:"Charges financières",value:financialCharges}
  ];
  return {
    ca,ebe,rex,valueAdded,net,treasury,debt,bfr,equity,frng,
    client,stock,supplier,otherOperatingReceivables,otherOperatingLiabilities,currentLiabilities,currentAssets,
    purchases,external,personnel,taxes,incomeTax,financialCharges,financialProducts,otherCharges,otherProducts,depr,
    rows:rows.length,periodStart:dates[0]||"",periodEnd:dates.at(-1)||"",accountCount:accounts.size,
    debitTotal,creditTotal,balanceGap,balanceBalanced:balanceGap<0.01,
    quality:{balanceGap,balanceBalanced,missingAccountRows:rows.filter(r=>!accountNumber(r)).length},
    accountSummary,pnlSummary
  };
}

export function validateFecRows(rows=[]){
  if(!Array.isArray(rows)||!rows.length)return{valid:false,errors:["Aucune écriture détectée."],warnings:[]};
  const sample=rows[0]||{},keys=Object.keys(sample).map(normalizeKey);
  const hasAccount=keys.includes("comptenum")||keys.includes("compte")||keys.includes("account");
  const hasDebit=keys.includes("debit"),hasCredit=keys.includes("credit");
  const hasDate=keys.includes("ecrituredate")||keys.includes("date")||keys.includes("dateecriture");
  const errors=[],warnings=[];
  if(!hasAccount)errors.push("Colonne de compte absente (CompteNum/Compte).");
  if(!hasDebit||!hasCredit)errors.push("Colonnes Debit et Credit absentes.");
  if(!hasDate)warnings.push("Date d'écriture non détectée : l'exercice sera déduit du nom du fichier.");
  const years=[...new Set(rows.map(r=>extractYear(getField(r,["EcritureDate","Date","DateEcriture"]))).filter(Boolean))].sort();
  if(years.length>5)warnings.push("Plus de 5 exercices détectés : les exercices sont conservés, mais l'interface recommande une analyse sur 3 à 5 ans.");
  const missingAccount=rows.reduce((s,r)=>s+(accountNumber(r)?0:1),0);
  if(missingAccount)warnings.push(`${missingAccount.toLocaleString("fr-FR")} ligne(s) sans numéro de compte.`);
  return{valid:errors.length===0,errors,warnings,years};
}

export function parseFecRows(rows=[]){
  const validation=validateFecRows(rows);if(!validation.valid)throw new Error(validation.errors.join(" "));
  const groups=new Map();
  for(const row of rows){const year=extractYear(getField(row,["EcritureDate","Date","DateEcriture"]));const key=year||"unknown";if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
  const years={};
  for(const[year,group]of groups){const result=computeRows(group);if(year!=="unknown")years[year]=result;}
  if(!Object.keys(years).length)years[new Date().getFullYear()]=computeRows(rows);
  const all=computeRows(rows);
  const yearList=Object.keys(years).map(Number).sort((a,b)=>a-b);
  const quality={
    rowCount:rows.length,
    exerciseCount:yearList.length,
    balanceBalanced:all.balanceBalanced,
    balanceGap:all.balanceGap,
    debitTotal:all.debitTotal,
    creditTotal:all.creditTotal,
    warnings:validation.warnings,
    status:all.balanceBalanced?"OK":"À contrôler"
  };
  return{...all,years,validation,quality};
}

export function fecToCompany(result,filename="Société importée",metadata={}){
  const base=filename.replace(/\.[^.]+$/i,"").trim();
  // Format normalisé DGFiP : SIRENFECAAAAMMJJ (ex. 981110026FEC20261231)
  const fecMatch=base.match(/^(\d{9})FEC(\d{8})$/i);
  const detectedSiren=fecMatch?.[1]||"";
  const clean=fecMatch?"":base.replace(/[_-]+/g," ").trim();
  const years=result.years||{},yearList=Object.keys(years).map(Number).sort((a,b)=>a-b);
  const fallback=Number((`${result.periodEnd} ${result.periodStart}`).match(/20\d{2}/)?.[0])||new Date().getFullYear();
  const cleanYears=Object.fromEntries(Object.entries(years).map(([y,v])=>[y,{
    ca:v.ca,ebe:v.ebe,rex:v.rex,valueAdded:v.valueAdded,net:v.net,treasury:v.treasury,debt:v.debt,bfr:v.bfr,equity:v.equity,frng:v.frng,
    client:v.client,stock:v.stock,supplier:v.supplier,otherOperatingReceivables:v.otherOperatingReceivables,
    otherOperatingLiabilities:v.otherOperatingLiabilities,currentLiabilities:v.currentLiabilities,
    purchases:v.purchases,external:v.external,personnel:v.personnel,taxes:v.taxes,incomeTax:v.incomeTax,
    accountSummary:v.accountSummary||[],pnlSummary:v.pnlSummary||[],
    financialCharges:v.financialCharges,financialProducts:v.financialProducts,otherCharges:v.otherCharges,
    otherProducts:v.otherProducts,depr:v.depr,quality:v.quality
  }]));
  if(!Object.keys(cleanYears).length)cleanYears[fallback]={ca:result.ca,ebe:result.ebe,rex:result.rex,valueAdded:result.valueAdded,net:result.net,treasury:result.treasury,debt:result.debt,bfr:result.bfr,equity:result.equity,frng:result.frng};
  return{
    id:`fec-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    name:metadata.name||clean||(detectedSiren?`Société ${detectedSiren}`:"Société importée"),
    siren:metadata.siren||detectedSiren,naf:metadata.naf||"",sector:metadata.sector||"À classer",source:"FEC",
    importedAt:new Date().toISOString(),fecRows:result.rows,accountCount:result.accountCount,
    periodStart:result.periodStart,periodEnd:result.periodEnd,validation:result.validation,quality:result.quality,
    years:cleanYears,availableYears:yearList.length?yearList:[fallback]
  };
}

export function scoreBreakdown(r={}){
  const finiteDebt=Number.isFinite(r.debtEbe)?r.debtEbe:10;
  const marginScore=Math.max(0,Math.min(100,50+(n(r.margin)-8)*6));
  const debtScore=Math.max(0,Math.min(100,100-finiteDebt*22));
  const bfrScore=Math.max(0,Math.min(100,100-Math.max(0,n(r.bfrCa)-10)*2.2));
  const roeScore=Math.max(0,Math.min(100,40+n(r.roe)*3));
  const treasuryScore=n(r.treasury)>=0?70:25;
  return [
    {key:"margin",label:"Rentabilité opérationnelle",score:Math.round(marginScore),weight:28},
    {key:"debt",label:"Endettement",score:Math.round(debtScore),weight:24},
    {key:"bfr",label:"BFR",score:Math.round(bfrScore),weight:18},
    {key:"roe",label:"Capitaux propres / ROE",score:Math.round(roeScore),weight:20},
    {key:"cash",label:"Trésorerie",score:Math.round(treasuryScore),weight:10}
  ];
}
export function financialScore(r={}){
  return Math.round(scoreBreakdown(r).reduce((sum,x)=>sum+x.score*x.weight/100,0));
}
export function scoreLabel(score){if(score>=80)return"Excellent";if(score>=65)return"Solide";if(score>=50)return"À surveiller";return"Fragile";}
export function yoy(current,previous){return n(previous)?(n(current)/n(previous)-1)*100:0;}

export function portfolioBenchmark(companies=[],sector=""){
  const pool=(Array.isArray(companies)?companies:[]).filter(c=>!sector||String(c?.sector||"")===String(sector));
  const latest=company=>{const years=Object.keys(company?.years||{}).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);return years.length?company.years[years.at(-1)]||{}:{};};
  const metrics=pool.map(c=>ratios(latest(c)));
  const quartiles=values=>{
    const a=(Array.isArray(values)?values:[]).map(Number).filter(Number.isFinite).sort((x,y)=>x-y);
    if(!a.length)return{q1:null,median:null,q3:null,count:0};
    const quantile=p=>a[Math.min(a.length-1,Math.floor((a.length-1)*p))];
    return{q1:quantile(.25),median:quantile(.5),q3:quantile(.75),count:a.length};
  };
  const keys=["ca","ebe","rex","valueAdded","kp","bfr","gearing","roe","roce","liquidity","tmg","margin","netMargin","debtEbe","bfrCa"];
  return Object.fromEntries([["count",pool.length],...keys.map(k=>[k,quartiles(metrics.map(x=>x[k]))])]);
}

export const KPI_DEFINITIONS = {
  ca:{label:"Chiffre d'affaires",unit:"€",type:"value",higher:true},
  ebe:{label:"EBE",unit:"€",type:"value",higher:true},
  rex:{label:"REX",unit:"€",type:"value",higher:true},
  valueAdded:{label:"Valeur ajoutée",unit:"€",type:"value",higher:true},
  kp:{label:"Capitaux propres (KP)",unit:"€",type:"value",higher:true},
  bfr:{label:"BFR",unit:"€",type:"value",higher:false},
  gearing:{label:"Gearing",unit:"x",type:"ratio",higher:false},
  roe:{label:"ROE",unit:"%",type:"ratio",higher:true},
  roce:{label:"ROCE",unit:"%",type:"ratio",higher:true},
  liquidity:{label:"Liquidité",unit:"%",type:"ratio",higher:true},
  tmg:{label:"TMG",unit:"%",type:"ratio",higher:true}
};

export function benchmarkComparison(companyRatios={}, benchmark={}) {
  return Object.entries(KPI_DEFINITIONS).map(([key,def])=>{
    const value=Number(companyRatios?.[key]);
    const median=Number(benchmark?.[key]?.median);
    if(!Number.isFinite(value)||!Number.isFinite(median)) return {...def,key,value:null,median:null,diff:null,status:"unknown"};
    const diff=value-median;
    const favorable=def.higher?diff>=0:diff<=0;
    const tolerance=def.unit==="%"?0.2:def.unit==="x"?0.03:1;
    const status=Math.abs(diff)<=tolerance?"neutral":favorable?"good":"bad";
    return {...def,key,value,median,diff,status};
  });
}

export function globalBenchmarkInterpretation(companyName, comparisons=[], populationCount=0) {
  const valid=comparisons.filter(x=>x.status!=="unknown");
  if(!valid.length) return `La comparaison sectorielle n'est pas disponible pour ${companyName} : les données de référence sont insuffisantes.`;
  const good=valid.filter(x=>x.status==="good").length, bad=valid.filter(x=>x.status==="bad").length;
  const notable=valid.filter(x=>x.status!=="neutral").sort((a,b)=>Math.abs(b.diff)-Math.abs(a.diff));
  const top=notable.slice(0,3).map(x=>`${x.label} ${x.status==="good"?"est favorablement positionné":"est en dessous du référentiel"}`).join(", ");
  const tone=good>=bad+3?"globalement favorable":bad>=good+3?"globalement inférieur aux références":"contrasté";
  return `${companyName} présente un positionnement ${tone} par rapport à la médiane des ${populationCount} société${populationCount>1?"s":""} du secteur analysées dans le cabinet. ${top?`Les écarts les plus significatifs concernent : ${top}.`:"Les écarts restent limités sur les indicateurs comparables."}`;
}

export function diagnostics(company,year){
  const years=Object.keys(company?.years||{}).map(Number).sort((a,b)=>a-b),y=company?.years?.[year]||company?.years?.[years.at(-1)]||{},prev=company?.years?.[year-1],r=ratios(y),out=[];
  if(r.margin<5)out.push({level:"bad",title:"Marge EBE faible",text:`La marge EBE est de ${r.margin.toFixed(1)} %. La priorité est d'identifier les charges qui pèsent sur l'exploitation.`});
  else if(r.margin<8)out.push({level:"warning",title:"Marge EBE à surveiller",text:`La marge EBE est de ${r.margin.toFixed(1)} %. Elle reste positive mais offre une marge de sécurité limitée.`});
  else out.push({level:"good",title:"Rentabilité opérationnelle",text:`La marge EBE atteint ${r.margin.toFixed(1)} % du chiffre d'affaires et constitue un point favorable.`});
  if(!Number.isFinite(r.debtEbe)||r.debtEbe>3)out.push({level:"bad",title:"Capacité de remboursement sous pression",text:`La dette représente ${Number.isFinite(r.debtEbe)?r.debtEbe.toFixed(1):"> 10"} fois l'EBE.`});
  else if(r.debtEbe>2)out.push({level:"warning",title:"Endettement à surveiller",text:`La dette représente ${r.debtEbe.toFixed(1)} fois l'EBE : un suivi de la capacité de remboursement est recommandé.`});
  else out.push({level:"good",title:"Endettement maîtrisé",text:`La dette représente ${r.debtEbe.toFixed(1)} fois l'EBE.`});
  if(y.treasury<0)out.push({level:"bad",title:"Trésorerie négative",text:`La trésorerie est négative de ${Math.abs(Math.round(y.treasury)).toLocaleString("fr-FR")} € : le financement du cycle d'exploitation doit être sécurisé.`});
  else out.push({level:"good",title:"Trésorerie positive",text:`La trésorerie disponible est positive à ${Math.round(y.treasury).toLocaleString("fr-FR")} €.`});
  if(r.bfrCa>25)out.push({level:"warning",title:"BFR élevé",text:`Le BFR représente ${r.bfrCa.toFixed(1)} % du CA et immobilise une part importante des ressources.`});
  else if(r.bfrCa>15)out.push({level:"warning",title:"BFR à surveiller",text:`Le BFR représente ${r.bfrCa.toFixed(1)} % du CA : l'évolution des créances, stocks et dettes fournisseurs mérite une attention particulière.`});
  if(prev){const g=yoy(y.ca,prev.ca);if(g<-5)out.push({level:"bad",title:"Repli du chiffre d'affaires",text:`Le CA baisse de ${Math.abs(g).toFixed(1)} % sur un an.`});else if(g>10)out.push({level:"good",title:"Croissance soutenue",text:`Le CA progresse de ${g.toFixed(1)} % sur un an : l'enjeu est de préserver la marge.`});}
  return out;
}

export function detailedAnalysis(company={},year){
  const years=Object.keys(company.years||{}).map(Number).sort((a,b)=>a-b),y=company.years?.[year]||company.years?.[years.at(-1)]||{},prev=company.years?.[year-1],r=ratios(y);
  return {year:year||years.at(-1),ratios:r,compare:prev?compare(prev,y):null,diagnostics:diagnostics(company,year),
    quality:company.quality||y.quality||null,
    interpretation:{
      profitability:r.margin>=10?`La rentabilité opérationnelle est satisfaisante avec une marge EBE de ${r.margin.toFixed(1)} %.`:`La rentabilité opérationnelle doit être surveillée : la marge EBE est de ${r.margin.toFixed(1)} %.`,
      workingCapital:r.bfrCa>25?`Le BFR représente ${r.bfrCa.toFixed(1)} % du CA et constitue un enjeu important de trésorerie.`:`Le BFR représente ${r.bfrCa.toFixed(1)} % du CA et reste dans une zone à surveiller selon le secteur.`,
      debt:!Number.isFinite(r.debtEbe)||r.debtEbe>3?`La capacité de remboursement est sous pression avec une dette supérieure à trois années d'EBE.`:`La dette représente ${r.debtEbe.toFixed(1)} fois l'EBE.`,
      cash:y.treasury>=0?`La trésorerie est positive à ${Math.round(y.treasury).toLocaleString("fr-FR")} €.`:`La trésorerie est négative de ${Math.abs(Math.round(y.treasury)).toLocaleString("fr-FR")} €.`
    }
  };
}


function accountValue(obj,account){
  const row=(obj?.accountSummary||[]).find(x=>String(x.account||"").replace(/\D/g,"")===String(account));
  return row?Number(row.balance)||0:0;
}
function accountGrowth(obj,prev,account){
  const cur=accountValue(obj,account), old=accountValue(prev,account);
  if(!Number.isFinite(cur)||!Number.isFinite(old)||old===0) return null;
  return (cur-old)/Math.abs(old)*100;
}

export function fecCausalInsights(company={},year){
  const ys=Object.keys(company?.years||{}).map(Number).sort((a,b)=>a-b);
  const y=company?.years?.[year]||company?.years?.[ys.at(-1)]||{};
  const prev=ys.length>1?company.years?.[ys[ys.length-2]]:null;
  const growth=(a,b)=>Number.isFinite(Number(a))&&Number.isFinite(Number(b))&&Number(b)!==0?(Number(a)-Number(b))/Math.abs(Number(b))*100:null;
  const value=(obj,key)=>Number((obj?.pnlSummary||[]).find(x=>x.key===key)?.value||0);
  const caG=growth(y.ca,prev?.ca), purchG=growth(value(y,"purchases"),value(prev,"purchases"));
  const extG=growth(value(y,"external"),value(prev,"external")), persG=growth(value(y,"personnel"),value(prev,"personnel"));
  const supplierG=growth(y.supplier,prev?.supplier), clientG=growth(y.client,prev?.client), stockG=growth(y.stock,prev?.stock);
  const insights=[];
  if(caG!==null&&purchG!==null&&purchG>caG+3) insights.push({level:"bad",title:"Les achats progressent plus vite que le CA",text:`Les achats évoluent de ${purchG.toFixed(1)} % contre ${caG.toFixed(1)} % pour le chiffre d'affaires. Cette divergence comprime mécaniquement la marge brute. La revue doit porter en priorité sur les prix d'achat, le mix produits et les principaux fournisseurs.`,source:"FEC · comptes 60 · comparaison N/N-1",confidence:"élevée"});
  if(caG!==null&&extG!==null&&extG>caG+3){
    let detail="La hausse doit être ventilée entre les principaux comptes de charges externes afin de distinguer une dérive structurelle d'une dépense ponctuelle.";
    const h6226=accountGrowth(y,prev,"6226");
    if(h6226!==null&&h6226>5) detail=`Le compte 6226 (honoraires) progresse de ${h6226.toFixed(1)} %. Cette évolution peut expliquer une partie de la hausse des charges externes ; elle ne permet pas, à elle seule, de conclure à une hausse du coût des fournisseurs.`;
    insights.push({level:"warning",title:"Charges externes en hausse",text:`Les charges externes progressent de ${extG.toFixed(1)} % contre ${caG.toFixed(1)} % pour le CA. ${detail}`,source:"FEC · comptes 61–62 · analyse des comptes contributifs",confidence:"élevée"});
  }
  if(caG!==null&&persG!==null&&persG>caG+5) insights.push({level:"warning",title:"Masse salariale sous tension",text:`Les charges de personnel progressent de ${persG.toFixed(1)} % alors que le CA évolue de ${caG.toFixed(1)} %. Contrôler effectif, rémunérations, heures supplémentaires et productivité avant de qualifier la hausse comme structurelle.`,source:"FEC · comptes 64 · comparaison N/N-1",confidence:"élevée"});
  if(supplierG!==null&&supplierG>10) insights.push({level:"warning",title:"Solde fournisseurs en hausse",text:`Le solde fournisseurs progresse de ${supplierG.toFixed(1)} %. Ce mouvement traduit un besoin de financement du cycle plus important, mais ne constitue pas en soi une hausse des charges : il faut rapprocher l'évolution du solde des achats, des délais de règlement et des factures restant dues.`,source:"FEC · comptes 40 · comparaison des soldes",confidence:"élevée"});
  if(clientG!==null&&clientG>10) insights.push({level:"warning",title:"Créances clients en hausse",text:`Les créances clients progressent de ${clientG.toFixed(1)} %. Si le CA n'augmente pas dans la même proportion, le financement du cycle peut se tendre. Contrôler l'ancienneté des créances et les principaux encours.`,source:"FEC · comptes 41 · comparaison des soldes",confidence:"élevée"});
  if(stockG!==null&&stockG>10) insights.push({level:"warning",title:"Stock en hausse",text:`Le stock progresse de ${stockG.toFixed(1)} %. Une hausse supérieure à celle du CA peut signaler une accumulation ou une rotation moins rapide ; rapprocher ce mouvement des volumes vendus et du taux de rotation.`,source:"FEC · comptes 3 · comparaison des soldes",confidence:"moyenne"});
  if(y.bfr<0) insights.push({level:"good",title:"Le cycle d'exploitation apporte un financement",text:`Le BFR ressort à ${Math.round(y.bfr).toLocaleString("fr-FR")} €. Le cycle finance donc une partie de l'activité à la date analysée. Il convient néanmoins de vérifier que cet effet provient de délais fournisseurs durables et non d'un décalage temporaire.`,source:"FEC · comptes 41, 3, 40 et autres postes d'exploitation",confidence:"moyenne"});
  else if(y.ca&&y.bfr/y.ca>.2) insights.push({level:"bad",title:"Le BFR consomme une part significative du CA",text:`Le BFR représente ${(y.bfr/y.ca*100).toFixed(1)} % du CA. L'analyse doit identifier la contribution respective des créances clients, des stocks et des autres postes d'exploitation afin de cibler le levier de trésorerie.`,source:"FEC · comptes d'exploitation · ratio BFR/CA",confidence:"moyenne"});
  if(y.equity<0) insights.push({level:"bad",title:"Capitaux propres négatifs",text:`Les capitaux propres ressortent à ${Math.round(y.equity).toLocaleString("fr-FR")} €. Cette situation fragilise la structure financière et justifie une revue avec le dirigeant des pertes cumulées, des distributions éventuelles et des solutions de reconstitution des fonds propres.`,source:"FEC · comptes 10–14",confidence:"élevée"});
  const accounts=(y.accountSummary||[]).slice(0,8);
  return {insights,accounts,hasHistory:ys.length>1,drivers:{caG,purchG,extG,persG,supplierG,clientG,stockG,honorairesG:accountGrowth(y,prev,"6226")}};
}

export function clientInterpretations(company={},year){
  const ys=Object.keys(company?.years||{}).map(Number).sort((a,b)=>a-b);
  const y=company?.years?.[year]||company?.years?.[ys.at(-1)]||{};
  const prev=company?.years?.[year-1]||null;
  const r=ratios(y);
  const pctText=v=>Number.isFinite(Number(v))?`${Number(v).toFixed(1)} %`:"—";
  const growth=(a,b)=>Number.isFinite(Number(a))&&Number.isFinite(Number(b))&&Number(b)!==0?(Number(a)-Number(b))/Math.abs(Number(b))*100:null;
  const caG=growth(y.ca,prev?.ca), ebeG=growth(y.ebe,prev?.ebe), supplierG=growth(y.supplier,prev?.supplier);
  const paragraphs=[];
  if(caG!==null||ebeG!==null){
    const caPhrase=caG===null?"le CA n'est pas comparable":`le CA ${caG>=0?"progresse":"recule"} de ${Math.abs(caG).toFixed(1)} %`;
    const ebePhrase=ebeG===null?"":`, tandis que l'EBE ${ebeG>=0?"progresse":"recule"} de ${Math.abs(ebeG).toFixed(1)} %`;
    paragraphs.push(`Sur le dernier exercice disponible, ${caPhrase}${ebePhrase}. ${r.margin<5?"La création de résultat d'exploitation apparaît ainsi insuffisante pour absorber sereinement les variations de charges et les aléas de trésorerie.":"La lecture doit surtout porter sur la capacité de la rentabilité à accompagner l'évolution de l'activité."}`);
  }
  if(supplierG!==null&&supplierG>10){
    paragraphs.push(`Le solde fournisseurs augmente de ${supplierG.toFixed(1)} %. Ce mouvement ne signifie pas automatiquement que les achats ou les charges ont augmenté : il peut refléter un allongement des délais de règlement ou un niveau de factures non réglées plus élevé. NOVACAB Insight recommande de rapprocher ce solde de l'évolution des achats et des échéances fournisseurs.`);
  }
  if(r.bfrCa<0) paragraphs.push(`Le BFR est négatif à ${pctText(r.bfrCa)} du CA : le cycle d'exploitation apporte actuellement un financement net. Ce point est favorable à la trésorerie, mais sa pérennité doit être vérifiée, notamment au regard des délais fournisseurs et de la rotation des stocks.`);
  else if(r.bfrCa>15) paragraphs.push(`Le BFR représente ${pctText(r.bfrCa)} du CA. Une part significative des ressources est donc mobilisée par le cycle d'exploitation ; la priorité est d'identifier le poste qui consomme le plus de trésorerie et de quantifier le gain potentiel.`);
  if(y.treasury<0) paragraphs.push(`La trésorerie est négative de ${Math.abs(Math.round(y.treasury)).toLocaleString("fr-FR")} €. Dans ce contexte, l'amélioration du cash doit être pilotée avec un suivi rapproché des encaissements, des décaissements et des besoins liés au BFR.`);
  return paragraphs.slice(0,5);
}
