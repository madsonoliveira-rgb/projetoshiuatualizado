/*
 * SHIU — menu de navegação em telas estreitas (apenas apresentação).
 * Sem JavaScript, os links continuam visíveis (quebram para a linha de baixo).
 * Com JavaScript, em telas estreitas eles ficam num painel aberto pelo botão.
 * Não interage com busca, filtros, sessão nem captura de áudio.
 */
(function () {
    'use strict';
    var btn = document.querySelector('.nav-toggle');
    var menu = document.getElementById('menu-principal');
    if (!btn || !menu) return;

    document.documentElement.classList.add('has-nav-js');
    btn.hidden = false;

    function setOpen(open) {
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
        menu.classList.toggle('is-open', open);
    }

    btn.addEventListener('click', function () {
        setOpen(btn.getAttribute('aria-expanded') !== 'true');
    });
    // fecha ao escolher um link, com Esc ou ao clicar fora
    menu.addEventListener('click', function (ev) {
        if (ev.target.closest && ev.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { setOpen(false); btn.focus(); }
    });
    document.addEventListener('click', function (ev) {
        if (btn.getAttribute('aria-expanded') !== 'true') return;
        if (!menu.contains(ev.target) && !btn.contains(ev.target)) setOpen(false);
    });
    // ao voltar para telas largas, o painel não fica preso aberto
    var wide = window.matchMedia('(min-width: 861px)');
    function onWide() { if (wide.matches) setOpen(false); }
    if (wide.addEventListener) wide.addEventListener('change', onWide); else if (wide.addListener) wide.addListener(onWide);
})();
