(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const beeTypes = [
    {name:'Clover Bee',rarity:'Common',emoji:'🐝',power:1,rate:.8,price:80,desc:'A cheerful little worker. Loves clover.'},
    {name:'Bumble Bee',rarity:'Uncommon',emoji:'🐝',power:1.55,rate:1.2,price:190,desc:'Fluffy, friendly, and a little faster.'},
    {name:'Bluebell Bee',rarity:'Rare',emoji:'🐝',power:2.5,rate:2,price:480,desc:'A blue-winged pollen specialist.'},
    {name:'Sunbeam Bee',rarity:'Epic',emoji:'🐝',power:4,rate:3.3,price:1100,desc:'Glows like a tiny ray of sunshine.'},
    {name:'Queen Bee',rarity:'Legendary',emoji:'👑',power:8,rate:6,price:3000,desc:'Royalty of the meadow. All hail the queen.'}
  ];
  const worlds = [
    {name:'Starter Meadow',emoji:'🌼',desc:'A sunny place to put down roots.',req:0,mult:1,flower:'24',honey:'Clover honey'},
    {name:'Desert Island',emoji:'🌵',desc:'Golden dunes and tough little desert bees.',req:900,mult:1.7,flower:'32',honey:'Desert honey'},
    {name:'Frozen Kingdom',emoji:'❄️',desc:'A frosty wonderland of crystal blooms.',req:4500,mult:2.6,flower:'40',honey:'Frost honey'},
    {name:'Enchanted Forest',emoji:'🍄',desc:'Where the flowers glow after dark.',req:18000,mult:4,flower:'52',honey:'Fairy honey'},
    {name:'Cosmic Galaxy',emoji:'🌌',desc:'The stars are full of pollen.',req:75000,mult:7,flower:'68',honey:'Stardust honey'}
  ];
  const upgradeDefs = [
    {id:'extractor',branch:'Honey production',icon:'🍯',name:'Honey extractor',desc:'+35% honey production per level.',cost:55,max:10,effect:'+35% output'},
    {id:'conversion',branch:'Honey production',icon:'⚗️',name:'Sweet science',desc:'Convert pollen into honey more efficiently.',cost:130,max:8,effect:'+25% conversion'},
    {id:'critical',branch:'Honey production',icon:'✨',name:'Golden drops',desc:'A chance for a production burst.',cost:260,max:5,effect:'More critical honey'},
    {id:'flight',branch:'Bee efficiency',icon:'🪽',name:'Swift wings',desc:'Bees fly faster and bring back more pollen.',cost:70,max:10,effect:'+30% bee speed'},
    {id:'capacity',branch:'Bee efficiency',icon:'🐝',name:'Bigger hive',desc:'Make room for another little helper.',cost:180,max:4,effect:'+1 bee slot'},
    {id:'harvest',branch:'Bee efficiency',icon:'🌸',name:'Flower friends',desc:'More pollen from every flower visit.',cost:115,max:8,effect:'+20% pollen'},
    {id:'jar',branch:'Jar technology',icon:'🫙',name:'Roomier jars',desc:'Increase active jar capacity by 30%.',cost:85,max:8,effect:'+30% jar size'},
    {id:'price',branch:'Jar technology',icon:'🪙',name:'Market charm',desc:'Sell each full jar for more coins.',cost:140,max:8,effect:'+25% sale price'},
    {id:'multiple',branch:'Jar technology',icon:'🧺',name:'Jar carousel',desc:'Extra jars are queued automatically.',cost:400,max:2,effect:'+1 jar queue'},
    {id:'luck',branch:'Royal research',icon:'🥚',name:'Royal intuition',desc:'Improve your odds of hatching a rare bee.',cost:220,max:8,effect:'Better egg luck'},
    {id:'research',branch:'Royal research',icon:'📜',name:'Ancient formula',desc:'A permanent boost to all honey.',cost:500,max:5,effect:'+20% honey'},
    {id:'rebirth',branch:'Royal research',icon:'♛',name:'Royal blessing',desc:'Strengthen your next royal rebirth.',cost:900,max:5,effect:'+1 rebirth token'}
  ];
  const baseState = {coins:35,totalHoney:0,jar:0,capacity:60,beeIds:['Clover Bee'],upgrades:{},world:0,unlocked:[0],milestones:[],sold:0,rebirths:0,tokens:0,questClaimed:false,dailyClaimed:'',sound:true,muted:false,offlineAt:Date.now(),honeyMultiplier:1};
  let state;
  try { state={...baseState,...JSON.parse(localStorage.getItem('honeyEmpireSave')||'{}')}; } catch { state={...baseState}; }
  state.upgrades ||= {}; state.unlocked ||= [0]; state.milestones ||= []; state.beeIds ||= ['Clover Bee'];
  const maxJarBase=60, milestones=[
    {title:'First sweet steps',desc:'Collect 25 honey',test:s=>s.totalHoney>=25,reward:40},
    {title:'A jar of sunshine',desc:'Sell your first full jar',test:s=>s.sold>=1,reward:75},
    {title:'Bee our guest',desc:'Welcome 3 bees to your hive',test:s=>s.beeIds.length>=3,reward:100},
    {title:'Honey helper',desc:'Reach 250 total honey',test:s=>s.totalHoney>=250,reward:100},
    {title:'A growing empire',desc:'Buy 3 upgrades',test:s=>Object.values(s.upgrades).reduce((a,b)=>a+b,0)>=3,reward:150},
    {title:'Meadow master',desc:'Sell 5 full jars',test:s=>s.sold>=5,reward:200},
    {title:'Royal company',desc:'Hatch an Epic bee',test:s=>s.beeIds.some(n=>n==='Sunbeam Bee'||n==='Queen Bee'),reward:250},
    {title:'Desert bound',desc:'Unlock the Desert Island',test:s=>s.unlocked.includes(1),reward:300},
    {title:'Buzzing with power',desc:'Reach 10 honey per second',test:s=>rate(s)>=10,reward:400},
    {title:'Honey Empire',desc:'Sell 25 jars',test:s=>s.sold>=25,reward:1000}
  ];
  function rate(s=state){const bees=s.beeIds.reduce((sum,n)=>sum+(beeTypes.find(b=>b.name===n)?.rate||.8),0);let up=1+(s.upgrades.extractor||0)*.35+(s.upgrades.research||0)*.2+(s.upgrades.conversion||0)*.25;return bees*up*(worlds[s.world]?.mult||1)*(s.honeyMultiplier||1);}
  function capacity(s=state){return Math.round(maxJarBase*(1+(s.upgrades.jar||0)*.3));}
  function price(s=state){return Math.round(120*(1+(s.upgrades.price||0)*.25)*(worlds[s.world]?.mult||1));}
  function save(){state.offlineAt=Date.now();localStorage.setItem('honeyEmpireSave',JSON.stringify(state));}
  function number(n){if(n>=1e6)return (n/1e6).toFixed(1)+'m';if(n>=1e4)return (n/1e3).toFixed(1)+'k';return Math.floor(n).toLocaleString();}
  function toast(msg){const el=document.createElement('div');el.className='toast';el.innerHTML=msg;$('#toast-stack').append(el);setTimeout(()=>el.remove(),3200)}
  function audio(freq=520,duration=.11){if(!state.sound)return;try{const c=new(window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.055,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+duration)}catch{}}
  function render(){
    state.capacity=capacity();const hps=rate();
    $('#honey-balance').textContent=number(state.totalHoney);$('#coin-balance').textContent=number(state.coins);$('#level').textContent=1+Math.floor(state.totalHoney/500);
    $('#bee-count').textContent=state.beeIds.length;$('#bee-card-title').textContent=`${state.beeIds.length} busy bee${state.beeIds.length===1?'':'s'}`;
    $('#hps').textContent=hps.toFixed(1);$('#pollen-stat').textContent=`${Math.min(30,Math.floor(state.jar/2))} / 30`;
    $('#jar-amount').textContent=`${number(state.jar)} / ${number(state.capacity)}`;$('#jar-progress').style.width=`${Math.min(100,state.jar/state.capacity*100)}%`;$('#jar-liquid').style.height=`${Math.min(100,state.jar/state.capacity*100)}%`;
    $('#jar-value').textContent=number(price());$('#sell-button').disabled=state.jar<state.capacity;
    $('#flower-count').textContent=worlds[state.world].flower;document.querySelector('.breadcrumb strong').textContent=worlds[state.world].name;$('#jar-name').textContent=state.world===0?'Clover jar':state.world===1?'Sand jar':state.world===2?'Crystal jar':state.world===3?'Emerald jar':'Cosmic jar';
    const m=milestones.findIndex((x,i)=>!state.milestones.includes(i));$('#milestone-copy').textContent=m<0?'All milestones complete!':milestones[m].title;$('#milestone-count').textContent=m<0?'10 / 10':`${m} / 10`;$('#milestone-progress').style.width=`${m<0?100:m*10}%`;
    $('#quest-card-sub').textContent=`Earn 500 honey · ${number(Math.min(500,state.totalHoney))} / 500`;$('#quest-card-title').textContent=state.questClaimed?'Quest complete!':'A sticky start';
    $('#daily-copy').textContent=state.dailyClaimed===new Date().toDateString()?'Come back tomorrow!':'Claim today\'s gift';
    if(state.jar>0&&state.jar<state.capacity){$('#pour-stream').classList.add('pouring');$('#pour-drop').classList.add('pouring')}else{$('#pour-stream').classList.remove('pouring');$('#pour-drop').classList.remove('pouring')}
    document.querySelectorAll('.bee').forEach((el,i)=>{el.style.display=i<Math.min(state.beeIds.length,5)?'block':'none';if(i<state.beeIds.length&&state.beeIds[i])el.querySelector('span').textContent=beeTypes.find(b=>b.name===state.beeIds[i])?.emoji||'🐝'});
    $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.panel==='home'&&$('#modal-backdrop').classList.contains('open')===false));
    save();checkMilestones();
  }
  function checkMilestones(){milestones.forEach((m,i)=>{if(!state.milestones.includes(i)&&m.test(state)){state.milestones.push(i);state.coins+=m.reward;toast(`🏆 <strong>${m.title}</strong> complete! +${m.reward} coins`);audio(760,.18)}})}
  function collect(amount=8){if(state.jar>=state.capacity){toast('Your jar is full! Sell it to keep collecting.');return}const boost=Math.random()<.05?2:1,add=Math.min(state.capacity-state.jar,amount*boost);state.jar+=add;state.totalHoney+=add;if(boost>1)toast('✨ Golden pollen! Double honey!');audio(430,.08);render()}
  function sellJar(){if(state.jar<state.capacity)return;const earned=price();state.coins+=earned;state.sold++;state.jar=0;$('#jar-liquid').classList.add('jar-glow');setTimeout(()=>$('#jar-liquid').classList.remove('jar-glow'),700);audio(700,.2);toast(`🍯 Jar sold! <strong>+${number(earned)} coins</strong>`);render()}
  function buyUpgrade(id){const u=upgradeDefs.find(x=>x.id===id),lv=state.upgrades[id]||0,cost=Math.floor(u.cost*Math.pow(1.58,lv));if(lv>=u.max){toast('That upgrade is fully powered up!');return}if(state.coins<cost){toast(`You need <strong>${number(cost-state.coins)} more coins</strong>. Sell a jar!`);return}state.coins-=cost;state.upgrades[id]=lv+1;if(id==='jar')state.capacity=capacity();audio(650,.13);toast(`✨ <strong>${u.name}</strong> upgraded to level ${lv+1}!`);openPanel('upgrades');render()}
  function hatchBee(){const cost=80;if(state.coins<cost){toast('Sell a full jar to earn coins for an egg.');return}if(state.beeIds.length>=3+(state.upgrades.capacity||0)){toast('Your hive is full! Upgrade Bigger hive first.');return}state.coins-=cost;let weights=[54,25,13,6,2],luck=state.upgrades.luck||0;weights[0]-=luck*3;weights[4]+=luck;const roll=Math.random()*weights.reduce((a,b)=>a+b,0);let sum=0,index=0;for(;index<weights.length;index++){sum+=weights[index];if(roll<sum)break}const bee=beeTypes[Math.min(index,4)];state.beeIds.push(bee.name);if(Math.random()<.035)toast('🌈 A mutation! Your new bee has a <strong>Rainbow glow</strong>!');toast(`🥚 You hatched a <strong>${bee.rarity} ${bee.name}</strong>!`);audio(bee.rarity==='Legendary'?880:540,.2);openPanel('bees');render()}
  function fuse(name){const count=state.beeIds.filter(n=>n===name).length;if(count<3){toast('You need 3 identical bees to fuse.');return}state.beeIds=state.beeIds.filter(n=>n!==name);const idx=beeTypes.findIndex(b=>b.name===name),next=beeTypes[Math.min(4,idx+1)];state.beeIds.push(next.name);toast(`⚡ Fusion complete! 3 ${name}s became a <strong>Shiny ${next.name}</strong>!`);audio(800,.3);openPanel('bees');render()}
  function openPanel(panel){
    const backdrop=$('#modal-backdrop'),content=$('#modal-content');let html='';
    const head=(eyebrow,title,lead)=>`<div class="modal-eyebrow">${eyebrow}</div><h2>${title}</h2><p class="modal-lead">${lead}</p>`;
    if(panel==='bees'){
      html=head('YOUR HIVE','Bee collection',`${state.beeIds.length} helper${state.beeIds.length===1?'':'s'} in your hive · ${rate().toFixed(1)} honey per second`)+`<div class="bee-collection">`+beeTypes.map(b=>{const count=state.beeIds.filter(n=>n===b.name).length;return `<article class="bee-tile"><div class="bee-avatar">${b.emoji}</div><strong>${b.name}${count>1?` ×${count}`:''}</strong><small>${b.rate} honey / sec · ${b.desc}</small><span class="rarity ${b.rarity.toLowerCase()}">${b.rarity}</span>${count>=3?`<button class="mini-action" data-fuse="${b.name}">Fuse 3 bees</button>`:''}</article>`}).join('')+`</div><div class="modal-callout">🐝 Bees fly around the meadow automatically, visiting flowers and bringing pollen back to your jar.</div><button class="action-button" data-panel="hatch">🥚 Visit the egg shop · 80 coins</button>`;
    } else if(panel==='upgrades'){
      html=head('CHOOSE YOUR PATH','The upgrade tree','Pick a branch and build your own honey-making strategy. Every upgrade has a real effect.')+`<div class="upgrade-tree">`+upgradeDefs.map(u=>{const lv=state.upgrades[u.id]||0,cost=Math.floor(u.cost*Math.pow(1.58,lv)),locked=lv>=u.max;return `<article class="upgrade-node"><div class="node-head"><span class="node-icon">${u.icon}</span><div><h3>${u.name}</h3><span class="node-level">${u.branch} · Lv. ${lv}/${u.max}</span></div></div><p>${u.desc} ${u.effect}</p><button class="mini-action" data-buy="${u.id}" ${locked?'disabled':''}>${locked?'MAX LEVEL':`Upgrade · 🪙 ${number(cost)}`}</button></article>`}).join('')+`</div>`;
    } else if(panel==='hatch'){
      html=head('A SURPRISE IN EVERY EGG','Meadow egg shop','Hatch a new helper! Better Royal Research improves your rare bee odds. Your hive has room for '+(3+(state.upgrades.capacity||0)-state.beeIds.length)+' more bees.')+`<div class="modal-card" style="text-align:center;padding:20px"><div style="font-size:48px">🥚</div><h3>Meadow egg</h3><p>Common 54% · Uncommon 25% · Rare 13% · Epic 6% · Legendary 2%</p><button class="action-button" style="margin-top:14px" data-hatch>Hatch egg · 🪙 80</button></div><div class="modal-grid" style="margin-top:10px">${beeTypes.map(b=>`<div class="modal-card"><span class="card-emoji">${b.emoji}</span><span class="rarity ${b.rarity.toLowerCase()}">${b.rarity}</span><h3>${b.name}</h3><p>${b.desc} · ${b.rate} honey/sec</p></div>`).join('')}</div>`;
    } else if(panel==='worlds'){
      html=head('A BIG, BEAUTIFUL WORLD','Choose your world','Unlock new worlds with coins. Each one boosts honey output and brings a new honey type.')+`<div class="world-list">`+worlds.map((w,i)=>`<div class="world-row"><div class="world-art">${w.emoji}</div><div><strong>${w.name}</strong><small>${w.desc} · ${w.mult}× production</small></div>${state.unlocked.includes(i)?`<button class="mini-action" data-world="${i}" ${state.world===i?'disabled':''}>${state.world===i?'Visiting':'Travel'}</button>`:`<button class="mini-action" data-unlock="${i}">Unlock · 🪙 ${number(w.req)}</button>`}</div>`).join('')+`</div><div class="modal-callout">🌷 Honey produced in each world adds to that world's mastery. Higher worlds make every bee more productive.</div>`;
    } else if(panel==='quests'){
      const progress=Math.min(500,state.totalHoney),done=progress>=500;html=head('LITTLE GOALS, LOVELY REWARDS','Daily quests','A fresh little challenge to keep your hive humming.')+`<div class="quest-row"><span class="quest-symbol">🍯</span><div class="quest-copy"><strong>A sticky start</strong><small>Produce 500 honey · ${number(progress)} / 500</small></div><span class="quest-reward">+150 🪙</span><button class="mini-action" data-quest ${!done||state.questClaimed?'disabled':''}>${state.questClaimed?'Claimed':done?'Claim':'In progress'}</button></div>`+`<div class="quest-row"><span class="quest-symbol">🫙</span><div class="quest-copy"><strong>Jar collector</strong><small>Sell 3 jars · ${Math.min(3,state.sold)} / 3</small></div><span class="quest-reward">+100 🪙</span><button class="mini-action" data-sellquest ${state.sold<3?'disabled':''}>${state.sold<3?'In progress':'Collect'}</button></div><div class="modal-eyebrow" style="margin-top:20px">10 EMPIRE MILESTONES</div><div class="modal-grid" style="margin-top:9px">${milestones.map((m,i)=>`<div class="modal-card ${state.milestones.includes(i)?'':'locked'}"><span class="card-emoji">${state.milestones.includes(i)?'✅':'🏆'}</span><h3>${i+1}. ${m.title}</h3><p>${m.desc} · ${state.milestones.includes(i)?'Claimed':'Reward: '+m.reward+' coins'}</p></div>`).join('')}</div>`;
    } else if(panel==='mastery'){
      html=head('YOUR SIGNATURE FEATURE','Honey mastery','Every kind of honey has its own mastery track. Revisit worlds, make more honey, and earn lasting bonuses.')+`<div class="world-list">`+worlds.map((w,i)=>{const amount=i===state.world?state.totalHoney:state.unlocked.includes(i)?Math.floor(state.totalHoney*(i===0?0.68:0.18)):0;const marks=[10000,100000,1000000,10000000];return `<div class="world-row"><div class="world-art">${w.emoji}</div><div style="flex:1"><strong>${w.honey} mastery</strong><small>${number(amount)} produced · next reward at ${number(marks[0])}</small><div class="progress-track" style="margin-top:7px"><i style="width:${Math.min(100,amount/marks[0]*100)}%"></i></div></div><span class="level-badge">${amount>=marks[0]?'REWARD READY':'IN PROGRESS'}</span></div>`}).join('')+`</div><div class="modal-callout">🌟 Mastery rewards include world-specific bee bonuses, jars, exclusive bees and a secret hive at 10 million honey.</div>`;
    } else if(panel==='rebirth'){
      const need=5000,ready=state.totalHoney>=need&&state.coins>=1000;html=head('START AGAIN, STRONGER','Royal rebirth',`Reset your coins, honey and ordinary upgrades for permanent royal tokens. Your bee collection and worlds are kept.`)+`<div class="modal-card" style="text-align:center;padding:20px"><span class="modal-eyebrow">CURRENT ROYAL TOKENS</span><div class="big-number">♛ ${state.tokens}</div><p>Each token adds +10% permanent honey production.</p><div class="modal-callout">Rebirth needs 5,000 lifetime honey and 1,000 coins.<br>Current honey: ${number(state.totalHoney)} / ${number(need)} · coins: ${number(state.coins)} / 1,000</div><button class="action-button" data-rebirth ${ready?'':'disabled'}>Royal rebirth · Reset progression</button></div><div class="upgrade-tree" style="margin-top:10px">${[1,2,3,4].map((n)=>`<article class="upgrade-node"><div class="node-head"><span class="node-icon">♛</span><h3>Royal blessing ${n}</h3></div><p>Permanent +10% honey for every token earned.</p><span class="node-level">${state.tokens>=n?'UNLOCKED':'NEED '+n+' TOKENS'}</span></article>`).join('')}</div>`;
    } else if(panel==='settings'){
      html=head('MAKE YOURSELF AT HOME','Settings','Your progress saves automatically on this device.')+`<div class="settings-row"><span>Sound effects</span><button class="toggle ${state.sound?'':'off'}" data-setting="sound"><i></i></button></div><div class="settings-row"><span>Reduced motion</span><button class="toggle ${state.muted?'':'off'}" data-setting="motion"><i></i></button></div><div class="settings-row"><span>Save status</span><b style="color:#67a45c">Saved automatically ✓</b></div><div class="modal-callout">Your empire is stored in this browser. Come back any time to find your bees waiting.</div>`;
    } else {html=head('YOUR EMPIRE','A little more buzz','The queen bee is keeping an eye on things.')+`<div class="empty-note">Your next adventure is just around the corner!</div>`}
    content.innerHTML=html;backdrop.classList.add('open');$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.panel===panel));
  }
  function closePanel(){$('#modal-backdrop').classList.remove('open');$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.panel==='home'))}
  document.addEventListener('click',e=>{
    const target=e.target.closest('button');if(!target)return;
    if(target.dataset.panel){openPanel(target.dataset.panel);return}
    if(target.id==='collect-button'){collect(8);return}if(target.id==='sell-button'){sellJar();return}
    if(target.id==='daily-button'){const today=new Date().toDateString();if(state.dailyClaimed===today){toast('Your next daily gift is waiting tomorrow!')}else{state.dailyClaimed=today;state.coins+=180;toast('🎁 Daily gift claimed! <strong>+180 coins</strong>');audio(740,.2);render()}return}
    if(target.id==='settings-button'){openPanel('settings');return}if(target.id==='notify-button'){toast(`🐝 ${state.beeIds.length} bees are buzzing in your hive!`);return}
    if(target.id==='modal-close'||target.id==='jar-menu'){if(target.id==='jar-menu'){openPanel('mastery')}else closePanel();return}
    if(target.hasAttribute('data-hatch')){hatchBee();return}if(target.dataset.buy){buyUpgrade(target.dataset.buy);return}if(target.dataset.fuse){fuse(target.dataset.fuse);return}
    if(target.dataset.world!==undefined){state.world=Number(target.dataset.world);closePanel();render();toast(`🌍 Welcome to <strong>${worlds[state.world].name}</strong>!`);return}
    if(target.dataset.unlock!==undefined){const i=Number(target.dataset.unlock),cost=worlds[i].req;if(state.coins<cost){toast(`You need <strong>${number(cost-state.coins)} more coins</strong> to unlock this world.`);return}state.coins-=cost;state.unlocked.push(i);state.world=i;openPanel('worlds');render();toast(`🌟 <strong>${worlds[i].name}</strong> unlocked!`);return}
    if(target.hasAttribute('data-quest')){if(state.totalHoney>=500&&!state.questClaimed){state.questClaimed=true;state.coins+=150;toast('⚑ Quest complete! <strong>+150 coins</strong>');render();openPanel('quests')}return}
    if(target.hasAttribute('data-sellquest')){if(state.sold>=3){state.coins+=100;state.sold-=3;toast('🫙 Jar collector reward! <strong>+100 coins</strong>');render();openPanel('quests')}return}
    if(target.hasAttribute('data-rebirth')){if(state.totalHoney<5000||state.coins<1000)return;state.tokens++;state.coins=0;state.totalHoney=0;state.jar=0;state.upgrades={};state.capacity=maxJarBase;state.honeyMultiplier=1+state.tokens*.1;state.sold=0;audio(280,.4);toast(`♛ Royal rebirth! <strong>Token ${state.tokens}</strong> · permanent +10% honey`);render();openPanel('rebirth');return}
    if(target.dataset.setting){if(target.dataset.setting==='sound')state.sound=!state.sound;else state.muted=!state.muted;save();openPanel('settings');return}
  });
  $('#modal-backdrop').addEventListener('click',e=>{if(e.target.id==='modal-backdrop')closePanel()});$('#modal-close').addEventListener('click',closePanel);
  document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['BUTTON','INPUT'].includes(document.activeElement.tagName)){e.preventDefault();collect(8)}if(e.key==='Escape')closePanel()});
  // A small, bounded offline bonus (up to two hours).
  const away=Math.min(7200,Math.max(0,(Date.now()-(state.offlineAt||Date.now()))/1000));if(away>45){const bonus=Math.floor(Math.min(state.capacity-state.jar,rate()*away*.18));if(bonus>0){state.jar+=bonus;state.totalHoney+=bonus;setTimeout(()=>toast(`🌙 Welcome back! Your bees made <strong>${number(bonus)} honey</strong> while you were away.`),700)}}
  let rushSeconds=170;setInterval(()=>{if(rushSeconds>0){rushSeconds--;const mins=String(Math.floor(rushSeconds/60)).padStart(2,'0'),secs=String(rushSeconds%60).padStart(2,'0');$('#event-copy').textContent=`Next rush in ${mins}:${secs}`;if(!rushSeconds){rushSeconds=60;$('#rush-overlay').classList.add('active');toast('✨ <strong>Golden Honey Rush!</strong> 3× production for 60 seconds!');audio(900,.3);setTimeout(()=>{$('#rush-overlay').classList.remove('active');toast('The Golden Honey Rush has ended. Back to the meadow!')},60000)}}},1000);
  setInterval(()=>{if(state.jar<state.capacity){const amount=rate()*( $('#rush-overlay').classList.contains('active')?3:1 );state.jar=Math.min(state.capacity,state.jar+amount);state.totalHoney+=amount;render()}},1000);
  // Start with a clear home state and restore any browser-saved progress.
  render();
})();