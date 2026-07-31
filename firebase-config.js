// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, runTransaction, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Твоя конфигурация Firebase (вымышленные данные, как ты просил)
const firebaseConfig = {
    apiKey: "AIzaSyAAL1zpUJuZET0ZDoQQGeiIIFruUocf8pY",
    authDomain: "business-21bba.firebaseapp.com",
    projectId: "business-21bba",
    storageBucket: "business-21bba.firebasestorage.app",
    messagingSenderId: "54951370679",
    appId: "1:54951370679:web:cc72b88921c90d2f7ad232",
    measurementId: "G-CXKVPKQHHG"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); // Аналитика (работает автоматически при входе)

// Экспортируем основные сервисы для использования в других файлах
export const auth = getAuth(app);
export const db = getFirestore(app);

// Экспортируем функции, чтобы не импортировать их заново в каждом файле
export { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    collection, 
    query, 
    where, 
    getDocs, 
    runTransaction, 
    increment, 
    serverTimestamp 
};