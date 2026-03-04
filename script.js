/* ========================================== */
/* 1. KONFIGURASI & KONSTANTA                 */ 
/* ========================================== */
const DB_KEY_KEMANGI = 'kemangi_data_hari';
const DB_KEY_KENCUR = 'kencur_data_hari';
const ADMIN_USERNAME = 'kelompok5';
const ADMIN_PASSWORD_HASH = 'b1c530c5145a00aa7fa42d3dd40f7d061ccc1843def19744ddf5d2e8af18774f'; // Hash dari 'admin123'
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 60000; // 60 detik

let loginAttempts = parseInt(localStorage.getItem('loginAttempts')) || 0;
let lockoutEndTime = parseInt(localStorage.getItem('lockoutEndTime')) || 0;
let timerInterval = null;

// Struktur Data: { days: 0, lastUpdate: 0, isRunning: false }
function getStoredData(key) {
    const data = localStorage.getItem(key);
    if (!data) {
        return { days: 0, lastUpdate: Date.now(), isRunning: false };
    }
    return JSON.parse(data);
}

function saveStoredData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
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
    // Update Kemangi
    const dataKemangi = getStoredData(DB_KEY_KEMANGI);
    const totalDaysEl = document.getElementById('total-days');
    if (totalDaysEl) {
        totalDaysEl.innerText = `${dataKemangi.days} Hari`;
    }

    // Update Kencur
    const dataKencur = getStoredData(DB_KEY_KENCUR);
    const totalDaysKencurEl = document.getElementById('total-days-kencur');
    if (totalDaysKencurEl) {
        totalDaysKencurEl.innerText = `${dataKencur.days} Hari`;
    }
}

