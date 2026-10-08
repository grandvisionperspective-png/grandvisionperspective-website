/* Operations Health Scorecard. Vanilla JS, no tracking. Answers stay in the
   browser unless the visitor sends the email form or carries the result into
   an order request or booking. */
(() => {
    'use strict';
    const data = document.getElementById('sc-data');
    const form = document.querySelector('[data-sc-form]');
    if (!data || !form) return;
    const QUESTIONS = JSON.parse(data.textContent);
    const RESULT_KEY = 'gvp-scorecard-v1';
    const CART_KEY = 'gvp-cart-v1';
    const $ = (s) => document.querySelector(s);
    const el = (tag, attrs, text) => { const n = document.createElement(tag); Object.keys(attrs || {}).forEach((k) => n.setAttribute(k, attrs[k])); if (text !== undefined) n.textContent = text; return n; };

    const DIMS = {
        documentation: { name: 'Documentation and procedures', weak: 'Too much of how the work gets done lives in people\'s heads. That makes hiring, holidays and growth harder than they need to be, and it puts quality at the mercy of whoever is in that day.' },
        reporting: { name: 'Reporting and visibility', weak: 'The numbers arrive late, take effort to produce, or do not agree with each other. Decisions end up being made on feel, and problems show up after they have already cost money.' },
        admin: { name: 'Manual admin load', weak: 'Your team spends a large part of the week moving information between tools and chasing approvals, instead of doing the work only people can do.' },
        owner: { name: 'Owner dependency', weak: 'Too much runs through the owner. The business moves at the speed of one inbox, and stepping away is hard.' },
        consistency: { name: 'Consistency across sites and teams', weak: 'Sites, entities or teams do the same work in different ways. That makes them hard to compare, hard to improve, and hard to scale.' },
    };
    const WEAK_BELOW = 50;

    let shop = null;
    fetch('/assets/shop-config.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((c) => {
        shop = c;
        // The fee line under the booking panel only shows while prices are published.
        const note = document.querySelector('[data-sc-price-note]');
        if (note && !(c && c.flags && c.flags.pricesPublished)) note.hidden = true;
    }).catch(() => {});

    const buyable = (id) => {
        if (!shop || !shop.flags || !shop.flags.pricesPublished || !shop.flags.cartEnabled) return false;
        const p = (shop.products || []).find((x) => x.id === id && x.enabled !== false);
        const cur = (shop.currencies && shop.currencies.default) || 'IDR';
        return !!(p && p.inCart && p.prices && typeof p.prices[cur] === 'number');
    };

    // Progress
    const update = () => {
        const n = QUESTIONS.filter((q) => form.querySelector('input[name="' + q.id + '"]:checked')).length;
        $('[data-sc-count]').textContent = n + ' of ' + QUESTIONS.length + ' answered';
        $('[data-sc-bar]').style.width = Math.round((n / QUESTIONS.length) * 100) + '%';
    };
    form.addEventListener('change', update);

    const score = () => {
        const per = {};
        let multi = false;
        QUESTIONS.forEach((q) => {
            const v = parseInt(form.querySelector('input[name="' + q.id + '"]:checked').value, 10);
            if (!q.dim) { multi = v >= 1; return; }
            (per[q.dim] = per[q.dim] || []).push(v);
        });
        const dims = Object.keys(DIMS).map((k) => {
            const vals = per[k] || [];
            const s = Math.round((vals.reduce((a, b) => a + b, 0) / (vals.length * 3)) * 100);
            return { key: k, name: DIMS[k].name, score: s, weak: s < WEAK_BELOW };
        });
        const overall = Math.round(dims.reduce((a, d) => a + d.score, 0) / dims.length);
        const weakest = dims.slice().sort((a, b) => a.score - b.score)[0];
        const weakCount = dims.filter((d) => d.weak).length;
        let route = 'call';
        if (weakCount >= 2 || (multi && (weakCount >= 1 || overall < 70))) route = 'operations-audit';
        else if (weakCount === 1) route = 'focus-audit';
        const band = overall < WEAK_BELOW ? 'Under strain' : overall < 75 ? 'Holding, with gaps' : 'Running well';
        return { overall, dims, weakest, weakCount, multi, route, band };
    };

    const bookHref = (r) => '/contact/?scorecard=' + r.overall + '&weakest=' + encodeURIComponent(r.weakest.name) + '#book';

    const addToOrder = (id, r) => {
        let cart = {};
        try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || {}; } catch (e) { cart = {}; }
        cart.items = cart.items || {};
        cart.items[id] = 1;
        try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* ignore */ }
        window.location.href = '/shop/#order';
    };

    const btn = (label, cls, href, onClick) => {
        const a = el(href ? 'a' : 'button', href ? { class: cls, href } : { class: cls, type: 'button' }, label);
        if (onClick) a.addEventListener('click', onClick);
        return a;
    };

    const show = (r) => {
        $('[data-sc-score]').textContent = r.overall;
        $('[data-sc-band]').textContent = r.band;
        const list = $('[data-sc-dims]');
        list.textContent = '';
        r.dims.forEach((d) => {
            const li = el('li', d.weak ? { class: 'is-weak' } : {});
            li.append(el('strong', {}, d.name), el('span', {}, d.score + ' / 100'));
            const m = el('div', { class: 'meter', 'aria-hidden': 'true' });
            const bar = el('span'); bar.style.width = Math.max(d.score, 2) + '%';
            m.appendChild(bar); li.appendChild(m);
            list.appendChild(li);
        });
        $('[data-sc-weakest-title]').textContent = 'Weakest area: ' + r.weakest.name;
        $('[data-sc-weakest-text]').textContent = r.weakest.score >= 75
            ? 'Nothing here is under serious strain. This is simply the area with the most room to improve.'
            : DIMS[r.weakest.key].weak;

        const actions = $('[data-sc-actions]');
        actions.textContent = '';
        const t = $('[data-sc-next-title]');
        const p = $('[data-sc-next-text]');
        if (r.route === 'operations-audit') {
            t.textContent = 'An Operations Audit';
            p.textContent = (r.weakCount >= 2 ? 'More than one area is under strain' : 'You run more than one company or site, and the cracks are starting to show') +
                '. A whole-operation audit maps how the work flows across all of it and sets out, in writing, what to change first and what it would cost to implement. You keep the report.';
            if (buyable('operations-audit')) actions.appendChild(btn('Add the Operations Audit to an order', 'btn btn-primary', null, () => addToOrder('operations-audit', r)));
            else actions.appendChild(btn('Book a Strategy Call', 'btn btn-primary', bookHref(r)));
            actions.appendChild(btn('See what the audit includes', 'btn btn-secondary', '/operations-audit/'));
            if (buyable('operations-audit')) actions.appendChild(btn('Not sure? Book a fit call', 'text-link', bookHref(r)));
        } else if (r.route === 'focus-audit') {
            if (buyable('focus-audit')) {
                t.textContent = 'A Focus Audit';
                p.textContent = 'One area stands out. A Focus Audit applies the audit method to that one workflow in about five working days, so you know exactly what to fix and in what order.';
                actions.appendChild(btn('Add the Focus Audit to an order', 'btn btn-primary', null, () => addToOrder('focus-audit', r)));
                actions.appendChild(btn('Not sure? Book a fit call', 'text-link', bookHref(r)));
            } else {
                t.textContent = 'A short look at one area';
                p.textContent = 'One area stands out. Book a free strategy call and we will talk through whether a focused audit of that area is the right first step.';
                actions.appendChild(btn('Book a Strategy Call', 'btn btn-primary', bookHref(r)));
                actions.appendChild(btn('See how the audit works', 'btn btn-secondary', '/operations-audit/'));
            }
        } else {
            t.textContent = 'A free strategy call';
            p.textContent = 'Nothing is under serious strain. If there is still something you would like to run better, a 30-minute call is the quickest way to find out whether we can help. If there is no fit, we say so.';
        }

        // Breakdown for the optional email.
        const lines = ['Operations Health Scorecard', 'Overall: ' + r.overall + ' / 100 (' + r.band + ')', 'Weakest area: ' + r.weakest.name, ''];
        r.dims.forEach((d) => lines.push(d.name + ': ' + d.score + ' / 100' + (d.weak ? ' (weak area)' : '')));
        lines.push('', 'Your answers:');
        QUESTIONS.forEach((q) => { const v = parseInt(form.querySelector('input[name="' + q.id + '"]:checked').value, 10); lines.push('- ' + q.q + ' ' + q.opts[v]); });
        lines.push('', 'Suggested next step: ' + t.textContent, '', 'Grand Vision Perspective, connect@grandvisionperspective.com');
        const text = lines.join('\n');
        const ef = $('[data-sc-email]');
        const setField = (name, value) => { const f = ef.querySelector('[name="' + name + '"]'); if (f) f.value = value; };
        setField('scorecard_breakdown', text);
        setField('overall_score', r.overall + ' / 100');
        setField('band', r.band);
        setField('weakest_area', r.weakest.name);
        r.dims.forEach((d) => setField('score_' + d.key, d.score + ' / 100' + (d.weak ? ' (weak area)' : '')));
        setField('suggested_next_step', t.textContent);
        setField('_autoresponse', 'Thank you for using the Operations Health Scorecard. Here is your result.\n\n' + text + '\n\nTo talk it through, book a 30-minute call: https://grandvisionperspective.com/contact/#book');
        const book = $('[data-sc-book]');
        if (book) book.setAttribute('href', bookHref(r));

        try { localStorage.setItem(RESULT_KEY, JSON.stringify({ score: r.overall, band: r.band, weakest: r.weakest.name, weakAreas: r.dims.filter((d) => d.weak).map((d) => d.name), route: r.route })); } catch (e) { /* ignore */ }

        form.hidden = true;
        $('.sc-progress').hidden = true;
        const res = $('[data-sc-result]');
        res.hidden = false;
        res.focus();
        res.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const missing = QUESTIONS.filter((q) => !form.querySelector('input[name="' + q.id + '"]:checked'));
        $('[data-sc-missing]').hidden = !missing.length;
        if (missing.length) { const first = form.querySelector('input[name="' + missing[0].id + '"]'); first.closest('fieldset').scrollIntoView({ behavior: 'smooth', block: 'center' }); first.focus(); return; }
        show(score());
    });

    $('[data-sc-restart]').addEventListener('click', () => {
        form.reset(); update();
        form.hidden = false; $('.sc-progress').hidden = false; $('[data-sc-result]').hidden = true;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    if (/[?&]sent=1/.test(window.location.search)) $('[data-sc-sent]').hidden = false;
    update();
})();
