import test from "node:test";
import assert from "node:assert/strict";
import {ratios,financialScore,scenario,diagnostics,benchmarkComparison,portfolioBenchmark,dataReliability,ebeWaterfall,gapToTarget,copilotTopInsights} from "../src/services/financialEngine.js";

const base={ca:1000000,ebe:100000,treasury:50000,debt:200000,equity:250000,bfr:150000,client:200000,stock:50000,supplier:100000};
test("moteur financier",()=>{
 const r=ratios(base);
 assert.equal(Math.round(r.margin),10);
 assert.ok(Number.isFinite(r.debtEbe));
 assert.ok(financialScore(r)>=0&&financialScore(r)<=100);
 const out=scenario(base,{ca:10,margin:1,bfr:5,investments:10000,debtRepayment:20000});
 assert.ok(out.ca>base.ca); assert.ok(out.ebe>base.ebe); assert.ok(Number.isFinite(out.treasury));
 const c={name:"Test",sector:"Test",years:{2025:base,2026:{...base,ca:900000,ebe:30000,treasury:-10000}}};
 assert.ok(diagnostics(c,2026).length>=3);
 const b=portfolioBenchmark([c],"Test");
 const cmp=benchmarkComparison(r,b);
 assert.equal(cmp.length,11);
});

test("fiabilité, waterfall et gap-to-target",()=>{
 const c={name:"Test",sector:"Test",quality:{rowCount:100,balanceBalanced:true,exerciseCount:2},years:{2025:{...base,purchases:300000,external:200000,personnel:300000,taxes:50000},2026:{...base,ca:1100000,ebe:90000,purchases:330000,external:220000,personnel:320000,taxes:50000}}};
 const q=dataReliability(c,2026);
 assert.equal(q.score,100); assert.equal(q.level,"élevée");
 const wf=ebeWaterfall(c,2026);
 assert.equal(wf.available,true); assert.equal(wf.items.at(0).value,base.ebe); assert.equal(wf.items.at(-1).value,90000);
 const gap=gapToTarget(c,{margin:{median:12}},2026);
 assert.equal(gap.available,true); assert.ok(gap.ebePotential>0);
 const top=copilotTopInsights(c,2026,{margin:{median:12}});
 assert.equal(top.items.length,3); assert.ok(top.reliability.score>=85);
});

test("fiabilité faible si FEC et historique manquent",()=>{
 const c={years:{2026:{ca:100,ebe:5,bfr:10}}};
 const q=dataReliability(c,2026);
 assert.equal(q.level,"faible"); assert.ok(q.warnings.length>=2);
});
