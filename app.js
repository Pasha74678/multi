// app.js - Полная логика игры "Путь к успеху"

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, increment, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// FIREBASE CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyAAL1zpUJuZET0ZDoQQGeiIIFruUocf8pY",
    authDomain: "business-21bba.firebaseapp.com",
    projectId: "business-21bba",
    storageBucket: "business-21bba.firebasestorage.app",
    messagingSenderId: "54951370679",
    appId: "1:54951370679:web:cc72b88921c90d2f7ad232",
    measurementId: "G-CXKVPKQHHG"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
window.currentUser = null;
window.userData = null;

window.CONFIG = {
    START_USDT: 100,
    START_STAMINA: 100,
    BASE_MAX_STAMINA: 100,
    START_POWER: 100,
    START_MULTIPLIER: 1.0,
    CLICK_REWARD: 0.00001,
    MINER_WORK_HOURS: 2
};

window.ANTI_CHEAT = { history: [], blocked: false };

// НАВИГАЦИЯ
window.navigateTo = (pageName) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pageName}`).classList.add('active');
    
    const backBtn = document.getElementById('back-btn');
    const pageTitle = document.getElementById('page-title');
    
    if (pageName === 'home') {
        backBtn.style.display = 'none';
        pageTitle.textContent = 'Главная';
    } else {
        backBtn.style.display = 'block';
        const titles = {
            clicker: '🖱 Кликер',
            miner: '⛏ Майнер',
            market: '📊 Рынок',
            invest: '🏢 Инвестиции',
            business: '🏭 Бизнесы',
            bank: '🏦 Банк',
            theft: '⚔️ Крипто-Рейд',
            auction: '🔨 Аукционы',
            top: '🏆 Топ',
            profile: '👤 Профиль'
        };
        pageTitle.textContent = titles[pageName] || pageName;
    }
    
    if (pageName === 'market') renderMarket();
    if (pageName === 'invest') renderInvestments();
    if (pageName === 'business') renderBusinesses();
    if (pageName === 'bank') renderBank();
    if (pageName === 'top') loadTopData();
    if (pageName === 'profile') renderProfile();
    if (pageName === 'auction') renderAuctions();
};

window.goHome = () => {
    window.navigateTo('home');
};

// АВТОРИЗАЦИЯ
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
    let friendlyMsg = msg;
    if (msg.includes('auth/invalid-email')) friendlyMsg = 'Неверный формат Email';
    else if (msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password')) friendlyMsg = 'Неверный Email или пароль';
    else if (msg.includes('auth/email-already-in-use')) friendlyMsg = 'Этот Email уже зарегистрирован';
    else if (msg.includes('auth/weak-password')) friendlyMsg = 'Пароль должен быть не менее 6 символов';
    document.getElementById('auth-error').textContent = friendlyMsg;
}

window.register = async () => {
    const nick = document.getElementById('reg-nick').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-password').value;
    const passConf = document.getElementById('reg-password-confirm').value;

    document.getElementById('auth-error').textContent = '';

    if (!nick || nick.length < 2 || nick.length > 20) return showError("Ник от 2 до 20 символов");
    if (pass !== passConf) return showError("Пароли не совпадают");

    try {
        const userCred = await createUserWithEmailAndPassword(auth, email, pass);
        await setDoc(doc(db, "users", userCred.user.uid), {
            nick: nick,
            email: email,
            usdt: window.CONFIG.START_USDT,
            stamina: window.CONFIG.START_STAMINA,
            maxStamina: window.CONFIG.BASE_MAX_STAMINA,
            power: window.CONFIG.START_POWER,
            multiplier: window.CONFIG.START_MULTIPLIER,
            level: 0,
            balances: { BTC: 0, ETH: 0, LTC: 0, BNB: 0, TRX: 0, XRP: 0, GOLD: 0, SILVER: 0, PLAT: 0, DIAMOND: 0, SAPPHIRE: 0, RUBY: 0 },
            businesses: [],
            activeInvestments: [],
            bank: { deposit: 0, depositDate: null, loan: 0, loanDate: null },
            miner: { running: false, startTime: null, currency: 'BTC' },
            createdAt: new Date().toISOString()
        });
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
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
};

onAuthStateChanged(auth, async (user) => {
    const authScreen = document.getElementById('auth-screen');
    const gameScreen = document.getElementById('game-screen');

    if (user) {
        window.currentUser = user;
        const docSnap = await getDoc(doc(db, "users", user.uid));
        
        if (docSnap.exists()) {
            window.userData = docSnap.data();
            authScreen.style.display = 'none';
            gameScreen.style.display = 'flex';
            updateUI();
            checkOfflineMiner();
            window.notify("С возвращением, " + window.userData.nick + "!", "success");
        }
    } else {
        window.currentUser = null;
        window.userData = null;
        gameScreen.style.display = 'none';
        authScreen.style.display = 'flex';
    }
});

// UI ОБНОВЛЕНИЕ
window.updateUI = () => {
    if (!window.userData) return;
    document.getElementById('usdt-display').textContent = window.userData.usdt.toFixed(2);
    document.getElementById('player-nick').textContent = window.userData.nick;
};

// УВЕДОМЛЕНИЯ
window.notify = (msg, type = 'info') => {
    const div = document.createElement('div');
    div.className = `notification notify-${type}`;
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
};

// АНТИ-ЧИТ
window.validateClick = (x, y) => {
    if (window.ANTI_CHEAT.blocked) return false;
    const now = performance.now();
    window.ANTI_CHEAT.history.push({ x: Math.round(x), y: Math.round(y), time: now });
    if (window.ANTI_CHEAT.history.length > 10) window.ANTI_CHEAT.history.shift();

    if (window.ANTI_CHEAT.history.length >= 2) {
        if (now - window.ANTI_CHEAT.history[window.ANTI_CHEAT.history.length - 2].time <= 1.0) {
            blockInput("Слишком высокая скорость кликов!");
            return false;
        }
    }
    if (window.ANTI_CHEAT.history.length === 10) {
        const first = window.ANTI_CHEAT.history[0];
        if (window.ANTI_CHEAT.history.every(c => c.x === first.x && c.y === first.y)) {
            blockInput("Обнаружен клик в одну точку!");
            return false;
        }
    }
    return true;
};

function blockInput(reason) {
    window.ANTI_CHEAT.blocked = true;
    window.notify(`⚠️ ${reason} Блок на 10 сек.`, "error");
    document.body.style.pointerEvents = 'none';
    setTimeout(() => {
        window.ANTI_CHEAT.blocked = false;
        document.body.style.pointerEvents = 'auto';
        window.ANTI_CHEAT.history = [];
        window.notify("✅ Ввод разблокирован", "success");
    }, 10000);
}

// КЛИКЕР
document.addEventListener('DOMContentLoaded', () => {
    const clickBtn = document.getElementById('click-btn');
    if (clickBtn) {
        const handleClick = (e) => {
            if (!window.userData || window.userData.stamina <= 0) {
                window.notify("Нет стамины!", "error");
                return;
            }

            const rect = clickBtn.getBoundingClientRect();
            const x = e.clientX || (e.touches ? e.touches[0].clientX : rect.left + rect.width/2);
            const y = e.clientY || (e.touches ? e.touches[0].clientY : rect.top + rect.height/2);

            if (!window.validateClick(x, y)) return;

            const currency = document.getElementById('clicker-currency').value;
            const reward = (window.userData.power * window.userData.multiplier * window.CONFIG.CLICK_REWARD);

            window.userData.stamina -= 1;
            window.userData.usdt += reward;
            window.updateUI();

            const effect = document.createElement('div');
            effect.className = 'click-effect';
            effect.textContent = `+${reward.toFixed(6)}`;
            effect.style.left = `${x}px`;
            effect.style.top = `${y}px`;
            document.body.appendChild(effect);
            setTimeout(() => effect.remove(), 1000);

            updateDoc(doc(db, "users", window.currentUser.uid), {
                stamina: increment(-1),
                usdt: increment(reward)
            });
        };

        clickBtn.addEventListener('mousedown', handleClick);
        clickBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleClick(e);
        }, { passive: false });
    }
});

// МАЙНЕР С ОФФЛАЙН-ПРОГРЕССОМ
function checkOfflineMiner() {
    if (!window.userData.miner || !window.userData.miner.running || !window.userData.miner.startTime) return;
    
    const now = Date.now();
    const start = new Date(window.userData.miner.startTime).getTime();
    const elapsed = (now - start) / 1000;
    const maxSec = window.CONFIG.MINER_WORK_HOURS * 3600;
    
    if (elapsed >= maxSec) {
        window.userData.miner.running = false;
        window.userData.miner.startTime = null;
        updateDoc(doc(db, "users", window.currentUser.uid), {
            miner: { running: false, startTime: null, currency: window.userData.miner.currency }
        });
        window.notify("⛏ Майнер завершил работу!", "success");
    } else {
        const progress = (elapsed / maxSec) * 100;
        const remaining = Math.ceil((maxSec - elapsed) / 60);
        document.getElementById('miner-progress').style.width = `${progress}%`;
        document.getElementById('miner-time-left').textContent = `${remaining} мин`;
        document.getElementById('miner-status').textContent = "🟢 Работает";
        document.getElementById('miner-toggle-btn').textContent = "⏹ Остановить";
    }
}

document.getElementById('miner-toggle-btn').addEventListener('click', async () => {
    if (!window.userData.miner) window.userData.miner = { running: false, startTime: null, currency: 'BTC' };
    
    if (window.userData.miner.running) {
        window.userData.miner.running = false;
        window.userData.miner.startTime = null;
        document.getElementById('miner-progress').style.width = '0%';
        document.getElementById('miner-time-left').textContent = '0 мин';
        document.getElementById('miner-status').textContent = ' Остановлен';
        document.getElementById('miner-toggle-btn').textContent = '▶️ Запустить';
    } else {
        window.userData.miner.running = true;
        window.userData.miner.startTime = new Date().toISOString();
        window.userData.miner.currency = document.getElementById('miner-currency').value;
        document.getElementById('miner-status').textContent = '🟢 Работает';
        document.getElementById('miner-toggle-btn').textContent = '⏹ Остановить';
        window.notify("Майнер запущен!", "success");
    }
    
    await updateDoc(doc(db, "users", window.currentUser.uid), {
        miner: window.userData.miner
    });
});

// РЫНОК
const ASSETS = [
    { id: 'BTC', name: 'Bitcoin', type: 'crypto', icon: '₿', minPrice: 30 },
    { id: 'ETH', name: 'Ethereum', type: 'crypto', icon: 'Ξ', minPrice: 30 },
    { id: 'LTC', name: 'Litecoin', type: 'crypto', icon: 'Ł', minPrice: 30 },
    { id: 'BNB', name: 'Binance Coin', type: 'crypto', icon: '🔶', minPrice: 30 },
    { id: 'TRX', name: 'Tron', type: 'crypto', icon: '🔴', minPrice: 30 },
    { id: 'XRP', name: 'Ripple', type: 'crypto', icon: '✕', minPrice: 30 },
    { id: 'GOLD', name: 'Золото', type: 'metal', icon: '🥇', minPrice: 50 },
    { id: 'SILVER', name: 'Серебро', type: 'metal', icon: '🥈', minPrice: 50 },
    { id: 'PLAT', name: 'Платина', type: 'metal', icon: '⬜', minPrice: 50 },
    { id: 'DIAMOND', name: 'Алмаз', type: 'metal', icon: '💎', minPrice: 50 },
    { id: 'SAPPHIRE', name: 'Сапфир', type: 'metal', icon: '🔷', minPrice: 50 },
    { id: 'RUBY', name: 'Рубин', type: 'metal', icon: '', minPrice: 50 }
];

async function renderMarket() {
    const list = document.getElementById('market-list');
    list.innerHTML = '<p style="text-align:center;">Загрузка...</p>';
    
    const marketRef = doc(db, "global", "market_prices");
    let marketData = {};
    const snap = await getDoc(marketRef);
    
    if (snap.exists()) {
        marketData = snap.data();
    } else {
        ASSETS.forEach(asset => {
            marketData[asset.id] = { price: asset.minPrice, prevPrice: asset.minPrice };
        });
        await setDoc(marketRef, marketData);
    }
    
    list.innerHTML = '';
    
    for (const asset of ASSETS) {
        const data = marketData[asset.id] || { price: asset.minPrice, prevPrice: asset.minPrice };
        const price = data.price;
        const prevPrice = data.prevPrice;
        const userBalance = window.userData.balances?.[asset.id] || 0;
        
        const trend = price > prevPrice ? '' : (price < prevPrice ? '' : '➡️');
        const trendColor = price > prevPrice ? '#00ff88' : (price < prevPrice ? '#ff4444' : '#B3CFE5');
        
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div style="flex: 1;">
                <div style="font-size: 18px; font-weight: bold;">${asset.icon} ${asset.name}</div>
                <div style="color: ${trendColor}; font-size: 14px;">${trend} ${price.toFixed(2)} USDT</div>
                <div style="font-size: 12px; color: #B3CFE5;">Баланс: ${userBalance.toFixed(6)}</div>
            </div>
            <div style="display: flex; gap: 8px; flex-direction: column;">
                <button class="btn-primary" style="padding: 8px 15px; font-size: 14px;" onclick="tradeAsset('${asset.id}', 'buy', ${price})">Купить</button>
                <button class="btn-secondary" style="padding: 8px 15px; font-size: 14px;" onclick="tradeAsset('${asset.id}', 'sell', ${price})">Продать</button>
            </div>
        `;
        list.appendChild(div);
    }
}

