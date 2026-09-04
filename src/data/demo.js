export const demoCompanies = [
 {id:"axe",name:"AXE EXPERTS",siren:"552 123 456",naf:"6920Z",sector:"Activités comptables",years:{
  2023:{ca:2180000,ebe:244000,net:132000,treasury:180000,debt:620000,bfr:410000,equity:780000},
  2024:{ca:2390000,ebe:278000,net:151000,treasury:215000,debt:590000,bfr:445000,equity:845000},
  2025:{ca:2710000,ebe:302000,net:176000,treasury:248000,debt:540000,bfr:492000,equity:920000}
 }},
 {id:"nova",name:"NOVA CONSEIL",siren:"481 987 321",naf:"7022Z",sector:"Conseil pour les affaires et autres conseils de gestion",years:{
  2023:{ca:1950000,ebe:221000,net:118000,treasury:210000,debt:430000,bfr:295000,equity:720000},
  2024:{ca:2140000,ebe:251000,net:136000,treasury:245000,debt:405000,bfr:312000,equity:770000},
  2025:{ca:2280000,ebe:287000,net:161000,treasury:286000,debt:370000,bfr:325000,equity:838000}
 }},
 {id:"pro",name:"PROXIMA DIGITAL",siren:"498 456 123",naf:"6201Z",sector:"Programmation informatique",years:{
  2023:{ca:1620000,ebe:176000,net:82000,treasury:130000,debt:510000,bfr:260000,equity:510000},
  2024:{ca:1890000,ebe:214000,net:104000,treasury:165000,debt:535000,bfr:318000,equity:566000},
  2025:{ca:2240000,ebe:239000,net:119000,treasury:148000,debt:590000,bfr:402000,equity:628000}
 }}
];

export const demoBenchmark = {
 "Activités comptables":{
  ebeMargin:{q1:7.2,median:10.4,q3:14.1},
  netMargin:{q1:2.8,median:5.6,q3:8.9},
  debtEbe:{q1:0.5,median:1.5,q3:3.0},
  bfrCa:{q1:8,median:15,q3:25}
 },
 "Conseil pour les affaires et autres conseils de gestion":{
  ebeMargin:{q1:8.0,median:12.0,q3:17.5},
  netMargin:{q1:3.5,median:6.8,q3:10.5},
  debtEbe:{q1:0.3,median:1.2,q3:2.5},
  bfrCa:{q1:5,median:12,q3:22}
 },
 "Programmation informatique":{
  ebeMargin:{q1:6.5,median:10.8,q3:16.2},
  netMargin:{q1:2.2,median:5.1,q3:9.0},
  debtEbe:{q1:0.4,median:1.4,q3:2.8},
  bfrCa:{q1:6,median:14,q3:24}
 }
};
