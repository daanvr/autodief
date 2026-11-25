// Vergelijkt de getoonde winkans bij vechten met de echte uitkomst.
const h=require('./head.js'); let cur; const orig=AD.ui.render; AD.ui.render=o=>{cur=o;orig(o)};
function fight(setup,units,from,pol){ let res={win:0,jail:0,wasted:0,free:0,rounds:0,est:0},N=300; for(let i=0;i<N;i++){ AD.state.newGame(); const S=AD.state.S; S.heat=40; setup(S); AD.engine.hub(); cur.choices.find(c=>/Op pad/.test(c.label)).act(); cur.choices[0].act(); const run=AD.engine.run(); run.chase={mode:'foot',distance:20,round:1,units,used:new Set(),next:null,history:[20]}; const fc=AD.engine.fightChoice(from); res.est+=fc.chance; fc.act(); let n=0,r=0; while(cur.title==='GEVECHT'&&n++<40){ const c=cur.choices.find(x=>/Ronde/.test(x.label)); r++; c.act(); } res.rounds+=r; if(/CEL|BUSTED|WASTED/.test(cur.title)) res.wasted++; else res.win++; } return `inschatting ${(res.est/N*100).toFixed(0)}%  echt gewonnen ${(res.win/N*100).toFixed(0)}%  neergeschoten ${(res.wasted/N*100).toFixed(0)}%  rondes ${(res.rounds/N).toFixed(1)}`; }
const crew=(S,n,w,a)=>{S.crew=[];for(let i=0;i<n;i++)S.crew.push(AD.crewGen.complete({uid:900+i,name:'X'+i+' "t"',role:i?'spierbundel':'schutter',skill:1,hp:100,cut:.1,cost:0,armor:a||0,weapon:w||null}))};
console.log('blote handen, 1 agent  ',fight(S=>{},1,'chase'));
console.log('knuppel, 1 agent       ',fight(S=>{S.inv.knuppel=1},1,'chase'));
console.log('pistool, 3 agenten     ',fight(S=>{S.inv.pistool=1},2,'chase'));
console.log('pistool+vest, 3 agenten',fight(S=>{S.inv.pistool=1;S.armor=40},2,'chase'));
console.log('uzi+vest+2 crew pistool, 4',fight(S=>{S.inv.uzi=1;S.armor=40;crew(S,2,'pistool',40)},3,'chase'));
console.log('blote handen, 3 agenten',fight(S=>{},2,'arrest'));