window.tradeAsset = async (assetId, action, currentPrice) => {
    const amountStr = prompt(`Введите количество ${assetId} для ${action === 'buy' ? 'покупки' : 'продажи'}:`);
    if (!amountStr) return;
    
    const amount = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return window.notify("Неверное количество", "error");
    
    const totalCost = amount * currentPrice;
    
    if (action === 'buy') {
        if (window.userData.usdt < totalCost) return window.notify("Недостаточно USDT", "error");
        
        await updateDoc(doc(db, "users", window.currentUser.uid), {
            usdt: increment(-totalCost),
            [`balances.${assetId}`]: increment(amount)
        });
        
        window.userData.usdt -= totalCost;
        if (!window.userData.balances) window.userData.balances = {};
        window.userData.balances[assetId] = (window.userData.balances[assetId] || 0) + amount;
        
        window.notify(`✅ Куплено ${amount} ${assetId}`, "success");
    } else {
        const currentBal = window.userData.balances?.[assetId] || 0;
        if (currentBal < amount) return window.notify(`Недостаточно ${assetId}`, "error");
        
        await updateDoc(doc(db, "users", window.currentUser.uid), {
            usdt: increment(totalCost),
            [`balances.${assetId}`]: increment(-amount)
        });
        
        window.userData.usdt += totalCost;
        window.userData.balances[assetId] -= amount;
        
        window.notify(`✅ Продано ${amount} ${assetId}`, "success");
    }
    
    window.updateUI();
    renderMarket();
};

