// bank.js
import { db, doc, updateDoc, increment, getDoc } from './firebase-config.js';

export async function renderBank() {
    const bankData = window.userData.bank || { deposit: 0, depositDate: null, loan: 0, loanDate: null };
    
    document.getElementById('bank-deposit').textContent = bankData.deposit.toFixed(2);
    document.getElementById('bank-loan').textContent = bankData.loan.toFixed(2);
}

window.bankAction = async (action) => {
    const bankData = window.userData.bank || { deposit: 0, depositDate: null, loan: 0, loanDate: null };
    const now = Date.now();

    if (action === 'deposit') {
        const amountStr = prompt("Введите сумму для вклада (минимум 100 USDT):");
        if (!amountStr) return;
        const amount = parseFloat(amountStr.replace(',', '.'));
        if (isNaN(amount) || amount < 100) return window.notify("Минимум 100 USDT", "error");
        if (window.userData.usdt < amount) return window.notify("Недостаточно USDT", "error");

        await updateDoc(doc(db, "users", window.currentUser.uid), {
            usdt: increment(-amount),
            "bank.deposit": increment(amount),
            "bank.depositDate": now
        });
        window.userData.usdt -= amount;
        window.userData.bank = { ...bankData, deposit: bankData.deposit + amount, depositDate: now };
        window.notify("✅ Средства успешно вложены!", "success");
    } 
    else if (action === 'withdraw') {
        if (bankData.deposit <= 0) return window.notify("У вас нет активного вклада", "error");
        
        const daysPassed = (now - bankData.depositDate) / (1000 * 60 * 60 * 24);
        if (daysPassed < 7) {
            return window.notify(`Вклад заморожен. Осталось дней: ${Math.ceil(7 - daysPassed)}`, "error");
        }

        // Сложный процент: 2% в день
        const totalReturn = bankData.deposit * Math.pow(1.02, daysPassed);
        
        await updateDoc(doc(db, "users", window.currentUser.uid), {
            usdt: increment(totalReturn),
            "bank.deposit": 0,
            "bank.depositDate": null
        });
        window.userData.usdt += totalReturn;
        window.userData.bank.deposit = 0;
        window.userData.bank.depositDate = null;
        window.notify(`✅ Вклад закрыт! Получено ${totalReturn.toFixed(2)} USDT`, "success");
    }
    else if (action === 'loan') {
        if (bankData.loan > 0) return window.notify("Сначала погасите текущий кредит", "error");
        
        const amountStr = prompt("Введите сумму кредита (максимум 1000 USDT):");
        if (!amountStr) return;
        const amount = parseFloat(amountStr.replace(',', '.'));
        if (isNaN(amount) || amount <= 0 || amount > 1000) return window.notify("Сумма от 1 до 1000 USDT", "error");

        await updateDoc(doc(db, "users", window.currentUser.uid), {
            usdt: increment(amount),
            "bank.loan": amount,
            "bank.loanDate": now
        });
        window.userData.usdt += amount;
        window.userData.bank = { ...bankData, loan: amount, loanDate: now };
        window.notify(`✅ Кредит получен!`, "success");
    }
    else if (action === 'payLoan') {
        if (bankData.loan <= 0) return window.notify("У вас нет кредита", "error");
        
        const daysPassed = (now - bankData.loanDate) / (1000 * 60 * 60 * 24);
        // Сложный процент: 5% в день
        const debt = bankData.loan * Math.pow(1.05, daysPassed);
        
        if (window.userData.usdt < debt) {
            return window.notify(`Недостаточно USDT. Ваш долг: ${debt.toFixed(2)} USDT`, "error");
        }

        await updateDoc(doc(db, "users", window.currentUser.uid), {
            usdt: increment(-debt),
            "bank.loan": 0,
            "bank.loanDate": null
        });
        window.userData.usdt -= debt;
        window.userData.bank.loan = 0;
        window.userData.bank.loanDate = null;
        window.notify(`✅ Кредит полностью погашен! Списано ${debt.toFixed(2)} USDT`, "success");
    }

    window.updateUI();
    renderBank();
};
