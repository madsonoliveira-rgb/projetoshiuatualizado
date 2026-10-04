from supabase_service import supabase
from flask import jsonify
from flask import Flask
from flask_login import LoginManager, UserMixin
from app import app

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"

class Usuario(UserMixin):
    def __init__(self, id,nome,senha, email):
        self.id = id
        self.nome = nome
        self.senha = senha
        self.email = email

#Carregar o usuário por ID
@login_manager.user_loader
def carregar_usuario(user_id):
    resposta = supabase.table('users').select('id', 'nome', 'senha', 'email').eq('id', user_id).execute()

    if resposta.data:
        usuario = resposta.data[0]

        return Usuario(
            usuario['id'],usuario['nome'],usuario['senha'], usuario['email']
        )
    return None

def consultar_tabela():
    consulta = (supabase.table("produtos").select("id_marca, nome_produto, categoria, barulho, link_imagem").execute())
    consulta_ok = consulta.data
    return jsonify(consulta_ok)

def consultar_marcas():
    consulta = (supabase.table("marcas").select("id, nome").execute())
    consulta_ok = consulta.data
    return jsonify(consulta_ok)

def cadastrar_user(email, nome, senha):
    resposta = supabase.table('users').insert({'email':email, 'nome':nome, 'senha':senha}).execute()
    
def buscar_usuario(email, senha):
    resposta = (
        supabase
        .table("users")
        .select("id, email, nome, senha")
        .eq("email", email)
        .eq("senha", senha)
        .execute()
    )

    if resposta.data:
        usuario = resposta.data[0]

        return Usuario(
            usuario["id"],
            usuario["nome"],
            usuario["senha"],
            usuario["email"]
        )

    return None

def adicionar_produto(id_marca, nome_produto, categoria_produto, barulho, link):
    adicao = supabase.table('produtos').insert({'id_marca':id_marca, 'nome_produto':nome_produto, 'categoria':categoria_produto, 'barulho': barulho, 'link_imagem': link}).execute()
