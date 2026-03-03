/* ========================================== */
/* 1. KONFIGURASI & KONSTANTA                 */
/* ========================================== */
const DB_KEY = 'kemangi_data_hari';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD_HASH = '986d82f8267a13456b7fe17c9153383030ea65b4f1a419936346cdfe8e89538c'; // Hash dari 'admin123'
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 60000; // 60 detik

let loginAttempts = parseInt(localStorage.getItem('loginAttempts')) || 0;
let lockoutEndTime = parseInt(localStorage.getItem('lockoutEndTime')) || 0;
let timerInterval = null;

// Struktur Data: { days: 0, lastUpdate: 0, isRunning: false }
function getStoredData() {
    const data = localStorage.getItem(DB_KEY);
    if (!data) {
        return { days: 0, lastUpdate: Date.now(), isRunning: false };
    }
    return JSON.parse(data);
}

function saveStoredData(data) {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
}

/* ========================================== */
/* 2. FUNGSI NOTIFIKASI TOAST                */
/* ========================================== */
function showNotification(message, isError = false) {
    const notif = document.getElementById('notification');
    const msgSpan = document.getElementById('notification-message');
    
    if (!notif) return;
    
    msgSpan.innerText = message;
    notif.className = 'notification show';
    
    if (isError) {
        notif.classList.add('error');
    } else {
        notif.classList.remove('error');
    }

    setTimeout(() => {
        notif.className = 'notification';
    }, 3000);
}

/* ========================================== */
/* 3. FUNGSI KEAMANAN (HASHING & LOCKOUT)    */
/* ========================================== */
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

function isLockedOut() {
    const now = Date.now();
    if (lockoutEndTime > now) {
        return Math.ceil((lockoutEndTime - now) / 1000);
    }
    return 0;
}

function handleFailedAttempt() {
    loginAttempts++;
    localStorage.setItem('loginAttempts', loginAttempts);
    
    if (loginAttempts >= MAX_ATTEMPTS) {
        lockoutEndTime = Date.now() + LOCKOUT_TIME;
        localStorage.setItem('lockoutEndTime', lockoutEndTime);
        loginAttempts = 0;
        localStorage.setItem('loginAttempts', 0);
        return true;
    }
    return false;
}

function resetLoginAttempts() {
    loginAttempts = 0;
    lockoutEndTime = 0;
    localStorage.setItem('loginAttempts', 0);
    localStorage.setItem('lockoutEndTime', 0);
}

/* ========================================== */
/* 4. FUNGSI UNTUK HALAMAN UTAMA (INDEX)     */
/* ========================================== */
function updateIndexDisplay() {
    const data = getStoredData();
    const totalDaysEl = document.getElementById('total-days');
    
    if (totalDaysEl) {
        totalDaysEl.innerText = `${data.days} Hari`;
    }
}

/* ========================================== */
/* 5. FUNGSI TIMER & LOGIKA HARI             */
/* ========================================== */
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        const data = getStoredData();
        if (!data.isRunning) return;

        const now = Date.now();
        const diff = now - data.lastUpdate;
        const oneDay = 24 * 60 * 60 * 1000;

        if (diff >= oneDay) {
            data.days++;
            data.lastUpdate = now;
            saveStoredData(data);
            updateIndexDisplay();
            updateAdminDisplay();
            showNotification(`Hari ke-${data.days} dimulai!`, false);
        }
    }, 1000); // Cek setiap 1 detik
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateAdminDisplay() {
    const data = getStoredData();
    const displayEl = document.getElementById('current-day-display');
    if (displayEl) {
        displayEl.innerText = data.days;
    }
}