// ИНВЕСТИЦИИ
const ENTERPRISES = [
    { id: 'school', name: 'Школа', icon: '' },
    { id: 'wb', name: 'Wildberries', icon: '🛍️' },
    { id: 'ozon', name: 'Ozon', icon: '📦' },
    { id: 'ai', name: 'AI', icon: '🤖' },
    { id: 'hospital', name: 'Больница', icon: '🏥' },
    { id: 'apple', name: 'Apple', icon: '🍎' },
    { id: 'samsung', name: 'Samsung', icon: '' },
    { id: 'tesla', name: 'Tesla', icon: '🚗' },
    { id: 'google', name: 'Google', icon: '🔍' },
    { id: 'amazon', name: 'Amazon', icon: '📚' }
];

function getCurrentInvestments() {
    const period = Math.floor(Date.now() / (3 * 24 * 60 * 60 * 1000));
    const seed = period * 12345;
    const shuffled = [...ENTERPRISES].sort((a, b) => {
        const randomA = Math.sin(seed + a.id.length) * 10000;
        const randomB = Math.sin(seed + b.id.length) * 10000;
        return randomA - randomB;
    });
    
    return shuffled.slice(0, 5).map((ent, i) => {
        const winChance = 10 + (i * 10);
        const profitPercent = 80 - (i * 10);
        const maxBet = 3000 + (i * 500);
        
        return { ...ent, winChance, profitPercent, maxBet, minBet: 500 };
    });
}

