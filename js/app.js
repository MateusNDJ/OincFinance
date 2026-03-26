import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { ref, set, get, push, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

let currentUser = null;
let goalsData = {}; // Changed from goalData to goalsData (multiple goals)
let contributionsData = {};
let submetasData = {};
let rewardsData = [];
let chart = null;

const motivationalMessages = [
    "✨ Juntos somos mais fortes! Cada centavinho conta! 💪",
    "🏠 A casa dos sonhos está cada vez mais perto! Continue assim! 🎉",
    "💕 O amor constrói sonhos, e vocês estão construindo o de vocês! 🏗️",
    "🌟 Cada economia é um tijolinho da nossa casa! 🧱",
    "🎯 Foco no objetivo! Vocês vão conseguir! 💪💕",
    "🐷 Continue guardando! Vocês estão indo muito bem! 🎊",
    "💰 Dinheiro guardado é sonho realizado! Vamos lá! 🚀",
    "🏡 Persistência é a chave do sucesso! 💖"
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
    setupEventListeners();
    setDefaultDate();
    loadTheme();
    updateMotivationalMessage();
});

function initializeAuth() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            showMainApp();
            loadData();
        } else {
            showLoginScreen();
        }
    });
}

function setupEventListeners() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('goalForm').addEventListener('submit', handleGoalSubmit);
    document.getElementById('contributionForm').addEventListener('submit', handleContributionSubmit);
    document.getElementById('submetaForm').addEventListener('submit', handleSubmetaSubmit);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('profileForm').addEventListener('submit', handleProfileSubmit);
    document.getElementById('profileAvatarInput').addEventListener('change', handleAvatarPreview);
    
    // Image preview handlers
    document.getElementById('goalImageFile').addEventListener('change', handleGoalImageUpload);
    document.getElementById('submetaImage').addEventListener('change', handleSubmetaImagePreview);
    
    // Update motivational message every 10 seconds
    setInterval(updateMotivationalMessage, 10000);
}

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('contributionDate').value = today;
}

// Authentication
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        // Login successful - onAuthStateChanged will handle the redirect
    } catch (error) {
        console.error('Login error:', error.code, error.message);
        
        let errorMessage = 'Email ou senha incorretos. Por favor, tente novamente.';
        
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'Usuário não encontrado. Verifique o email.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Senha incorreta. Tente novamente.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Email inválido. Verifique o formato.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Muitas tentativas. Aguarde alguns minutos.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Erro de conexão. Verifique sua internet.';
        } else if (error.code.includes('auth/requests-to-this-api') || error.code.includes('blocked')) {
            errorMessage = '⚠️ API bloqueada! Configure as restrições da API Key no Google Cloud Console para permitir "Identity Toolkit API".';
        }
        
        showErrorModal(errorMessage);
    }
}

async function handleLogout() {
    await signOut(auth);
}

function showLoginScreen() {
    document.getElementById('loginScreen').classList.remove('d-none');
    document.getElementById('mainApp').classList.add('d-none');
    document.body.classList.add('login-active');
    document.body.classList.remove('app-active');
    document.documentElement.classList.remove('app-active');
}

function showMainApp() {
    document.getElementById('loginScreen').classList.add('d-none');
    document.getElementById('mainApp').classList.remove('d-none');
    document.body.classList.remove('login-active');
    document.body.classList.add('app-active');
    document.documentElement.classList.add('app-active');
    loadUserProfile();
}

// Data Loading
function loadData() {
    const goalsRef = ref(db, 'goals'); // Changed from 'goal' to 'goals'
    const contributionsRef = ref(db, 'contributions');
    const submetasRef = ref(db, 'submetas');
    const rewardsRef = ref(db, 'rewards');
    
    onValue(goalsRef, (snapshot) => {
        goalsData = snapshot.val() || {};
        updateGoalsDisplay();
        updateAllDisplays();
    });
    
    onValue(contributionsRef, (snapshot) => {
        contributionsData = snapshot.val() || {};
        updateAllDisplays();
    });
    
    onValue(submetasRef, (snapshot) => {
        submetasData = snapshot.val() || {};
        updateSubmetasDisplay();
    });
    
    onValue(rewardsRef, (snapshot) => {
        rewardsData = snapshot.val() || [];
        updateRewardsDisplay();
    });
}

// Goal Management
async function handleGoalSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('goalName').value;
    const amount = parseFloat(document.getElementById('goalAmount').value);
    const imageUrl = document.getElementById('goalImage').value;
    const imageFile = document.getElementById('goalImageFile').files[0];
    
    let image = imageUrl;
    
    // If file was uploaded, convert to base64
    if (imageFile) {
        image = await fileToBase64(imageFile);
    }
    
    const goal = {
        name,
        amount,
        image,
        createdAt: Date.now()
    };
    
    await push(ref(db, 'goals'), goal); // Changed to push for multiple goals
    
    bootstrap.Modal.getInstance(document.getElementById('goalModal')).hide();
    e.target.reset();
    document.getElementById('goalImagePreview').innerHTML = '';
    showSuccessModal('Meta adicionada com sucesso! 🎉');
}

