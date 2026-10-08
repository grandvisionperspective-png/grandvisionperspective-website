/* Grand Vision Perspective: shared interactive behaviour */
(() => {
    'use strict';

    // Mobile nav toggle
    const toggle = document.querySelector('.nav-toggle');
    const mobile = document.querySelector('.nav-mobile');
    if (toggle && mobile) {
        toggle.addEventListener('click', () => {
            const active = toggle.classList.toggle('active');
            mobile.classList.toggle('active');
            toggle.setAttribute('aria-expanded', active ? 'true' : 'false');
            document.body.style.overflow = active ? 'hidden' : '';
        });
        mobile.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
            toggle.classList.remove('active');
            mobile.classList.remove('active');
            toggle.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        }));
    }

    // Scroll reveal
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('.reveal, .reveal-stagger').forEach((el) => observer.observe(el));
    } else {
        document.querySelectorAll('.reveal, .reveal-stagger').forEach((el) => el.classList.add('visible'));
    }

    // Stat numbers. The count-up animation was retired in the de-template
    // pass (Oct 2026). Pages that still mark numbers up with data-target
    // (currently /id/) get the final value rendered straight away.
    // Locale follows the page's <html lang> so EN renders 27,715 and ID renders 27.715
    // regardless of the user's browser locale.
    const pageLocale = document.documentElement.lang === 'id' ? 'id-ID' : 'en-US';
    document.querySelectorAll('[data-target]').forEach((el) => {
        const target = parseFloat(el.dataset.target);
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const value = target.toLocaleString(pageLocale, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
        el.textContent = (el.dataset.prefix || '') + value + (el.dataset.suffix || '');
    });
})();
