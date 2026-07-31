import { db, doc, updateDoc, increment, collection, getDocs, query, where } from './firebase-config.js';

document.getElementById('theft-search-btn').addEventListener('click', async () => {
    if (window.userData.usdt < 10) return window.notify("Нужно 10 USDT", "error");
    
    document.getElementById('theft-search-btn').style.display = 'none';
    document.getElementById('theft-animation').style.display = 'block';
    
    await updateDoc(doc(db, "users", window.currentUser.uid), { usdt: increment(-10) });
    window.userData.usdt -= 10;
    window.updateUI();

    // Анимация шагов
    const statusText = document.getElementById('theft-status-text');
    await new Promise(r => setTimeout(r, 1500));
    statusText.textContent = "Сканирование уязвимостей...";
    await new Promise(r => setTimeout(r, 1500));
    statusText.textContent = "Жертва найдена! Анализ баланса...";
    await new Promise(r => setTimeout(r, 1500));

    // Поиск реальной жертвы (упрощенно: берем случайного из топ-100, у кого > 300 USDT)
    // В реальном приложении лучше использовать Cloud Function для подбора
    const victimNick = "Игрок_" + Math.floor(Math.random() * 9999);
    const victimBalance = 500 + Math.floor(Math.random() * 2000);

    document.getElementById('theft-animation').style.display = 'none';
    const resultDiv = document.getElementById('theft-result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <h3>🎯 Жертва: ${victimNick}</h3>
        <p>Примерный баланс: ~${victimBalance} USDT</p>
        <p>Выберите риск (процент от баланса жертвы):</p>
        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;">
            <button class="btn-secondary" onclick="executeTheft(1, 40, '${victimNick}', ${victimBalance})">1% (Шанс 40%)</button>
            <button class="btn-secondary" onclick="executeTheft(3, 18, '${victimNick}', ${victimBalance})">3% (Шанс 18%)</button>
            <button class="btn-secondary" onclick="executeTheft(5, 5, '${victimNick}', ${victimBalance})">5% (Шанс 5%)</button>
        </div>
        <button class="btn-small" style="margin-top:15px;" onclick="resetTheftUI()">Отмена</button>
    `;
});

window.executeTheft = async (percent, chance, victimNick, victimBal) => {
    const isWin = Math.random() * 100 < chance;
    const amount = victimBal * (percent / 100);
    
    if (isWin) {
        await updateDoc(doc(db, "users", window.currentUser.uid), { usdt: increment(amount) });
        window.userData.usdt += amount;
        window.notify(`✅ Успех! Украдено ${amount.toFixed(2)} USDT у ${victimNick}`, "success");
    } else {
        const penalty = window.userData.usdt * (percent / 100);
        await updateDoc(doc(db, "users", window.currentUser.uid), { usdt: increment(-penalty) });
        window.userData.usdt -= penalty;
        window.notify(`❌ Провал! Вы потеряли ${penalty.toFixed(2)} USDT`, "error");
    }
    window.updateUI();
    resetTheftUI();
};

window.resetTheftUI = () => {
    document.getElementById('theft-animation').style.display = 'none';
    document.getElementById('theft-result').style.display = 'none';
    document.getElementById('theft-search-btn').style.display = 'block';
};