function updateGoalsDisplay() {
    const container = document.getElementById('goalsList');
    const goals = Object.entries(goalsData).map(([id, data]) => ({ id, ...data }));
    
    if (goals.length === 0) {
        container.innerHTML = '<p class="text-muted">Nenhuma meta criada ainda. Clique em "Adicionar Meta" para começar! 🎯</p>';
        return;
    }
    
    const contributions = Object.values(contributionsData);
    const total = contributions.reduce((sum, c) => sum + c.amount, 0);
    
    container.innerHTML = goals.map(goal => {
        const percentage = Math.min(100, (total / goal.amount) * 100);
        const remaining = Math.max(0, goal.amount - total);
        const isCompleted = total >= goal.amount;
        
        const imageHtml = goal.image ? `
            <img src="${goal.image}" class="goal-card-image mb-3" alt="${goal.name}">
        ` : '';
        
        return `
            <div class="goal-item ${isCompleted ? 'completed' : ''}" style="cursor: pointer;" onclick="showGoalDetailsModal('${goal.id}')">
                ${imageHtml}
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h5 class="mb-0">${goal.name}</h5>
                    <div class="d-flex align-items-center gap-2">
                        <span class="badge bg-primary">${formatCurrency(goal.amount)}</span>
                        <button class="btn btn-sm btn-outline-danger delete-goal-btn" data-id="${goal.id}" title="Deletar meta" onclick="event.stopPropagation()">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="progress mb-2" style="height: 25px;">
                    <div class="progress-bar ${isCompleted ? 'bg-success' : ''}" style="width: ${percentage}%">
                        ${percentage.toFixed(1)}%
                    </div>
                </div>
                <div class="d-flex justify-content-between">
                    <small class="text-muted">Acumulado: ${formatCurrency(total)}</small>
                    <small class="text-muted">Falta: ${formatCurrency(remaining)}</small>
                </div>
            </div>
        `;
    }).join('');
}

// Image Upload Handlers
async function handleGoalImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const preview = document.getElementById('goalImagePreview');
        const base64 = await fileToBase64(file);
        preview.innerHTML = `
            <img src="${base64}" alt="Preview" class="image-preview">
        `;
    }
}

