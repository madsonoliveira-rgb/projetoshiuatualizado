from app import app
from flask import render_template, jsonify, request
from funcoes import consultar_tabela, consultar_marcas, cadastrar_user, buscar_usuario, adicionar_produto
from flask_login import login_user, login_required, logout_user

@app.route('/')
def home():
    return render_template("homepage.html")


@app.route('/capturar_som')
def capturar():
    return render_template("captura.html")

@app.route('/api/produtos')
def get_produtos():
    return consultar_tabela()

@app.route('/api/marcas')
def get_marcas():
    return consultar_marcas()


#Adicionar os itens
@app.route('/adicionar', methods = ['GET', 'POST'])
def adicionar():
    if request.method == "POST":
        id_marca = request.form["id_marca"]
        nome_produto = request.form["nome_produto"]
        categoria = request.form["categoria_produto"]
        barulho = request.form["barulho"]
        link_imagem = request.form["link_imagem"]
        adicionar_produto(id_marca, nome_produto, categoria, barulho, link_imagem)
        resposta = "Produto cadastrado com sucesso!"
        return render_template("adicionar.html", resposta = resposta)
    return render_template("adicionar.html")

#Usuário e login é daqui pra baixo

@app.route('/perfil')
@login_required
def perfil():
    return render_template("perfil.html")

@app.route('/cadastro', methods=['GET', 'POST'])
def cadastro():
    if request.method == 'POST':
        email = request.form["email"]
        nome = request.form["nome"]
        senha = request.form["senha"]
        usuario = cadastrar_user(email, nome, senha)
        return render_template("login.html")
    return render_template("cadastrar.html")

@app.route('/login', methods=['GET', 'POST'])
def login():

    if request.method == 'POST':
        email = request.form["email"]
        senha = request.form["senha"]

        usuario = buscar_usuario(email, senha)

        if usuario:
            login_user(usuario)

            return render_template("homepage.html")
        resposta = "Email ou senha incorretos."
        return render_template("login.html", resposta = resposta)
    return render_template("login.html")

@app.route('/logout')
def logout():
    logout_user()
    return render_template("login.html")