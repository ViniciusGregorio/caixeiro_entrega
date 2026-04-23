from flask import Flask, request, jsonify
from flask_cors import CORS
import random
import math

app = Flask(__name__)
CORS(app)

# ==========================================
# FUNÇÕES DE APOIO (Lousa do Professor)
# ==========================================
def avalia(sol, n, m):
    soma = 0
    for i in range(n - 1):
        origem = sol[i]
        destino = sol[i+1]
        soma += m[origem][destino]
    return soma

def sucessor_pcv(atual, va, n, m):
    # Gera todos os vizinhos fazendo um swap com uma posição aleatória (p) e pega o melhor
    p = random.randint(0, n - 1)
    flag = True
    melhor = []
    vm = 0
    
    for i in range(n):
        if i != p:
            suc = atual.copy()
            # Swap manual
            x = suc[i]
            suc[i] = suc[p]
            suc[p] = x
            
            vs = avalia(suc, n, m)
            
            if flag == True:
                melhor = suc.copy()
                vm = vs
                flag = False
            else:
                if vs < vm:
                    melhor = suc.copy()
                    vm = vs
                    
    return melhor, vm

def gera_vizinho_aleatorio(atual, n):
    # Função auxiliar para a Têmpera Simulada (que precisa de vizinho aleatório, não do melhor)
    novo = atual.copy()
    p1 = random.randint(0, n - 1)
    p2 = random.randint(0, n - 1)
    while p1 == p2:
        p2 = random.randint(0, n - 1)
    
    x = novo[p1]
    novo[p1] = novo[p2]
    novo[p2] = x
    return novo

# ==========================================
# MÉTODOS DE BUSCA
# ==========================================
def metodo_subida_encosta(si, vi, n, m):
    atual = si.copy()
    va = vi
    
    while True:
        novo, vn = sucessor_pcv(atual, va, n, m)
        
        if vn < va:
            atual = novo.copy()
            va = vn
        else:
            return atual, va

def metodo_subida_tentativas(si, vi, n, m):
    # Executa a subida de encosta 5 vezes a partir de pontos diferentes
    tentativas = 5
    melhor_global = si.copy()
    va_global = vi
    
    for t in range(tentativas):
        if t == 0:
            # A primeira tentativa usa a solução inicial passada pelo usuário
            atual_start = si.copy()
        else:
            # As próximas geram uma rota embaralhada nova
            atual_start = list(range(n))
            random.shuffle(atual_start)
            
        va_start = avalia(atual_start, n, m)
        
        # Faz a subida de encosta normal
        solucao_local, custo_local = metodo_subida_encosta(atual_start, va_start, n, m)
        
        # Verifica se achou algo melhor que o recorde global
        if custo_local < va_global:
            melhor_global = solucao_local.copy()
            va_global = custo_local
            
    return melhor_global, va_global

def metodo_tempera_simulada(si, vi, n, m):
    atual = si.copy()
    va = vi
    
    melhor_global = atual.copy()
    va_global = va
    
    # Parâmetros clássicos da Têmpera Simulada
    temperatura = 100.0
    resfriamento = 0.95
    iteracoes_por_temperatura = 20
    
    while temperatura > 0.1:
        for i in range(iteracoes_por_temperatura):
            novo = gera_vizinho_aleatorio(atual, n)
            vn = avalia(novo, n, m)
            
            delta = vn - va
            
            if delta < 0:
                # O vizinho é melhor, aceita direto
                atual = novo.copy()
                va = vn
                if va < va_global:
                    melhor_global = atual.copy()
                    va_global = va
            else:
                # O vizinho é pior, aceita com uma probabilidade que diminui com a temperatura
                probabilidade = math.exp(-delta / temperatura)
                if random.random() < probabilidade:
                    atual = novo.copy()
                    va = vn
                    
        # Esfria o sistema
        temperatura = temperatura * resfriamento
        
    return melhor_global, va_global

# ==========================================
# ROTAS DA API
# ==========================================
@app.route('/gerar_problema_pcv', methods=['POST'])
def gerar_problema_pcv():
    dados = request.json
    n = dados.get('tamanho', 10)
    tipo_execucao = dados.get('tipo', 'random')
    str_inicial = dados.get('inicial', '')
    
    # Cria matriz assimétrica de pesos (1 a 20)
    m = [[0] * n for i in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                m[i][j] = random.randint(1, 20) 
            else:
                m[i][j] = 0
                
    solucao_inicial = []
    
    if tipo_execucao == 'fixed' and str_inicial != '':
        # Transforma a string "0,1,2,3" recebida do JS em uma lista de inteiros
        partes = str_inicial.split(',')
        for p in partes:
            solucao_inicial.append(int(p.strip()))
    else:
        # Gera aleatório
        solucao_inicial = list(range(n))
        random.shuffle(solucao_inicial)
    
    return jsonify({
        "matriz": m,
        "solucao_inicial": solucao_inicial,
        "custo_inicial": avalia(solucao_inicial, n, m)
    })

@app.route('/executar_basico', methods=['POST'])
def executar_basico():
    dados = request.json
    metodo = dados.get('metodo')
    matriz = dados.get('matriz')
    solucao_inicial = dados.get('solucao_inicial')
    n = len(solucao_inicial)
    
    custo_inicial = avalia(solucao_inicial, n, matriz)
    
    if metodo == 'hill':
        sf, cf = metodo_subida_encosta(solucao_inicial, custo_inicial, n, matriz)
        nome_metodo = "Subida de Encosta"
    elif metodo == 'hillRestart':
        sf, cf = metodo_subida_tentativas(solucao_inicial, custo_inicial, n, matriz)
        nome_metodo = "Subida de Encosta com Tentativas"
    elif metodo == 'annealing':
        sf, cf = metodo_tempera_simulada(solucao_inicial, custo_inicial, n, matriz)
        nome_metodo = "Têmpera Simulada"
    else:
        return jsonify({"erro": "Método inválido."})
        
    return jsonify({
        "nome_metodo": nome_metodo,
        "solucao_final": sf,
        "custo_final": cf
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)