/* ========================================== */
/* 6. FUNGSI UNTUK HALAMAN ADMIN             */
/* ========================================== */
function setupLogin() {
    const form = document.getElementById('form-login');
    const errorMsg = document.getElementById('login-error');
    const loginPage = document.getElementById('login-page');
    const adminPage = document.getElementById('admin-page');

    if (!form) return;

    // Cek sesi login
    if (sessionStorage.getItem('isLogin') === 'true') {
        loginPage.style.display = 'none';
        adminPage.style.display = 'flex';
        updateAdminDisplay();
        const data = getStoredData();
        if (data.isRunning) startTimer();
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const lockStatus = isLockedOut();
        if (lockStatus > 0) {
            showNotification(`Terlalu banyak percobaan! Coba lagi dalam ${lockStatus} detik.`, true);
            return;
        }

        const user = document.getElementById('username').value.trim();
        const pass = document.getElementById('password').value;

        if (!user || !pass) {
            showNotification('Username dan Password harus diisi!', true);
            return;
        }

        // --- VALIDASI USERNAME ---
        if (user !== ADMIN_USERNAME) {
            errorMsg.style.display = 'block';
            errorMsg.innerText = 'Username salah!';
            handleFailedAttempt();
            showNotification('Username salah!', true);
            return;
        }

        // --- VALIDASI PASSWORD (HASHING) ---
        const inputHash = await sha256(pass);

        if (inputHash === ADMIN_PASSWORD_HASH) {
            // Login Berhasil
            sessionStorage.setItem('isLogin', 'true');
            loginPage.style.display = 'none';
            adminPage.style.display = 'flex';
            errorMsg.style.display = 'none';
            resetLoginAttempts();
            updateAdminDisplay();
            const data = getStoredData();
            if (data.isRunning) startTimer();
            showNotification('Login berhasil! Selamat datang Admin.');
        } else {
            // Login Gagal
            errorMsg.style.display = 'block';
            errorMsg.innerText = 'Password salah!';
            
            const isNowLocked = handleFailedAttempt();
            
            if (isNowLocked) {
                showNotification('Terlalu banyak percobaan! Akun dikunci sementara.', true);
                errorMsg.innerText = `Terlalu banyak percobaan. Coba lagi dalam ${LOCKOUT_TIME/1000} detik.`;
            } else {
                const remaining = MAX_ATTEMPTS - loginAttempts;
                showNotification(`Password salah! Sisa percobaan: ${remaining}`, true);
            }
        }
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            stopTimer();
            sessionStorage.removeItem('isLogin');
            location.reload();
        });
    }
}

function setupAdminControls() {
    const btnStart = document.getElementById('btn-start');
    const btnPause = document.getElementById('btn-pause');
    const btnStop = document.getElementById('btn-stop');
    const btnPlus = document.getElementById('btn-plus');
    const btnMinus = document.getElementById('btn-minus');
    const btnReset = document.getElementById('reset-data-btn');

    if (!btnStart) return;

    // Tombol Mulai
    btnStart.addEventListener('click', () => {
        const data = getStoredData();
        data.isRunning = true;
        saveStoredData(data);
        startTimer();
        showNotification('Timer dimulai. Hari akan bertambah otomatis setiap 24 jam.');
    });

    // Tombol Jeda
    btnPause.addEventListener('click', () => {
        const data = getStoredData();
        data.isRunning = false;
        saveStoredData(data);
        stopTimer();
        showNotification('Timer dijeda.');
    });

    // Tombol Berhenti (Reset Hari ke 0)
    btnStop.addEventListener('click', () => {
        if(confirm('Apakah Anda yakin ingin mereset semua data ke 0 Hari?')) {
            const data = { days: 0, lastUpdate: Date.now(), isRunning: false };
            saveStoredData(data);
            stopTimer();
            updateAdminDisplay();
            updateIndexDisplay();
            showNotification('Data telah direset ke 0 Hari.');
        }
    });

    // Tombol Manual +
    btnPlus.addEventListener('click', () => {
        const data = getStoredData();
        data.days++;
        data.lastUpdate = Date.now();
        saveStoredData(data);
        updateAdminDisplay();
        updateIndexDisplay();
        showNotification('Hari ditambah manual.');
    });

    // Tombol Manual -
    btnMinus.addEventListener('click', () => {
        const data = getStoredData();
        if (data.days > 0) {
            data.days--;
            data.lastUpdate = Date.now();
            saveStoredData(data);
            updateAdminDisplay();
            updateIndexDisplay();
            showNotification('Hari dikurangi manual.');
        } else {
            showNotification('Hari tidak bisa kurang dari 0.', true);
        }
    });

    // Tombol Reset Data Total
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            if(confirm('Hapus semua data dan reset login?')) {
                localStorage.removeItem(DB_KEY);
                localStorage.removeItem('loginAttempts');
                localStorage.removeItem('lockoutEndTime');
                location.reload();
            }
        });
    }
}

/* ========================================== */
/* 7. INISIALISASI & ANIMASI SCROLL          */
/* ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    
    // Update tampilan index
    updateIndexDisplay();

    // Setup Login & Admin
    if (document.getElementById('login-page')) {
        setupLogin();
    }

    // Setup Kontrol Admin
    if (document.getElementById('admin-page')) {
        setupAdminControls();
    }

    /* --- Animasi Scroll --- */
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('scroll-visible');
                entry.target.classList.remove('scroll-hidden', 'scroll-left', 'scroll-right', 'scroll-bottom');
            }
        });
    }, observerOptions);

    const hiddenElements = document.querySelectorAll('.scroll-hidden');
    hiddenElements.forEach((el) => observer.observe(el));
});
