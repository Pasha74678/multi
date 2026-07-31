// ==================== БАНК ====================
document.addEventListener('DOMContentLoaded', () => {
    renderBank();
    
    const depositBtn = document.getElementById('deposit-btn');
    const withdrawBtn = document.getElementById('withdraw-btn');
    const loanBtn = document.getElementById('loan-btn');
    const payLoanBtn = document.getElementById('pay-loan-btn');
    
    if (depositBtn) depositBtn.addEventListener('click', makeDeposit);
    if (withdrawBtn) withdrawBtn.addEventListener('click', withdrawDeposit);
    if (loanBtn) loanBtn.addEventListener('click', takeLoan);
    if (payLoanBtn) payLoanBtn.addEventListener('click', payLoan);
});

function renderBank() {
    const balanceEl = document.getElementById('bank-balance');
    const depositEl = document.getElementById('bank-deposit');
    const loanEl = document.getElementById('bank-loan');
    
    if (balanceEl) balanceEl.textContent = GAME_DATA.player.usdt.toFixed(2);
    if (depositEl) depositEl.textContent = GAME_DATA.bank.deposit.toFixed(2);
    if (loanEl) loanEl.textContent = GAME_DATA.bank.loan.toFixed(2);
}

function makeDeposit() {
    if (GAME_DATA.player.usdt < 100) {
        showNotification('❌ Минимум 100 USDT', 'error');
        return;
    }
    
    if (confirm('Вложить 100 USDT на депозит?')) {
        GAME_DATA.player.usdt -= 100;
        GAME_DATA.bank.deposit += 100;
        GAME_DATA.bank.depositDate = new Date().toISOString();
        
        showNotification('✅ Вложено 100 USDT!', 'success');
        saveGame();
        updateUI();
        renderBank();
    }
}

function withdrawDeposit() {
    if (GAME_DATA.bank.deposit <= 0) {
        showNotification('❌ Нет депозита', 'error');
        return;
    }
    
    if (!GAME_DATA.bank.depositDate) {
        showNotification(' Ошибка: нет даты депозита', 'error');
        return;
    }
    
    const days = Math.floor((new Date() - new Date(GAME_DATA.bank.depositDate)) / (1000 * 60 * 60 * 24));
    
    if (days < CONFIG.DEPOSIT_LOCK_DAYS) {
        showNotification(`❌ Мин. срок ${CONFIG.DEPOSIT_LOCK_DAYS} дней. Осталось: ${CONFIG.DEPOSIT_LOCK_DAYS - days}`, 'error');
        return;
    }
    
    const interest = GAME_DATA.bank.deposit * Math.pow(1 + CONFIG.BANK_DEPOSIT_INTEREST, days);
    
    if (confirm(`Забрать депозит с процентами? Получите ${interest.toFixed(2)} USDT`)) {
        GAME_DATA.player.usdt += interest;
        GAME_DATA.bank.deposit = 0;
        GAME_DATA.bank.depositDate = null;
        
        showNotification(`✅ Получено ${interest.toFixed(2)} USDT!`, 'success');
        saveGame();
        updateUI();
        renderBank();
    }
}

function takeLoan() {
    if (GAME_DATA.bank.loan > 0) {
        showNotification('❌ Сначала погасите текущий кредит', 'error');
        return;
    }
    
    if (confirm('Взять кредит 1000 USDT?')) {
        GAME_DATA.player.usdt += 1000;
        GAME_DATA.bank.loan = 1000;
        GAME_DATA.bank.loanDate = new Date().toISOString();
        
        showNotification('✅ Взято 1000 USDT!', 'success');
        saveGame();
        updateUI();
        renderBank();
    }
}

function payLoan() {
    if (GAME_DATA.bank.loan <= 0) {
        showNotification('❌ Нет кредита', 'error');
        return;
    }
    
    if (!GAME_DATA.bank.loanDate) {
        showNotification('❌ Ошибка: нет даты кредита', 'error');
        return;
    }
    
    const days = Math.floor((new Date() - new Date(GAME_DATA.bank.loanDate)) / (1000 * 60 * 60 * 24));
    const debt = GAME_DATA.bank.loan * Math.pow(1 + CONFIG.BANK_LOAN_INTEREST, days);
    
    if (GAME_DATA.player.usdt < debt) {
        showNotification(`❌ Нужно ${debt.toFixed(2)} USDT, у вас ${GAME_DATA.player.usdt.toFixed(2)}`, 'error');
        return;
    }
    
    if (confirm(`Погасить кредит? Нужно ${debt.toFixed(2)} USDT`)) {
        GAME_DATA.player.usdt -= debt;
        GAME_DATA.bank.loan = 0;
        GAME_DATA.bank.loanDate = null;
        
        showNotification(`✅ Кредит погашен! Отдано ${debt.toFixed(2)} USDT`, 'success');
        saveGame();
        updateUI();
        renderBank();
    }
}