async function renderInvestments() {
    const list = document.getElementById('investments-list');
    list.innerHTML = '';
    const invs = getCurrentInvestments();
    
    invs.forEach(inv => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'flex-start';
        div.innerHTML = `
            <strong>${inv.icon} ${inv.name}</strong>
            <small>Шанс: ${inv.winChance}% | Доход: +${inv.profitPercent}% | Лимит: ${inv.minBet} - ${inv.maxBet} USDT</small>
            <input type="number" id="inv-amount-${inv.id}" placeholder="Сумма" style="margin-top:10px; width:100px;">
            <button class="btn-primary" style="margin-top:10px; width:auto;" onclick="makeInvestment('${inv.id}', ${inv.winChance}, ${inv.profitPercent}, ${inv.maxBet})">Инвестировать</button>
        `;
        list.appendChild(div);
    });
    
    const activeList = document.getElementById('active-investments-list');
    activeList.innerHTML = '';
    (window.userData.activeInvestments || []).forEach((act, idx) => {
        const endTime = new Date(act.startTime).getTime() + (18 * 60 * 60 * 1000);
        const msLeft = endTime - Date.now();
        const hoursLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60)));
        
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div>
                <strong>${act.name}</strong><br>
                <small>Вложено: ${act.amount} USDT. Осталось: ${hoursLeft} ч.</small>
            </div>
            ${msLeft <= 0 ? `<button class="btn-primary" style="width:auto;" onclick="resolveInvestment(${idx})">Забрать</button>` : '<small>⏳ Ожидание</small>'}
        `;
        activeList.appendChild(div);
    });
}

window.makeInvestment = async (id, chance, profit, maxBet) => {
    const amount = parseFloat(document.getElementById(`inv-amount-${id}`).value);
    if (!amount || amount < 500 || amount > maxBet) return window.notify(`Сумма от 500 до ${maxBet}`, "error");
    if (window.userData.usdt < amount) return window.notify("Недостаточно USDT", "error");
    
    const newInv = { id, name: ENTERPRISES.find(e=>e.id===id).name, amount, chance, profit, startTime: new Date().toISOString() };
    const active = [...(window.userData.activeInvestments || []), newInv];
    
    await updateDoc(doc(db, "users", window.currentUser.uid), {
        activeInvestments: active,
        usdt: increment(-amount)
    });
    window.userData.usdt -= amount;
    window.userData.activeInvestments = active;
    window.updateUI();
    renderInvestments();
    window.notify("Инвестиция размещена!", "success");
};

window.resolveInvestment = async (index) => {
    const actives = window.userData.activeInvestments;
    const inv = actives[index];
    const isWin = Math.random() * 100 < inv.chance;
    
    let msg = "";
    if (isWin) {
        const profit = inv.amount * (inv.profit / 100);
        const total = inv.amount + profit;
        await updateDoc(doc(db, "users", window.currentUser.uid), {
            activeInvestments: actives.filter((_, i) => i !== index),
            usdt: increment(total)
        });
        window.userData.usdt += total;
        msg = `🎉 Успех! Получено ${total.toFixed(2)} USDT`;
    } else {
        await updateDoc(doc(db, "users", window.currentUser.uid), {
            activeInvestments: actives.filter((_, i) => i !== index)
        });
        msg = `📉 Провал. Средства потеряны.`;
    }
    
    window.userData.activeInvestments = actives.filter((_, i) => i !== index);
    window.updateUI();
    renderInvestments();
    window.notify(msg, isWin ? "success" : "error");
};

// БИЗНЕСЫ
const BUSINESS_TYPES = [
    { id: 'it', name: 'IT-стартап', icon: '💻', cost: 2000, income: 100 },
    { id: 'restaurant', name: 'Ресторан', icon: '️', cost: 3000, income: 150 },
    { id: 'auto', name: 'Автосервис', icon: '🔧', cost: 2500, income: 120 },
    { id: 'fitness', name: 'Фитнес-клуб', icon: '💪', cost: 4000, income: 200 },
    { id: 'beauty', name: 'Салон красоты', icon: '💇', cost: 3500, income: 180 }
];

async function renderBusinesses() {
    const list = document.getElementById('businesses-list');
    list.innerHTML = '';
    const bizs = window.userData.businesses || [];
    
    if (bizs.length >= 2) document.getElementById('create-business-btn').style.display = 'none';
    else document.getElementById('create-business-btn').style.display = 'block';
    
    bizs.forEach((biz, index) => {
        const bizType = BUSINESS_TYPES.find(t => t.id === biz.type);
        if (!bizType) return;
        
        const div = document.createElement('div');
        div.className = 'list-item';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'flex-start';
        
        let statusText = biz.isBroken ? "🚨 СЛОМАН (Ремонт 600 USDT)" : `Доход: ${bizType.income * biz.level} USDT/день`;
        
        div.innerHTML = `
            <strong>${bizType.icon} ${bizType.name} - ${biz.name}</strong>
            <small>${statusText} | Вложено: ${biz.totalInvested} USDT</small>
            <div style="margin-top:10px; display:flex; gap:10px;">
                ${biz.isBroken ? `<button class="btn-secondary" onclick="repairBusiness(${index})"> Починить (600)</button>` : ''}
                <button class="btn-secondary" onclick="sellBusiness(${index})">💸 Продать (40%)</button>
            </div>
        `;
        list.appendChild(div);
    });
}

document.getElementById('create-business-btn').addEventListener('click', () => {
    if ((window.userData.businesses || []).length >= 2) return window.notify("Максимум 2 бизнеса", "error");
    let html = '<h3>Создать бизнес</h3>';
    BUSINESS_TYPES.forEach(s => {
        html += `<div class="list-item" onclick="createBiz('${s.id}')" style="cursor:pointer; margin:5px 0;"><b>${s.icon} ${s.name}</b><br><small>Цена: ${s.cost} USDT | Доход: ${s.income} USDT/день</small></div>`;
    });
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal').style.display = 'block';
});

window.createBiz = async (typeId) => {
    const name = prompt("Введите название бизнеса:");
    if (!name) return;
    const bizType = BUSINESS_TYPES.find(t => t.id === typeId);
    if (window.userData.usdt < bizType.cost) return window.notify("Недостаточно средств", "error");
    
    const newBiz = { type: typeId, name, level: 1, totalInvested: bizType.cost, isBroken: false, lastCheckTime: new Date().toISOString(), lastCrashDate: null };
    const bizs = [...(window.userData.businesses || []), newBiz];
    
    await updateDoc(doc(db, "users", window.currentUser.uid), {
        businesses: bizs,
        usdt: increment(-bizType.cost)
    });
    window.userData.usdt -= bizType.cost;
    window.userData.businesses = bizs;
    window.closeModal();
    window.updateUI();
    renderBusinesses();
    window.notify("Бизнес создан!", "success");
};

window.repairBusiness = async (index) => {
    if (window.userData.usdt < 600) return window.notify("Недостаточно 600 USDT", "error");
    const bizs = window.userData.businesses;
    bizs[index].isBroken = false;
    
    await updateDoc(doc(db, "users", window.currentUser.uid), {
        businesses: bizs,
        usdt: increment(-600)
    });
    window.userData.usdt -= 600;
    window.userData.businesses = bizs;
    window.updateUI();
    renderBusinesses();
    window.notify("Бизнес отремонтирован!", "success");
};

window.sellBusiness = async (index) => {
    const bizs = window.userData.businesses;
    const refund = bizs[index].totalInvested * 0.4;
    bizs.splice(index, 1);
    
    await updateDoc(doc(db, "users", window.currentUser.uid), {
        businesses: bizs,
        usdt: increment(refund)
    });
    window.userData.usdt += refund;
    window.userData.businesses = bizs;
    window.updateUI();
    renderBusinesses();
    window.notify(`Бизнес продан за ${refund.toFixed(2)} USDT`, "success");
};

// БАНК
async function renderBank() {
    const bankData = window.userData.bank || { deposit: 0, loan: 0 };
    document.getElementById('bank-deposit').textContent = bankData.deposit.toFixed(2) + ' USDT';
    document.getElementById('bank-loan').textContent = bankData.loan.toFixed(2) + ' USDT';
}

window.bankAction = async (action) => {
    const bankData = window.userData.bank || { deposit: 0, depositDate: null, loan: 0, loanDate: null };
    const now = Date.now();
    
    if (action === 'deposit') {
        if (window.userData.usdt < 100) return window.notify("Минимум 100 USDT", "error");
        
        await updateDoc(doc(db, "users", window.currentUser.uid), {
            usdt: increment(-100),
            "bank.deposit": increment(100),
            "bank.depositDate": now
        });
        window.userData.usdt -= 100;
        window.userData.bank = { ...bankData, deposit: bankData.deposit + 100, depositDate: now };
        window.notify("✅ Вложено 100 USDT!", "success");
    }
    else if (action === 'withdraw') {
        if (bankData.deposit <= 0) return window.notify("Нет депозита", "error");
        
        const daysPassed = (now - bankData.depositDate) / (1000 * 60 * 60 * 24);
        if (daysPassed < 7) return window.notify(`Мин. срок 7 дней. Осталось: ${Math.ceil(7 - daysPassed)}`, "error");
        
        const totalReturn = bankData.deposit * Math.pow(1.02, daysPassed);
        
        await updateDoc(doc(db, "users", window.currentUser.uid), {
            usdt: increment(totalReturn),
            "bank.deposit": 0,
            "bank.depositDate": null
        });
        window.userData.usdt += totalReturn;
        window.userData.bank.deposit = 0;
        window.userData.bank.depositDate = null;
        window.notify(`✅ Получено ${totalReturn.toFixed(2)} USDT`, "success");
    }
    else if (action === 'loan') {
        if (bankData.loan > 0) return window.notify("Сначала погасите кредит", "error");
        
        await updateDoc(doc(db, "users", window.currentUser.uid), {
            usdt: increment(1000),
            "bank.loan": 1000,
            "bank.loanDate": now
        });
        window.userData.usdt += 1000;
        window.userData.bank = { ...bankData, loan: 1000, loanDate: now };
        window.notify("✅ Кредит получен!", "success");
    }
    else if (action === 'payLoan') {
        if (bankData.loan <= 0) return window.notify("Нет кредита", "error");
        
        const daysPassed = (now - bankData.loanDate) / (1000 * 60 * 60 * 24);
        const debt = bankData.loan * Math.pow(1.05, daysPassed);
        
        if (window.userData.usdt < debt) return window.notify(`Нужно ${debt.toFixed(2)} USDT`, "error");
        
        await updateDoc(doc(db, "users", window.currentUser.uid), {
            usdt: increment(-debt),
            "bank.loan": 0,
            "bank.loanDate": null
        });
        window.userData.usdt -= debt;
        window.userData.bank.loan = 0;
        window.userData.bank.loanDate = null;
        window.notify(`✅ Кредит погашен! Списано ${debt.toFixed(2)} USDT`, "success");
    }
    
    window.updateUI();
    renderBank();
};

// КРАЖА
document.getElementById('theft-search-btn').addEventListener('click', async () => {
    if (window.userData.usdt < 10) return window.notify("Нужно 10 USDT", "error");
    
    document.getElementById('theft-search-btn').style.display = 'none';
    document.getElementById('theft-animation').style.display = 'block';
    
    await updateDoc(doc(db, "users", window.currentUser.uid), { usdt: increment(-10) });
    window.userData.usdt -= 10;
    window.updateUI();
    
    const statusText = document.getElementById('theft-status-text');
    await new Promise(r => setTimeout(r, 1500));
    statusText.textContent = "Сканирование уязвимостей...";
    await new Promise(r => setTimeout(r, 1500));
    statusText.textContent = "Жертва найдена! Анализ баланса...";
    await new Promise(r => setTimeout(r, 1500));
    
    const victimNick = "Игрок_" + Math.floor(Math.random() * 9999);
    const victimBalance = 500 + Math.floor(Math.random() * 2000);
    
    document.getElementById('theft-animation').style.display = 'none';
    const resultDiv = document.getElementById('theft-result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <h3>🎯 Жертва: ${victimNick}</h3>
        <p>Примерный баланс: ~${victimBalance} USDT</p>
        <p>Выберите риск:</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
            <button class="btn-secondary" onclick="executeTheft(1, 40, ${victimBalance})">1% (Шанс 40%)</button>
            <button class="btn-secondary" onclick="executeTheft(3, 18, ${victimBalance})">3% (Шанс 18%)</button>
            <button class="btn-secondary" onclick="executeTheft(5, 5, ${victimBalance})">5% (Шанс 5%)</button>
        </div>
        <button class="btn-secondary" style="margin-top:15px;" onclick="resetTheftUI()">Отмена</button>
    `;
});

