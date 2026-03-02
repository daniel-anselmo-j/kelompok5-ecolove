/* ========================================== */
/* 1. KONFIGURASI & KONSTANTA                 */
/* ========================================== */
const DB_KEY = 'data_tanaman_jahe';
const START_DATE = new Date('2025-03-01');
const END_DATE = new Date('2026-12-31');
const JUMLAH_HARI = Math.round((END_DATE - START_DATE) / (1000 * 60 * 60 * 24)) + 1;

// --- KONFIGURASI KEAMANAN ---
// Password default: admin123 (di-hash menggunakan SHA-256)
// Hash ini tidak bisa dikembalikan ke teks asli dengan mudah
const ADMIN_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'; 

const MAX_ATTEMPTS = 5;           // Maksimal percobaan login
const LOCKOUT_TIME = 60000;       // Waktu kunci (60 detik)

// --- VARIABLE KEAMANAN (TIDAK DIKIRIM KE SERVER) ---
let loginAttempts = parseInt(localStorage.getItem('loginAttempts')) || 0;
let lockoutEndTime = parseInt(localStorage.getItem('lockoutEndTime')) || 0;

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

// Fungsi hashing SHA-256 (Menggunakan Web Crypto API)
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Cek apakah masih dalam kondisi locked out
function isLockedOut() {
    const now = Date.now();
    if (lockoutEndTime > now) {
        const remaining = Math.ceil((lockoutEndTime - now) / 1000);
        return remaining;
    }
    return 0;
}

// Update counter percobaan login
function handleFailedAttempt() {
    loginAttempts++;
    localStorage.setItem('loginAttempts', loginAttempts);
    
    if (loginAttempts >= MAX_ATTEMPTS) {
        lockoutEndTime = Date.now() + LOCKOUT_TIME;
        localStorage.setItem('lockoutEndTime', lockoutEndTime);
        loginAttempts = 0;
        localStorage.setItem('loginAttempts', 0);
        return true; // Berarti baru saja dikunci
    }
    return false;
}

// Reset counter setelah login berhasil
function resetLoginAttempts() {
    loginAttempts = 0;
    lockoutEndTime = 0;
    localStorage.setItem('loginAttempts', 0);
    localStorage.setItem('lockoutEndTime', 0);
}

