// ===== КОНФИГ =====
const SERVER_IP='planning-mongolia.gl.joinmc.link:25565';
const SUPABASE_URL='https://ibhguzlxzoeznhtmauzp.supabase.co';
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliaGd1emx4em9lem5odG1hdXpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MzczMzEsImV4cCI6MjEwMDMxMzMzMX0.u9cmyan1JPVzNIISFJIQBns-PrMdh_JXIIbRcAE-6-8';
const DONATE_LINK='https://www.patreon.com/your_link_here'; // <- СВОЯ ССЫЛКА
const sb=window.supabase?window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY):null;
let currentUser=localStorage.getItem('pvx_user')||null;
let adminAuth=localStorage.getItem('pvx_admin')==='1';
let selectedTariff=null;
const gNick=()=>localStorage.getItem('pvx_admin_nick')||'';
const gToken=()=>localStorage.getItem('pvx_admin_token')||'';

// ===== НАВИГАЦИЯ =====
function renderNavbar(){
  const c=document.getElementById('nav-links'); if(!c)return;
  const p=document.body.dataset.page||'home'; let h='';
  h+=`<a href="index.html" class="${p==='home'?'active':''}">Главная</a>`;
  h+=currentUser?`<a href="profile.html" class="${p==='profile'?'active':''}">Кабинет</a>`:`<a href="register.html" class="${p==='register'?'active':''}">Регистрация</a>`;
  h+=`<a href="donate.html" class="${p==='donate'?'active':''}">Донат</a>`;
  h+=`<a href="rules.html" class="${p==='rules'?'active':''}">Правила</a>`;
  if(adminAuth) h+=`<a href="admin.html" class="${p==='admin'?'active':''}">Админка</a>`;
  if(currentUser) h+=`<a href="#" onclick="logout();return false;" class="logout">Выйти</a>`;
  c.innerHTML=h;
}
function logout(){currentUser=null;adminAuth=false;['pvx_user','pvx_admin','pvx_admin_nick','pvx_admin_token'].forEach(k=>localStorage.removeItem(k));location.href='index.html';}

// ===== ОНЛАЙН =====
async function fetchServerStatus(){
  const s=document.getElementById('server-status'),o=document.getElementById('online-count'); if(!s)return;
  try{const r=await fetch('https://api.mcsrvstat.us/3/planning-mongolia.gl.joinmc.link');const d=await r.json();
    if(d.online){s.innerHTML='<span class="dot online"></span> Онлайн';o.textContent=d.players.online;}
    else{s.innerHTML='<span class="dot offline"></span> Оффлайн';o.textContent='0';}
  }catch(e){s.innerHTML='<span class="dot offline"></span> Недоступен';o.textContent='-';}
}

// ===== УТИЛИТЫ =====
function vNick(n){if(!n)return'Введите никнейм!';if(n.length<3||n.length>16)return'Ник: 3-16 символов.';if(!/^[a-zA-Z0-9_]+$/.test(n))return'Только латиница, цифры и _.';return null;}
function setL(b,on,t){if(on){b.disabled=true;b.innerHTML='<span class="loader"></span> Обработка...';}else{b.disabled=false;b.textContent=t;}}
function res(id,m,t){const e=document.getElementById(id);if(e){e.innerHTML=m;e.className='result show '+t;}}
function copyIP(){const b=document.getElementById('copyBtn');const done=()=>{const o=b.textContent;b.textContent='Скопировано!';b.classList.add('copied');setTimeout(()=>{b.textContent='Copy';b.classList.remove('copied');},1500);};
  if(navigator.clipboard)navigator.clipboard.writeText(SERVER_IP).then(done).catch(fb);else fb();
  function fb(){const t=document.createElement('textarea');t.value=SERVER_IP;t.style.cssText='position:fixed;opacity:0';document.body.appendChild(t);t.select();try{document.execCommand('copy');}catch(e){}document.body.removeChild(t);done();}}

