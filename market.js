// market.js
import { db, doc, updateDoc, increment, getDoc, collection, getDocs } from './firebase-config.js';

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
    { id: 'RUBY', name: 'Рубин', type: 'metal', icon: '🔴', minPrice: 50 }
];

export async function renderMarket() {
    const list = document.getElementById('market-list');
    list.innerHTML = '<p style="text-align:center;">Загрузка рынка...</p>';

    // Получаем текущие цены из Firebase (или инициализируем, если их нет)
    const marketRef = doc(db, "global", "market_prices");
    let marketData = {};
    const snap = await getDoc(marketRef);
    
    if (snap.exists()) {
        marketData = snap.data();
    } else {
        // Инициализация стартовых цен
        ASSETS.forEach(asset => {
            marketData[asset.id] = { price: asset.minPrice, prevPrice: asset.minPrice };
        });
        await updateDoc(marketRef, marketData);
    }

    list.innerHTML = '';
    
    // Сортируем: сначала крипта, потом металлы
    const sortedAssets = [...ASSETS].sort((a, b) => a.type.localeCompare(b.type));

    for (const asset of sortedAssets) {
        const data = marketData[asset.id] || { price: asset.minPrice, prevPrice: asset.minPrice };
        const price = data.price;
        const prevPrice = data.prevPrice;
        const userBalance = window.userData.balances?.[asset.id] || 0;
        
        const trend = price > prevPrice ? '🔼' : (price < prevPrice ? '🔽' : '➡️');
        const trendColor = price > prevPrice ? '#00ff88' : (price < prevPrice ? '#ff4444' : '#B3CFE5');

        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div style="flex: 1;">
                <div style="font-size: 18px; font-weight: bold;">${asset.icon} ${asset.name} <small style="color: #B3CFE5;">(${asset.id})</small></div>
                <div style="color: ${trendColor}; font-size: 14px;">${trend} ${price.toFixed(2)} USDT</div>
                <div style="font-size: 12px; color: #B3CFE5;">Твой баланс: ${userBalance.toFixed(6)}</div>
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
        
        // Обновляем баланс пользователя
        await updateDoc(doc(db, "users", window.currentUser.uid), {
            usdt: increment(-totalCost),
            [`balances.${assetId}`]: increment(amount)
        });
        
        // Имитируем изменение цены (покупка повышает цену)
        await simulatePriceChange(assetId, currentPrice, amount, 'buy');
        
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

        // Имитируем изменение цены (продажа понижает цену)
        await simulatePriceChange(assetId, currentPrice, amount, 'sell');

        window.userData.usdt += totalCost;
        window.userData.balances[assetId] -= amount;
        
        window.notify(`✅ Продано ${amount} ${assetId}`, "success");
    }
    
    window.updateUI();
    renderMarket();
};

async function simulatePriceChange(assetId, currentPrice, amount, action) {
    const marketRef = doc(db, "global", "market_prices");
    const snap = await getDoc(marketRef);
    const data = snap.data() || {};
    
    const asset = ASSETS.find(a => a.id === assetId);
    // Влияние на цену: чем больше объем, тем сильнее сдвиг. + случайная волатильность
    const impact = (amount * 0.01) * (action === 'buy' ? 1 : -1);
    const volatility = (Math.random() - 0.5) * 0.02; // +/- 1%
    
    let newPrice = currentPrice * (1 + impact + volatility);
    newPrice = Math.max(asset.minPrice, newPrice); // Не ниже стартовой цены
    
    data[assetId] = { price: newPrice, prevPrice: currentPrice };
    await updateDoc(marketRef, data);
}
