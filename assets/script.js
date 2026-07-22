// ============================================================
// НАСТРОЙКИ
// ============================================================
const SERVER_IP = 'planning-mongolia.gl.joinmc.link:25565';
const SUPABASE_URL = 'https://ibhguzlxzoeznhtmauzp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliaGd1emx4em9lem5odG1hdXpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MzczMzEsImV4cCI6MjEwMDMxMzMzMX0.u9cmyan1JPVzNIISFJIQBns-PrMdh_JXIIbRcAE-6-8';
const DONATE_LINK = 'https://www.donationalerts.com/'; // ЗАМЕНИ НА СВОЮ ССЫЛКУ

let supabase = null;
if (window.supabase) {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

let currentUser = localStorage.getItem('pvx_user') || null;
let adminAuth = localStorage.getItem('pvx_admin') === '1';
let selectedTariff = null;

// ============================================================
// РЕАЛЬНЫЙ СТАТУС СЕРВЕРА (Никаких фейков!)
// ============================================================
async function fetchServerStatus() {
  const statusEl = document.getElementById('server-status');
  const onlineEl = document.getElementById('online-count');
  if (!statusEl || !onlineEl) return;

  try {
    const response = await fetch('https://api.mcsrvstat.us/3/planning-mongolia.gl.joinmc.link');
    const data = await response.json();
    
    if (data.online) {
      statusEl.innerHTML = '<span class="dot online"></span> Онлайн';
      onlineEl.textContent = data.players.online;
    } else {
      statusEl.innerHTML = '<span class="dot offline"></span> Оффлайн';
      onlineEl.textContent = '0';
    }
  } catch (e) {
    statusEl.innerHTML = '<span class="dot offline"></span> Статус неизвестен';
    onlineEl.textContent = '-';
  }
}

// ============================================================
// УТИЛИТЫ
// ============================================================
function validateNick(n) {
  if (!n) return 'Введите никнейм!';
  if (n.length < 3 || n.length > 16) return 'Ник должен быть от 3 до 16 символов.';
  if (!/^[a-zA-Z0-9_]+$/.test(n)) return 'Только латинские буквы, цифры и _.';
  return null;
}

function setLoading(btn, on, txt) {
  if (on) { btn.disabled = true; btn.innerHTML = '<span class="loader"></span> Обработка...'; }
  else { btn.disabled = false; btn.textContent = txt; }
}

function showResult(id, msg, type) {
  const el = document.getElementById(id);
  if (el) { el.innerHTML = msg; el.className = 'result show ' + type; }
}

function copyIP() {
  const btn = document.getElementById('copyBtn');
  const done = () => {
    const old = btn.textContent;
    btn.textContent = 'Скопировано!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
  };
  
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(SERVER_IP).then(done).catch(() => fallbackCopy());
  } else {
    fallbackCopy();
  }

  function fallbackCopy() {
    const t = document.createElement('textarea');
    t.value = SERVER_IP; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } catch(e) {}
    document.body.removeChild(t);
    done();
  }
}

