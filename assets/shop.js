/* Grand Vision Perspective: config-driven shop (prices, cart, discounts).
   Everything is driven by /assets/shop-config.json. With the flags off
   (the shipped default) nothing here changes the page: elements that need
   a price or the cart carry the `hidden` attribute in the HTML and are only
   revealed when the config says so. No framework, no tracking. */
(() => {
    'use strict';

    const CONFIG_URL = '/assets/shop-config.json';
    const CART_KEY = 'gvp-cart-v1';
    const ORDER_KEY = 'gvp-last-order-v1';

    /* ---------- Pure engine (also exported for tests) ---------- */

    const byId = (cfg, id) => (cfg.products || []).find((p) => p.id === id && p.enabled !== false);
    const baseCur = (cfg) => (cfg.currencies && cfg.currencies.default) || 'IDR';
    const priceMode = (cfg, p) => p.priceMode || (cfg.flags && cfg.flags.priceMode) || 'exact';
    const unitPrice = (p, cur) => {
        const v = p && p.prices ? p.prices[cur] : null;
        return typeof v === 'number' && v >= 0 ? v : null;
    };
    const today = () => {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };

    // In the cart only when prices are published, the cart is on, the product
    // is a cart item with an exact price in the base currency.
    const isBuyable = (cfg, p) => !!(cfg.flags && cfg.flags.pricesPublished && cfg.flags.cartEnabled &&
        p && p.enabled !== false && p.inCart && priceMode(cfg, p) === 'exact' && unitPrice(p, baseCur(cfg)) !== null);

    const decimals = (cfg, cur) => (cfg.currencies && cfg.currencies.decimals && cfg.currencies.decimals[cur]) || 0;
    const roundTo = (cfg, cur, v) => { const f = Math.pow(10, decimals(cfg, cur)); return Math.round(v * f) / f; };
    // Amounts read the way the invoice states them.
    // English pages: whole millions ("IDR 20 million"), up to two decimals
    // ("IDR 12.5 million"), billions ("IDR 2.4 billion"); anything that does not
    // round cleanly to two decimals is grouped in full ("IDR 12,345,678").
    // Bahasa pages (<html lang="id">): "Rp20.000.000".
    const pageLang = (cfg) => String(cfg._lang || (typeof document !== 'undefined' && document.documentElement.lang) || 'en').toLowerCase();
    const scaled = (v, unit) => {
        const h = Math.round(v / unit * 100);
        return h * unit / 100 === v ? (h / 100).toLocaleString('en-GB', { maximumFractionDigits: 2 }) : null;
    };
    const formatWords = (v) => {
        const n = Math.round(Math.abs(v));
        const sign = v < 0 ? '-' : '';
        let s = null;
        if (n >= 1e9) s = scaled(n, 1e9) && scaled(n, 1e9) + ' billion';
        else if (n >= 1e6) s = scaled(n, 1e6) && scaled(n, 1e6) + ' million';
        return sign + 'IDR ' + (s || n.toLocaleString('en-GB', { maximumFractionDigits: 0 }));
    };
    const format = (cfg, cur, v) => {
        const d = decimals(cfg, cur);
        if (cur === 'IDR' && pageLang(cfg).indexOf('id') !== 0) return formatWords(v);
        const labels = (cfg.currencies && cfg.currencies.labels) || {};
        return (labels[cur] || cur + ' ') + Number(v).toLocaleString(cur === 'IDR' ? 'id-ID' : 'en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
    };

    const scopeLines = (lines, appliesTo) => {
        if (appliesTo === 'all' || !appliesTo) return lines;
        if (appliesTo === 'monthly') return lines.filter((l) => l.monthly);
        if (Array.isArray(appliesTo)) return lines.filter((l) => appliesTo.includes(l.id));
        return [];
    };

    // Offer is live: enabled, has a value, internal count above 0 (if counted, never shown), not past its end date.
    const ruleLive = (rule) => {
        if (!rule || !rule.enabled) return false;
        if (!((typeof rule.percent === 'number' && rule.percent > 0) || (rule.amount && Object.keys(rule.amount).some((k) => rule.amount[k] > 0)))) return false;
        if (Object.prototype.hasOwnProperty.call(rule, 'remaining') && !(typeof rule.remaining === 'number' && rule.remaining > 0)) return false;
        const when = rule.when || {};
        if (when.endDate && today() > when.endDate) return false;
        if (when.startDate && today() < when.startDate) return false;
        return true;
    };

    const ruleApplies = (rule, lines, cart) => {
        if (!ruleLive(rule)) return false;
        const when = rule.when || {};
        if (when.allOf && !when.allOf.every((id) => lines.some((l) => l.id === id))) return false;
        if (when.paymentPlan && when.paymentPlan !== (cart.plan || 'instalments')) return false;
        if (when.optIn && !(cart.optIns || []).includes(when.optIn)) return false;
        const scoped = scopeLines(lines, rule.appliesTo);
        if (!scoped.length) return false;
        if (when.minUnits && scoped.reduce((n, l) => n + l.qty, 0) < when.minUnits) return false;
        return true;
    };

    const ruleAmount = (rule, lines, cur) => {
        let left = typeof rule.maxUnits === 'number' ? rule.maxUnits : Infinity;
        let base = 0;
        scopeLines(lines, rule.appliesTo).forEach((l) => { const u = Math.min(l.qty, left); left -= u; base += u * l.unitPrice; });
        if (typeof rule.percent === 'number' && rule.percent > 0) return Math.min(base, base * rule.percent / 100);
        const fixed = rule.amount && typeof rule.amount[cur] === 'number' ? rule.amount[cur] : 0;
        return fixed > 0 ? Math.min(base, fixed) : 0;
    };

    // cart: { items: { id: qty }, plan, optIns: [] }. Prices per currency come
    // straight from the config, so the IDR column uses the fixed IDR prices.
    const compute = (cfg, cart, cur) => {
        cur = cur || baseCur(cfg);
        const lines = [];
        Object.keys(cart.items || {}).forEach((id) => {
            const p = byId(cfg, id);
            const qty = Math.max(0, Math.min(cart.items[id] | 0, (p && p.maxQty) || 1));
            if (!p || !qty || !isBuyable(cfg, p)) return;
            if (p.requires && !cart.items[p.requires]) return;
            const price = unitPrice(p, cur);
            if (price === null) return;
            lines.push({ id, name: p.name, qty, unit: qty === 1 ? p.unit : (p.unitPlural || p.unit), monthly: !!p.monthly, unitPrice: price, lineTotal: roundTo(cfg, cur, price * qty) });
        });
        const subtotal = roundTo(cfg, cur, lines.reduce((s, l) => s + l.lineTotal, 0));

        const best = {};
        ((cfg.discounts && cfg.discounts.rules) || []).forEach((rule) => {
            if (!ruleApplies(rule, lines, cart)) return;
            const amt = roundTo(cfg, cur, ruleAmount(rule, lines, cur));
            if (amt <= 0) return;
            const g = rule.group || rule.id;
            if (!best[g] || amt > best[g].amount) best[g] = { id: rule.id, label: rule.label, amount: amt };
        });
        const discounts = Object.keys(best).map((g) => best[g]);
        let discountTotal = discounts.reduce((s, d) => s + d.amount, 0);
        const capPct = cfg.discounts && typeof cfg.discounts.maxTotalPercent === 'number' ? cfg.discounts.maxTotalPercent : null;
        if (capPct !== null) {
            const cap = roundTo(cfg, cur, subtotal * capPct / 100);
            if (discountTotal > cap) {
                discounts.push({ id: 'cap', label: 'Combined discount limit (' + capPct + '%)', amount: roundTo(cfg, cur, cap - discountTotal) });
                discountTotal = cap;
            }
        }
        return { currency: cur, plan: cart.plan || 'instalments', lines, subtotal, discounts, discountTotal: roundTo(cfg, cur, discountTotal), total: roundTo(cfg, cur, subtotal - discountTotal), hasMonthly: lines.some((l) => l.monthly && l.qty > 1) };
    };

    const summaryText = (cfg, r, ref, country) => {
        const out = ['Order reference: ' + ref, 'Buyer country: ' + (country || 'Not chosen'), 'Currency: ' + r.currency, ''];
        r.lines.forEach((l, i) => out.push(l.name + ' x ' + l.qty + ' ' + l.unit + ' = ' + format(cfg, r.currency, l.lineTotal) ));
        out.push('', 'Subtotal: ' + format(cfg, r.currency, r.subtotal) );
        r.discounts.forEach((d, i) => out.push(d.label + ': -' + format(cfg, r.currency, Math.abs(d.amount)) ));
        out.push('Total: ' + format(cfg, r.currency, r.total) );
        try { const sc = JSON.parse(localStorage.getItem('gvp-scorecard-v1')); if (sc && typeof sc.score === 'number') out.push('', 'Operations Health Scorecard: ' + sc.score + ' / 100, weakest area: ' + sc.weakest); } catch (e) { /* ignore */ }
        if (r.hasMonthly) out.push('Payment plan: ' + (r.plan === 'full' ? 'pay all months up front' : 'monthly'));
        return out.join('\n');
    };

    // Prices are shown in one currency only (IDR; Bank Indonesia bans dual
    // quotation). The buyer's country never changes the currency. It only
    // decides whether the order is confirmed offline (see buyerOffline).
    const buyerCurrency = (cfg) => baseCur(cfg);
    const buyerOffline = (cfg, cart) => {
        const c = ((cfg.buyer && cfg.buyer.countries) || []).find((x) => x.code === cart.country);
        return !!(c && c.offlineConfirmation && !(cfg.flags && cfg.flags.indonesiaCheckoutReady));
    };

    const engine = { formatWords, buyerCurrency, buyerOffline, compute, format, isBuyable, priceMode, unitPrice, summaryText, byId, ruleLive };
    if (typeof module !== 'undefined' && module.exports) { module.exports = engine; return; }
    window.GVPShop = engine;

    /* ---------- Browser wiring ---------- */

    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
    const el = (tag, attrs, text) => {
        const n = document.createElement(tag);
        Object.keys(attrs || {}).forEach((k) => { if (k === 'class') n.className = attrs[k]; else n.setAttribute(k, attrs[k]); });
        if (text !== undefined) n.textContent = text;
        return n;
    };
    const show = (n, on) => { if (n) n.hidden = !on; };
    const rules = (cfg) => (cfg.discounts && cfg.discounts.rules) || [];
    const notes = (cfg) => (cfg.discounts && cfg.discounts.notes) || [];

    const loadCart = () => {
        try {
            const c = JSON.parse(localStorage.getItem(CART_KEY)) || {};
            return { items: c.items || {}, plan: c.plan || 'instalments', optIns: c.optIns || [], country: c.country || '' };
        } catch (e) { return { items: {}, plan: 'instalments', optIns: [], country: '' }; }
    };
    const saveCart = (cart) => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* storage off */ } };
    const cartCount = (cart) => Object.keys(cart.items).filter((k) => cart.items[k] > 0).length;

    const priceLabel = (cfg, p) => {
        const v = unitPrice(p, baseCur(cfg));
        if (v === null) return null;
        return (priceMode(cfg, p) === 'from' ? 'From ' : '') + format(cfg, baseCur(cfg), v) + (p.monthly ? ' per ' + p.unit : '');
    };


    // Offer copy follows the page language. No places-left or countdown text is ever added.
    const offerText = (rule) => {
        if (pageLang({}).indexOf('id') === 0 && rule.offerTextId) return rule.offerTextId;
        return rule.offerText || rule.label;
    };

    const addFitCall = (cfg, parent) => {
        if (!cfg.fitCall) return;
        parent.appendChild(el('a', { class: 'text-link fit-call', href: cfg.fitCall.href }, cfg.fitCall.label));
    };

    const wireGeneric = (cfg, cart) => {
        const f = cfg.flags || {};
        $$('[data-shop="no-prices"]').forEach((n) => show(n, !f.pricesPublished));
        $$('[data-shop="prices"]').forEach((n) => show(n, !!f.pricesPublished));
        $$('[data-shop="cart"]').forEach((n) => show(n, !!(f.pricesPublished && f.cartEnabled)));
        $$('[data-shop="no-cart"]').forEach((n) => show(n, !(f.pricesPublished && f.cartEnabled)));

        $$('[data-price-for]').forEach((n) => {
            const p = byId(cfg, n.getAttribute('data-price-for'));
            const label = f.pricesPublished && p ? priceLabel(cfg, p, cart) : null;
            if (label) { n.textContent = label; show(n, true); } else { show(n, false); }
        });
        // Direct pay button: only without the cart, with an exact price, an
        // enabled company payment link, and while no opt-in offer could change the amount.
        $$('[data-buy-direct]').forEach((n) => {
            const p = byId(cfg, n.getAttribute('data-buy-direct'));
            const link = cfg.payment && cfg.payment.gateway;
            const offerOpen = p && rules(cfg).some((r) => ruleLive(r) && Array.isArray(r.appliesTo) && r.appliesTo.includes(p.id) && r.when && r.when.optIn);
            const ok = f.pricesPublished && !f.cartEnabled && p && link && link.enabled && /^https:\/\//.test(link.paymentLinkUrl || '') &&
                priceMode(cfg, p) === 'exact' && unitPrice(p, baseCur(cfg)) !== null && !offerOpen;
            if (ok) n.setAttribute('href', link.paymentLinkUrl);
            show(n, !!ok);
        });

        $$('[data-add-to-cart]').forEach((n) => {
            const p = byId(cfg, n.getAttribute('data-add-to-cart'));
            show(n, isBuyable(cfg, p));
            n.addEventListener('click', () => {
                cart.items[p.id] = Math.min((cart.items[p.id] || 0) + 1, p.maxQty || 1);
                saveCart(cart);
                window.location.href = '/shop/#order';
            });
        });

        $$('[data-shop-note]').forEach((n) => {
            const note = notes(cfg).find((x) => x.id === n.getAttribute('data-shop-note'));
            const ok = f.pricesPublished && note && note.enabled && note.text;
            if (ok) n.textContent = note.text;
            show(n, !!ok);
        });

        $$('[data-shop-offer]').forEach((n) => {
            const rule = rules(cfg).find((r) => r.id === n.getAttribute('data-shop-offer'));
            const ok = f.pricesPublished && ruleLive(rule);
            if (ok) n.textContent = offerText(rule);
            show(n, !!ok);
        });

        $$('[data-cart-link]').forEach((n) => {
            const count = cartCount(cart);
            show(n, f.cartEnabled && f.pricesPublished && count > 0);
            n.textContent = 'View your order (' + count + ')';
        });
    };

    /* ----- /shop/ catalogue ----- */
    const renderCatalogue = (cfg, cart, root, rerender) => {
        root.textContent = '';
        const f = cfg.flags || {};
        (cfg.products || []).filter((p) => p.enabled !== false).forEach((p) => {
            const row = el('article', { class: 'product-row', id: 'product-' + p.id });
            const head = el('div', { class: 'product-head' });
            head.appendChild(el('h3', {}, p.name));
            const price = f.pricesPublished ? priceLabel(cfg, p, cart) : null;
            head.appendChild(el('p', { class: 'product-price' }, price || 'Fixed fee, agreed in writing before work starts'));
            row.appendChild(head);
            const body = el('div', { class: 'product-body' });
            body.appendChild(el('p', {}, p.summary));
            if (p.deliverables && p.deliverables.length) body.appendChild(el('p', { class: 'product-deliverables' }, 'Core deliverables: ' + p.deliverables.join(', ') + '.'));
            if (p.includes && p.includes.length) {
                const ul = el('ul', { class: 'product-includes' });
                p.includes.forEach((i) => ul.appendChild(el('li', {}, i)));
                body.appendChild(ul);
            }
            if (f.pricesPublished) notes(cfg).filter((n) => n.enabled && n.inCatalogue !== false && (n.appliesTo || []).includes(p.id)).forEach((n) => body.appendChild(el('p', { class: 'product-note' }, n.text)));
            if (f.pricesPublished) rules(cfg).filter((r) => ruleLive(r) && Array.isArray(r.appliesTo) && r.appliesTo[0] === p.id && r.offerText).forEach((r) => body.appendChild(el('p', { class: 'sheet-offer' }, offerText(r))));
            row.appendChild(body);
            const act = el('div', { class: 'product-actions' });
            if (isBuyable(cfg, p) && !(p.requires && !cart.items[p.requires])) {
                const full = (cart.items[p.id] || 0) >= (p.maxQty || 1);
                const b = el('button', { class: 'btn btn-primary', type: 'button' }, full ? 'In your order' : (cart.items[p.id] ? 'Add another' : 'Add to order'));
                b.disabled = full;
                b.addEventListener('click', () => { cart.items[p.id] = Math.min((cart.items[p.id] || 0) + 1, p.maxQty || 1); saveCart(cart); rerender(); });
                act.appendChild(b);
                addFitCall(cfg, act);
            } else if (p.actions && p.actions.length) {
                p.actions.forEach((a) => act.appendChild(el('a', { class: 'btn ' + (a.style === 'primary' ? 'btn-primary' : 'btn-secondary'), href: a.href }, a.label)));
            } else {
                act.appendChild(el('a', { class: 'btn btn-secondary', href: '/contact/#book' }, 'Book a Strategy Call'));
            }
            if (p.detailUrl) act.appendChild(el('a', { class: 'text-link', href: p.detailUrl }, 'Details'));
            row.appendChild(act);
            root.appendChild(row);
        });
        (cfg.catalogueNotes || []).forEach((n) => {
            const p = el('p', { class: 'catalogue-note' }, n.text + ' ');
            if (n.href) p.appendChild(el('a', { class: 'text-link', href: n.href }, n.linkLabel || 'Find out more'));
            root.appendChild(p);
        });
    };

    /* ----- /shop/ cart + order request ----- */
    const renderCart = (cfg, cart, root, rerender) => {
        const cur = buyerCurrency(cfg);
        const r = compute(cfg, cart, cur);
        const offline = buyerOffline(cfg, cart);
        const list = $('[data-cart-lines]', root);
        list.textContent = '';
        show($('[data-cart-empty]', root), !r.lines.length);
        show($('[data-cart-filled]', root), !!r.lines.length);

        r.lines.forEach((l, i) => {
            const p = byId(cfg, l.id);
            const li = el('li', { class: 'cart-line' });
            const info = el('div', { class: 'cart-line-info' });
            info.appendChild(el('strong', {}, l.name));
            info.appendChild(el('span', {}, format(cfg, r.currency, l.unitPrice) + ' per ' + p.unit));
            li.appendChild(info);
            const qty = el('div', { class: 'cart-qty' });
            if ((p.maxQty || 1) > 1) {
                const minus = el('button', { type: 'button', 'aria-label': 'Remove one ' + p.unit + ' of ' + l.name }, '\u2212');
                const plus = el('button', { type: 'button', 'aria-label': 'Add one ' + p.unit + ' of ' + l.name }, '+');
                plus.disabled = l.qty >= p.maxQty;
                minus.addEventListener('click', () => { cart.items[l.id] = l.qty - 1; if (cart.items[l.id] <= 0) delete cart.items[l.id]; saveCart(cart); rerender(); });
                plus.addEventListener('click', () => { cart.items[l.id] = l.qty + 1; saveCart(cart); rerender(); });
                qty.append(minus, el('span', { 'aria-live': 'polite' }, l.qty + ' ' + l.unit), plus);
            } else {
                qty.appendChild(el('span', {}, '1 ' + l.unit));
            }
            li.appendChild(qty);
            const tot = el('span', { class: 'cart-line-total' }, format(cfg, r.currency, l.lineTotal));
            li.appendChild(tot);
            const rm = el('button', { type: 'button', class: 'cart-remove' }, 'Remove');
            rm.addEventListener('click', () => { delete cart.items[l.id]; saveCart(cart); rerender(); });
            li.appendChild(rm);
            list.appendChild(li);
        });

        const sums = $('[data-cart-sums]', root);
        sums.textContent = '';
        const addSum = (label, value, cls) => {
            const d = el('div', { class: cls || '' });
            const dd = el('dd', {}, value);
            d.append(el('dt', {}, label), dd);
            sums.appendChild(d);
        };
        addSum('Subtotal', format(cfg, r.currency, r.subtotal), '');
        r.discounts.forEach((d) => addSum(d.label, '\u2212' + format(cfg, r.currency, Math.abs(d.amount)), 'is-discount'));
        addSum('Total', format(cfg, r.currency, r.total), 'is-total');

        // Opt-in offers (founding client) for products in the order.
        const optWrap = $('[data-cart-optins]', root);
        optWrap.textContent = '';
        rules(cfg).filter((x) => ruleLive(x) && x.when && x.when.optIn && scopeLines(r.lines, x.appliesTo).length).forEach((x) => {
            const lab = el('label', { class: 'choice optin' });
            const cb = el('input', { type: 'checkbox', name: 'offer_' + x.id, value: 'yes' });
            cb.checked = (cart.optIns || []).includes(x.when.optIn);
            if (cb.checked) cb.setAttribute('checked', '');
            cb.addEventListener('change', () => {
                cart.optIns = (cart.optIns || []).filter((o) => o !== x.when.optIn);
                if (cb.checked) cart.optIns.push(x.when.optIn);
                saveCart(cart); rerender();
            });
            lab.append(cb, el('span', {}, x.optInLabel || x.label));
            optWrap.appendChild(lab);
        });
        // Information notes (credits) for products in the order.
        const noteWrap = $('[data-cart-notes]', root);
        noteWrap.textContent = '';
        notes(cfg).filter((n) => n.enabled && (n.appliesTo || []).some((id) => r.lines.some((l) => l.id === id))).forEach((n) => noteWrap.appendChild(el('p', { class: 'sheet-note' }, n.text)));

        const planWrap = $('[data-cart-plan]', root);
        show(planWrap, r.hasMonthly);
        $$('input[name="payment_plan"]', root).forEach((i) => {
            i.checked = i.value === r.plan;
            i.onchange = () => { cart.plan = i.value; saveCart(cart); rerender(); };
        });

        // Buyer country decides the currency.
        const countrySel = $('[data-cart-country]', root);
        if (countrySel) {
            if (!countrySel.options.length) {
                countrySel.appendChild(el('option', { value: '' }, 'Choose your country'));
                ((cfg.buyer && cfg.buyer.countries) || []).forEach((c) => countrySel.appendChild(el('option', { value: c.code }, c.name)));
            }
            countrySel.value = cart.country || '';
            countrySel.onchange = () => { cart.country = countrySel.value; saveCart(cart); rerender(); };
        }
        $('[name="currency"]', root).value = cur;
        const c = ((cfg.buyer && cfg.buyer.countries) || []).find((x) => x.code === cart.country);
        $('[name="buyer_country_name"]', root).value = c ? c.name : 'Not chosen';

        // Final price, shown right above the send button.
        const fin = $('[data-cart-final]', root);
        if (fin) fin.textContent = 'Total to pay: ' + format(cfg, r.currency, r.total) + (r.discounts.length ? ', including the discount shown above.' : '.');

        // Terms link follows the buyer's language.
        const terms = $('[data-cart-terms]', root);
        if (terms && cfg.legal) {
            terms.textContent = '';
            terms.append((cfg.legal.agreeText || 'By ordering you agree to the') + ' ');
            terms.appendChild(el('a', { class: 'text-link', href: cfg.legal.termsUrl, target: '_blank', rel: 'noopener' }, cfg.legal.agreeLinkLabel || 'Terms of Sale'));
            terms.append('.');
        }
        show($('[data-cart-checkout]', root), !offline);
        const off = $('[data-cart-offline]', root);
        if (off) { const t = $('[data-cart-offline-text]', off); if (t && cfg.buyer && cfg.buyer.offlineText) t.textContent = cfg.buyer.offlineText; }
        show(off, offline);

        const ref = root.getAttribute('data-ref');
        $('[name="order_reference"]', root).value = ref;
        $('[name="order_summary"]', root).value = summaryText(cfg, r, ref, c ? c.name : '');
        $('[name="order_total"]', root).value = format(cfg, r.currency, r.total);
        $('[name="_subject"]', root).value = 'Order request ' + ref + ' (' + format(cfg, r.currency, r.total) + ')';
        root._result = r;
    };

    const newRef = () => {
        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        return 'GVP-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    };

    const initShop = (cfg, cart) => {
        const cat = $('[data-catalogue]');
        const cartRoot = $('[data-cart]');
        const f = cfg.flags || {};
        const rerender = () => {
            if (cat) renderCatalogue(cfg, cart, cat, rerender);
            if (cartRoot && f.cartEnabled && f.pricesPublished) renderCart(cfg, cart, cartRoot, rerender);
        };
        if (cartRoot) {
            show(cartRoot, !!(f.cartEnabled && f.pricesPublished));
            cartRoot.setAttribute('data-ref', newRef());
            const form = $('form', cartRoot);
            // Business address: same as billing by default, otherwise required.
            const same = $('[data-same-address]', cartRoot);
            const bizWrap = $('[data-business-address]', cartRoot);
            if (same && bizWrap) {
                const sync = () => { show(bizWrap, !same.checked); const t = $('textarea', bizWrap); if (t) t.required = !same.checked; };
                same.addEventListener('change', sync);
                sync();
            }
            if (form) form.addEventListener('submit', (e) => {
                const r = cartRoot._result;
                if (!r || !r.lines.length || buyerOffline(cfg, cart)) { e.preventDefault(); return; }
                try { sessionStorage.setItem(ORDER_KEY, JSON.stringify({ ref: cartRoot.getAttribute('data-ref'), total: r.total, currency: r.currency, summary: $('[name="order_summary"]', cartRoot).value })); } catch (err) { /* ignore */ }
            });
        }
        rerender();
    };

    const initThanks = (cfg) => {
        const root = $('[data-order-thanks]');
        if (!root) return;
        let order = null;
        try { order = JSON.parse(sessionStorage.getItem(ORDER_KEY)); } catch (e) { /* ignore */ }
        if (!order) return;
        const pre = $('[data-order-summary]', root);
        if (pre) { pre.textContent = order.summary; show(pre.closest('[data-order-summary-wrap]'), true); }
        try { localStorage.removeItem(CART_KEY); } catch (e) { /* ignore */ }
        const pay = $('[data-order-pay]', root);
        const link = cfg.payment && cfg.payment.gateway;
        if (pay && link && link.enabled && /^https:\/\//.test(link.paymentLinkUrl || '')) {
            pay.setAttribute('href', link.paymentLinkUrl);
            pay.textContent = link.label || 'Pay online';
            show(pay, true);
        }
    };

    fetch(CONFIG_URL, { cache: 'no-cache' })
        .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
        .then((cfg) => {
            cfg.flags = cfg.flags || {};
            cfg.currencies = cfg.currencies || { default: 'IDR', labels: { IDR: 'Rp' }, decimals: { IDR: 0 } };
            cfg.payment = cfg.payment || {};
            const cart = loadCart();
            wireGeneric(cfg, cart);
            initShop(cfg, cart);
            initThanks(cfg);
        })
        .catch(() => { /* Config missing: page stays in its safe, flags-off state. */ });
})();