window.executeTheft = async (percent, chance, victimBal) => {
    const isWin = Math.random() * 100 < chance;
    const amount = victimBal * (percent / 100);
    
    if (isWin) {
        await updateDoc(doc(db, "users", window.currentUser.uid), { usdt: increment(amount) });
        window.userData.usdt += amount;
        window.notify(`✅ Успех! Украдено ${amount.toFixed(2)} USDT`, "success");
    } else {
        const penalty = window.userData.usdt * (percent / 100);
        await updateDoc(doc(db, "users", window.currentUser.uid), { usdt: increment(-penalty) });
        window.userData.usdt -= penalty;
        window.notify(` Провал! Потеряно ${penalty.toFixed(2)} USDT`, "error");
    }
    window.updateUI();
    resetTheftUI();
};

window.resetTheftUI = () => {
    document.getElementById('theft-animation').style.display = 'none';
    document.getElementById('theft-result').style.display = 'none';
    document.getElementById('theft-search-btn').style.display = 'block';
};

// АУКЦИОНЫ
async function renderAuctions() {
    const list = document.getElementById('auction-list');
    list.innerHTML = '<p style="text-align:center;">Загрузка...</p>';
    
    const auctionsRef = collection(db, "auctions");
    const q = query(auctionsRef, where("status", "==", "active"));
    const snapshot = await getDocs(q);
    
    list.innerHTML = '';
    
    if (snapshot.empty) {
        const newAuction = {
            currentBid: 100,
            highestBidderId: null,
            highestBidderNick: null,
            endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
            status: "active"
        };
        await addDoc(auctionsRef, newAuction);
        return renderAuctions();
    }
    
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const timeLeftMs = data.endTime.toDate().getTime() - Date.now();
        const hoursLeft = Math.max(0, Math.ceil(timeLeftMs / (1000 * 60 * 60)));
        
        const div = document.createElement('div');
        div.className = 'list-item';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'flex-start';
        div.innerHTML = `
            <strong> Крипто-кошелёк #${docSnap.id.substr(0, 6)}</strong>
            <small>Текущая ставка: <b>${data.currentBid.toFixed(2)} USDT</b></small>
            <small>Лидер: ${data.highestBidderNick || 'Нет'}</small>
            <small style="color: #ff4444;">⏳ До конца: ${hoursLeft} ч.</small>
            <small style="color: #B3CFE5; font-size: 11px;">⚠️ Ставка невозвратна!</small>
            <div style="display:flex; gap:10px; margin-top:10px; width:100%;">
                <input type="number" id="bid-input-${docSnap.id}" placeholder="Ваша ставка" style="flex:1;">
                <button class="btn-primary" style="width:auto;" onclick="placeBid('${docSnap.id}', ${data.currentBid})">Сделать ставку</button>
            </div>
        `;
        list.appendChild(div);
    });
}

