// auctions.js
import { db, doc, updateDoc, increment, getDoc, collection, getDocs, query, where, runTransaction, serverTimestamp } from './firebase-config.js';

export async function renderAuctions() {
    const list = document.getElementById('auction-list');
    list.innerHTML = '<p style="text-align:center;">Загрузка аукционов...</p>';

    // В реальной игре админ создает аукционы. Здесь мы генерируем тестовый, если их нет
    const auctionsRef = collection(db, "auctions");
    const q = query(auctionsRef, where("status", "==", "active"));
    const snapshot = await getDocs(q);

    list.innerHTML = '';
    
    if (snapshot.empty) {
        // Создаем тестовый аукцион для демонстрации механики
        await createTestAuction();
        return renderAuctions(); // Перезапускаем рендер
    }

    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const timeLeftMs = data.endTime.toDate().getTime() - Date.now();
        const hoursLeft = Math.max(0, Math.ceil(timeLeftMs / (1000 * 60 * 60)));
        const minsLeft = Math.max(0, Math.ceil(timeLeftMs / (1000 * 60)));

        const div = document.createElement('div');
        div.className = 'list-item';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'flex-start';
        div.innerHTML = `
            <strong>🔒 Крипто-кошелёк #${docSnap.id.substr(0, 6)}</strong>
            <small>Текущая ставка: <b>${data.currentBid.toFixed(2)} USDT</b></small>
            <small>Лидер: ${data.highestBidderNick || 'Нет'}</small>
            <small style="color: #ff4444;">⏳ До конца: ${hoursLeft} ч. ${minsLeft} мин.</small>
            <small style="color: #B3CFE5; font-size: 11px;">⚠️ Ставка невозвратна!</small>
            <div style="display:flex; gap:10px; margin-top:10px; width:100%;">
                <input type="number" id="bid-input-${docSnap.id}" placeholder="Ваша ставка" style="flex:1;">
                <button class="btn-primary" style="width:auto;" onclick="placeBid('${docSnap.id}', ${data.currentBid})">Сделать ставку</button>
            </div>
        `;
        list.appendChild(div);
    });
}

async function createTestAuction() {
    const auctionsRef = collection(db, "auctions");
    const newAuction = {
        currentBid: 100,
        highestBidderId: null,
        highestBidderNick: null,
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 часа
        status: "active",
        createdAt: serverTimestamp()
    };
    await addDocToCollection(auctionsRef, newAuction);
}

// Вспомогательная функция, так как addDoc не экспортирован, используем doc с push ID или просто добавим в конфиг. 
// Для простоты, добавим импорт addDoc в firebase-config.js, но пока сделаем хак через doc с случайным ID.
import { addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
async function addDocToCollection(ref, data) {
    await addDoc(ref, data);
}

window.placeBid = async (auctionId, currentBid) => {
    const input = document.getElementById(`bid-input-${auctionId}`);
    const newBid = parseFloat(input.value.replace(',', '.'));
    
    if (isNaN(newBid) || newBid <= currentBid) {
        return window.notify(`Ставка должна быть выше ${currentBid} USDT`, "error");
    }
    if (window.userData.usdt < newBid) {
        return window.notify("Недостаточно USDT для ставки", "error");
    }

    // ВАЖНО: Используем транзакцию, чтобы избежать гонки данных
    const auctionRef = doc(db, "auctions", auctionId);
    const userRef = doc(db, "users", window.currentUser.uid);

    try {
        await runTransaction(db, async (transaction) => {
            const auctionSnap = await transaction.get(auctionRef);
            if (!auctionSnap.exists()) throw "Аукцион не найден";
            
            const auctionData = auctionSnap.data();
            if (auctionData.status !== "active") throw "Аукцион уже завершен";

            // Проверяем, не перебили ли ставку за миллисекунду до нас
            if (newBid <= auctionData.currentBid) {
                throw "Ставка уже перебита! Введите сумму выше.";
            }

            // Списываем деньги с пользователя СРАЗУ (правило "невозвратна")
            transaction.update(userRef, {
                usdt: increment(-newBid)
            });

            // Обновляем аукцион: новая ставка, новый лидер, время + 1 час
            const newEndTime = new Date(Date.now() + 60 * 60 * 1000);
            transaction.update(auctionRef, {
                currentBid: newBid,
                highestBidderId: window.currentUser.uid,
                highestBidderNick: window.userData.nick,
                endTime: newEndTime
            });
        });

        // Обновляем локальные данные
        window.userData.usdt -= newBid;
        window.updateUI();
        window.notify(`✅ Ставка ${newBid} USDT принята! Время продлено на 1 час.`, "success");
        renderAuctions();
        
    } catch (error) {
        window.notify(`❌ Ошибка: ${error}`, "error");
    }
};

// Эту функцию нужно вызывать периодически или при входе, чтобы проверить завершенные аукционы
export async function checkEndedAuctions() {
    const auctionsRef = collection(db, "auctions");
    const q = query(auctionsRef, where("status", "==", "active"));
    const snapshot = await getDocs(q);
    const now = Date.now();

    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data.endTime.toDate().getTime() <= now && data.highestBidderId) {
            // Аукцион завершен, есть победитель
            await resolveAuction(docSnap.id, data);
        } else if (data.endTime.toDate().getTime() <= now && !data.highestBidderId) {
            // Аукцион завершен, но ставок не было
            await updateDoc(doc(db, "auctions", docSnap.id), { status: "cancelled" });
        }
    }
}

async function resolveAuction(auctionId, data) {
    // Генерируем стоимость содержимого: от -20% до +50% от финальной ставки
    const randomFactor = 0.8 + (Math.random() * 0.7); // 0.8 ... 1.5
    const contentsValue = data.currentBid * randomFactor;
    
    const isProfit = contentsValue > data.currentBid;
    const message = isProfit 
        ? `🎉 Вы выиграли аукцион! В кошельке оказалось ${contentsValue.toFixed(2)} USDT (Прибыль: +${(contentsValue - data.currentBid).toFixed(2)})`
        : `📉 Вы выиграли аукцион, но в кошельке оказалось лишь ${contentsValue.toFixed(2)} USDT (Убыток: -${(data.currentBid - contentsValue).toFixed(2)})`;

    // Начисляем выигрыш победителю
    const winnerRef = doc(db, "users", data.highestBidderId);
    await updateDoc(winnerRef, {
        usdt: increment(contentsValue)
    });

    // Помечаем аукцион как завершенный
    await updateDoc(doc(db, "auctions", auctionId), {
        status: "ended",
        contentsValue: contentsValue
    });

    // Если это текущий пользователь, показываем уведомление
    if (data.highestBidderId === window.currentUser.uid) {
        window.notify(message, isProfit ? "success" : "info");
        // Обновляем баланс локально
        window.userData.usdt += contentsValue;
        window.updateUI();
    }
}
