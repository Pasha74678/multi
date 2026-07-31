import { db, doc, updateDoc, increment } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('click-btn');
    if (!btn) return;

    const handleClick = (e) => {
        if (!window.userData || window.userData.stamina <= 0) {
            window.notify("Нет стамины!", "error");
            return;
        }

        const rect = btn.getBoundingClientRect();
        const x = e.clientX || (e.touches ? e.touches[0].clientX : rect.left + rect.width/2);
        const y = e.clientY || (e.touches ? e.touches[0].clientY : rect.top + rect.height/2);

        if (!window.validateClick(x, y)) return;

        const currency = document.getElementById('clicker-currency').value;
        const reward = (window.userData.power * window.userData.multiplier * window.CONFIG.CLICK_REWARD);

        // Обновление локально для мгновенного отклика
        window.userData.stamina -= 1;
        window.userData.usdt += reward; // Упрощение: крипта сразу в USDT для кликера, или можно добавить баланс крипты
        window.updateUI();

        // Визуальный эффект
        const effect = document.createElement('div');
        effect.className = 'click-effect';
        effect.textContent = `+${reward.toFixed(6)}`;
        effect.style.left = `${e.clientX || x}px`;
        effect.style.top = `${e.clientY || y}px`;
        document.body.appendChild(effect);
        setTimeout(() => effect.remove(), 1000);

        // Сохранение в Firebase (debounce можно добавить для оптимизации)
        updateDoc(doc(db, "users", window.currentUser.uid), {
            stamina: increment(-1),
            usdt: increment(reward)
        });
    };

    btn.addEventListener('mousedown', handleClick);
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); handleClick(e); }, { passive: false });
});