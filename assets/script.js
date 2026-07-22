// ============================================================
// НАСТРОЙКИ PARAVERX
// ============================================================
const SERVER_IP = 'driver-clicking.gl.joinmc.link:25565';
const SUPABASE_URL = 'https://ibhguzlxzoeznhtmauzp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliaGd1emx4em9lem5odG1hdXpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MzczMzEsImV4cCI6MjEwMDMxMzMzMX0.u9cmyan1JPVzNIISFJIQBns-PrMdh_JXIIbRcAE-6-8';
const PATREON_LINK = 'https://www.patreon.com/your_link_here'; // ЗАМЕНИ НА СВОЮ ССЫЛКУ

// Инициализация Supabase
let supabase = null;
if (window.supabase) {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

let currentUser = localStorage.getItem('pvx_user') || null;
let adminAuth = localStorage.getItem('pvx_admin') === '1';
let selectedTariff = null;

// ============================================================
// НАВИГАЦИЯ
// ============================================================
function setActiveNav() {
  const page = document.body.dataset.page || 'home';
  document.querySelectorAll('.nav-menu a').forEach(a => {
    a.classList.remove('active');
    if (a.dataset.page === page) a.classList.add('active');
  });
}

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================
function validateNick(n) {
  if (!n) return 'Введи никнейм!';
  if (n.length < 3 || n.length > 16) return 'Ник должен быть от 3 до 16 символов.';
  if (!/^[a-zA-Z0-9_]+$/.test(n)) return 'Только латинские буквы, цифры и _.';
  return null;
}

function setLoading(btn, on, txt) {
  if (on) { btn.disabled = true; btn.innerHTML = '<span class="loader"></span> ОБРАБОТКА...'; }
  else { btn.disabled = false; btn.textContent = txt; }
}

function showResult(id, msg, type) {
  const el = document.getElementById(id);
  if (el) { el.innerHTML = msg; el.className = 'result show ' + type; }
}

function hideResult(id) {
  const el = document.getElementById(id);
  if (el) el.className = 'result';
}

// ============================================================
// РЕГИСТРАЦИЯ
// ============================================================
async function doRegister() {
  const input = document.getElementById('reg-nick');
  const btn = document.getElementById('reg-btn');
  const nick = input.value.trim();
  hideResult('reg-result');
  
  const err = validateNick(nick);
  if (err) { showResult('reg-result', err, 'error'); return; }
  
  if (!supabase) { showResult('reg-result', 'Ошибка подключения к базе.', 'error'); return; }
  
  setLoading(btn, true);
  
  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('minecraft_nickname')
      .ilike('minecraft_nickname', nick)
      .single();
      
    if (existingUser) {
      showResult('reg-result', 'Ник "' + nick + '" уже занят! Попробуй другой.', 'error');
      setLoading(btn, false, 'ПОЛУЧИТЬ КОД');
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expireLink = new Date(now.getTime() + 5 * 60000).toISOString();
    const expireTemp = new Date(now.getTime() + 2 * 60000).toISOString();
    const fakeTgId = 999999999 + Math.floor(Math.random() * 1000000);

    const { error: tempError } = await supabase.from('temporary_access').insert({
      nickname: nick.toLowerCase(),
      expire_at: expireTemp
    });

    const { error: codeError } = await supabase.from('linking_codes').insert({
      code: code,
      tg_id: fakeTgId,
      expire_at: expireLink
    });

    if (tempError || codeError) {
      console.error('DB Error:', tempError || codeError);
      showResult('reg-result', 'Ошибка сервера. Попробуй позже.', 'error');
    } else {
      currentUser = nick.toLowerCase();
      localStorage.setItem('pvx_user', currentUser);
      showResult('reg-result', `✅ Код получен! Зайди на сервер и введи:<br><strong style="font-size:1.2em; color:var(--accent-3)">/link ${code}</strong><br><small>(Действует 5 минут)</small>`, 'success');
      input.value = '';
    }
  } catch (e) {
    console.error(e);
    showResult('reg-result', 'Ошибка подключения к базе данных.', 'error');
  }
  
  setLoading(btn, false, 'ПОЛУЧИТЬ КОД');
}

// ============================================================
// ПРОФИЛЬ
// ============================================================
async function renderProfile() {
  const box = document.getElementById('profile-box');
  if (!box) return;
  
  if (!currentUser) {
    box.innerHTML = '<div class="panel form-card"><h2>КАБИНЕТ</h2><p class="sub">Сначала создай аккаунт.</p><a href="register.html" class="btn full">ЗАРЕГИСТРИРОВАТЬСЯ</a></div>';
    return;
  }
  
  if (!supabase) {
    box.innerHTML = '<div class="panel form-card"><p class="sub">Ошибка подключения к базе.</p></div>';
    return;
  }
  
  try {
    const { data: rec, error } = await supabase
      .from('users')
      .select('*')
      .ilike('minecraft_nickname', currentUser)
      .single();
      
    if (error || !rec) {
      currentUser = null;
      localStorage.removeItem('pvx_user');
      renderProfile();
      return;
    }
    
    const letter = currentUser.charAt(0).toUpperCase();
    const st = rec.banned ? '<span class="pstatus ban">● ЗАБАНЕН</span>' : '<span class="pstatus ok">● АКТИВЕН</span>';
    const pref = (rec.prefix || '').replace(/§[0-9a-fk-or]/gi, '') || '—';
    const passEnd = rec.pass_end ? new Date(rec.pass_end).toLocaleDateString('ru-RU') : 'Нет';
    
    box.innerHTML = '<div class="panel profile">' +
      '<div class="avatar">' + letter + '</div>' +
      '<div class="pname">' + currentUser + '</div>' + st +
      '<div class="kv">' +
        '<div class="item"><div class="k">СТАТУС</div><div class="v">' + rec.status + '</div></div>' +
        '<div class="item"><div class="k">ПРОХОДКА ДО</div><div class="v">' + passEnd + '</div></div>' +
        '<div class="item"><div class="k">ПРЕФИКС</div><div class="v">' + pref + '</div></div>' +
        '<div class="item"><div class="k">IP СЕРВЕРА</div><div class="v">' + SERVER_IP + '</div></div>' +
      '</div>' +
      '<div class="pactions">' +
        '<a href="donate.html" class="btn">КУПИТЬ УСЛУГУ</a>' +
        '<button class="btn ghost" onclick="logout()">ВЫЙТИ</button>' +
      '</div>' +
    '</div>';
  } catch (e) {
    box.innerHTML = '<div class="panel form-card"><p class="sub">Ошибка загрузки профиля.</p></div>';
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('pvx_user');
  window.location.href = 'index.html';
}

// ============================================================
// ДОНАТ
// ============================================================
function selectTariff(el) {
  document.querySelectorAll('.tariff').forEach(t => t.classList.remove('sel'));
  el.classList.add('sel');
  selectedTariff = el.dataset.tariff;
}

function doDonate() {
  const nickEl = document.getElementById('donate-nick');
  const btn = document.getElementById('donate-btn');
  const nick = nickEl.value.trim();
  hideResult('donate-result');
  
  const err = validateNick(nick);
  if (err) { showResult('donate-result', err, 'error'); return; }
  if (!selectedTariff) { showResult('donate-result', 'Сначала выбери услугу выше!', 'error'); return; }
  
  setLoading(btn, true);
  
  setTimeout(() => {
    showResult('donate-result', '🔄 Перенаправление на страницу оплаты...', 'success');
    setTimeout(() => {
      window.open(PATREON_LINK, '_blank');
      setLoading(btn, false, 'ПЕРЕЙТИ К ОПЛАТЕ');
    }, 1000);
  }, 800);
}

// ============================================================
// АДМИНКА
// ============================================================
async function renderAdmin() {
  const box = document.getElementById('admin-box');
  if (!box) return;
  
  if (!adminAuth) {
    box.innerHTML = '<div class="panel form-card"><h2> ВХОД В АДМИНКУ</h2>' +
      '<p class="sub">Доступ только для операторов сервера ParaVerX.</p>' +
      '<div class="field"><label for="admin-nick-input">Твой ник на сервере</label>' +
      '<input type="text" id="admin-nick-input" placeholder="Herobrine" autocomplete="off" maxlength="16"></div>' +
      '<div class="field"><label for="admin-token-input">Токен доступа</label>' +
      '<input type="password" id="admin-token-input" placeholder="pvx_XXXXXXXX" autocomplete="off"></div>' +
      '<p class="hint">Получи токен на сервере командой <code>/pvx getadmincode</code></p>' +
      '<button class="btn full" id="admin-login-btn" onclick="loginAdmin()">ВОЙТИ</button>' +
      '<div class="result" id="admin-login-result"></div></div>';
      
    document.getElementById('admin-nick-input').addEventListener('keypress', e => { if (e.key === 'Enter') loginAdmin(); });
    document.getElementById('admin-token-input').addEventListener('keypress', e => { if (e.key === 'Enter') loginAdmin(); });
    return;
  }
  
  const savedNick = localStorage.getItem('pvx_admin_nick') || 'admin';
  box.innerHTML = '<div class="panel form-card"><h2>⚙️ ПАНЕЛЬ АДМИНА</h2>' +
    '<p class="sub">Авторизован как: <strong style="color:var(--accent-3)">' + savedNick + '</strong></p>' +
    '<p class="sub" style="font-size:.8rem">Используй игровые команды (/mban, /mprefix) для управления. Сайт синхронизирован с базой.</p>' +
    '<div style="text-align:center;margin-top:16px"><button class="btn ghost sm" onclick="logoutAdmin()">ВЫЙТИ ИЗ АДМИНКИ</button></div></div>';
}

async function loginAdmin() {
  const nick = (document.getElementById('admin-nick-input').value || '').trim();
  const token = (document.getElementById('admin-token-input').value || '').trim();
  hideResult('admin-login-result');
  
  if (!nick || !token) { showResult('admin-login-result', 'Введи ник и токен!', 'error'); return; }
  if (!token.startsWith('pvx_')) { showResult('admin-login-result', 'Неверный формат токена!', 'error'); return; }
  
  if (!supabase) { showResult('admin-login-result', 'Ошибка подключения.', 'error'); return; }
  
  const btn = document.getElementById('admin-login-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loader"></span> ПРОВЕРКА...';
  
  try {
    const { data, error } = await supabase.rpc('verify_admin_token', { p_nickname: nick, p_token: token });
    
    if (!error && data && data.status === 'valid') {
      adminAuth = true;
      localStorage.setItem('pvx_admin_nick', nick);
      localStorage.setItem('pvx_admin', '1');
      renderAdmin();
    } else {
      showResult('admin-login-result', '❌ Токен недействителен или ник не является OP.', 'error');
    }
  } catch (e) {
    showResult('admin-login-result', 'Ошибка подключения.', 'error');
  }
  
  btn.disabled = false;
  btn.textContent = 'ВОЙТИ';
}

function logoutAdmin() {
  adminAuth = false;
  localStorage.removeItem('pvx_admin_nick');
  localStorage.removeItem('pvx_admin');
  renderAdmin();
}

// ============================================================
// УТИЛИТЫ
// ============================================================
function copyIP() {
  const btn = document.getElementById('copyBtn');
  const done = () => {
    const old = btn.textContent;
    btn.textContent = 'СКОПИРОВАНО';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = old; btn.classList.remove('copied'); }, 1300);
  };
  const fallback = () => {
    const t = document.createElement('textarea');
    t.value = SERVER_IP;
    t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } catch(e) {}
    document.body.removeChild(t);
    done();
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(SERVER_IP).then(done).catch(fallback);
  } else {
    fallback();
  }
}

