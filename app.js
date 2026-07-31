import { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, doc, setDoc, getDoc, updateDoc } from './firebase-config.js';

window.currentUser = null;
window.userData = null;

// Глобальные настройки
window.CONFIG = {
    START_USDT: 100, START_STAMINA: 100, BASE_MAX_STAMINA: 100, START_POWER: 100,
    START_MULTIPLIER: 1.0, STAMINA_RECOVERY_SEC: 30, CLICK_REWARD: 0.00001,
    MIN_PRICE_CRYPTO: 30.0, MIN_PRICE_METAL: 50.0, TAX_BASE: 0.03
};

window.ANTI_CHEAT = { history: [], blocked: false };

// Авторизация
window.showRegister = () => { document.getElementById('login-form').style.display = 'none'; document.getElementById('register-form').style.display = 'block'; };
window.showLogin = () => { document.getElementById('register-form').style.display = 'none'; document.getElementById('login-form').style.display = 'block'; };

window.register = async () => {
    const nick = document.getElementById('reg-nick').value.trim();
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    const passConf = document.getElementById('reg-password-confirm').value;

    if (!nick || nick.length > 20) return notify("Ник от 1 до 20 символов", "error");
    if (pass !== passConf) return notify("Пароли не совпадают", "error");

    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, pass);
        await setDoc(doc(db, "users", userCred.user.uid), {
            nick: nick, email: email, usdt: CONFIG.START_USDT, stamina: CONFIG.START_STAMINA,
            maxStamina: CONFIG.BASE_MAX_STAMINA, power: CONFIG.START_POWER, multiplier: CONFIG.START_MULTIPLIER,
            level: 0, businesses: [], activeInvestments: [], createdAt: new Date().toISOString()
        });
        notify("Аккаунт создан!", "success");
    } catch (e) { notify(e.message, "error"); }
};

window.login = async () => {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) { notify("Ошибка входа: " + e.message, "error"); }
};

window.logout = () => signOut(auth);

onAuthStateChanged(auth, async (user) => {
    if (user) {
        window.currentUser = user;
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
            window.userData = docSnap.data();
            document.getElementById('auth-screen').classList.remove('active');
            document.getElementById('game-screen').classList.add('active');
            updateUI();
            // Запуск проверок при входе
            import('./miner.js').then(m => m.checkOfflineMinerProgress());
            import('./businesses.js').then(b => b.checkBusinessCrashes());
            import('./investments.js').then(i => i.checkInvestmentResults());
        }
    } else {
        window.currentUser = null;
        document.getElementById('game-screen').classList.remove('active');
        document.getElementById('auth-screen').classList.add('active');
    }
});

// Навигация
window.switchTab = (tabName) => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    event.target.classList.add('active');
    
    // Динамическая подгрузка данных вкладок
    if (tabName === 'market') import('./market.js').then(m => m.renderMarket());
    if (tabName === 'invest') import('./investments.js').then(i => i.renderInvestments());
    if (tabName === 'business') import('./businesses.js').then(b => b.renderBusinesses());
    if (tabName === 'top') import('./top.js').then(t => t.loadTopData());
};

window.updateUI = () => {
    if (!window.userData) return;
    document.getElementById('usdt-display').textContent = window.userData.usdt.toFixed(2);
    document.getElementById('stamina-display').textContent = `${Math.floor(window.userData.stamina)}/${window.userData.maxStamina}`;
    const taxRate = (CONFIG.TAX_BASE + (window.userData.businesses ? window.userData.businesses.length * 0.01 : 0)) * 100;
    document.getElementById('tax-display').textContent = `${taxRate.toFixed(1)}%`;
};

window.notify = (msg, type = 'info') => {
    const div = document.createElement('div');
    div.className = `notification notify-${type}`;
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
};

window.closeModal = () => document.getElementById('modal').classList.remove('active'); // Исправлено: убрать active или display:none через CSS

// Анти-чит логика (вызывается из clicker.js)
window.validateClick = (x, y) => {
    if (ANTI_CHEAT.blocked) return false;
    const now = performance.now();
    ANTI_CHEAT.history.push({ x: Math.round(x), y: Math.round(y), time: now });
    if (ANTI_CHEAT.history.length > 10) ANTI_CHEAT.history.shift();

    if (ANTI_CHEAT.history.length >= 2) {
        if (now - ANTI_CHEAT.history[ANTI_CHEAT.history.length - 2].time <= 1.0) {
            blockInput("Слишком высокая скорость кликов!"); return false;
        }
    }
    if (ANTI_CHEAT.history.length === 10) {
        const first = ANTI_CHEAT.history[0];
        if (ANTI_CHEAT.history.every(c => c.x === first.x && c.y === first.y)) {
            blockInput("Обнаружен клик в одну точку!"); return false;
        }
    }
    return true;
};

function blockInput(reason) {
    ANTI_CHEAT.blocked = true;
    notify(`⚠️ ${reason} Блок на 10 сек.`, "error");
    document.body.style.pointerEvents = 'none';
    setTimeout(() => {
        ANTI_CHEAT.blocked = false;
        document.body.style.pointerEvents = 'auto';
        ANTI_CHEAT.history = [];
        notify("✅ Ввод разблокирован", "success");
    }, 10000);
}