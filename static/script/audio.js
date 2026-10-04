let contexto;
let analisador;
let dados;
let rodando = false;
let intervaloId;

async function alternar() {
    const botao = document.getElementById('botao');
    const valorDisplay = document.getElementById('valor');
    const tagStatus = document.getElementById('tag-status');

    if (!rodando) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            contexto = new (window.AudioContext || window.webkitAudioContext)();
            const source = contexto.createMediaStreamSource(stream);
            analisador = contexto.createAnalyser();
            analisador.fftSize = 2048;
            source.connect(analisador);
            dados = new Float32Array(analisador.fftSize);

            rodando = true;
            // Atualiza o botão com ícone e cor de "parar"
            botao.innerHTML = '<i class="fas fa-stop"></i> Parar Teste';
            botao.style.background = "#EF4444"; // Vermelho para indicar parada

            intervaloId = setInterval(monitorar, 200); // 200ms deixa a atualização mais fluida
        } catch (err) {
            console.error("Erro ao acessar microfone:", err);
            alert("Não foi possível acessar o microfone. Verifique as permissões.");
        }
    } else {
        rodando = false;
        // Volta o botão ao estado original
        botao.innerHTML = '<i class="fas fa-microphone"></i> Iniciar Microfone';
        botao.style.background = ""; // Volta para a cor do CSS (var(--blue))
        
        clearInterval(intervaloId);

        if (contexto) {
            await contexto.close();
        }
        
        valorDisplay.innerText = "0.00";
        tagStatus.innerText = "Aguardando...";
        tagStatus.className = "status-tag baixo";
    }
}

function monitorar() {
    if (!analisador || !rodando) return;

    const valorDisplay = document.getElementById('valor');
    const tagStatus = document.getElementById('tag-status');

    analisador.getFloatTimeDomainData(dados);
    let soma = 0;
    for (let i = 0; i < dados.length; i++) {
        soma += dados[i] * dados[i];
    }
    let rms = Math.sqrt(soma / dados.length);
    let db = rms > 0 ? 20 * Math.log10(rms) : -100;
    
    // Ajuste de sensibilidade para exibição (offset de +100)
    let valorfinal = Math.max(0, db + 100);

    let imagemcard = document.getElementById('imagem-card')
    
    valorDisplay.innerText = valorfinal.toFixed(2);

    // --- LÓGICA DE CORES DO SHIU ---
    if (valorfinal < 50) {
        tagStatus.innerText = "Silencioso";
        tagStatus.className = "status-tag baixo";
        imagemcard.src = "static/img/som_baixo.png";
    } else if (valorfinal < 75) {
        tagStatus.innerText = "Moderado";
        tagStatus.className = "status-tag moderado";
        imagemcard.src = "static/img/sommedio.png";
    } else if (valorfinal < 85) {
        tagStatus.innerText = "Alto";
        tagStatus.className = "status-tag alto";
        imagemcard.src = "static/img/somalto.png";
    } else {
        tagStatus.innerText = "Muito Alto";
        tagStatus.className = "status-tag muito-alto";
        imagemcard.src = "static/img/sommuitoalto.png";
    }
}