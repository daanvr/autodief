// Speelt Autodief zonder beeld. Los gedraaid: carrière-simulatie van een verstandige speler.
global.window=global; const base=require('path').join(__dirname,'..','..','js')+'/';
const mem={}; Object.defineProperty(global,'localStorage',{value:{getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{mem[k]=String(v)},removeItem:k=>{delete mem[k]}}}); window.localStorage=global.localStorage;
global.AD={};
['version','config/settings','config/cars','config/items','config/crew','config/districts','config/spots'].forEach(f=>require(base+f+'.js'));
require('vm').runInThisContext(require('fs').readFileSync(base+'config/events.js','utf8'));
['core/rng','core/state','core/rules'].forEach(f=>require(base+f+'.js'));
const noop=()=>{}; AD.sfx=new Proxy({},{get:()=>noop});
AD.scene={set:noop,update:noop,overlay:noop,setSpots:noop,BLOCK_SLOTS:Array(10).fill(0)};
let cur=null; AD.ui={render:o=>{cur=o}};
['core/engine','core/crew','core/fight'].forEach(f=>require(base+f+'.js'));
exports.play=function(maxSteps,policy,setup,stop){ AD.state.newGame(); setup&&setup(AD.state.S); AD.engine.hub(); let n=0;
 while(n++<maxSteps){ const s=AD.state.S; if(/BUSTED|WASTED/.test(cur.title)) return cur.title; if(stop&&stop(s)) return 'stop';
  const ch=cur.choices.filter(Boolean).filter(c=>!c.disabled&&c.act&&!/Opslaan en stoppen|Titelscherm/.test(c.label)); if(!ch.length) throw new Error('geen keuze '+cur.title); (policy(cur,ch,s)||ch[0]).act(); }
 return 'max'; };
exports.sane=(o,ch,s)=>{ const by=re=>ch.find(c=>re.test(c.label)); const best=l=>l.slice().sort((a,b)=>(b.chance==null?.9:b.chance)-(a.chance==null?.9:a.chance))[0];
 if(/schuilplaats/.test(o.title)){ if(s.health<60&&by(/dokter/)&&s.money>600) return by(/dokter/); if(s.skillPoints) return by(/Vaardigheden/); if(s.garage.cars.length&&s.money>300) return by(/^Garage/); if(s.heat>60&&by(/Onderduiken/)) return by(/Onderduiken/);
  const buy=(id,m,l)=>{const it=AD.ITEMS[id]; if(!s.inv[id]&&s.money>it.price+m&&s.level>=(it.minLevel||1)){s.money-=it.price;s.inv[id]=1;}};
  buy('slimjim',200);buy('hotwirekit',100);buy('scanner',600);buy('lockpick',800);buy('sleuteltrekker',800);buy('obdprog',2000);buy('relaybox',3000);
  if(s.money>9000){const p=Math.min(s.debt,s.money-4000);s.money-=p;s.debt-=p;} return by(/Op pad/); }
 if(/Louche|Vaardigheden/.test(o.title)) return ch[0];
 if(o.title==='Garage') return ch.find(c=>/%/.test(c.label))||by(/Terug/);
 if(by(/Verkopen aan/)) return by(/Overspuiten/)||by(/Export/)||by(/Heler/)||by(/Verkopen/);
 if(/Kies een wijk/.test(o.title)) return (s.level>=5&&s.heat<30&&by(/Zaken/))||(s.level>=4&&s.heat<40&&by(/Villa/))||(s.level>=2&&s.heat<45&&by(/Centrum/))||by(/Arbeiders/);
 if(by(/^Stallen/)) return by(/^Stallen/); if(by(/Sloperij/)) return by(/Sloperij/);
 if(by(/Volgende straat/)){ const cars=ch.filter(c=>c.spot&&c.chance>.6&&!/Al geprobeerd/.test(c.hint)); return cars.length&&AD.engine.run().spot.eta>2?cars.sort((a,b)=>AD.carDef(b.icon.slice(4)).value-AD.carDef(a.icon.slice(4)).value)[0]:by(/Volgende straat/); }
 if(/straat/.test(o.title)&&by(/Afhaken|Terug naar het/)){ const t=ch.filter(c=>/Openbreken|Opnieuw|Motor starten|Nog eens/.test(c.label)); const sp=AD.engine.run().spot; const b=best(t); if(b&&b.chance>.5&&!sp.called&&sp.attention<70) return b; return by(/Afhaken|Terug naar het/); }
 if(/ALARM/.test(o.title)) return best(ch); if(by(/Afhaken/)) return by(/Afhaken/); if(by(/Verder/)) return by(/Verder/);
 if(by(/uitschakelen/)) return by(/uitschakelen/);
 const safe=ch.filter(c=>!/Overgeven|achterlaten|vechten|Uitstappen|Vluchtmiddel/.test(c.label)); return best(safe.length?safe:ch); };
if(require.main===module){ const N=60, day=40; let agg={}; const rows=[];
 for(let g=0;g<N;g++){ const lv={}; const end=exports.play(20000,(o,c,s)=>{ if(!lv[s.level]) lv[s.level]=s.day; return exports.sane(o,c,s); },null,s=>s.day>=day||s.debt<=0); const S=AD.state.S; rows.push({end,day:S.day,lv,level:S.level,rec:S.record,paid:50000-S.debt,money:S.money,st:S.stats,sk:S.skills}); }
 const avg=f=>(rows.reduce((t,r)=>t+f(r),0)/N).toFixed(1); const cnt=f=>rows.filter(f).length;
 console.log({over:cnt(r=>/BUSTED|WASTED/.test(r.end)),wasted:cnt(r=>/WASTED/.test(r.end)),schuldvrij:cnt(r=>r.paid>=50000),dag:avg(r=>r.day),level:avg(r=>r.level),strafblad:avg(r=>r.rec),afbetaald:avg(r=>r.paid),gestolen:avg(r=>r.st.stolen),achterv:avg(r=>r.st.chases),ontsnapt:avg(r=>r.st.escapes),skills:['inbreken','rijden','rennen','gladheid','schieten'].map(k=>k+' '+avg(r=>r.sk[k])).join(', ')});
 [2,3,4,5,6].forEach(l=>{const d=rows.filter(r=>r.lv[l]).map(r=>r.lv[l]); console.log('level',l,'gem. dag',(d.reduce((a,b)=>a+b,0)/d.length).toFixed(1),'bereikt door',d.length)}); }
