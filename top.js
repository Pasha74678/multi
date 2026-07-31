import { db, collection, getDocs, query, orderBy, limit } from './firebase-config.js';

window.switchTop = (type) => {
    document.querySelectorAll('.top-toggle-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.top-list').forEach(l => l.classList.remove('active'));
    
    document.getElementById(`btn-${type}`).classList.add('active');
    document.getElementById(`top-${type}-list`).classList.add('active');
};

export async function loadTopData() {
    // Топ игроков
    const playersList = document.getElementById('top-players-list');
    playersList.innerHTML = '<p>Загрузка...</p>';
    
    // В реальном приложении это делается через Cloud Function или агрегацию, 
    // здесь упрощенный запрос (внимание: для >1000 игроков нужен бэкенд)
    const q = query(collection(db, "users"), orderBy("usdt", "desc"), limit(10));
    const snapshot = await getDocs(q);
    
    let html = '';
    snapshot.forEach((doc, idx) => {
        const data = doc.data();
        html += `<div class="list-item"><span>#${idx+1} ${data.nick}</span> <span>${data.usdt.toFixed(2)} USDT</span></div>`;
    });
    playersList.innerHTML = html || '<p>Пока нет игроков</p>';

    // Топ кланов (заглушка для примера структуры, требует отдельной коллекции clans)
    document.getElementById('top-clans-list').innerHTML = '<div class="list-item"><span>#1 Клан "Elite"</span> <span>15,400 USDT</span></div>';
}