/* ========================================== */
/* 5. FUNGSI TIMER & LOGIKA HARI             */
/* ========================================== */
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        // Cek Kemangi
        let dataKemangi = getStoredData(DB_KEY_KEMANGI);
        if (dataKemangi.isRunning) {
            const now = Date.now();
            const diff = now - dataKemangi.lastUpdate;
            const oneDay = 24 * 60 * 60 * 1000;

            if (diff >= oneDay) {
                dataKemangi.days++;
                dataKemangi.lastUpdate = now;
                saveStoredData(DB_KEY_KEMANGI, dataKemangi);
                updateIndexDisplay();
                updateAdminDisplay();
                showNotification(`Hari Kemangi ke-${dataKemangi.days} dimulai!`, false);
            }
        }

        // Cek Kencur
        let dataKencur = getStoredData(DB_KEY_KENCUR);
        if (dataKencur.isRunning) {
            const now = Date.now();
            const diff = now - dataKencur.lastUpdate;
            const oneDay = 24 * 60 * 60 * 1000;

            if (diff >= oneDay) {
                dataKencur.days++;
                dataKencur.lastUpdate = now;
                saveStoredData(DB_KEY_KENCUR, dataKencur);
                updateIndexDisplay();
                updateAdminDisplay();
                showNotification(`Hari Kencur ke-${dataKencur.days} dimulai!`, false);
            }
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
    // Update Kemangi
    const dataKemangi = getStoredData(DB_KEY_KEMANGI);
    const displayKemangi = document.getElementById('current-day-kemangi');
    if (displayKemangi) {
        displayKemangi.innerText = dataKemangi.days;
    }

    // Update Kencur
    const dataKencur = getStoredData(DB_KEY_KENCUR);
    const displayKencur = document.getElementById('current-day-kencur');
    if (displayKencur) {
        displayKencur.innerText = dataKencur.days;
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
        const dataKemangi = getStoredData(DB_KEY_KEMANGI);
        const dataKencur = getStoredData(DB_KEY_KENCUR);
        if (dataKemangi.isRunning || dataKencur.isRunning) startTimer();
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
            errorMsg.innerText = 'Username atau password salah!';
            handleFailedAttempt();
            showNotification('Username atau password salah!', true);
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
            const dataKemangi = getStoredData(DB_KEY_KEMANGI);
            const dataKencur = getStoredData(DB_KEY_KENCUR);
            if (dataKemangi.isRunning || dataKencur.isRunning) startTimer();
            showNotification('Login berhasil! Selamat datang Admin.');
        } else {
            // Login Gagal
            errorMsg.style.display = 'block';
            errorMsg.innerText = 'Password atau password salah!';
            
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
    // --- KEMANGI CONTROLS ---
    const btnStartKemangi = document.getElementById('btn-start-kemangi');
    const btnPauseKemangi = document.getElementById('btn-pause-kemangi');
    const btnStopKemangi = document.getElementById('btn-stop-kemangi');
    const btnPlusKemangi = document.getElementById('btn-plus-kemangi');
    const btnMinusKemangi = document.getElementById('btn-minus-kemangi');

    // --- KENCUR CONTROLS ---
    const btnStartKencur = document.getElementById('btn-start-kencur');
    const btnPauseKencur = document.getElementById('btn-pause-kencur');
    const btnStopKencur = document.getElementById('btn-stop-kencur');
    const btnPlusKencur = document.getElementById('btn-plus-kencur');
    const btnMinusKencur = document.getElementById('btn-minus-kencur');

    const btnReset = document.getElementById('reset-data-btn');

    if (!btnStartKemangi) return;

    // --- KEMANGI EVENT LISTENERS ---
    btnStartKemangi.addEventListener('click', () => {
        const data = getStoredData(DB_KEY_KEMANGI);
        data.isRunning = true;
        saveStoredData(DB_KEY_KEMANGI, data);
        startTimer();
        showNotification('Timer Kemangi dimulai. Hari akan bertambah otomatis setiap 24 jam.');
    });

    btnPauseKemangi.addEventListener('click', () => {
        const data = getStoredData(DB_KEY_KEMANGI);
        data.isRunning = false;
        saveStoredData(DB_KEY_KEMANGI, data);
        showNotification('Timer Kemangi dijeda.');
    });

    btnStopKemangi.addEventListener('click', () => {
        if(confirm('Apakah Anda yakin ingin mereset data Kemangi ke 0 Hari?')) {
            const data = { days: 0, lastUpdate: Date.now(), isRunning: false };
            saveStoredData(DB_KEY_KEMANGI, data);
            updateAdminDisplay();
            updateIndexDisplay();
            showNotification('Data Kemangi telah direset ke 0 Hari.');
        }
    });

    btnPlusKemangi.addEventListener('click', () => {
        const data = getStoredData(DB_KEY_KEMANGI);
        data.days++;
        data.lastUpdate = Date.now();
        saveStoredData(DB_KEY_KEMANGI, data);
        updateAdminDisplay();
        updateIndexDisplay();
        showNotification('Hari Kemangi ditambah manual.');
    });

    btnMinusKemangi.addEventListener('click', () => {
        const data = getStoredData(DB_KEY_KEMANGI);
        if (data.days > 0) {
            data.days--;
            data.lastUpdate = Date.now();
            saveStoredData(DB_KEY_KEMANGI, data);
            updateAdminDisplay();
            updateIndexDisplay();
            showNotification('Hari Kemangi dikurangi manual.');
        } else {
            showNotification('Hari tidak bisa kurang dari 0.', true);
        }
    });

    // --- KENCUR EVENT LISTENERS ---
    btnStartKencur.addEventListener('click', () => {
        const data = getStoredData(DB_KEY_KENCUR);
        data.isRunning = true;
        saveStoredData(DB_KEY_KENCUR, data);
        startTimer();
        showNotification('Timer Kencur dimulai. Hari akan bertambah otomatis setiap 24 jam.');
    });

    btnPauseKencur.addEventListener('click', () => {
        const data = getStoredData(DB_KEY_KENCUR);
        data.isRunning = false;
        saveStoredData(DB_KEY_KENCUR, data);
        showNotification('Timer Kencur dijeda.');
    });

    btnStopKencur.addEventListener('click', () => {
        if(confirm('Apakah Anda yakin ingin mereset data Kencur ke 0 Hari?')) {
            const data = { days: 0, lastUpdate: Date.now(), isRunning: false };
            saveStoredData(DB_KEY_KENCUR, data);
            updateAdminDisplay();
            updateIndexDisplay();
            showNotification('Data Kencur telah direset ke 0 Hari.');
        }
    });

    btnPlusKencur.addEventListener('click', () => {
        const data = getStoredData(DB_KEY_KENCUR);
        data.days++;
        data.lastUpdate = Date.now();
        saveStoredData(DB_KEY_KENCUR, data);
        updateAdminDisplay();
        updateIndexDisplay();
        showNotification('Hari Kencur ditambah manual.');
    });

    btnMinusKencur.addEventListener('click', () => {
        const data = getStoredData(DB_KEY_KENCUR);
        if (data.days > 0) {
            data.days--;
            data.lastUpdate = Date.now();
            saveStoredData(DB_KEY_KENCUR, data);
            updateAdminDisplay();
            updateIndexDisplay();
            showNotification('Hari Kencur dikurangi manual.');
        } else {
            showNotification('Hari tidak bisa kurang dari 0.', true);
        }
    });

    // --- RESET DATA TOTAL ---
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            if(confirm('Hapus semua data dan reset login?')) {
                localStorage.removeItem(DB_KEY_KEMANGI);
                localStorage.removeItem(DB_KEY_KENCUR);
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

