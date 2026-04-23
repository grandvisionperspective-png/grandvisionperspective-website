/* Grand Vision Perspective — shared interactive behaviour */
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

    // Animated number counters on stats.
    // Locale follows the page's <html lang> so EN renders 27,715 and ID renders 27.715
    // regardless of the user's browser locale.
    const pageLocale = document.documentElement.lang === 'id' ? 'id-ID' : 'en-US';
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const formatNumber = (value, decimals) => {
        if (decimals > 0) {
            return value.toLocaleString(pageLocale, {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
            });
        }
        return Math.floor(value).toLocaleString(pageLocale);
    };

    const animateNumber = (el) => {
        const target = parseFloat(el.dataset.target);
        const suffix = el.dataset.suffix || '';
        const prefix = el.dataset.prefix || '';
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const duration = 1600;
        const start = performance.now();

        const tick = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutCubic(progress);
            const value = target * eased;
            el.textContent = prefix + formatNumber(value, decimals) + suffix;
            if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    };

    if ('IntersectionObserver' in window) {
        const statObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    animateNumber(entry.target);
                    statObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        document.querySelectorAll('[data-target]').forEach((el) => statObserver.observe(el));
    } else {
        document.querySelectorAll('[data-target]').forEach((el) => {
            const t = parseFloat(el.dataset.target);
            const decimals = parseInt(el.dataset.decimals || '0', 10);
            el.textContent = (el.dataset.prefix || '') + formatNumber(t, decimals) + (el.dataset.suffix || '');
        });
    }
})();