async function handleSubmetaImagePreview(e) {
    const file = e.target.files[0];
    if (file) {
        const preview = document.getElementById('submetaImagePreview');
        const base64 = await fileToBase64(file);
        preview.innerHTML = `
            <img src="${base64}" alt="Preview" class="image-preview">
        `;
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Contributions Management
async function handleContributionSubmit(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('contributionAmount').value);
    const date = document.getElementById('contributionDate').value;
    
    const contribution = {
        amount,
        date,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        timestamp: Date.now()
    };
    
    await push(ref(db, 'contributions'), contribution);
    
    bootstrap.Modal.getInstance(document.getElementById('contributionModal')).hide();
    e.target.reset();
    setDefaultDate();
    
    createCoinAnimation();
    showSuccessModal('Contribuição adicionada com sucesso! 💰');
}

// Display Updates
function updateAllDisplays() {
    console.log('Updating all displays...', { contributionsData, goalsData });
    updateProgressDisplay();
    updateHistoryDisplay();
    updateChart();
    updateSubmetasDisplay();
    updateLevelSystem();
    updateAdvancedMetrics();
}

function updateProgressDisplay() {
    const contributions = Object.values(contributionsData);
    const total = contributions.reduce((sum, c) => sum + c.amount, 0);
    const goals = Object.values(goalsData);
    const totalGoalAmount = goals.reduce((sum, g) => sum + g.amount, 0);
    const remaining = Math.max(0, totalGoalAmount - total);
    const percentage = totalGoalAmount > 0 ? Math.min(100, (total / totalGoalAmount) * 100) : 0;
    
    document.getElementById('totalSaved').textContent = formatCurrency(total);
    document.getElementById('remaining').textContent = formatCurrency(remaining);
    document.getElementById('totalContributions').textContent = contributions.length;
    document.getElementById('progressBar').style.width = percentage + '%';
    document.getElementById('progressBar').textContent = percentage.toFixed(1) + '%';
    document.getElementById('progressFill').style.height = percentage + '%';
    
    // Progress message
    let message = 'Continue economizando!';
    if (percentage >= 100) {
        message = '🎉 Parabéns! Todas as metas atingidas!';
    } else if (percentage >= 75) {
        message = '🔥 Quase lá! Falta pouco!';
    } else if (percentage >= 50) {
        message = '💪 Metade do caminho! Continue assim!';
    } else if (percentage >= 25) {
        message = '🌟 Bom progresso! Não desista!';
    }
    document.getElementById('progressMessage').textContent = message;
    
    // Celebration when goal is reached
    const piggyBank = document.getElementById('piggyBank');
    if (percentage >= 100 && totalGoalAmount > 0) {
        piggyBank.textContent = '🎉';
        document.querySelector('.piggy-bank-container').classList.add('celebration-mode');
    } else {
        piggyBank.textContent = '🐷';
        document.querySelector('.piggy-bank-container')?.classList.remove('celebration-mode');
    }
    
    updateForecast(contributions, total, totalGoalAmount);
    updateMyBalance();
    updateIndividualDashboard();
    updateContributorsDisplay();
}

function updateContributorsDisplay() {
    const container = document.getElementById('contributorsDisplay');
    if (!container) return;
    
    const contributions = Object.values(contributionsData);
    
    // Group by user
    const userStats = {};
    contributions.forEach(c => {
        if (!userStats[c.userId]) {
            userStats[c.userId] = {
                email: c.userEmail,
                total: 0,
                count: 0
            };
        }
        userStats[c.userId].total += c.amount;
        userStats[c.userId].count++;
    });
    
    if (Object.keys(userStats).length === 0) {
        container.innerHTML = '<p class="text-muted">Nenhuma contribuição ainda</p>';
        return;
    }
    
    container.innerHTML = Object.entries(userStats).map(([userId, stats]) => {
        const userName = stats.email.split('@')[0];
        const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=6366f1&color=fff&size=80&bold=true`;
        const avg = stats.total / stats.count;
        
        return `
            <div class="contributor-card">
                <img src="${avatar}" alt="${userName}" class="contributor-avatar">
                <div class="contributor-name">${userName}</div>
                <div class="contributor-stats">
                    <span class="contributor-stat">${stats.count} contribuições</span>
                    <span class="contributor-stat">Média: ${formatCurrency(avg)}</span>
                </div>
                <div class="contributor-amount">${formatCurrency(stats.total)}</div>
            </div>
        `;
    }).join('');
}

function updateForecast(contributions, total, goalAmount) {
    if (contributions.length < 2 || total >= goalAmount) {
        document.getElementById('forecast').textContent = total >= goalAmount ? '🎉 Meta atingida!' : 'Aguardando mais dados';
        return;
    }
    
    const sortedContributions = contributions.sort((a, b) => a.timestamp - b.timestamp);
    const firstDate = new Date(sortedContributions[0].timestamp);
    const lastDate = new Date(sortedContributions[sortedContributions.length - 1].timestamp);
    const daysDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 0) {
        const avgPerDay = total / daysDiff;
        const remaining = goalAmount - total;
        const daysToGoal = remaining / avgPerDay;
        const forecastDate = new Date();
        forecastDate.setDate(forecastDate.getDate() + daysToGoal);
        
        document.getElementById('forecast').textContent = forecastDate.toLocaleDateString('pt-BR');
    }
}

function updateMyBalance() {
    const myContributions = Object.values(contributionsData).filter(c => c.userId === currentUser.uid);
    const myTotal = myContributions.reduce((sum, c) => sum + c.amount, 0);
    document.getElementById('myBalance').textContent = formatCurrency(myTotal);
}

function updateIndividualDashboard() {
    const myContributions = Object.values(contributionsData).filter(c => c.userId === currentUser.uid);
    const allContributions = Object.values(contributionsData);
    
    const myTotal = myContributions.reduce((sum, c) => sum + c.amount, 0);
    const totalAll = allContributions.reduce((sum, c) => sum + c.amount, 0);
    const myAvg = myContributions.length > 0 ? myTotal / myContributions.length : 0;
    const participation = totalAll > 0 ? (myTotal / totalAll) * 100 : 0;
    
    document.getElementById('myBalance').textContent = formatCurrency(myTotal);
    document.getElementById('myContributionsCount').textContent = myContributions.length;
    document.getElementById('myAverage').textContent = formatCurrency(myAvg);
    document.getElementById('myParticipation').textContent = participation.toFixed(1) + '%';
}

function updateHistoryDisplay() {
    const contributions = Object.entries(contributionsData)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.timestamp - a.timestamp);
    
    const myContributions = contributions.filter(c => c.userId === currentUser.uid);
    
    document.getElementById('combinedHistory').innerHTML = contributions.length > 0
        ? contributions.map(c => createHistoryItem(c)).join('')
        : '<p class="text-muted">Nenhuma contribuição ainda</p>';
    
    document.getElementById('myHistory').innerHTML = myContributions.length > 0
        ? myContributions.map(c => createHistoryItem(c)).join('')
        : '<p class="text-muted">Você ainda não fez contribuições</p>';
}

function createHistoryItem(contribution) {
    const date = new Date(contribution.date).toLocaleDateString('pt-BR');
    const userName = contribution.userEmail.split('@')[0];
    return `
        <div class="history-item">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <span><strong>${date}</strong> - ${userName}</span>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <span class="text-success fw-bold">${formatCurrency(contribution.amount)}</span>
                    <button class="btn btn-sm btn-outline-danger delete-contribution-btn" data-id="${contribution.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function updateChart() {
    const userContributions = {};
    
    Object.values(contributionsData).forEach(c => {
        const userName = c.userEmail.split('@')[0];
        userContributions[userName] = (userContributions[userName] || 0) + c.amount;
    });
    
    const ctx = document.getElementById('contributionsChart');
    
    if (chart) {
        chart.destroy();
    }
    
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(userContributions),
            datasets: [{
                label: 'Contribuições (R$)',
                data: Object.values(userContributions),
                backgroundColor: ['#667eea', '#764ba2'],
                borderRadius: 10
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// Utilities
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.classList.remove('d-none');
    setTimeout(() => errorElement.classList.add('d-none'), 3000);
}


// Theme Toggle
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    const themeToggle = document.getElementById('themeToggle');
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update icon
    const icon = themeToggle.querySelector('i');
    if (newTheme === 'dark') {
        icon.className = 'bi bi-sun-fill';
    } else {
        icon.className = 'bi bi-moon-fill';
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const themeToggle = document.getElementById('themeToggle');
    const icon = themeToggle.querySelector('i');
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    if (savedTheme === 'dark') {
        icon.className = 'bi bi-sun-fill';
    } else {
        icon.className = 'bi bi-moon-fill';
    }
}

// Motivational Messages
function updateMotivationalMessage() {
    const messageElement = document.getElementById('motivationalMessage');
    if (messageElement) {
        const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
        messageElement.innerHTML = `<p class="mb-0">${randomMessage}</p>`;
    }
}

// Submetas Management
async function handleSubmetaSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('submetaName').value;
    const amount = parseFloat(document.getElementById('submetaAmount').value);
    const reward = document.getElementById('submetaReward').value;
    const imageFile = document.getElementById('submetaImage').files[0];
    
    let image = null;
    
    // If user uploaded a file, convert to base64
    if (imageFile) {
        image = await fileToBase64(imageFile);
    }
    
    const submeta = {
        name,
        amount,
        reward,
        image,
        completed: false,
        timestamp: Date.now()
    };
    
    await push(ref(db, 'submetas'), submeta);
    
    bootstrap.Modal.getInstance(document.getElementById('submetaModal')).hide();
    e.target.reset();
    document.getElementById('submetaImagePreview').innerHTML = '';
    showSuccessModal('Submeta adicionada com sucesso! 🎯');
}

function updateSubmetasDisplay() {
    const container = document.getElementById('submetasList');
    const submetas = Object.entries(submetasData).map(([id, data]) => ({ id, ...data }));
    const contributions = Object.values(contributionsData);
    const total = contributions.reduce((sum, c) => sum + c.amount, 0);
    
    if (submetas.length === 0) {
        container.innerHTML = '<p class="text-muted">Nenhuma submeta criada ainda</p>';
        return;
    }
    
    container.innerHTML = submetas.map(submeta => {
        const percentage = Math.min(100, (total / submeta.amount) * 100);
        const isCompleted = total >= submeta.amount;
        
        // Check if submeta was just completed
        if (isCompleted && !submeta.completed) {
            unlockReward(submeta);
        }
        
        const imageHtml = submeta.image ? `
            <img src="${submeta.image}" class="submeta-image mb-2" alt="${submeta.name}">
        ` : '';
        
        return `
            <div class="submeta-item ${isCompleted ? 'completed' : ''}" style="cursor: pointer;" onclick="showSubmetaDetailsModal('${submeta.id}')">
                ${imageHtml}
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <strong>${submeta.name}</strong>
                    <div class="d-flex align-items-center gap-2">
                        <span class="badge bg-primary">${formatCurrency(submeta.amount)}</span>
                        <button class="btn btn-sm btn-outline-danger delete-submeta-btn" data-id="${submeta.id}" title="Deletar submeta" onclick="event.stopPropagation()">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="progress mb-2" style="height: 20px;">
                    <div class="progress-bar ${isCompleted ? 'bg-success' : ''}" style="width: ${percentage}%">
                        ${percentage.toFixed(0)}%
                    </div>
                </div>
                <small class="text-muted">🎁 Recompensa: ${submeta.reward}</small>
            </div>
        `;
    }).join('');
}

async function unlockReward(submeta) {
    const rewardRef = ref(db, 'rewards');
    const snapshot = await get(rewardRef);
    const rewards = snapshot.val() || [];
    
    // Check if reward already exists
    if (!rewards.find(r => r.submetaName === submeta.name)) {
        const newReward = {
            submetaName: submeta.name,
            reward: submeta.reward,
            unlockedAt: Date.now()
        };
        
        // Only add image if it exists
        if (submeta.image) {
            newReward.image = submeta.image;
        }
        
        await set(rewardRef, [...rewards, newReward]);
        
        // Update submeta as completed
        const submetaId = Object.keys(submetasData).find(
            key => submetasData[key].name === submeta.name
        );
        if (submetaId) {
            await set(ref(db, `submetas/${submetaId}/completed`), true);
        }
        
        showCelebration(`🎉 Parabéns! Vocês conquistaram: ${submeta.reward}! 🏆`);
        createConfetti();
    }
}

function updateRewardsDisplay() {
    const container = document.getElementById('rewardsList');
    
    if (!rewardsData || rewardsData.length === 0) {
        container.innerHTML = '<p class="text-muted">Nenhuma recompensa conquistada ainda. Continue economizando! 💪</p>';
        return;
    }
    
    container.innerHTML = rewardsData.map(reward => {
        const imageHtml = reward.image ? `
            <img src="${reward.image}" class="reward-image mb-2" alt="${reward.reward}">
        ` : '';
        
        return `
            <div class="reward-badge">
                ${imageHtml}
                <div>
                    🏆 ${reward.reward}
                    <small class="d-block" style="font-size: 0.8em;">
                        ${new Date(reward.unlockedAt).toLocaleDateString('pt-BR')}
                    </small>
                </div>
            </div>
        `;
    }).join('');
}

// Celebration Effects
function showCelebration(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3';
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function createConfetti() {
    const colors = ['#ff6b9d', '#c44569', '#26de81', '#fed330', '#667eea'];
    
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 2 + 's';
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 3000);
        }, i * 30);
    }
}

// Coin Animation on Contribution
function createCoinAnimation() {
    const piggyContainer = document.querySelector('.piggy-bank-container');
    if (!piggyContainer) return;
    
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const coin = document.createElement('div');
            coin.className = 'coins-animation';
            coin.textContent = '🪙';
            coin.style.left = (Math.random() * 80 + 10) + '%';
            piggyContainer.appendChild(coin);
            
            setTimeout(() => coin.remove(), 2000);
        }, i * 200);
    }
}


