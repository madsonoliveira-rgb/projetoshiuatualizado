/*
 * SHIU — efeitos visuais decorativos (página do microfone).
 * Desenha as ondas de malha de pontos atrás do painel.
 * Totalmente independente de audio.js: não acessa o microfone,
 * não altera elementos funcionais e não solicita permissões.
 */
(function () {
    'use strict';

    var canvas = document.querySelector('.wave-canvas');
    if (!canvas || !canvas.getContext) return;
    var stage = canvas.parentElement;
    var panel = document.querySelector('.mic-panel');
    var ctx = canvas.getContext('2d');

    var reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

    /*
     * Faixas de onda descritas nas coordenadas da referência (1505 × 1045),
     * com o painel centralizado em (753, 513) e 748 px de largura.
     * Cada faixa é formada por N linhas de pontos; o deslocamento de fase
     * entre as linhas cria as dobras luminosas da malha.
     */
    var RIBBONS = [
        { // esquerda — faixa principal
            pts: [[-120, 448], [0, 435], [110, 412], [230, 455], [377, 545], [460, 585]],
            gap: [[0, 5.0], [110, 6.4], [230, 5.4], [377, 4.1]],
            crest: [[0, 0.72], [110, 0.59], [230, 0.48], [377, 0.31]],
            x0: -2000, x1: 460, n: 46, amp: 14, len: 300, shift: 0.05,
            speed: 0.32, alpha: 1, edge: 0.8, rim: 0.32, fill: 0.06
        },
        { // esquerda — camada inferior
            pts: [[-120, 596], [0, 594], [150, 598], [300, 618], [460, 668]],
            gap: [[0, 4.4], [377, 3.4]],
            crest: [[0, 0.25], [377, 0.3]],
            x0: -2000, x1: 460, n: 22, amp: 12, len: 360, shift: 0.06,
            speed: 0.24, alpha: 0.55, edge: 0.45, rim: 0.3, fill: 0.04
        },
        { // direita — faixa de fundo (arco superior)
            pts: [[1050, 470], [1130, 425], [1240, 335], [1340, 290], [1440, 292], [1520, 320], [1640, 380]],
            gap: [[1130, 1.6], [1340, 2.6], [1505, 2.2]],
            crest: [[1130, 0.5], [1505, 0.5]],
            x0: 1050, x1: 3600, n: 20, amp: 10, len: 340, shift: 0.05,
            speed: 0.2, alpha: 0.42, edge: 0.25, rim: 0.12, fill: 0.03
        },
        { // direita — faixa principal (sobe para o canto)
            pts: [[1050, 492], [1130, 482], [1230, 452], [1310, 418], [1390, 392], [1505, 352], [1640, 318]],
            gap: [[1130, 0.9], [1230, 2.6], [1390, 4.8], [1505, 6.8]],
            crest: [[1130, 0.45], [1300, 0.38], [1505, 0.55]],
            x0: 1050, x1: 3600, n: 36, amp: 12, len: 280, shift: 0.05,
            speed: 0.3, alpha: 1, edge: 0.85, rim: 0.7, fill: 0.06
        },
        { // direita — faixa central
            pts: [[1050, 504], [1130, 500], [1260, 472], [1370, 482], [1505, 528], [1640, 560]],
            gap: [[1130, 2.2], [1505, 4.6]],
            crest: [[1130, 0.2], [1505, 0.3]],
            x0: 1050, x1: 3600, n: 26, amp: 12, len: 320, shift: 0.06,
            speed: 0.26, alpha: 0.8, edge: 0.5, rim: 0.6, fill: 0.05
        },
        { // direita — camada inferior
            pts: [[1050, 566], [1130, 562], [1300, 572], [1505, 560], [1640, 552]],
            gap: [[1130, 5.0], [1505, 6.2]],
            crest: [[1130, 0.3], [1505, 0.3]],
            x0: 1050, x1: 3600, n: 20, amp: 12, len: 380, shift: 0.07,
            speed: 0.22, alpha: 0.5, edge: 0.3, rim: 0.2, fill: 0.04
        }
    ];

    // Interpolação linear de um perfil [[x, valor], ...]
    function prof(arr, x) {
        if (x <= arr[0][0]) return arr[0][1];
        for (var i = 1; i < arr.length; i++) {
            if (x <= arr[i][0]) {
                var t = (x - arr[i - 1][0]) / (arr[i][0] - arr[i - 1][0]);
                return arr[i - 1][1] + (arr[i][1] - arr[i - 1][1]) * t;
            }
        }
        return arr[arr.length - 1][1];
    }
    var MOTION = 2.1;      // velocidade da ondulação (fator sobre speed)
    var MOTION_AMP = 1.45; // amplitude da ondulação (fator sobre amp)
    var REF_CX = 753, REF_CY = 513, REF_W = 748;

    // Curva de base: Catmull-Rom entre os pontos, extrapolação linear nas pontas.
    function baseY(pts, x) {
        var n = pts.length;
        if (x <= pts[0][0]) {
            var s0 = (pts[1][1] - pts[0][1]) / (pts[1][0] - pts[0][0]);
            return pts[0][1] + s0 * (x - pts[0][0]);
        }
        if (x >= pts[n - 1][0]) {
            var s1 = (pts[n - 1][1] - pts[n - 2][1]) / (pts[n - 1][0] - pts[n - 2][0]);
            return pts[n - 1][1] + s1 * (x - pts[n - 1][0]);
        }
        for (var i = 0; i < n - 1; i++) {
            if (x <= pts[i + 1][0]) {
                var p0 = pts[Math.max(i - 1, 0)][1], p1 = pts[i][1], p2 = pts[i + 1][1], p3 = pts[Math.min(i + 2, n - 1)][1];
                var t = (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
                var t2 = t * t, t3 = t2 * t;
                return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
            }
        }
        return pts[n - 1][1];
    }

    // Camada de brilho: cópia reduzida da cena, ampliada com suavização.
    var glow = document.createElement('canvas');
    var gctx = glow.getContext('2d');
    var GLOW_SCALE = 1 / 6;

    var W = 0, H = 0, dpr = 1, k = 1, cx = 0, cy = 0, small = false;
    var cache = [];

    function measure() {
        var r = stage.getBoundingClientRect();
        W = Math.max(1, Math.round(r.width));
        small = W < 720;
        dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
        H = Math.max(1, Math.round(r.height));
        small = W < 720;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        glow.width = Math.max(1, Math.round(W * GLOW_SCALE));
        glow.height = Math.max(1, Math.round(H * GLOW_SCALE));
        if (panel) {
            var p = panel.getBoundingClientRect();
            // escala pela largura da janela (o painel compacto não encolhe as ondas)
            k = Math.min(1.25, Math.max(0.55, W / 1505));
            cx = p.left - r.left + p.width / 2;
            cy = p.top - r.top + p.height / 2;
        } else {
            k = W / 1505; cx = W / 2; cy = H / 2;
        }
        buildCache();
    }

    // Pré-calcula a curva de base de cada faixa no espaço da tela.
    function buildCache() {
        cache = [];
        var step = (small ? 6 : 3.4); // px de tela entre pontos
        RIBBONS.forEach(function (rb) {
            var xs = [], ys = [], gs = [], cs = [];
            var refStep = step / k;
            var xa = Math.max(rb.x0, REF_CX - (cx + 40) / k);
            var xb = Math.min(rb.x1, REF_CX + (W - cx + 40) / k);
            for (var x = xa; x <= xb; x += refStep) {
                xs.push(x);
                ys.push(baseY(rb.pts, x));
                gs.push(prof(rb.gap, x));
                cs.push(prof(rb.crest, x));
            }
            var n = small ? Math.max(8, Math.round(rb.n * 0.55)) : rb.n;
            cache.push({ rb: rb, xs: xs, ys: ys, gs: gs, cs: cs, n: n, gapScale: rb.n / n });
        });
    }

    // Tons pré-calculados (evita montar cores a cada ponto).
    var LEVELS = 24, TONES = [];
    for (var L = 0; L < LEVELS; L++) {
        var f = L / (LEVELS - 1);
        TONES.push('rgba(' + Math.round(14 + 50 * f * f) + ',' + Math.round(84 + 80 * f * f) + ',255,' + (0.06 + 0.94 * f).toFixed(3) + ')');
    }

    function draw(time) {
        var t = time / 1000;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'lighter';
        var dot = small ? 1.8 : 1.5;

        for (var r = 0; r < cache.length; r++) {
            var c = cache[r], rb = c.rb, xs = c.xs, ys = c.ys, gs = c.gs, cs = c.cs, n = c.n;
            if (!xs.length) continue;
            var w = (2 * Math.PI) / rb.len;
            // movimento da própria malha: onda que percorre a faixa, contra-onda
            // mais lenta, amplitude que "respira" e espessura que pulsa —
            // as camadas ondulam com ritmos próprios, sem deslizar como imagem.
            var ph = t * rb.speed * MOTION;
            var ph2 = t * rb.speed * MOTION * 0.62;
            var A = rb.amp * MOTION_AMP * (1 + 0.32 * Math.sin(t * 0.45 + r * 1.7));
            var A2 = A * 0.55;
            var swell = 0.09 * Math.sin(t * 0.38 + r * 2.3);
            var drift = Math.sin(t * 0.33 + r * 1.3) * 7 + Math.sin(t * 0.21 + r) * 4;
            var crestLine = new Array(xs.length * 2), edgeTop = [], edgeBot = [];

            for (var i = 0; i < n; i++) {
                var v = i / (n - 1);                       // 0..1 através da faixa
                var fade = Math.min(1, (v + 0.08) / 0.22, (1 - v) / 0.22); // bordas suaves
                var skip = (small && i % 2) ? 1 : 0;
                for (var j = 0; j < xs.length; j++) {
                    var x = xs[j];
                    var gap = gs[j] * c.gapScale * (1 + swell * Math.sin(x * 0.006 + t * 0.5));
                    var arg = x * w + ph + i * rb.shift;
                    var y = ys[j] + drift
                        + (i - (n - 1) / 2) * gap
                        + A * Math.sin(arg)
                        + A2 * Math.sin(x * w * 0.47 - ph2 + i * rb.shift * 0.5);
                    var X = cx + (x - REF_CX) * k;
                    var Y = cy + (y - REF_CY) * k;
                    var ci = cs[j] * (n - 1);
                    if (i === 0) {
                        // crista: curva contínua no índice fracionário
                        var ca = x * w + ph + ci * rb.shift;
                        var cyy = ys[j] + drift + (ci - (n - 1) / 2) * gap + A * Math.sin(ca)
                            + A2 * Math.sin(x * w * 0.47 - ph2 + ci * rb.shift * 0.5);
                        crestLine[j * 2] = X; crestLine[j * 2 + 1] = cy + (cyy - REF_CY) * k;
                    }
                    if (i === 0) edgeTop.push(X, Y);
                    else if (i === n - 1) edgeBot.push(X, Y);
                    if (skip || ((i + j) & 1)) continue;
                    // luz concentrada na crista e nas faces voltadas para a luz
                    var d = Math.abs(i - ci) / (n * 0.5);
                    var near = d < 1 ? 1 - d : 0;
                    var lit = Math.cos(arg - 0.6);
                    lit = lit > 0 ? lit : 0;
                    var inner = rb.x1 < REF_CX ? (rb.x1 - x) / 160 : (x - rb.x0) / 160; // dissolve junto ao painel
                    if (inner < 1) { if (inner <= 0) continue; } else inner = 1;
                    var lv = rb.alpha * fade * inner * (0.36 + 0.9 * near * near + 0.45 * lit);
                    var idx = Math.min(LEVELS - 1, (lv * LEVELS) | 0);
                    if (idx < 1) continue;
                    ctx.fillStyle = TONES[idx];
                    ctx.fillRect(X - dot / 2, Y - dot / 2, dot, dot);
                }
            }
            fillBand(edgeTop, edgeBot, rb.fill);
            stroke(crestLine, rb.edge);
            if (rb.rim) stroke(edgeTop, rb.rim);
        }

        // dissolve suavemente as pontas internas (curvas, preenchimento e pontos) junto ao painel
        var xl = cx + (460 - REF_CX) * k, xr = cx + (1050 - REF_CX) * k, fw = 150 * k;
        var g = ctx.createLinearGradient(xl - fw, 0, xr + fw, 0);
        var span = (xr + fw) - (xl - fw);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(fw / span, 'rgba(0,0,0,1)');
        g.addColorStop(1 - fw / span, 'rgba(0,0,0,1)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = g;
        ctx.fillRect(xl - fw, 0, span, H);
        ctx.globalCompositeOperation = 'lighter';

        // brilho difuso sobre as faixas
        gctx.clearRect(0, 0, glow.width, glow.height);
        gctx.imageSmoothingEnabled = true;
        gctx.imageSmoothingQuality = 'high';
        gctx.drawImage(canvas, 0, 0, glow.width, glow.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.globalAlpha = 0.5; // brilho difuso discreto
        ctx.drawImage(glow, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    }

    function fillBand(top, bot, alpha) {
        if (top.length < 4 || bot.length < 4 || !alpha) return;
        ctx.beginPath();
        ctx.moveTo(top[0], top[1]);
        for (var i = 2; i < top.length; i += 2) ctx.lineTo(top[i], top[i + 1]);
        for (var j = bot.length - 2; j >= 0; j -= 2) ctx.lineTo(bot[j], bot[j + 1]);
        ctx.closePath();
        ctx.fillStyle = 'rgba(16, 76, 230,' + alpha.toFixed(3) + ')';
        ctx.fill();
    }

    function stroke(pts, alpha) {
        if (pts.length < 4) return;
        ctx.lineJoin = 'round';
        // brilho difuso
        ctx.strokeStyle = 'rgba(30, 110, 255,' + (alpha * 0.14).toFixed(3) + ')';
        ctx.lineWidth = 7;
        path(pts); ctx.stroke();
        // linha nítida
        ctx.strokeStyle = 'rgba(86, 160, 255,' + alpha.toFixed(3) + ')';
        ctx.lineWidth = 1;
        path(pts); ctx.stroke();
    }
    function path(pts) {
        ctx.beginPath();
        ctx.moveTo(pts[0], pts[1]);
        for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    }

    /*
     * Ciclo contínuo com requestAnimationFrame.
     * O tempo da animação só avança enquanto ela está rodando; ao pausar
     * (aba oculta ou ondas fora da tela) e retomar, o movimento continua
     * do mesmo ponto, sem saltos, e o loop é sempre reagendado.
     */
    var raf = 0, running = false, visible = true;
    var animTime = 0, lastNow = 0, lastPaint = 0;

    function shouldRun() {
        return !reduceMotion.matches && !document.hidden && visible;
    }
    function loop(now) {
        if (!running) return;
        raf = requestAnimationFrame(loop);
        var dt = now - lastNow;
        lastNow = now;
        if (dt > 0 && dt < 250) animTime += dt; // ignora saltos longos (ex.: retomada)
        var minFrame = small ? 66 : 33;         // ~15 fps no celular, ~30 fps no desktop
        if (now - lastPaint < minFrame) return;
        lastPaint = now;
        try { draw(animTime); } catch (e) { /* um quadro com falha não interrompe o ciclo */ }
    }
    function play() {
        if (reduceMotion.matches) {          // movimento reduzido: quadro estático fixo
            running = false;
            cancelAnimationFrame(raf);
            draw(0);
            return;
        }
        if (shouldRun()) {
            if (!running) {
                running = true;
                lastNow = performance.now();
                cancelAnimationFrame(raf);
                raf = requestAnimationFrame(loop);
            }
        } else if (running) {
            running = false;                 // pausa temporária; retoma em play()
            cancelAnimationFrame(raf);
        }
    }

    var resizeTimer = 0;
    function onResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            measure();
            // no modo estático redesenha sempre o mesmo quadro (sem "pulo")
            draw(reduceMotion.matches ? 0 : animTime);
        }, 120);
    }

    measure();
    draw(0);
    play();

    if (window.ResizeObserver) {
        new ResizeObserver(onResize).observe(stage);
    } else {
        window.addEventListener('resize', onResize);
    }
    document.addEventListener('visibilitychange', play);
    window.addEventListener('pageshow', play);
    if (window.IntersectionObserver) {
        new IntersectionObserver(function (entries) {
            visible = entries[entries.length - 1].isIntersecting;
            play();
        }).observe(stage);
    }
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', play);
    else if (reduceMotion.addListener) reduceMotion.addListener(play);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);
})();
