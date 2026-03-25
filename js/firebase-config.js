import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

const firebaseConfig = {
    apiKey: "AIzaSyAMek71qJr0wWE1hgfuliGveiT7W_BuO18",
    authDomain: "testedev-42ca7.firebaseapp.com",
    databaseURL: "https://testedev-42ca7-default-rtdb.firebaseio.com", // IMPORTANTE: Você precisa criar o Realtime Database e copiar essa URL
    projectId: "testedev-42ca7",
    storageBucket: "testedev-42ca7.firebasestorage.app",
    messagingSenderId: "825383277985",
    appId: "1:825383277985:web:5c727d5486a8ab072367e0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