// ===== РЕГИСТРАЦИЯ =====
async function doRegister(){
  const i=document.getElementById('reg-nick'),b=document.getElementById('reg-btn'),n=i.value.trim();res('reg-result','','');
  const e=vNick(n);if(e){res('reg-result',e,'error');return;}if(!sb){res('reg-result','Нет связи с БД','error');return;}
  setL(b,true);
  try{
    const{data:ex}=await sb.from('users').select('minecraft_nickname').ilike('minecraft_nickname',n).maybeSingle();
    if(ex){res('reg-result','Ник занят.','error');setL(b,false,'Получить код');return;}
    const code=Math.floor(100000+Math.random()*900000).toString(),now=Date.now();
    const fakeTg=999999999+Math.floor(Math.random()*1000000);
    await sb.from('temporary_access').insert({nickname:n.toLowerCase(),expire_at:new Date(now+120000).toISOString()});
    await sb.from('linking_codes').insert({code,tg_id:fakeTg,expire_at:new Date(now+300000).toISOString()});
    currentUser=n.toLowerCase();localStorage.setItem('pvx_user',currentUser);renderNavbar();
    res('reg-result',`✅ Код получен! На сервере введите:<br><strong style="font-size:1.2em;color:#fff;display:block;margin-top:10px;font-family:Outfit">/link ${code}</strong><small style="color:var(--text-muted)">(действует 5 минут)</small>`,'success');i.value='';
  }catch(err){console.error(err);res('reg-result','Ошибка сервера.','error');}
  setL(b,false,'Получить код');
}

// ===== ПРОФИЛЬ =====
async function renderProfile(){
  const box=document.getElementById('profile-box');if(!box)return;
  if(!currentUser){box.innerHTML='<div class="form-card"><h2>Личный кабинет</h2><p class="sub">Сначала создайте аккаунт.</p><a href="register.html" class="btn btn-primary full">Зарегистрироваться</a></div>';return;}
  if(!sb){box.innerHTML='<div class="form-card"><p class="sub">Нет связи с БД.</p></div>';return;}
  try{
    const{data:r}=await sb.from('users').select('*').ilike('minecraft_nickname',currentUser).maybeSingle();
    if(!r){currentUser=null;localStorage.removeItem('pvx_user');renderNavbar();renderProfile();return;}
    const L=currentUser[0].toUpperCase(),st=r.banned?'<span class="pstatus ban">● Забанен</span>':'<span class="pstatus ok">● Активен</span>';
    const pf=(r.prefix||'').replace(/§[0-9a-fk-or]/gi,'')||'Нет',pe=r.pass_end?new Date(r.pass_end).toLocaleDateString('ru-RU'):'Нет';
    const ex=(r.extra_nicknames||[]).join(', ')||'Нет';
    const disc=r.active_discount_percent>0?`<div style="margin-top:10px;color:var(--accent-secondary);font-size:.85rem">🔥 Скидка ${r.active_discount_percent}% (${r.active_discount_code})</div>`:'';
    box.innerHTML=`<div class="profile"><div class="avatar">${L}</div><div class="pname">${currentUser}</div>${st}
      <div class="kv"><div class="item"><div class="k">Статус</div><div class="v">${r.status}</div></div>
      <div class="item"><div class="k">Проходка до</div><div class="v">${pe}</div></div>
      <div class="item"><div class="k">Префикс</div><div class="v">${pf}</div></div>
      <div class="item"><div class="k">Доп. ники</div><div class="v">${ex}</div></div></div>
      <div class="mini-block"><h4>🎟 Промокод</h4><div class="row-inline"><input id="promo-code-input" placeholder="Введите код"><button class="btn btn-primary sm" id="promo-btn" onclick="applyPromo()">OK</button></div><div class="result" id="promo-result"></div>${disc}</div>
      <div class="mini-block"><h4>🐞 Жалоба / баг</h4><input id="report-target" placeholder="Ник нарушителя (необязательно)" style="margin-bottom:8px"><textarea id="report-msg" placeholder="Опишите проблему..."></textarea><button class="btn btn-secondary full" id="report-btn" onclick="submitReport()" style="margin-top:8px">Отправить</button><div class="result" id="report-result"></div></div>
      <div class="mini-block" style="text-align:center"><h4>🆓 Бесплатная проходка</h4><p style="color:var(--text-secondary);font-size:.85rem;margin-bottom:12px">Заявка уйдёт на модерацию</p><button class="btn btn-secondary" id="free-pass-btn" onclick="requestFreePass()">Подать заявку</button><div class="result" id="free-pass-result"></div></div>
      <div style="display:flex;gap:16px;justify-content:center"><a href="donate.html" class="btn btn-primary">Купить услугу</a><button class="btn btn-secondary" onclick="logout()">Выйти</button></div></div>`;
  }catch(e){box.innerHTML='<div class="form-card"><p class="sub">Ошибка загрузки.</p></div>';}
}
async function applyPromo(){const i=document.getElementById('promo-code-input'),b=document.getElementById('promo-btn'),c=i.value.trim();res('promo-result','','');if(!c)return;setL(b,true,'...');
  try{const{data}=await sb.rpc('apply_promocode',{p_nickname:currentUser,p_code:c});if(data&&data.status==='success'){res('promo-result','✅ '+data.message,'success');i.value='';setTimeout(renderProfile,1200);}else res('promo-result','❌ '+(data?.message||'Ошибка'),'error');}catch(e){res('promo-result','Ошибка','error');}setL(b,false,'OK');}