// Profile Management
function getDefaultAvatar(email) {
    // Generate a default avatar using UI Avatars
    const name = email.split('@')[0];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=150&bold=true`;
}

async function handleAvatarPreview(e) {
    const file = e.target.files[0];
    if (file) {
        const base64 = await fileToBase64(file);
        document.getElementById('profileAvatarPreview').src = base64;
    }
}

// Level System
const LEVELS = [
    { level: 1, title: 'Iniciante', badge: '🥉', contributions: 0 },
    { level: 2, title: 'Poupador', badge: '🥈', contributions: 5 },
    { level: 3, title: 'Economista', badge: '🥇', contributions: 15 },
    { level: 4, title: 'Investidor', badge: '💎', contributions: 30 },
    { level: 5, title: 'Milionário', badge: '👑', contributions: 50 }
];

function updateLevelSystem() {
    const contributions = Object.values(contributionsData);
    const totalContributions = contributions.length;
    
    let currentLevel = LEVELS[0];
    let nextLevel = LEVELS[1];
    
    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (totalContributions >= LEVELS[i].contributions) {
            currentLevel = LEVELS[i];
            nextLevel = LEVELS[i + 1] || LEVELS[i];
            break;
        }
    }
    
    const progress = nextLevel.contributions > 0 
        ? ((totalContributions - currentLevel.contributions) / (nextLevel.contributions - currentLevel.contributions)) * 100
        : 100;
    
    document.getElementById('userLevel').textContent = currentLevel.level;
    document.getElementById('levelTitle').textContent = currentLevel.title;
    document.getElementById('levelBadge').textContent = currentLevel.badge;
    document.getElementById('levelProgress').style.width = Math.min(progress, 100) + '%';
    document.getElementById('levelProgressText').textContent = Math.min(progress, 100).toFixed(0) + '%';
    document.getElementById('currentContributions').textContent = totalContributions;
    document.getElementById('nextLevelContributions').textContent = nextLevel.contributions;
}

// Advanced Metrics
function updateAdvancedMetrics() {
    const contributions = Object.values(contributionsData);
    
    if (contributions.length === 0) {
        document.getElementById('avgContribution').textContent = 'R$ 0,00';
        document.getElementById('frequency').textContent = '-';
        document.getElementById('savingSpeed').textContent = '-';
        return;
    }
    
    // Average contribution
    const total = contributions.reduce((sum, c) => sum + c.amount, 0);
    const avg = total / contributions.length;
    document.getElementById('avgContribution').textContent = formatCurrency(avg);
    
    // Frequency
    if (contributions.length >= 2) {
        const sorted = contributions.sort((a, b) => a.timestamp - b.timestamp);
        const firstDate = new Date(sorted[0].timestamp);
        const lastDate = new Date(sorted[sorted.length - 1].timestamp);
        const daysDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
        const frequency = daysDiff > 0 ? (contributions.length / daysDiff).toFixed(1) : contributions.length;
        document.getElementById('frequency').textContent = `${frequency} por dia`;
    } else {
        document.getElementById('frequency').textContent = '1 contribuição';
    }
    
    // Saving speed
    const goals = Object.values(goalsData);
    const totalGoalAmount = goals.reduce((sum, g) => sum + g.amount, 0);
    if (totalGoalAmount > 0) {
        const percentage = (total / totalGoalAmount) * 100;
        document.getElementById('savingSpeed').textContent = `${percentage.toFixed(1)}% da meta`;
    } else {
        document.getElementById('savingSpeed').textContent = '-';
    }
}

// Delete Contribution
async function deleteContribution(contributionId) {
    showConfirmModal(
        'Deletar Contribuição',
        'Tem certeza que deseja deletar esta contribuição?',
        async () => {
            await set(ref(db, `contributions/${contributionId}`), null);
            showSuccessModal('Contribuição deletada com sucesso!');
        }
    );
}

// Delete Submeta
async function deleteSubmeta(submetaId) {
    showConfirmModal(
        'Deletar Submeta',
        'Tem certeza que deseja deletar esta submeta?',
        async () => {
            await set(ref(db, `submetas/${submetaId}`), null);
            showSuccessModal('Submeta deletada com sucesso!');
        }
    );
}

// Delete Goal
async function deleteGoal(goalId) {
    showConfirmModal(
        'Deletar Meta',
        'Tem certeza que deseja deletar esta meta?',
        async () => {
            await set(ref(db, `goals/${goalId}`), null);
            showSuccessModal('Meta deletada com sucesso!');
        }
    );
}

// Clear All History
async function clearAllHistory() {
    showConfirmModal(
        'Limpar Histórico',
        '⚠️ ATENÇÃO: Isso vai deletar TODAS as contribuições! Esta ação não pode ser desfeita.',
        async () => {
            await set(ref(db, 'contributions'), null);
            showSuccessModal('Histórico limpo com sucesso!');
        },
        true // danger mode
    );
}

// Clear All Data (Reset App)
async function clearAllData() {
    showConfirmModal(
        'Resetar Aplicação',
        '⚠️ PERIGO: Isso vai deletar TUDO (metas, contribuições, submetas, recompensas)! Esta ação não pode ser desfeita.',
        async () => {
            // Clear new structure
            await set(ref(db, 'goals'), null);
            await set(ref(db, 'contributions'), null);
            await set(ref(db, 'submetas'), null);
            await set(ref(db, 'rewards'), null);
            
            // Clear old structure (if exists)
            await set(ref(db, 'goal'), null);
            
            showSuccessModal('Aplicação resetada com sucesso! Recarregue a página.');
            
            // Reload after 2 seconds
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        },
        true // danger mode
    );
}

// Background Management
async function handleProfileSubmit(e) {
    e.preventDefault();
    
    const username = document.getElementById('profileUsername').value;
    const avatarFile = document.getElementById('profileAvatarInput').files[0];
    const backgroundFile = document.getElementById('backgroundImageInput').files[0];
    const backgroundUrl = document.getElementById('backgroundImageUrl').value;
    const backgroundOpacity = document.getElementById('backgroundOpacity').value;
    
    let avatar = document.getElementById('profileAvatarPreview').src;
    let background = null;
    
    // If new avatar was uploaded
    if (avatarFile) {
        avatar = await fileToBase64(avatarFile);
    }
    
    // If background was uploaded
    if (backgroundFile) {
        background = await fileToBase64(backgroundFile);
    } else if (backgroundUrl) {
        background = backgroundUrl;
    }
    
    const profile = {
        username,
        avatar,
        background,
        backgroundOpacity,
        updatedAt: Date.now()
    };
    
    await set(ref(db, `users/${currentUser.uid}/profile`), profile);
    
    // Update UI
    document.getElementById('userName').textContent = username;
    document.getElementById('userAvatar').src = avatar;
    applyBackground(background, backgroundOpacity);
    
    bootstrap.Modal.getInstance(document.getElementById('profileModal')).hide();
    showSuccessModal('Perfil atualizado com sucesso! ✨');
}

function applyBackground(imageUrl, opacity) {
    let bgElement = document.querySelector('.app-background');
    
    if (!bgElement) {
        bgElement = document.createElement('div');
        bgElement.className = 'app-background';
        document.body.insertBefore(bgElement, document.body.firstChild);
    }
    
    if (imageUrl) {
        bgElement.style.backgroundImage = `url(${imageUrl})`;
        bgElement.style.opacity = opacity / 100;
    } else {
        bgElement.style.backgroundImage = 'none';
        bgElement.style.opacity = 0;
    }
}

async function loadUserProfile() {
    const profileRef = ref(db, `users/${currentUser.uid}/profile`);
    const snapshot = await get(profileRef);
    const profile = snapshot.val();
    
    if (profile) {
        // Update navbar
        document.getElementById('userName').textContent = profile.username || currentUser.email.split('@')[0];
        
        const avatarUrl = profile.avatar || getDefaultAvatar(currentUser.email);
        document.getElementById('userAvatar').src = avatarUrl;
        
        // Update profile modal
        document.getElementById('profileUsername').value = profile.username || currentUser.email.split('@')[0];
        document.getElementById('profileEmail').value = currentUser.email;
        document.getElementById('profileAvatarPreview').src = avatarUrl;
        
        // Apply background
        if (profile.background) {
            applyBackground(profile.background, profile.backgroundOpacity || 20);
            document.getElementById('backgroundOpacity').value = profile.backgroundOpacity || 20;
            document.getElementById('opacityValue').textContent = profile.backgroundOpacity || 20;
        }
    } else {
        // Set defaults
        const defaultUsername = currentUser.email.split('@')[0];
        const defaultAvatar = getDefaultAvatar(currentUser.email);
        
        document.getElementById('userName').textContent = defaultUsername;
        document.getElementById('userAvatar').src = defaultAvatar;
        document.getElementById('profileUsername').value = defaultUsername;
        document.getElementById('profileEmail').value = currentUser.email;
        document.getElementById('profileAvatarPreview').src = defaultAvatar;
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Opacity slider
    const opacitySlider = document.getElementById('backgroundOpacity');
    if (opacitySlider) {
        opacitySlider.addEventListener('input', (e) => {
            document.getElementById('opacityValue').textContent = e.target.value;
        });
    }
    
    // Background preview
    const bgInput = document.getElementById('backgroundImageInput');
    if (bgInput) {
        bgInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const base64 = await fileToBase64(file);
                document.getElementById('backgroundPreview').innerHTML = `
                    <img src="${base64}" alt="Preview">
                `;
            }
        });
    }
    
    // Background URL preview
    const bgUrlInput = document.getElementById('backgroundImageUrl');
    if (bgUrlInput) {
        bgUrlInput.addEventListener('input', (e) => {
            const url = e.target.value;
            if (url) {
                document.getElementById('backgroundPreview').innerHTML = `
                    <img src="${url}" alt="Preview" onerror="this.style.display='none'">
                `;
            } else {
                document.getElementById('backgroundPreview').innerHTML = '';
            }
        });
    }
    
    // Remove background
    const removeBgBtn = document.getElementById('removeBackgroundBtn');
    if (removeBgBtn) {
        removeBgBtn.addEventListener('click', async () => {
            const profileRef = ref(db, `users/${currentUser.uid}/profile`);
            const snapshot = await get(profileRef);
            const profile = snapshot.val() || {};
            
            profile.background = null;
            await set(profileRef, profile);
            
            applyBackground(null, 0);
            document.getElementById('backgroundImageInput').value = '';
            document.getElementById('backgroundImageUrl').value = '';
            document.getElementById('backgroundPreview').innerHTML = '';
            showSuccessModal('Fundo removido com sucesso!');
        });
    }
    
    // Clear history button
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearAllHistory);
    }
    
    // Delete contribution buttons (delegated event)
    document.addEventListener('click', (e) => {
        if (e.target.closest('.delete-contribution-btn')) {
            const btn = e.target.closest('.delete-contribution-btn');
            const contributionId = btn.dataset.id;
            deleteContribution(contributionId);
        }
        
        // Delete submeta buttons
        if (e.target.closest('.delete-submeta-btn')) {
            const btn = e.target.closest('.delete-submeta-btn');
            const submetaId = btn.dataset.id;
            deleteSubmeta(submetaId);
        }
        
        // Delete goal buttons
        if (e.target.closest('.delete-goal-btn')) {
            const btn = e.target.closest('.delete-goal-btn');
            const goalId = btn.dataset.id;
            deleteGoal(goalId);
        }
    });
});

// Goal Details Modal
function showGoalDetailsModal(goalId) {
    const goal = goalsData[goalId];
    if (!goal) {
        showErrorModal('Meta não encontrada!');
        return;
    }
    
    const contributions = Object.values(contributionsData);
    const total = contributions.reduce((sum, c) => sum + c.amount, 0);
    const remaining = Math.max(0, goal.amount - total);
    const percentage = goal.amount > 0 ? Math.min(100, (total / goal.amount) * 100) : 0;
    
    document.getElementById('goalDetailsTitle').textContent = goal.name;
    document.getElementById('goalDetailsAmount').textContent = formatCurrency(goal.amount);
    document.getElementById('goalDetailsSaved').textContent = formatCurrency(total);
    document.getElementById('goalDetailsRemaining').textContent = formatCurrency(remaining);
    document.getElementById('goalDetailsProgress').textContent = percentage.toFixed(1) + '%';
    document.getElementById('goalDetailsProgressBar').style.width = percentage + '%';
    document.getElementById('goalDetailsProgressText').textContent = percentage.toFixed(1) + '%';
    
    if (goal.image) {
        document.getElementById('goalDetailsImage').innerHTML = `
            <img src="${goal.image}" alt="${goal.name}">
        `;
    } else {
        document.getElementById('goalDetailsImage').innerHTML = '';
    }
    
    const modal = new bootstrap.Modal(document.getElementById('goalDetailsModal'));
    modal.show();
}

// Submeta Details Modal
function showSubmetaDetailsModal(submetaId) {
    const submeta = submetasData[submetaId];
    if (!submeta) return;
    
    const contributions = Object.values(contributionsData);
    const total = contributions.reduce((sum, c) => sum + c.amount, 0);
    const remaining = Math.max(0, submeta.amount - total);
    const percentage = Math.min(100, (total / submeta.amount) * 100);
    const isCompleted = total >= submeta.amount;
    
    document.getElementById('submetaDetailsTitle').textContent = submeta.name;
    document.getElementById('submetaDetailsAmount').textContent = formatCurrency(submeta.amount);
    document.getElementById('submetaDetailsSaved').textContent = formatCurrency(total);
    document.getElementById('submetaDetailsRemaining').textContent = formatCurrency(remaining);
    document.getElementById('submetaDetailsReward').textContent = submeta.reward;
    document.getElementById('submetaDetailsProgressBar').style.width = percentage + '%';
    document.getElementById('submetaDetailsProgressText').textContent = percentage.toFixed(1) + '%';
    
    if (submeta.image) {
        document.getElementById('submetaDetailsImage').innerHTML = `
            <img src="${submeta.image}" alt="${submeta.name}">
        `;
    } else {
        document.getElementById('submetaDetailsImage').innerHTML = '';
    }
    
    if (isCompleted) {
        document.getElementById('submetaCompletedBadge').classList.remove('d-none');
        document.getElementById('submetaDetailsProgressBar').classList.add('bg-success');
    } else {
        document.getElementById('submetaCompletedBadge').classList.add('d-none');
        document.getElementById('submetaDetailsProgressBar').classList.remove('bg-success');
    }
    
    const modal = new bootstrap.Modal(document.getElementById('submetaDetailsModal'));
    modal.show();
}

// Modal Utilities
function showConfirmModal(title, message, onConfirm, isDanger = false) {
    const modalId = 'confirmModal' + Date.now();
    const modalHtml = `
        <div class="modal fade" id="${modalId}" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header ${isDanger ? 'bg-danger text-white' : ''}">
                        <h5 class="modal-title">
                            <i class="bi bi-${isDanger ? 'exclamation-triangle' : 'question-circle'} me-2"></i>${title}
                        </h5>
                        <button type="button" class="btn-close ${isDanger ? 'btn-close-white' : ''}" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p class="mb-0">${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle me-1"></i>Cancelar
                        </button>
                        <button type="button" class="btn btn-${isDanger ? 'danger' : 'primary'}" id="confirmBtn${modalId}">
                            <i class="bi bi-check-circle me-1"></i>Confirmar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalElement = document.getElementById(modalId);
    const modal = new bootstrap.Modal(modalElement);
    
    document.getElementById('confirmBtn' + modalId).addEventListener('click', async () => {
        modal.hide();
        if (onConfirm) await onConfirm();
        setTimeout(() => modalElement.remove(), 300);
    });
    
    modalElement.addEventListener('hidden.bs.modal', () => {
        setTimeout(() => modalElement.remove(), 300);
    });
    
    modal.show();
}

function showSuccessModal(message) {
    const modalId = 'successModal' + Date.now();
    const modalHtml = `
        <div class="modal fade" id="${modalId}" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-success text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-check-circle me-2"></i>Sucesso!
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p class="mb-0">${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-success" data-bs-dismiss="modal">
                            <i class="bi bi-check me-1"></i>OK
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalElement = document.getElementById(modalId);
    const modal = new bootstrap.Modal(modalElement);
    
    modalElement.addEventListener('hidden.bs.modal', () => {
        setTimeout(() => modalElement.remove(), 300);
    });
    
    modal.show();
    
    // Auto close after 2 seconds
    setTimeout(() => {
        modal.hide();
    }, 2000);
}

function showErrorModal(message) {
    const modalId = 'errorModal' + Date.now();
    const modalHtml = `
        <div class="modal fade" id="${modalId}" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-x-circle me-2"></i>Erro!
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p class="mb-0">${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-danger" data-bs-dismiss="modal">
                            <i class="bi bi-x me-1"></i>Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalElement = document.getElementById(modalId);
    const modal = new bootstrap.Modal(modalElement);
    
    modalElement.addEventListener('hidden.bs.modal', () => {
        setTimeout(() => modalElement.remove(), 300);
    });
    
    modal.show();
}