// Частицы
function initParticles() {
  const c = document.getElementById('particles');
  if (!c) return;
  for (let i = 0; i < 30; i++) {
    const s = document.createElement('span');
    const size = 3 + Math.random() * 5;
    s.style.width = size + 'px'; s.style.height = size + 'px';
    s.style.left = Math.random() * 100 + 'vw';
    s.style.animationDuration = (9 + Math.random() * 12) + 's';
    s.style.animationDelay = (Math.random() * 10) + 's';
    c.appendChild(s);
  }
}

// Счётчик онлайна
function initOnlineCounter() {
  const el = document.getElementById('onlineCount');
  if (!el) return;
  setInterval(() => {
    el.textContent = 120 + Math.floor(Math.random() * 40);
  }, 4000);
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
  initParticles();
  setActiveNav();
  initOnlineCounter();
  
  const regNick = document.getElementById('reg-nick');
  if (regNick) regNick.addEventListener('keypress', e => { if (e.key === 'Enter') doRegister(); });
  
  const donateNick = document.getElementById('donate-nick');
  if (donateNick) donateNick.addEventListener('keypress', e => { if (e.key === 'Enter') doDonate(); });
  
  if (document.body.dataset.page === 'profile') renderProfile();
  if (document.body.dataset.page === 'admin') renderAdmin();
});