async function submitReport(){const m=document.getElementById('report-msg'),t=document.getElementById('report-target'),b=document.getElementById('report-btn');res('report-result','','');if(!m.value.trim()){res('report-result','Опишите проблему','error');return;}setL(b,true,'...');
  try{await sb.rpc('submit_report',{p_reporter:currentUser||'Гость',p_target:t.value.trim()||'—',p_message:m.value.trim()});res('report-result','✅ Отправлено!','success');m.value='';t.value='';}catch(e){res('report-result','Ошибка','error');}setL(b,false,'Отправить');}
async function requestFreePass(){const b=document.getElementById('free-pass-btn');setL(b,true,'...');try{await sb.from('pass_applications').insert({nickname:currentUser});res('free-pass-result','✅ Заявка отправлена!','success');b.disabled=true;b.textContent='Отправлено';}catch(e){res('free-pass-result','Ошибка','error');}setL(b,false,'Подать заявку');}

// ===== ДОНАТ =====
function selectTariff(el){document.querySelectorAll('.tariff').forEach(t=>t.classList.remove('sel'));el.classList.add('sel');selectedTariff=el.dataset.tariff;}
function doDonate(){const i=document.getElementById('donate-nick'),b=document.getElementById('donate-btn'),n=i.value.trim();res('donate-result','','');const e=vNick(n);if(e){res('donate-result',e,'error');return;}if(!selectedTariff){res('donate-result','Выберите услугу!','error');return;}setL(b,true);setTimeout(()=>{res('donate-result','🔄 Переход к оплате...','success');setTimeout(()=>{window.open(DONATE_LINK,'_blank');setL(b,false,'Перейти к оплате');},900);},500);}

