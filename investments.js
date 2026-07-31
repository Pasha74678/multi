import { db, doc, updateDoc, increment, getDoc } from './firebase-config.js';

const ENTERPRISES = [
    { id: 'school', name: 'Школа', icon: '🏫' }, { id: 'wb', name: 'Wildberries', icon: '' },
    { id: 'ozon', name: 'Ozon', icon: '📦' }, { id: 'ai', name: 'AI', icon: '🤖' },
    { id: 'apple', name: 'Apple', icon: '🍎' } // Добавь до 30 по аналогии
];

// Генерация 5 случайных инвестиций на текущий 3-дневный период
function getCurrentInvestments() {
    const period = Math.floor(Date.now() / (3 * 24 * 60 * 60 * 1000));
    // Псевдо-рандом на основе периода, чтобы у всех были одинаковые 5 предприятий
    const seed = period * 12345; 
    const shuffled = [...ENTERPRISES].sort((a, b) => {
        const randomA = Math.sin(seed + a.id.length) * 10000;
        const randomB = Math.sin(seed + b.id.length) * 10000;
        return randomA - randomB;
    });
    
    return shuffled.slice(0, 5).map((ent, i) => {
        // Обратная зависимость: 10% шанс = 80% доход, макс 3000. 60% шанс = 10% доход, макс 6000.
        const winChance = 10 + (i * 10); // 10, 20, 30, 40, 50, 60
        const profitPercent = 80 - (i * 10); // 80, 70, 60, 50, 40, 30
        const maxBet = 3000 + (i * 500); // 3000, 3500, 4000, 4500, 5000, 5500, 6000
        
        return { ...ent, winChance, profitPercent, maxBet, minBet: 500 };
    });
}

export async function renderInvestments() {
    const list = document.getElementById('investments-list');
    list.innerHTML = '';
    const invs = getCurrentInvestments();
    
    invs.forEach(inv => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.style.flexDirection = 'column';
        div.innerHTML = `
            <strong>${inv.icon} ${inv.name}</strong>
            <small>Шанс: ${inv.winChance}% | Доход: +${inv.profitPercent}% | Лимит: ${inv.minBet} - ${inv.maxBet} USDT</small>
            <input type="number" id="inv-amount-${inv.id}" placeholder="Сумма" style="margin-top:10px; width:100px;">
            <button class="btn-primary" style="margin-top:10px; width:auto;" onclick="makeInvestment('${inv.id}', ${inv.winChance}, ${inv.profitPercent}, ${inv.maxBet})">Инвестировать</button>
        `;
        list.appendChild(div);
    });
    
    // Рендер активных
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
    if (!amount || amount < 500 || amount > maxBet) return window.notify(`Сумма должна быть от 500 до ${maxBet}`, "error");
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

export async function checkInvestmentResults() {
    // Эта функция вызывается при загрузке, она просто обновляет UI, 
    // реальное начисление происходит при нажатии "Забрать" в resolveInvestment
    renderInvestments();
}

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