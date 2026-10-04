/*
 * SHIU — entradas ao rolar e visibilidade dos loops (compartilhado).
 *
 * · Nada fica oculto por padrão: o conteúdo só é animado no instante em que
 *   começa a aparecer na tela (Web Animations API, fill "backwards"). Se este
 *   script falhar, tudo aparece normalmente, sem animação.
 * · Elementos já visíveis no carregamento não são animados (sem "piscar").
 * · Cada tipo de elemento tem sua própria entrada (rótulos, títulos, textos,
 *   controles, passos, cards e a chamada final), sempre curta.
 * · As entradas usam as propriedades individuais "translate" e "scale", que
 *   não disputam o "transform" usado por hover, flutuação ou loops.
 * · Cards do catálogo (div ou li) são registrados por SHIUMotion.registrarCartao()
 *   e revelados quando cada linha chega à tela, com pequenos intervalos.
 * · Loops sonoros (.sound-loop), atmosferas (.atmos) e o arco do hero
 *   (.hero-arc) pausam fora da tela; com a aba oculta, todos pausam
 *   (classe .is-tab-hidden no <html>) e retomam do mesmo ponto.
 * Sem dependências. Não altera dados, busca nem captura de áudio.
 */
(function () {
    'use strict';
    var reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var mobileMQ = window.matchMedia ? window.matchMedia('(max-width: 640px)') : null;
    var hasIO = 'IntersectionObserver' in window;
    var canAnimate = typeof Element.prototype.animate === 'function';
    var EASE = 'cubic-bezier(.16,1,.3,1)';

    function reduced() { return !!(reduceMQ && reduceMQ.matches); }
    function mobile() { return !!(mobileMQ && mobileMQ.matches); }
    function ativo() { return hasIO && canAnimate && !reduced(); }

    // ---------- Entradas: uma "assinatura" de movimento por tipo ----------
    var TIPOS = {
        rotulo:   { kf: [{ opacity: 0, translate: '-14px 0' }, { opacity: 1, translate: '0 0' }], dur: 600 },
        titulo:   { kf: [{ opacity: 0, translate: '0 26px', filter: 'blur(6px)' }, { opacity: 1, translate: '0 0', filter: 'blur(0)' }], dur: 760 },
        texto:    { kf: [{ opacity: 0, translate: '0 16px' }, { opacity: 1, translate: '0 0' }], dur: 640 },
        controle: { kf: [{ opacity: 0, translate: '0 14px', scale: '.97' }, { opacity: 1, translate: '0 0', scale: '1' }], dur: 620 },
        passo:    { kf: [{ opacity: 0, translate: '0 30px' }, { opacity: 1, translate: '0 0' }], dur: 760 },
        card:     { kf: [{ opacity: 0, translate: '0 28px', scale: '.96' }, { opacity: 1, translate: '0 0', scale: '1' }], dur: 680 },
        painel:   { kf: [{ opacity: 0, translate: '0 34px', scale: '.965' }, { opacity: 1, translate: '0 0', scale: '1' }], dur: 860 }
    };

    function tocar(el, tipo, atraso) {
        var t = TIPOS[tipo] || TIPOS.texto;
        var kf = t.kf;
        if (mobile()) { // celular: deslocamento menor e sem desfoque
            kf = kf.map(function (f) {
                var g = {}; for (var k in f) if (k !== 'filter') g[k] = f[k];
                if (g.translate && g.translate !== '0 0') g.translate = g.translate.replace(/(-?\d+)px/g, function (m, n) { return Math.round(n * 0.6) + 'px'; });
                return g;
            });
        }
        try {
            el.animate(kf, { duration: t.dur, delay: atraso || 0, easing: EASE, fill: 'backwards' });
        } catch (e) { /* navegador sem suporte a alguma propriedade: o conteúdo segue visível */ }
    }

    function tipoDoFilho(el) {
        if (el.classList.contains('eyebrow')) return 'rotulo';
        if (/^H[1-3]$/.test(el.tagName)) return 'titulo';
        if (el.classList.contains('field') || el.classList.contains('btn')) return 'controle';
        return 'texto';
    }

    function revelar(el) {
        var base = parseFloat(el.style.getPropertyValue('--rd')) || 0;
        var modo = el.getAttribute('data-reveal');
        if (modo === 'stagger') {          // filhos em sequência (título, descrição, controles)
            var filhos = el.children, n = 0;
            for (var i = 0; i < filhos.length; i++) {
                if (filhos[i].offsetParent === null) continue; // ocultos (ex.: sr-only) ficam como estão
                tocar(filhos[i], tipoDoFilho(filhos[i]), base + n * 110);
                n++;
            }
        } else if (modo === 'cta') {       // painel, depois texto, ondas e ação + passagem luminosa
            tocar(el, 'painel', base);
            var partes = el.querySelectorAll('.cta-text, .cta-wave, .btn-cta');
            for (var j = 0; j < partes.length; j++) tocar(partes[j], j === partes.length - 1 ? 'controle' : 'texto', base + 220 + j * 120);
        } else if (el.classList.contains('step')) {
            tocar(el, 'passo', base);
        } else {
            tocar(el, 'texto', base);
        }
    }

    if (ativo()) {
        var revealer = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (!en.isIntersecting) return;
                revealer.unobserve(en.target); // uma única vez por elemento
                revelar(en.target);
            });
        }, { rootMargin: '0px', threshold: 0 });

        var vh = window.innerHeight || document.documentElement.clientHeight;
        var itens = document.querySelectorAll('[data-reveal]');
        for (var i = 0; i < itens.length; i++) {
            // só observa o que ainda está abaixo da dobra; o resto já aparece normalmente
            if (itens[i].getBoundingClientRect().top >= vh) revealer.observe(itens[i]);
        }
    }

    // ---------- Passagem luminosa da chamada final (independe da entrada) ----------
    if (hasIO && !reduced()) {
        var ctas = document.querySelectorAll('.cta-banner');
        var luz = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (!en.isIntersecting) return;
                luz.unobserve(en.target);
                var alvo = en.target;
                setTimeout(function () { alvo.classList.add('is-lit'); }, 260);
            });
        }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
        for (var c = 0; c < ctas.length; c++) luz.observe(ctas[c]);
    }

    // ---------- Cards do catálogo: revelados por linha ao chegar à tela ----------
    var cardIO = null;
    if (ativo()) {
        cardIO = new IntersectionObserver(function (entries) {
            var novos = [];
            entries.forEach(function (en) {
                if (!en.isIntersecting) return;
                cardIO.unobserve(en.target);
                novos.push({ el: en.target, r: en.boundingClientRect });
            });
            // ordem de leitura: linha a linha, da esquerda para a direita
            novos.sort(function (a, b) { return (Math.round(a.r.top) - Math.round(b.r.top)) || (a.r.left - b.r.left); });
            var linhaTop = null, linha = -1, col = 0;
            novos.forEach(function (c) {
                if (linhaTop === null || Math.abs(c.r.top - linhaTop) > 8) { linhaTop = c.r.top; linha++; col = 0; }
                var atraso = Math.min(linha * 90 + col * 70, 420);
                tocar(c.el, 'card', atraso);
                col++;
            });
        }, { rootMargin: '0px', threshold: 0 });
    }

    function registrarCartao(el) {
        if (!el || el.nodeType !== 1 || el.__shiuCard) return;
        el.__shiuCard = true;
        if (cardIO) cardIO.observe(el);
    }
    function esquecerCartao(el) {
        if (el && el.__shiuCard && cardIO) cardIO.unobserve(el);
    }
    window.SHIUMotion = { registrarCartao: registrarCartao, esquecerCartao: esquecerCartao, ativo: ativo };

    // ---------- Loops decorativos: pausa fora da tela, retoma ao voltar ----------
    if (hasIO) {
        var loops = document.querySelectorAll('.sound-loop, .atmos, .hero-arc'); // loops sonoros, atmosfera e arco
        var watcher = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                en.target.classList.toggle('is-offscreen', !en.isIntersecting);
            });
        }, { rootMargin: '200px 0px' });
        for (var k = 0; k < loops.length; k++) watcher.observe(loops[k]);
    }

    // ---------- Aba oculta: pausa todos os loops decorativos ----------
    function syncTab() { document.documentElement.classList.toggle('is-tab-hidden', !!document.hidden); }
    document.addEventListener('visibilitychange', syncTab);
    syncTab();
})();