// ===== АДМИНКА =====
async function renderAdmin(){
  const box=document.getElementById('admin-box');if(!box)return;
  if(!adminAuth){box.innerHTML=`<div class="form-wrap"><div class="form-card"><h2>Вход в админку</h2><p class="sub">Только для OP сервера.</p><div class="field"><label>Ник на сервере</label><input id="admin-nick-input" maxlength="16"></div><div class="field"><label>Токен</label><input type="password" id="admin-token-input" placeholder="pvx_XXXXXXXX"></div><p style="font-size:.8rem;color:var(--text-muted);text-align:center;margin-bottom:24px">Токен — команда <code style="background:rgba(255,255,255,.1);padding:3px 7px;border-radius:5px;color:var(--accent-primary)">/pvx getadmincode</code></p><button class="btn btn-primary full" id="admin-login-btn" onclick="loginAdmin()">Войти</button><div class="result" id="admin-login-result"></div></div></div>`;
    document.getElementById('admin-nick-input').onkeypress=e=>{if(e.key==='Enter')loginAdmin();};document.getElementById('admin-token-input').onkeypress=e=>{if(e.key==='Enter')loginAdmin();};return;}
  box.innerHTML=`<div class="admin-wrap">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:8px"><h2 style="font-family:Outfit;font-size:1.8rem;font-weight:800">Панель админа</h2><span style="color:var(--text-secondary)">OP: <strong style="color:var(--accent-primary)">${gNick()}</strong></span></div>
    <div class="admin-tabs">
      <button class="admin-tab active" onclick="adminTab('players',this)">Игроки</button>
      <button class="admin-tab" onclick="adminTab('myths',this)">Мифы</button>
      <button class="admin-tab" onclick="adminTab('apps',this)">Заявки</button>
      <button class="admin-tab" onclick="adminTab('reports',this)">Жалобы</button>
      <button class="admin-tab" onclick="adminTab('promos',this)">Промокоды</button>
      <button class="admin-tab" onclick="adminTab('stats',this)">Статистика</button>
    </div>
    <div class="admin-panel active" id="ap-players"></div>
    <div class="admin-panel" id="ap-myths"></div>
    <div class="admin-panel" id="ap-apps"></div>
    <div class="admin-panel" id="ap-reports"></div>
    <div class="admin-panel" id="ap-promos"></div>
    <div class="admin-panel" id="ap-stats"></div>
    <div style="text-align:center;margin-top:30px"><button class="btn btn-secondary" onclick="logoutAdmin()">Выйти из админки</button></div>
  </div>`;
  loadPlayers();
}
function logoutAdmin(){adminAuth=false;['pvx_admin','pvx_admin_nick','pvx_admin_token'].forEach(k=>localStorage.removeItem(k));renderNavbar();renderAdmin();}
async function loginAdmin(){const n=document.getElementById('admin-nick-input').value.trim(),t=document.getElementById('admin-token-input').value.trim();res('admin-login-result','','');if(!n||!t||!t.startsWith('pvx_')){res('admin-login-result','Введите ник и токен pvx_...','error');return;}const b=document.getElementById('admin-login-btn');setL(b,true,'Проверка...');
  try{const{data}=await sb.rpc('verify_admin_token',{p_nickname:n,p_token:t});if(data&&data.status==='valid'){adminAuth=true;localStorage.setItem('pvx_admin_nick',n);localStorage.setItem('pvx_admin_token',t);localStorage.setItem('pvx_admin','1');renderNavbar();renderAdmin();}else res('admin-login-result','Токен недействителен.','error');}catch(e){res('admin-login-result','Ошибка','error');}setL(b,false,'Войти');}
function adminTab(id,btn){document.querySelectorAll('.admin-tab').forEach(t=>t.classList.remove('active'));document.querySelectorAll('.admin-panel').forEach(p=>p.classList.remove('active'));btn.classList.add('active');document.getElementById('ap-'+id).classList.add('active');
  ({players:loadPlayers,myths:loadMyths,apps:loadApps,reports:loadReports,promos:loadPromos,stats:loadStats})[id]();}
