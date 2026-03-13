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



