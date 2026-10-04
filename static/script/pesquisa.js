async function buscar() {
    let valor_pesquisar = document.getElementById('pesquisar').value.trim().toLowerCase();
    const container = document.getElementById('res');
    
    if (valor_pesquisar === "") return; // Evita busca vazia

    container.innerHTML = '<p style="text-align:center; width:100%;">Carregando...</p>';

    try {
        // 1. Busca marcas e produtos em paralelo (Mais rápido)
        const [resMarcas, resProdutos] = await Promise.all([
            fetch('/api/marcas'),
            fetch('/api/produtos')
        ]);

        const marcas = await resMarcas.json();
        const produtos = await resProdutos.json();

        container.innerHTML = ''; 

        // 2. Filtra as marcas
        const idsMarcasEncontradas = marcas
            .filter(m => m.nome.toLowerCase().includes(valor_pesquisar))
            .map(m => m.id);

        // 3. Filtra os produtos por nome ou por ID da marca encontrada
        const produtosFiltrados = produtos.filter(produto => {
            const nomeBate = produto.nome_produto.toLowerCase().includes(valor_pesquisar);
            const marcaBate = idsMarcasEncontradas.includes(produto.id_marca);
            return nomeBate || marcaBate;
        });

        // 4. Renderiza os resultados com o NOVO VISUAL
        if (produtosFiltrados.length === 0) {
            container.innerHTML = '<p style="text-align:center; width:100%;">Nenhum produto encontrado para sua pesquisa.</p>';
            return;
        }

        produtosFiltrados.forEach(produto => {
            container.appendChild(criarCardProduto(produto));
        });

    } catch (erro) {
        console.error("Erro na busca:", erro);
        container.innerHTML = 'Erro ao buscar dados.';
    }
}

// MANTENHA A FUNÇÃO criarCardProduto ATUALIZADA PARA O CSS NOVO
function criarCardProduto(produto_unico) {
    let div_geral = document.createElement('li'); // Mudamos para li para combinar com a <ul> #res
    div_geral.classList.add('card-aparelho');

    let imgBox = document.createElement('div');
    imgBox.classList.add('img-box');
    let imagem = document.createElement('img');
    imagem.src = produto_unico.link_imagem;
    imagem.alt = produto_unico.nome_produto;
    imgBox.appendChild(imagem);

    let cardInfo = document.createElement('div');
    cardInfo.classList.add('card-info');

    let titulo = document.createElement('h3');
    titulo.textContent = produto_unico.nome_produto;

    let nivel = document.createElement('div');
    nivel.classList.add('db-badge');
    nivel.textContent = `${produto_unico.barulho} dB`;

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

    cardInfo.append(titulo, nivel, tag);
    div_geral.append(imgBox, cardInfo);
    
    return div_geral;
}