const esc=s=>(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
async function rpc(fn,args){const{data,error}=await sb.rpc(fn,{...args,p_admin_nick:gNick(),p_admin_token:gToken()});if(error)throw error;return data;}

// -- Игроки --
async function loadPlayers(){const el=document.getElementById('ap-players');el.innerHTML='<div class="empty">Загрузка...</div>';
  try{const{data}=await sb.from('users').select('*').order('created_at',{ascending:false});
    if(!data||!data.length){el.innerHTML='<div class="empty">Игроков пока нет.</div>';return;}
    el.innerHTML='<div class="admin-list">'+data.map(u=>{const nick=esc(u.minecraft_nickname||('ID '+u.tg_id));const b=u.banned?'badge-ban':'badge-ok';const bt=u.banned?'Разбанить':'Забанить';const bc=u.banned?'ok':'danger';
      return`<div class="admin-row"><div><span class="who">${nick}</span> <span class="badge ${b}">${u.banned?'бан':'ок'}</span></div>
      <div class="meta">${esc(u.status)} • до ${u.pass_end?new Date(u.pass_end).toLocaleDateString('ru-RU'):'—'} • префикс «${esc((u.prefix||'').replace(/§[0-9a-fk-or]/gi,''))||'—'}» • альтов: ${(u.extra_nicknames||[]).length}</div>
      <div class="row-actions">
        <button class="mini-btn ${bc}" onclick="uBan('${nick}',${!u.banned})">${bt}</button>
        <button class="mini-btn" onclick="uPrefix('${nick}')">Префикс</button>
        <button class="mini-btn ok" onclick="uPass('${nick}')">+Проходка</button>
        <button class="mini-btn danger" onclick="uClear('${nick}')">Снять</button>
        <button class="mini-btn" onclick="uExtra('${nick}')">+Альт</button>
      </div></div>`;}).join('')+'</div>';
  }catch(e){el.innerHTML='<div class="empty">Ошибка загрузки.</div>';}}
async function uBan(n,v){try{await rpc('admin_update_user',{p_nickname:n,p_field:'banned',p_value:v?'true':'false'});loadPlayers();}catch(e){alert('Ошибка: '+e.message);}}
async function uPrefix(n){const v=prompt('Префикс для '+n+' (например [VIP] ):');if(v===null)return;try{await rpc('admin_update_user',{p_nickname:n,p_field:'prefix',p_value:v});loadPlayers();}catch(e){alert('Ошибка');}}
async function uPass(n){const v=prompt('Дней проходки для '+n+':','30');if(!v)return;try{await rpc('admin_update_user',{p_nickname:n,p_field:'pass_set',p_value:v});loadPlayers();}catch(e){alert('Ошибка');}}
async function uClear(n){if(!confirm('Снять проходку у '+n+'?'))return;try{await rpc('admin_update_user',{p_nickname:n,p_field:'pass_clear',p_value:''});loadPlayers();}catch(e){alert('Ошибка');}}
async function uExtra(n){const v=prompt('Доп. ник для '+n+':');if(!v)return;try{await rpc('admin_update_user',{p_nickname:n,p_field:'extra_add',p_value:v});loadPlayers();}catch(e){alert('Ошибка');}}

// -- Мифы --
async function loadMyths(){const el=document.getElementById('ap-myths');el.innerHTML='<div class="empty">Загрузка...</div>';
  try{const{data}=await sb.from('myths').select('*').order('nickname');
    let html=`<div class="mini-block"><h4>➕ Добавить мифа</h4><div class="row-inline"><input id="myth-nick" placeholder="никнейм мифа"><button class="btn btn-primary sm" onclick="mythAdd()">Создать</button></div></div>`;
    if(!data||!data.length)html+='<div class="empty">Мифов нет.</div>';
    else html+='<div class="admin-list">'+data.map(m=>`<div class="admin-row"><div><span class="who">👻 ${esc(m.nickname)}</span> <span class="badge badge-myth">${esc(m.style)}</span></div>
      <div class="meta">цвет «${esc(m.color)||'—'}» декор «${esc(m.decor)||'—'}» градиент ${esc(m.gradient)} префикс «${esc(m.prefix)}»</div>
      <div class="row-actions">
        <button class="mini-btn" onclick="mythSet('${m.nickname}','color')">Цвет</button>
        <button class="mini-btn" onclick="mythSet('${m.nickname}','decor')">Декор</button>
        <button class="mini-btn" onclick="mythSet('${m.nickname}','gradient')">Градиент</button>
        <button class="mini-btn" onclick="mythSet('${m.nickname}','prefix')">Префикс</button>
        <button class="mini-btn" onclick="mythToggle('${m.nickname}','${m.style}')">${m.style==='hidden'?'Показать':'Скрыть'}</button>
        <button class="mini-btn danger" onclick="mythDel('${m.nickname}')">Удалить</button>
      </div></div>`).join('')+'</div>';
    el.innerHTML=html;
  }catch(e){el.innerHTML='<div class="empty">Ошибка.</div>';}}
async function mythAdd(){const n=document.getElementById('myth-nick').value.trim();if(!n)return;try{await rpc('myth_add',{p_nickname:n});loadMyths();}catch(e){alert('Ошибка');}}
async function mythSet(n,f){const hints={color:'§-код цвета (§c §6 §d...)',decor:'§l или §k или пусто',gradient:'fire / ice / mystic / none',prefix:'текст префикса'};const v=prompt(hints[f]+' для '+n);if(v===null)return;try{await rpc('myth_update',{p_nickname:n,p_field:f,p_value:v});loadMyths();}catch(e){alert('Ошибка');}}
async function mythToggle(n,cur){try{await rpc('myth_update',{p_nickname:n,p_field:'style',p_value:cur==='hidden'?'normal':'hidden'});loadMyths();}catch(e){alert('Ошибка');}}
async function mythDel(n){if(!confirm('Удалить мифа '+n+'?'))return;try{await rpc('myth_delete',{p_nickname:n});loadMyths();}catch(e){alert('Ошибка');}}

// -- Заявки --
async function loadApps(){const el=document.getElementById('ap-apps');el.innerHTML='<div class="empty">Загрузка...</div>';
  try{const{data}=await sb.from('pass_applications').select('*').eq('status','pending').order('created_at',{ascending:false});
    if(!data||!data.length){el.innerHTML='<div class="empty">Нет активных заявок.</div>';return;}
    el.innerHTML='<div class="admin-list">'+data.map(a=>`<div class="admin-row"><div><span class="who">${esc(a.nickname)}</span> <span class="badge badge-pending">ожидает</span></div><div class="meta">${new Date(a.created_at).toLocaleString('ru-RU')}</div>
      <div class="row-actions"><button class="mini-btn ok" onclick="appOk('${a.id}')">Одобрить</button><button class="mini-btn danger" onclick="appNo('${a.id}')">Отклонить</button></div></div>`).join('')+'</div>';
  }catch(e){el.innerHTML='<div class="empty">Ошибка.</div>';}}
async function appOk(id){const d=prompt('Дней проходки:','30');if(!d)return;try{await rpc('approve_application',{p_id:id,p_days:parseInt(d)});loadApps();}catch(e){alert('Ошибка');}}
async function appNo(id){try{await rpc('decline_application',{p_id:id});loadApps();}catch(e){alert('Ошибка');}}

// -- Жалобы --
async function loadReports(){const el=document.getElementById('ap-reports');el.innerHTML='<div class="empty">Загрузка...</div>';
  try{const{data}=await sb.from('reports').select('*').eq('status','pending').order('created_at',{ascending:false});
    if(!data||!data.length){el.innerHTML='<div class="empty">Нет открытых жалоб.</div>';return;}
    el.innerHTML='<div class="admin-list">'+data.map(r=>`<div class="admin-row"><div><span class="who">${esc(r.reporter_name)} → ${esc(r.target_name||'—')}</span></div><div class="meta">${esc(r.message)}<br><small>${new Date(r.created_at).toLocaleString('ru-RU')}</small></div>
      <div class="row-actions"><button class="mini-btn ok" onclick="repOk('${r.id}')">В архив</button></div></div>`).join('')+'</div>';
  }catch(e){el.innerHTML='<div class="empty">Ошибка.</div>';}}
async function repOk(id){try{await rpc('resolve_report',{p_id:id});loadReports();}catch(e){alert('Ошибка');}}

// -- Промокоды --
async function loadPromos(){const el=document.getElementById('ap-promos');el.innerHTML='<div class="empty">Загрузка...</div>';
  try{const{data}=await sb.from('promocodes').select('*').order('code');
    let html=`<div class="mini-block"><h4>➕ Создать промокод</h4>
      <div class="row-inline" style="flex-wrap:wrap"><input id="pc-code" placeholder="КОД" style="min-width:120px">
      <select id="pc-type" style="padding:10px;border-radius:8px;background:rgba(0,0,0,.3);border:1px solid var(--border-subtle);color:#fff"><option value="days">Дни</option><option value="discount">Скидка %</option></select>
      <input id="pc-val" placeholder="значение" type="number" style="max-width:100px"><input id="pc-uses" placeholder="лимит" type="number" value="500" style="max-width:90px">
      <button class="btn btn-primary sm" onclick="promoCreate()">Создать</button></div></div>`;
    if(!data||!data.length)html+='<div class="empty">Промокодов нет.</div>';
    else html+='<div class="admin-list">'+data.map(p=>`<div class="admin-row"><div><span class="who">${esc(p.code)}</span></div><div class="meta">${p.reward_type==='days'?p.reward_value+' дн.':p.reward_value+'%'} • осталось ${p.uses_left}</div></div>`).join('')+'</div>';
    el.innerHTML=html;
  }catch(e){el.innerHTML='<div class="empty">Ошибка.</div>';}}
async function promoCreate(){const c=document.getElementById('pc-code').value.trim(),t=document.getElementById('pc-type').value,v=parseInt(document.getElementById('pc-val').value),u=parseInt(document.getElementById('pc-uses').value)||500;if(!c||!v){alert('Заполните код и значение');return;}try{await rpc('create_promocode',{p_code:c,p_type:t,p_value:v,p_uses:u});loadPromos();}catch(e){alert('Ошибка (код уже есть?)');}}

// -- Статистика --
async function loadStats(){const el=document.getElementById('ap-stats');el.innerHTML='<div class="empty">Загрузка...</div>';
  try{const{data}=await sb.rpc('get_stats');el.innerHTML=`<div class="stat-grid">
    <div class="stat-box"><div class="n">${data.total}</div><div class="l">Игроков</div></div>
    <div class="stat-box"><div class="n">${data.banned}</div><div class="l">Забанено</div></div>
    <div class="stat-box"><div class="n">${data.passes}</div><div class="l">С проходкой</div></div>
    <div class="stat-box"><div class="n">${data.myths}</div><div class="l">Мифов</div></div></div>`;
  }catch(e){el.innerHTML='<div class="empty">Ошибка.</div>';}}

// ===== СТАРТ =====
document.addEventListener('DOMContentLoaded',()=>{
  renderNavbar();
  const c=document.getElementById('particles');if(c)for(let i=0;i<30;i++){const s=document.createElement('span'),z=2+Math.random()*5;s.style.width=z+'px';s.style.height=z+'px';s.style.left=Math.random()*100+'vw';s.style.animationDuration=(10+Math.random()*15)+'s';s.style.animationDelay=(Math.random()*10)+'s';c.appendChild(s);}
  fetchServerStatus();
  const rn=document.getElementById('reg-nick');if(rn)rn.onkeypress=e=>{if(e.key==='Enter')doRegister();};
  const dn=document.getElementById('donate-nick');if(dn)dn.onkeypress=e=>{if(e.key==='Enter')doDonate();};
  if(document.body.dataset.page==='profile')renderProfile();
  if(document.body.dataset.page==='admin')renderAdmin();
});
