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
  return {
    ca,ebe,rex,valueAdded,net,treasury,debt,bfr,equity,frng,
    client,stock,supplier,otherOperatingReceivables,otherOperatingLiabilities,currentLiabilities,currentAssets,
    purchases,external,personnel,taxes,incomeTax,financialCharges,financialProducts,otherCharges,otherProducts,depr,
    rows:rows.length,periodStart:dates[0]||"",periodEnd:dates.at(-1)||"",accountCount:accounts.size,
    debitTotal,creditTotal,balanceGap,balanceBalanced:balanceGap<0.01,
    quality:{balanceGap,balanceBalanced,missingAccountRows:rows.filter(r=>!accountNumber(r)).length}
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

export function financialScore(r={}){
  const finiteDebt=Number.isFinite(r.debtEbe)?r.debtEbe:10;
  const marginScore=Math.max(0,Math.min(100,50+(n(r.margin)-8)*6));
  const debtScore=Math.max(0,Math.min(100,100-finiteDebt*22));
  const bfrScore=Math.max(0,Math.min(100,100-Math.max(0,n(r.bfrCa)-10)*2.2));
  const roeScore=Math.max(0,Math.min(100,40+n(r.roe)*3));
  const treasuryScore=n(r.treasury)>=0?70:25;
  return Math.round(marginScore*.28+debtScore*.24+bfrScore*.18+roeScore*.20+treasuryScore*.10);
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
