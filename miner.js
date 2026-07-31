import { db, doc, updateDoc, getDoc, increment } from './firebase-config.js';

let minerInterval = null;

export async function checkOfflineMinerProgress() {
    const userRef = doc(db, "users", window.currentUser.uid);
    const snap = await getDoc(userRef);
    const data = snap.data();
    
    if (data.minerRunning && data.minerStartTime) {
        const now = Date.now();
        const start = new Date(data.minerStartTime).getTime();
        const elapsedSec = (now - start) / 1000;
        const maxSec = 2 * 3600; // 2 часа базово + улучшения

        if (elapsedSec >= maxSec) {
            // Завершился оффлайн
            const reward = 0.00001 * maxSec / 60; // Упрощенная формула
            await updateDoc(userRef, {
                minerRunning: false,
                usdt: increment(reward)
            });
            window.notify("⛏ Майнер завершил работу пока вас не было!", "success");
            window.userData.minerRunning = false;
        } else {
            // Продолжает работать
            updateMinerUI((elapsedSec / maxSec) * 100, (maxSec - elapsedSec) / 60);
            startMinerTimer((maxSec - elapsedSec) / 60);
        }
    }
    updateMinerButtons();
}

window.toggleMiner = async () => {
    const userRef = doc(db, "users", window.currentUser.uid);
    const isRunning = window.userData.minerRunning;
    
    if (isRunning) {
        await updateDoc(userRef, { minerRunning: false });
        window.userData.minerRunning = false;
        window.notify("Майнер остановлен", "info");
    } else {
        await updateDoc(userRef, { 
            minerRunning: true, 
            minerStartTime: new Date().toISOString(),
            minerCurrency: document.getElementById('miner-currency').value
        });
        window.userData.minerRunning = true;
        window.notify("Майнер запущен!", "success");
        startMinerTimer(2 * 60); // 2 часа в минутах
    }
    updateMinerButtons();
};

function startMinerTimer(minutesLeft) {
    if (minerInterval) clearInterval(minerInterval);
    let secs = minutesLeft * 60;
    minerInterval = setInterval(() => {
        secs--;
        const total = 2 * 3600;
        const elapsed = total - secs;
        updateMinerUI((elapsed / total) * 100, secs / 60);
        if (secs <= 0) {
            clearInterval(minerInterval);
            window.toggleMiner(); // Остановить и начислить
        }
    }, 1000);
}

function updateMinerUI(percent, mins) {
    document.getElementById('miner-progress').style.width = `${percent}%`;
    document.getElementById('miner-time-left').textContent = `${Math.ceil(mins)} мин`;
    document.getElementById('miner-status').textContent = "🟢 Работает";
}

function updateMinerButtons() {
    const btn = document.getElementById('miner-toggle-btn');
    if (window.userData?.minerRunning) {
        btn.textContent = "⏹ Остановить";
    } else {
        btn.textContent = "▶️ Запустить";
        document.getElementById('miner-progress').style.width = "0%";
        document.getElementById('miner-time-left').textContent = "0 мин";
        document.getElementById('miner-status').textContent = "🔴 Остановлен";
    }
}

document.getElementById('miner-toggle-btn').addEventListener('click', window.toggleMiner);