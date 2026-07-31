import { db, doc, updateDoc, increment, getDoc } from './firebase-config.js';

const SPHERES = [
    { id: 'it', name: 'IT-стартап', cost: 2000, income: 100 },
    { id: 'rest', name: 'Ресторан', cost: 3000, income: 150 },
    { id: 'auto', name: 'Автосервис', cost: 2500, income: 120 }
    // ... добавь остальные 17 по аналогии
];

export async function renderBusinesses() {
    const list = document.getElementById('businesses-list');
    list.innerHTML = '';
    const bizs = window.userData.businesses || [];
    
    if (bizs.length >= 2) document.getElementById('create-business-btn').style.display = 'none';
    else document.getElementById('create-business-btn').style.display = 'block';

    bizs.forEach((biz, index) => {
        const sphere = SPHERES.find(s => s.id === biz.sphereId);
        const div = document.createElement('div');
        div.className = 'list-item';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'flex-start';
        
        let statusText = biz.isBroken ? "🚨 СЛОМАН (Нужен ремонт 600 USDT)" : `Доход: ${sphere.income * biz.level} USDT/день`;
        
        div.innerHTML = `
            <strong>${sphere.name} "${biz.name}"</strong>
            <small>${statusText} | Вложено: ${biz.totalInvested} USDT</small>
            <div style="margin-top:10px; display:flex; gap:10px;">
                ${biz.isBroken ? `<button class="btn-secondary" onclick="repairBusiness(${index})">🔧 Починить (600)</button>` : ''}
                <button class="btn-secondary" onclick="sellBusiness(${index})">💸 Продать (40%)</button>
            </div>
        `;
        list.appendChild(div);
    });
}

export async function checkBusinessCrashes() {
    const bizs = window.userData.businesses || [];
    const now = new Date();
    let updated = false;

    for (let biz of bizs) {
        if (biz.isBroken) continue; // Уже сломан
        
        const lastCrashDate = biz.lastCrashDate ? new Date(biz.lastCrashDate).toDateString() : null;
        if (lastCrashDate === now.toDateString()) continue; // Сегодня уже ломался

        if (biz.lastCheckTime) {
            const hoursSince = (now - new Date(biz.lastCheckTime)) / (1000 * 60 * 60);
            if (hoursSince < 6) continue; // Проверяем только раз в 6 часов
        }

        // Шанс краха 10-30% (можно сделать зависимым от дня)
        const crashChance = 10 + Math.floor(Math.random() * 21); 
        if (Math.random() * 100 < crashChance) {
            biz.isBroken = true;
            biz.lastCrashDate = now.toISOString();
            window.notify(`🚨 Бизнес "${biz.name}" сломался!`, "error");
            updated = true;
        }
        biz.lastCheckTime = now.toISOString();
    }

    if (updated) {
        await updateDoc(doc(db, "users", window.currentUser.uid), { businesses: bizs });
        window.userData.businesses = bizs;
        renderBusinesses();
    }
}

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

document.getElementById('create-business-btn').addEventListener('click', () => {
    if ((window.userData.businesses || []).length >= 2) return window.notify("Максимум 2 бизнеса", "error");
    let html = '<h3>Создать бизнес</h3>';
    SPHERES.forEach(s => {
        html += `<div class="list-item" onclick="createBiz('${s.id}')" style="cursor:pointer; margin:5px 0;"><b>${s.name}</b><br><small>Цена: ${s.cost} USDT</small></div>`;
    });
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal').style.display = 'block'; // Исправлено отображение
});

window.createBiz = async (sphereId) => {
    const name = prompt("Введите название бизнеса:");
    if (!name) return;
    const sphere = SPHERES.find(s => s.id === sphereId);
    if (window.userData.usdt < sphere.cost) return window.notify("Недостаточно средств", "error");

    const newBiz = { sphereId, name, level: 1, totalInvested: sphere.cost, isBroken: false, lastCheckTime: new Date().toISOString() };
    const bizs = [...(window.userData.businesses || []), newBiz];

    await updateDoc(doc(db, "users", window.currentUser.uid), {
        businesses: bizs,
        usdt: increment(-sphere.cost)
    });
    window.userData.usdt -= sphere.cost;
    window.userData.businesses = bizs;
    window.closeModal();
    window.updateUI();
    renderBusinesses();
    window.notify("Бизнес создан!", "success");
};