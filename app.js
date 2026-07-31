import { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, doc, setDoc, getDoc } from './firebase-config.js';

window.currentUser = null;
window.userData = null;

window.CONFIG = {
    START_USDT: 100, START_STAMINA: 100, BASE_MAX_STAMINA: 100, 
    START_POWER: 100, START_MULTIPLIER: 1.0
};

// Управление формами
window.showRegister = () => {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('auth-error').textContent = '';
};

window.showLogin = () => {
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('auth-error').textContent = '';
};

function showError(msg) {
    // Переводим технические ошибки Firebase на русский
    let friendlyMsg = msg;
    if (msg.includes('auth/invalid-email')) friendlyMsg = 'Неверный формат Email';
    else if (msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password')) friendlyMsg = 'Неверный Email или пароль';
    else if (msg.includes('auth/email-already-in-use')) friendlyMsg = 'Этот Email уже зарегистрирован';
    else if (msg.includes('auth/weak-password')) friendlyMsg = 'Пароль должен быть не менее 6 символов';
    else if (msg.includes('configuration-not-found')) friendlyMsg = 'Ошибка настройки Firebase. Проверьте консоль.';
    
    document.getElementById('auth-error').textContent = friendlyMsg;
}

window.register = async () => {
    const nick = document.getElementById('reg-nick').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-password').value;
    const passConf = document.getElementById('reg-password-confirm').value;

    document.getElementById('auth-error').textContent = '';

    if (!nick || nick.length < 2 || nick.length > 20) return showError("Ник должен быть от 2 до 20 символов");
    if (pass !== passConf) return showError("Пароли не совпадают");

    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, pass);
        await setDoc(doc(db, "users", userCred.user.uid), {
            nick: nick, email: email, usdt: window.CONFIG.START_USDT, 
            stamina: window.CONFIG.START_STAMINA, maxStamina: window.CONFIG.BASE_MAX_STAMINA,
            power: window.CONFIG.START_POWER, multiplier: window.CONFIG.START_MULTIPLIER,
            level: 0, businesses: [], activeInvestments: [], bank: {deposit: 0, loan: 0},
            createdAt: new Date().toISOString()
        });
        // onAuthStateChanged автоматически переключит экран
    } catch (e) {
        showError(e.message);
    }
};

window.login = async () => {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;
    document.getElementById('auth-error').textContent = '';

    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
        showError(e.message);
    }
};

window.logout = async () => {
    await signOut(auth);
    // Очистка полей при выходе
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
};

// ГЛАВНЫЙ КОНТРОЛЛЕР СОСТОЯНИЯ
onAuthStateChanged(auth, async (user) => {
    const authScreen = document.getElementById('auth-screen');
    const gameScreen = document.getElementById('game-screen');

    if (user) {
        // ПОЛЬЗОВАТЕЛЬ ВОШЕЛ
        window.currentUser = user;
        const docSnap = await getDoc(doc(db, "users", user.uid));
        
        if (docSnap.exists()) {
            window.userData = docSnap.data();
            
            // Скрываем авторизацию, показываем игру
            authScreen.style.display = 'none';
            gameScreen.style.display = 'block';
            
            updateUI();
            window.notify("С возвращением, " + window.userData.nick + "!", "success");
        } else {
            // Если пользователь есть в Auth, но нет в БД (редкий баг), выходим
            await signOut(auth);
            showError("Ошибка загрузки профиля. Попробуйте войти снова.");
        }
    } else {
        // ПОЛЬЗОВАТЕЛЬ НЕ ВОШЕЛ
        window.currentUser = null;
        window.userData = null;
        
        // Показываем авторизацию, скрываем игру
        gameScreen.style.display = 'none';
        authScreen.style.display = 'flex'; // Важно: flex для центрирования
    }
});

window.updateUI = () => {
    if (!window.userData) return;
    document.getElementById('usdt-display').textContent = window.userData.usdt.toFixed(2);
};

window.switchTab = (tabName) => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    const tab = document.getElementById(`tab-${tabName}`);
    if (tab) tab.classList.add('active');
    
    // Подсветка кнопки (упрощенно)
    event.target.classList.add('active');
};

window.notify = (msg, type = 'info') => {
    const div = document.createElement('div');
    div.className = `notification notify-${type}`;
    div.textContent = msg;
    div.style.cssText = `position: fixed; top: 20px; right: 20px; padding: 15px 20px; border-radius: 10px; color: white; font-weight: bold; z-index: 10000; animation: fadeInUp 0.3s; background: ${type === 'error' ? '#ff4444' : '#4A7FA7'};`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
};