// ============================================================
// РЕГИСТРАЦИЯ
// ============================================================
async function doRegister() {
  const input = document.getElementById('reg-nick');
  const btn = document.getElementById('reg-btn');
  const nick = input.value.trim();
  showResult('reg-result', '', ''); // Сброс
  
  const err = validateNick(nick);
  if (err) { showResult('reg-result', err, 'error'); return; }
  if (!supabase) { showResult('reg-result', 'Ошибка подключения к базе.', 'error'); return; }
  
  setLoading(btn, true);
  
  try {
    const { data: existingUser } = await supabase.from('users').select('minecraft_nickname').ilike('minecraft_nickname', nick).single();
    if (existingUser) {
      showResult('reg-result', 'Этот никнейм уже занят. Попробуйте другой.', 'error');
      setLoading(btn, false, 'Получить код');
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expireLink = new Date(now.getTime() + 5 * 60000).toISOString();
    const expireTemp = new Date(now.getTime() + 2 * 60000).toISOString();
    const fakeTgId = 999999999 + Math.floor(Math.random() * 1000000);

    await supabase.from('temporary_access').insert({ nickname: nick.toLowerCase(), expire_at: expireTemp });
    await supabase.from('linking_codes').insert({ code: code, tg_id: fakeTgId, expire_at: expireLink });

    currentUser = nick.toLowerCase();
    localStorage.setItem('pvx_user', currentUser);
    showResult('reg-result', `✅ Код получен! Зайдите на сервер и введите:<br><strong style="font-size:1.1em; color:var(--text-primary); margin-top:8px; display:block;">/link ${code}</strong><br><small style="color:var(--text-muted)">(Действует 5 минут)</small>`, 'success');
    input.value = '';
  } catch (e) {
    console.error(e);
    showResult('reg-result', 'Ошибка сервера. Попробуйте позже.', 'error');
  }
  setLoading(btn, false, 'Получить код');
}

// ============================================================
// ПРОФИЛЬ
// ============================================================
async function renderProfile() {
  const box = document.getElementById('profile-box');
  if (!box) return;
  
  if (!currentUser) {
    box.innerHTML = '<div class="form-card"><h2>Личный кабинет</h2><p class="sub">Сначала создайте аккаунт.</p><a href="register.html" class="btn btn-primary full">Зарегистрироваться</a></div>';
    return;
  }
  
  if (!supabase) {
    box.innerHTML = '<div class="form-card"><p class="sub">Ошибка подключения к базе данных.</p></div>';
    return;
  }
  
  try {
    const { data: rec, error } = await supabase.from('users').select('*').ilike('minecraft_nickname', currentUser).single();
    if (error || !rec) {
      currentUser = null; localStorage.removeItem('pvx_user');
      renderProfile(); return;
    }
    
    const letter = currentUser.charAt(0).toUpperCase();
    const st = rec.banned ? '<span class="pstatus ban">● Забанен</span>' : '<span class="pstatus ok">● Активен</span>';
    const pref = (rec.prefix || '').replace(/§[0-9a-fk-or]/gi, '') || 'Отсутствует';
    const passEnd = rec.pass_end ? new Date(rec.pass_end).toLocaleDateString('ru-RU') : 'Нет';
    
    box.innerHTML = `
      <div class="profile">
        <div class="avatar">${letter}</div>
        <div class="pname">${currentUser}</div>
        ${st}
        <div class="kv">
          <div class="item"><div class="k">Статус</div><div class="v">${rec.status}</div></div>
          <div class="item"><div class="k">Проходка до</div><div class="v">${passEnd}</div></div>
          <div class="item"><div class="k">Префикс</div><div class="v">${pref}</div></div>
          <div class="item"><div class="k">IP Сервера</div><div class="v" style="font-family:'JetBrains Mono'; font-size:0.85rem;">${SERVER_IP}</div></div>
        </div>
        <div style="display:flex; gap:12px; justify-content:center;">
          <a href="donate.html" class="btn btn-primary">Купить услугу</a>
          <button class="btn btn-secondary" onclick="logout()">Выйти</button>
        </div>
      </div>`;
  } catch (e) {
    box.innerHTML = '<div class="form-card"><p class="sub">Ошибка загрузки профиля.</p></div>';
  }
}

function logout() {
  currentUser = null; localStorage.removeItem('pvx_user');
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
  showResult('donate-result', '', '');
  
  const err = validateNick(nick);
  if (err) { showResult('donate-result', err, 'error'); return; }
  if (!selectedTariff) { showResult('donate-result', 'Сначала выберите услугу выше!', 'error'); return; }
  
  setLoading(btn, true);
  setTimeout(() => {
    showResult('donate-result', '🔄 Перенаправление на страницу оплаты...', 'success');
    setTimeout(() => {
      window.open(DONATE_LINK, '_blank');
      setLoading(btn, false, 'Перейти к оплате');
    }, 1000);
  }, 600);
}

// ============================================================
// АДМИНКА
// ============================================================
async function renderAdmin() {
  const box = document.getElementById('admin-box');
  if (!box) return;
  
  if (!adminAuth) {
    box.innerHTML = `
      <div class="form-card">
        <h2>Вход в админку</h2>
        <p class="sub">Доступ только для операторов сервера.</p>
        <div class="field"><label>Никнейм на сервере</label><input type="text" id="admin-nick-input" placeholder="Herobrine" maxlength="16"></div>
        <div class="field"><label>Токен доступа</label><input type="password" id="admin-token-input" placeholder="pvx_XXXXXXXX"></div>
        <p style="font-size:0.8rem; color:var(--text-muted); text-align:center; margin-bottom:20px;">Получите токен командой <code style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px;">/pvx getadmincode</code></p>
        <button class="btn btn-primary full" id="admin-login-btn" onclick="loginAdmin()">Войти</button>
        <div class="result" id="admin-login-result"></div>
      </div>`;
    document.getElementById('admin-nick-input').addEventListener('keypress', e => { if (e.key === 'Enter') loginAdmin(); });
    document.getElementById('admin-token-input').addEventListener('keypress', e => { if (e.key === 'Enter') loginAdmin(); });
    return;
  }
  
  const savedNick = localStorage.getItem('pvx_admin_nick') || 'admin';
  box.innerHTML = `
    <div class="form-card" style="text-align:center;">
      <h2>Панель администратора</h2>
      <p class="sub">Авторизован как: <strong style="color:var(--accent-primary)">${savedNick}</strong></p>
      <p style="color:var(--text-secondary); margin-bottom:24px; font-size:0.9rem;">Используйте игровые команды (<code>/mban</code>, <code>/mprefix</code>) для управления. Сайт синхронизирован с базой данных.</p>
      <button class="btn btn-secondary" onclick="logoutAdmin()">Выйти из админки</button>
    </div>`;
}

async function loginAdmin() {
  const nick = (document.getElementById('admin-nick-input').value || '').trim();
  const token = (document.getElementById('admin-token-input').value || '').trim();
  showResult('admin-login-result', '', '');
  
  if (!nick || !token) { showResult('admin-login-result', 'Введите ник и токен!', 'error'); return; }
  if (!token.startsWith('pvx_')) { showResult('admin-login-result', 'Неверный формат токена!', 'error'); return; }
  if (!supabase) { showResult('admin-login-result', 'Ошибка подключения.', 'error'); return; }
  
  const btn = document.getElementById('admin-login-btn');
  setLoading(btn, true, 'Проверка...');
  
  try {
    const { data, error } = await supabase.rpc('verify_admin_token', { p_nickname: nick, p_token: token });
    if (!error && data && data.status === 'valid') {
      adminAuth = true;
      localStorage.setItem('pvx_admin_nick', nick);
      localStorage.setItem('pvx_admin', '1');
      renderAdmin();
    } else {
      showResult('admin-login-result', 'Токен недействителен или вы не являетесь OP.', 'error');
    }
  } catch (e) {
    showResult('admin-login-result', 'Ошибка подключения к базе.', 'error');
  }
  setLoading(btn, false, 'Войти');
}

function logoutAdmin() {
  adminAuth = false;
  localStorage.removeItem('pvx_admin_nick');
  localStorage.removeItem('pvx_admin');
  renderAdmin();
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  // Частицы
  const c = document.getElementById('particles');
  if (c) {
    for (let i = 0; i < 25; i++) {
      const s = document.createElement('span');
      const size = 2 + Math.random() * 4;
      s.style.width = size + 'px'; s.style.height = size + 'px';
      s.style.left = Math.random() * 100 + 'vw';
      s.style.animationDuration = (10 + Math.random() * 15) + 's';
      s.style.animationDelay = (Math.random() * 10) + 's';
      c.appendChild(s);
    }
  }

  // Загрузка реального онлайна
  fetchServerStatus();

  // Привязка событий к формам
  const regNick = document.getElementById('reg-nick');
  if (regNick) regNick.addEventListener('keypress', e => { if (e.key === 'Enter') doRegister(); });
  
  const donateNick = document.getElementById('donate-nick');
  if (donateNick) donateNick.addEventListener('keypress', e => { if (e.key === 'Enter') doDonate(); });

  // Рендер специфичных страниц
  if (document.body.dataset.page === 'profile') renderProfile();
  if (document.body.dataset.page === 'admin') renderAdmin();
});
