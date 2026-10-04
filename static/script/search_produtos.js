const filtrando = document.querySelector('.filtrar-select')


async function coletar_dados() {
    let consulta = await fetch('/api/produtos');
    let dados = await consulta.json();
    filtrar(dados)
}

function filtrar(dados){
        const categoria = filtrando.value
        printar(dados, categoria);
    };

async function printar(dados, categoria) {
    const container = document.getElementById('res');
    container.innerHTML = '';
    if(categoria == "null"){
        for (let produto of dados){
            const cardPronto = criarCardProduto(produto);
            container.appendChild(cardPronto);
        }
    }else{
        for (let produto of dados){
            if (produto.categoria == categoria){
                const cardPronto = criarCardProduto(produto, categoria)
                container.appendChild(cardPronto)
            }
        }
    }
}

filtrando.addEventListener('change', coletar_dados)
coletar_dados()

function criarCardProduto(produto_unico, categoria) {
    // 1. Cria o container principal com a classe do CSS novo
    let div_geral = document.createElement('div');
    div_geral.classList.add('card-aparelho');
    let categoria_titulo = document.getElementById('categoria-titulo')
    if(categoria == undefined){
        categoria_titulo.innerText = "Exibindo tudo!"
    }else{
        categoria_titulo.innerText = `Filtrando por: ${categoria}`
    }
    

    // 2. Cria a caixa da imagem (img-box)
    let imgBox = document.createElement('div');
    imgBox.classList.add('img-box');
    let imagem = document.createElement('img');
    imagem.src = produto_unico.link_imagem;
    imagem.alt = produto_unico.nome_produto;
    imgBox.appendChild(imagem);

    // 3. Cria a área de informações (card-info)
    let cardInfo = document.createElement('div');
    cardInfo.classList.add('card-info');

    let titulo = document.createElement('h3');
    titulo.textContent = produto_unico.nome_produto;

    let nivel = document.createElement('div');
    nivel.classList.add('db-badge');
    nivel.textContent = `${produto_unico.barulho} dB`;

    // 4. Lógica de cor da Tag (Opcional, mas deixa o projeto profissional)
    let tag = document.createElement('span');
    tag.classList.add('status-tag');
    const db = parseInt(produto_unico.barulho);
    
    if (db <= 55) {
        tag.classList.add('baixo');
        tag.textContent = 'Silencioso';
    } else if (db <= 75) {
        tag.classList.add('moderado');
        tag.textContent = 'Moderado';
    } else {
        tag.classList.add('alto');
        tag.textContent = 'Alto';
    }

    // Montagem final seguindo a hierarquia do CSS
    cardInfo.append(titulo, nivel, tag);
    div_geral.append(imgBox, cardInfo);
    
    return div_geral;
}