window.placeBid = async (auctionId, currentBid) => {
    const input = document.getElementById(`bid-input-${auctionId}`);
    const newBid = parseFloat(input.value.replace(',', '.'));
    
    if (isNaN(newBid) || newBid <= currentBid) return window.notify(`Ставка должна быть выше ${currentBid}`, "error");
    if (window.userData.usdt < newBid) return window.notify("Недостаточно USDT", "error");
    
    const auctionRef = doc(db, "auctions", auctionId);
    
    await updateDoc(auctionRef, {
        currentBid: newBid,
        highestBidderId: window.currentUser.uid,
        highestBidderNick: window.userData.nick,
        endTime: new Date(Date.now() + 60 * 60 * 1000)
    });
    
    await updateDoc(doc(db, "users", window.currentUser.uid), {
        usdt: increment(-newBid)
    });
    
    window.userData.usdt -= newBid;
    window.updateUI();
    window.notify(`✅ Ставка ${newBid} USDT принята!`, "success");
    renderAuctions();
};

// ТОП
window.switchTop = (type) => {
    document.querySelectorAll('.top-toggle-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.top-list').forEach(l => l.classList.remove('active'));
    document.getElementById(`btn-${type}`).classList.add('active');
    document.getElementById(`top-${type}-list`).classList.add('active');
};

