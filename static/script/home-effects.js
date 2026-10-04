/*
 * SHIU — comportamento visual da página inicial.
 * 1. "Ir para o catálogo" (Como funciona): rola até o catálogo e foca o
 *    campo real #pesquisar, sem executar a busca.
 * 2. Cards inseridos pelos scripts existentes em #res (div ou li) são
 *    registrados no motion.js e revelados ao chegar à tela. Apenas observa o
 *    container; não refaz consultas nem filtros.
 * 3. Profundidade pela rolagem: variáveis CSS de progresso para as camadas
 *    decorativas do hero e das atmosferas das seções.
 */
(function () {
    'use strict';
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    function reduced() { return !!(reduce && reduce.matches); }

    // ---------- 1. Link para a busca ----------
    function focarBusca() {
        var campo = document.getElementById('pesquisar');
        if (!campo) return;
        try { campo.focus({ preventScroll: true }); } catch (e) { campo.focus(); }
    }
    document.addEventListener('click', function (ev) {
        var link = ev.target.closest ? ev.target.closest('.js-ir-busca') : null;
        if (!link) return;
        var catalogo = document.getElementById('catalogo');
        if (!catalogo) return;
        ev.preventDefault();
        var suave = !reduced();
        catalogo.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' });
        if (history.replaceState) history.replaceState(null, '', '#catalogo');
        if (!suave) { focarBusca(); return; }
        var feito = false;
        function concluir() {
            if (feito) return;
            feito = true;
            window.removeEventListener('scrollend', concluir);
            focarBusca();
        }
        window.addEventListener('scrollend', concluir, { once: true });
        setTimeout(concluir, 900);
    });

    // ---------- 2. Cards do catálogo ----------
    // Os cards (div ou li .card-aparelho) são inseridos pelos scripts existentes
    // em #res. Aqui só observamos o container: cada card novo é registrado no
    // motion.js e revelado quando sua linha chega à tela (inclusive os que
    // estão abaixo da dobra). Não refaz consultas nem filtros.
    var res = document.getElementById('res');
    if (res && 'MutationObserver' in window) {
        var M = window.SHIUMotion;
        var MAX_STAGGER = 8, STEP = 40;
        function registrar(el) {
            if (el.nodeType !== 1 || !el.classList.contains('card-aparelho')) return false;
            if (M && M.registrarCartao) { M.registrarCartao(el); return true; }
            return false;
        }
        // cards que já estavam no container antes deste script
        var existentes = res.querySelectorAll('.card-aparelho');
        for (var i = 0; i < existentes.length; i++) registrar(existentes[i]);

        new MutationObserver(function (mutations) {
            var n = 0;
            mutations.forEach(function (m) {
                for (var r = 0; r < m.removedNodes.length; r++) {
                    if (M && M.esquecerCartao) M.esquecerCartao(m.removedNodes[r]);
                }
                for (var a = 0; a < m.addedNodes.length; a++) {
                    var el = m.addedNodes[a];
                    if (registrar(el)) continue;
                    // sem motion.js: entrada simples na inserção (comportamento anterior)
                    if (el.nodeType !== 1 || !el.classList.contains('card-aparelho')) continue;
                    if (reduced() || typeof Element.prototype.animate !== 'function' || n >= MAX_STAGGER) { n++; continue; }
                    el.animate(
                        [{ opacity: 0, translate: '0 10px' }, { opacity: 1, translate: '0 0' }],
                        { duration: 320, delay: n * STEP, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'backwards' }
                    );
                    n++;
                }
            });
        }).observe(res, { childList: true });
    }

    // ---------- 3. Profundidade pela rolagem ----------
    // A posição de rolagem controla o progresso das camadas decorativas:
    // · --hero-p (0 → 1) enquanto o hero sai da tela: cada camada se desloca
    //   em velocidade diferente (CSS), criando profundidade;
    // · --sec-p (-1 → 1) nas atmosferas do catálogo e de "Como funciona".
    // Só escreve variáveis CSS, uma vez por quadro e apenas com a seção visível.
    // Textos, controles e cards não são afetados. Rolagem continua nativa.
    var hero = document.querySelector('.hero');
    var secoes = Array.prototype.slice.call(document.querySelectorAll('.atmos-calm, .atmos-how'));
    if (hero && 'IntersectionObserver' in window) {
        var visiveis = new Set();
        var pendente = false;
        function quadro() {
            pendente = false;
            if (reduced()) return;
            var vh = window.innerHeight || document.documentElement.clientHeight;
            if (visiveis.has(hero)) {
                var h = hero.offsetHeight || 1;
                var p = Math.min(1, Math.max(0, (window.scrollY || window.pageYOffset) / h));
                hero.style.setProperty('--hero-p', p.toFixed(4));
            }
            secoes.forEach(function (sec) {
                if (!visiveis.has(sec)) return;
                var r = sec.getBoundingClientRect();
                var q = ((r.top + r.height / 2) - vh / 2) / vh;
                sec.style.setProperty('--sec-p', Math.max(-1, Math.min(1, q)).toFixed(4));
            });
        }
        function pedir() { if (!pendente) { pendente = true; requestAnimationFrame(quadro); } }
        var vigia = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) visiveis.add(en.target); else visiveis.delete(en.target);
            });
            pedir();
        });
        vigia.observe(hero);
        secoes.forEach(function (sec) { vigia.observe(sec); });
        window.addEventListener('scroll', pedir, { passive: true });
        window.addEventListener('resize', pedir);
        if (reduce && reduce.addEventListener) reduce.addEventListener('change', function () {
            if (reduced()) { hero.style.removeProperty('--hero-p'); secoes.forEach(function (s) { s.style.removeProperty('--sec-p'); }); }
            else pedir();
        });
        pedir();
    }
})();
