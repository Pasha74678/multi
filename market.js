// ==================== РЫНОК ====================
document.addEventListener('DOMContentLoaded', () => {
    renderMarket();
});

function renderMarket() {
    const marketList = document.getElementById('market-list');
    if (!marketList) return;
    
    marketList.innerHTML = '';
    
    const currencies = Object.keys(GAME_DATA.marketPrices);
    
    currencies.forEach(currency => {
        const price = GAME_DATA.marketPrices[currency];
        const balance = GAME_DATA.balances[currency] || 0;
        
        const item = document.createElement('div');
        item.className = 'market-item';
        item.innerHTML = `
            <div class="market-item-info">
                <div class="market-item-name">${currency}</div>
                <div class="market-item-price">${price.toFixed(2)} USDT</div>
                <div style="font-size: 12px; color: #888;">Баланс: ${balance.toFixed(8)}</div>
            </div>
            <div class="market-item-actions">
                <button class="buy-btn" onclick="buyCrypto('${currency}')">Купить</button>
                <button class="sell-btn" onclick="sellCrypto('${currency}')">Продать</button>
            </div>
        `;
        
        marketList.appendChild(item);
    });
}

function buyCrypto(currency) {
    const price = GAME_DATA.marketPrices[currency];
    const maxAmount = Math.floor(GAME_DATA.player.usdt / price);
    
    const amount = prompt(`Введите количество ${currency} для покупки (максимум ${maxAmount}):`);
    
    if (!amount) return;
    
    const amountNum = parseFloat(amount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
        showNotification(' Неверное количество', 'error');
        return;
    }
    
    if (amountNum > maxAmount) {
        showNotification(' Недостаточно USDT', 'error');
        return;
    }
    
    const cost = amountNum * price;
    
    if (confirm(`Купить ${amountNum.toFixed(8)} ${currency} за ${cost.toFixed(2)} USDT?`)) {
        GAME_DATA.player.usdt -= cost;
        GAME_DATA.balances[currency] += amountNum;
        
        // Обновляем цену (уменьшаем банк, увеличиваем цену)
        updateMarketPriceAfterTrade(currency, 'buy', amountNum);
        
        showNotification(`✅ Куплено ${amountNum.toFixed(8)} ${currency}`, 'success');
        saveGame();
        updateUI();
        renderMarket();
    }
}

function sellCrypto(currency) {
    const balance = GAME_DATA.balances[currency] || 0;
    const price = GAME_DATA.marketPrices[currency];
    
    const amount = prompt(`Введите количество ${currency} для продажи (максимум ${balance.toFixed(8)}):`);
    
    if (!amount) return;
    
    const amountNum = parseFloat(amount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
        showNotification('❌ Неверное количество', 'error');
        return;
    }
    
    if (amountNum > balance) {
        showNotification(' Недостаточно крипты', 'error');
        return;
    }
    
    const reward = amountNum * price;
    
    if (confirm(`Продать ${amountNum.toFixed(8)} ${currency} за ${reward.toFixed(2)} USDT?`)) {
        GAME_DATA.balances[currency] -= amountNum;
        GAME_DATA.player.usdt += reward;
        
        // Обновляем цену (увеличиваем банк, уменьшаем цену)
        updateMarketPriceAfterTrade(currency, 'sell', amountNum);
        
        showNotification(`✅ Продано ${amountNum.toFixed(8)} ${currency}`, 'success');
        saveGame();
        updateUI();
        renderMarket();
    }
}

function updateMarketPriceAfterTrade(currency, action, amount) {
    const currentPrice = GAME_DATA.marketPrices[currency];
    const basePrice = 100.0;
    const impact = amount * 0.01; // Влияние на цену
    
    let newPrice;
    if (action === 'buy') {
        newPrice = currentPrice * (1 + impact);
    } else {
        newPrice = currentPrice * (1 - impact);
    }
    
    GAME_DATA.marketPrices[currency] = Math.max(CONFIG.MIN_PRICE, newPrice);
}