async function loadTopData() {
    const playersList = document.getElementById('top-players-list');
    playersList.innerHTML = '<p style="text-align:center;">Загрузка...</p>';
    
    const q = query(collection(db, "users"));
    const snapshot = await getDocs(q);
    
    let players = [];
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        players.push({ nick: data.nick, usdt: data.usdt });
    });
    
    players.sort((a, b) => b.usdt - a.usdt);
    players = players.slice(0, 10);
    
    playersList.innerHTML = '';
    players.forEach((p, idx) => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `<span>#${idx+1} ${p.nick}</span> <span>${p.usdt.toFixed(2)} USDT</span>`;
        playersList.appendChild(div);
    });
    
    document.getElementById('top-clans-list').innerHTML = '<p style="text-align:center;">Кланы скоро будут добавлены</p>';
}

// ПРОФИЛЬ
async function renderProfile() {
    if (!window.userData) return;
    document.getElementById('profile-nick').textContent = window.userData.nick;
    document.getElementById('profile-level').textContent = window.userData.level;
    document.getElementById('profile-usdt').textContent = window.userData.usdt.toFixed(2);
}

// МОДАЛЬНОЕ ОКНО
window.closeModal = () => {
    document.getElementById('modal').style.display = 'none';
};

console.log('✅ Путь к успеху загружен!');
