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

    // Stat numbers marked up with data-target are rendered as final values.
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

    // Sticky mobile CTA on English pages. Hidden on pages that already are
    // the conversion step (contact, intake, shop, privacy) and in Bahasa.
    const path = window.location.pathname;
    const skip = /^\/(contact|intake|shop|privacy|terms|scorecard)\b/.test(path) || document.documentElement.lang !== 'en';
    if (!skip) {
        const bar = document.createElement('div');
        bar.className = 'sticky-cta';
        bar.setAttribute('role', 'region');
        bar.setAttribute('aria-label', 'Quick actions');
        const call = document.createElement('a');
        call.className = 'btn btn-primary';
        call.href = '/contact/#book';
        call.textContent = 'Book a Strategy Call';
        bar.appendChild(call);
        if (!/^\/operations-audit\b/.test(path)) {
            const audit = document.createElement('a');
            audit.className = 'btn btn-ghost-light';
            audit.href = '/operations-audit/';
            audit.textContent = 'Operations Audit';
            bar.appendChild(audit);
        }
        document.body.appendChild(bar);
        document.body.classList.add('has-sticky-cta');
        const onScroll = () => bar.classList.toggle('is-visible', window.scrollY > 480);
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }
})();