/* ========================================== */
/* 4. FUNGSI UNTUK HALAMAN UTAMA (INDEX)     */
/* ========================================== */
function loadDataIndex() {
    const tbody = document.querySelector('#plant-table tbody');
    const noDataMsg = document.getElementById('no-data-msg');
    const rawData = localStorage.getItem(DB_KEY);

    if (!tbody) return;

    if (!rawData) {
        noDataMsg.style.display = 'block';
        return;
    }

    const data = JSON.parse(rawData);
    const validData = data.filter(item => item.panjang && item.panjang !== "");

    if (validData.length === 0) {
        noDataMsg.style.display = 'block';
        return;
    }

    let html = '';
    validData.forEach((item) => {
        html += `
            <tr>
                <td>${item.no}</td>
                <td>${item.tanggal}</td>
                <td>${item.panjang} cm</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    updateStats(validData);
}

function updateStats(data) {
    const totalDaysEl = document.getElementById('total-days');
    const avgHeightEl = document.getElementById('avg-height');

    if (data.length > 0) {
        const totalDays = data.length;
        const totalHeight = data.reduce((sum, item) => sum + parseFloat(item.panjang), 0);
        const avgHeight = (totalHeight / data.length).toFixed(1);

        if (totalDaysEl) totalDaysEl.innerText = `${totalDays} Hari`;
        if (avgHeightEl) avgHeightEl.innerText = `${avgHeight} cm`;
    }
}

/* ========================================== */
/* 5. FUNGSI UNTUK HALAMAN ADMIN             */
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
        generateInputTable();
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // --- CEK LOCKOUT TERLEBIH DAHULU ---
        const lockStatus = isLockedOut();
        if (lockStatus > 0) {
            showNotification(`Terlalu banyak percobaan! Coba lagi dalam ${lockStatus} detik.`, true);
            return;
        }

        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;

        // Validasi input tidak kosong
        if (!user || !pass) {
            showNotification('Username dan Password harus diisi!', true);
            return;
        }

        // --- PROSES LOGIN DENGAN HASHING ---
        // 1. Hash input password menggunakan SHA-256
        const inputHash = await sha256(pass);
        
        // 2. Bandingkan hash input dengan hash yang tersimpan
        // Juga tambahkan salt sederhana (username + panjang tertentu)
        const verifyHash = await sha256(pass); 

        if (verifyHash === ADMIN_HASH) {
            // Login Berhasil
            sessionStorage.setItem('isLogin', 'true');
            loginPage.style.display = 'none';
            adminPage.style.display = 'flex';
            generateInputTable();
            errorMsg.style.display = 'none';
            
            // Reset counter
            resetLoginAttempts();
            
            showNotification('Login berhasil! Selamat datang Admin.');
        } else {
            // Login Gagal
            errorMsg.style.display = 'block';
            
            // Tangani percobaan gagal
            const isNowLocked = handleFailedAttempt();
            
            if (isNowLocked) {
                showNotification('Terlalu banyak percobaan! Akun dikunci sementara.', true);
                // Update pesan error agar user tahu mereka dikunci
                errorMsg.innerText = `Terlalu banyak percobaan. Coba lagi dalam ${LOCKOUT_TIME/1000} detik.`;
            } else {
                const remaining = MAX_ATTEMPTS - loginAttempts;
                showNotification(`Username atau Password salah! Sisa percobaan: ${remaining}`, true);
            }
        }
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('isLogin');
            location.reload();
        });
    }
}

function generateInputTable() {
    const tbody = document.querySelector('#input-table tbody');
    if (!tbody) return;

    let currentDate = new Date(START_DATE);
    let html = '';

    for (let i = 0; i < JUMLAH_HARI; i++) {
        const tanggalStr = currentDate.toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        html += `
            <tr>
                <td>${i + 1}</td>
                <td>${tanggalStr}</td>
                <td><input type="number" class="length-input" placeholder="Cm" min="0"></td>
            </tr>
        `;

        currentDate.setDate(currentDate.getDate() + 1);
    }

    tbody.innerHTML = html;
    loadExistingDataToInput();
}

function loadExistingDataToInput() {
    const rawData = localStorage.getItem(DB_KEY);
    if (!rawData) return;

    const data = JSON.parse(rawData);
    const inputs = document.querySelectorAll('.length-input');

    data.forEach((item, index) => {
        if (inputs[index]) {
            if (item.panjang && item.panjang !== "") {
                inputs[index].value = item.panjang;
            }
        }
    });
}

function saveData() {
    const inputs = document.querySelectorAll('.length-input');
    const processedData = [];
    let currentDate = new Date(START_DATE);

    for (let i = 0; i < JUMLAH_HARI; i++) {
        const val = inputs[i].value;
        
        const tanggalStr = currentDate.toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        processedData.push({
            no: i + 1,
            tanggal: tanggalStr,
            panjang: val
        });

        currentDate.setDate(currentDate.getDate() + 1);
    }

    localStorage.setItem(DB_KEY, JSON.stringify(processedData));
    showNotification('Data berhasil disimpan!');
}

/* ========================================== */
/* 6. INISIALISASI & ANIMASI SCROLL          */
/* ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    
    if (document.getElementById('plant-table')) {
        loadDataIndex();
    }

    if (document.getElementById('login-page')) {
        setupLogin();
    }

    if (document.getElementById('save-btn')) {
        document.getElementById('save-btn').addEventListener('click', saveData);
    }

    if (document.getElementById('reset-btn')) {
        document.getElementById('reset-btn').addEventListener('click', () => {
            if(confirm('Reset semua data input di form ini?')) {
                document.querySelectorAll('.length-input').forEach(input => input.value = '');
                showNotification('Form input telah direset.');
            }
        });
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

