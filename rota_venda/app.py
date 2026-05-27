from flask import Flask, request, jsonify
from flask_cors import CORS
import random
import math
import requests

app = Flask(__name__)
CORS(app)

def avalia(sol, n, m):
    soma = 0
    for i in range(len(sol) - 1):
        origem = sol[i]
        destino = sol[i+1]
        soma += m[origem][destino]
    
    soma += m[sol[-1]][sol[0]] 
    return soma

def sucessor_pcv(atual, va, n, m):
    melhor = atual.copy()
    vm = va
    
  
    for i in range(n - 1):
        for j in range(i + 1, n):
            suc = atual.copy()
          
            suc[i], suc[j] = suc[j], suc[i]
            
            vs = avalia(suc, n, m)
            
        
            if vs < vm:
                melhor = suc.copy()
                vm = vs
                
    return melhor, vm

def gera_vizinho_aleatorio(atual, n):
    novo = atual.copy()
    p1 = random.randint(0, n - 1)
    p2 = random.randint(0, n - 1)
    while p1 == p2:
        p2 = random.randint(0, n - 1)
    x = novo[p1]
    novo[p1] = novo[p2]
    novo[p2] = x
    return novo

def metodo_subida_encosta(si, vi, n, m):
    atual = si.copy()
    va = vi
    historico = []
    
    while True:
        novo, vn = sucessor_pcv(atual, va, n, m)
        if vn < va:
            atual = novo.copy()
            va = vn
            historico.append({"rota": atual.copy(), "custo": va})
        else:
            return atual, va, historico

def metodo_subida_tentativas(si, vi, n, m, tmax):
    melhor_global = si.copy()
    va_global = vi
    historico = []
    
    tentativas_sem_melhoria = 0
    total_tentativas = 0
    
    while tentativas_sem_melhoria < tmax:
        if total_tentativas == 0:
            atual_start = si.copy() 
        else:
            atual_start = list(range(n))
            random.shuffle(atual_start) 
            
        va_start = avalia(atual_start, n, m)
        sol_local, custo_local, _ = metodo_subida_encosta(atual_start, va_start, n, m)
        
        total_tentativas += 1
        
        if custo_local < va_global:
            melhor_global = sol_local.copy()
            va_global = custo_local
            historico.append({"rota": melhor_global.copy(), "custo": va_global, "obs": f"Tentativa {total_tentativas} (Zerou TMAX)"})
            
            tentativas_sem_melhoria = 0 
        else:
            tentativas_sem_melhoria += 1
            
    return melhor_global, va_global, historico

def metodo_tempera_simulada(si, vi, n, m, ti, tf, fr):
    atual = si.copy()
    va = vi
    melhor_global = atual.copy()
    va_global = va
    historico = []
    
    temperatura = ti
    iteracoes_por_temperatura = n * 10
    
    while temperatura > tf:
        for i in range(iteracoes_por_temperatura):
            novo = gera_vizinho_aleatorio(atual, n)
            vn = avalia(novo, n, m)
            delta = vn - va
            
            if delta < 0:
                atual = novo.copy()
                va = vn
                if va < va_global:
                    melhor_global = atual.copy()
                    va_global = va
                    historico.append({"rota": melhor_global.copy(), "custo": va_global, "obs": f"Temp: {temperatura:.2f}"})
            else:
                probabilidade = math.exp(-delta / temperatura)
                if random.random() < probabilidade:
                    atual = novo.copy()
                    va = vn
        temperatura = temperatura * fr
        
    return melhor_global, va_global, historico

def executar_analise_comparativa(si, vi, n, m):
    resultados = []
    resultados.append(f"--- ANÁLISE COMPARATIVA DE GANHO ---")
    resultados.append(f"Custo Inicial (Solução de Partida): {vi}\n")

    def calcular_ganho(custo_final):
        ganho_abs = vi - custo_final
        ganho_perc = (ganho_abs / vi) * 100 if vi > 0 else 0
        return f"Ganho: {ganho_abs:.2f} ({ganho_perc:.2f}%)"

    # 1. Subida de Encosta 
    _, c_se, _ = metodo_subida_encosta(si, vi, n, m)
    resultados.append(f"[SE] Subida de Encosta Padrão:\n -> Melhor Custo = {c_se} | {calcular_ganho(c_se)}\n")
    
    # 2. Subida de Encosta com Tentativas (SET)
    tmax_vals = [n, max(1, int(n/2)), max(1, int(n/4))]
    for t in tmax_vals:
        _, c_set, _ = metodo_subida_tentativas(si, vi, n, m, t)
        resultados.append(f"[SET] Tentativas (TMAX={t}):\n -> Melhor Custo = {c_set} | {calcular_ganho(c_set)}")
    resultados.append("") 
        
    # 3. Têmpera Simulada (TE)
    configs_te = [
        (100, 0.1, 0.8), (200, 0.1, 0.8), (500, 0.1, 0.8),
        (200, 0.1, 0.9), (500, 0.1, 0.9),
        (200, 0.01, 0.9), (500, 0.01, 0.9)
    ]
    for ti, tf, fr in configs_te:
        _, c_te, _ = metodo_tempera_simulada(si, vi, n, m, ti, tf, fr)
        resultados.append(f"[TE] Têmpera (TI={ti}, TF={tf}, FR={fr}):\n -> Melhor Custo = {c_te} | {calcular_ganho(c_te)}")
        
    return "\n".join(resultados)

@app.route('/gerar_problema_pcv', methods=['POST'])
def gerar_problema_pcv():
    dados = request.json
    n = dados.get('tamanho', 10)
    tipo_execucao = dados.get('tipo', 'random')
    str_inicial = dados.get('inicial', '')
    
    solucao_inicial = []
    
    if tipo_execucao == 'fixed' and str_inicial != '':
        partes = str_inicial.split(',')
        for p in partes:
            if p.strip() != '': 
                try:
                    solucao_inicial.append(int(p.strip()))
                except ValueError:
                    return jsonify({"erro": "Entrada inválida. Digite apenas números separados por vírgula."})
        
        if len(solucao_inicial) != n:
            return jsonify({"erro": f"Você escolheu Tamanho {n}, mas digitou {len(solucao_inicial)} números. A quantidade deve ser exata."})
            
        for val in solucao_inicial:
            if val < 0 or val >= n:
                return jsonify({"erro": f"Número inválido detectado: {val}.\nPara um problema de tamanho {n}, os números válidos são de 0 até {n-1}."})
                
        if len(set(solucao_inicial)) != len(solucao_inicial):
            return jsonify({"erro": "A solução inicial não pode conter números repetidos!"})
    else:
        solucao_inicial = list(range(n))
        random.shuffle(solucao_inicial)
    
    m = [[0] * n for i in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                m[i][j] = random.randint(1, 20) 
            else:
                m[i][j] = 0
                
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
    si = dados.get('solucao_inicial')
    n = len(si)
    vi = avalia(si, n, matriz)
    
    tmax = dados.get('tmax', 5)
    ti = dados.get('ti', 100)
    tf = dados.get('tf', 0.1)
    fr = dados.get('fr', 0.8)
    
    sf, cf, historico, parametros = [], 0, [], ""
    resultado_comparativo = ""
    
    if metodo == 'encosta':
        sf, cf, historico = metodo_subida_encosta(si, vi, n, matriz)
        nome_metodo = "Subida de Encosta"
        parametros = "Padrão"
    elif metodo == 'tentativas':
        sf, cf, historico = metodo_subida_tentativas(si, vi, n, matriz, tmax)
        nome_metodo = "Subida de Encosta com Tentativas"
        parametros = f"TMAX = {tmax}"
    elif metodo == 'tempera':
        sf, cf, historico = metodo_tempera_simulada(si, vi, n, matriz, ti, tf, fr)
        nome_metodo = "Têmpera Simulada"
        parametros = f"TI = {ti}, TF = {tf}, FR = {fr}"
    elif metodo == 'comparativa':
        resultado_comparativo = executar_analise_comparativa(si, vi, n, matriz)
        nome_metodo = "Análise Comparativa (Tabela 1 do PDF)"
        return jsonify({"metodo": metodo, "resultado_comparativo": resultado_comparativo})
        
    return jsonify({
        "nome_metodo": nome_metodo,
        "parametros": parametros,
        "historico": historico,
        "solucao_final": sf,
        "custo_final": cf
    })



# ALGORITMO GENÉTICO

def fitness_pcv(sol, n, m):
    custo = avalia(sol, n, m)
    if custo == 0:
        return 99999 
    return 1.0 / custo

def selecao_roleta(populacao, fitness_pop):
    soma_fit = sum(fitness_pop)
    r = random.uniform(0, soma_fit)
    soma_parcial = 0
    for i, fit in enumerate(fitness_pop):
        soma_parcial += fit
        if soma_parcial >= r:
            return populacao[i]
    return populacao[-1]

def selecao_torneio(populacao, fitness_pop, k=3):
    selecionados = random.sample(list(zip(populacao, fitness_pop)), k)
    melhor = max(selecionados, key=lambda x: x[1])
    return melhor[0]

def cruzamento_ox(pai1, pai2, n):
    filho = [-1] * n
    a, b = sorted(random.sample(range(n), 2))
    filho[a:b+1] = pai1[a:b+1] 
    
    p2_filtrado = [x for x in pai2 if x not in filho] 
    idx = 0
    for i in range(n):
        if filho[i] == -1:
            filho[i] = p2_filtrado[idx]
            idx += 1
    return filho

def mutacao_swap(ind, taxa_mutacao, n):
    if random.random() < taxa_mutacao:
        a, b = random.sample(range(n), 2)
        ind[a], ind[b] = ind[b], ind[a]
    return ind

@app.route('/executar_ag', methods=['POST'])
def executar_ag_rota():
    dados = request.json
    n = dados.get('tamanho')
    m = dados.get('matriz')
    tamanho_pop = dados.get('tamanho_pop', 50)
    geracoes = dados.get('geracoes', 100)
    taxa_mutacao = dados.get('taxa_mutacao', 0.05)
    taxa_cruzamento = dados.get('taxa_cruzamento', 0.8)
    elitismo = dados.get('elitismo', True)
    metodo_selecao = dados.get('metodo_selecao', 'roleta')

    populacao = []
    for _ in range(tamanho_pop):
        ind = list(range(n))
        random.shuffle(ind)
        populacao.append(ind)

    melhor_global = None
    melhor_custo_global = float('inf')
    historico_custos = []

    for geracao in range(geracoes):
        fitness_pop = [fitness_pcv(ind, n, m) for ind in populacao]
        custos_pop = [avalia(ind, n, m) for ind in populacao]

        melhor_idx = custos_pop.index(min(custos_pop))
        if custos_pop[melhor_idx] < melhor_custo_global:
            melhor_custo_global = custos_pop[melhor_idx]
            melhor_global = populacao[melhor_idx].copy()

        historico_custos.append(melhor_custo_global)

        nova_populacao = []

        if elitismo:
            nova_populacao.append(melhor_global.copy())

        while len(nova_populacao) < tamanho_pop:
            if metodo_selecao == 'torneio':
                pai1 = selecao_torneio(populacao, fitness_pop)
                pai2 = selecao_torneio(populacao, fitness_pop)
            else:
                pai1 = selecao_roleta(populacao, fitness_pop)
                pai2 = selecao_roleta(populacao, fitness_pop)

            if random.random() < taxa_cruzamento:
                filho = cruzamento_ox(pai1, pai2, n)
            else:
                filho = pai1.copy() if random.random() < 0.5 else pai2.copy()

            filho = mutacao_swap(filho, taxa_mutacao, n)
            nova_populacao.append(filho)

        populacao = nova_populacao[:tamanho_pop]

    return jsonify({
        "melhor_rota": melhor_global,
        "melhor_custo": melhor_custo_global,
        "historico_custos": historico_custos
    })


#MODO DELIVERY COM MAPA

@app.route('/calcular_delivery_mapa', methods=['POST'])
def calcular_delivery_mapa():
    dados = request.json
    coords = dados.get('coordenadas', [])
    metodo = dados.get('metodo', 'encosta')
    
    tmax = dados.get('tmax', 5)
    ti = dados.get('ti', 100)
    tf = dados.get('tf', 0.1)
    fr = dados.get('fr', 0.8)
    
    n_real = len(coords)
    if n_real < 2:
        return jsonify({"erro": "Adicione pelo menos o Restaurante e um Cliente."})
    if n_real > 50:
        return jsonify({"erro": f"Limite máximo atingido. Selecionou {n_real} pontos, mas o máximo permitido é 50."})

    
    str_coords = ";".join([f"{c['lng']},{c['lat']}" for c in coords])
    url_osrm = f"http://router.project-osrm.org/table/v1/driving/{str_coords}?annotations=distance"
    
    try:
        resp = requests.get(url_osrm)
        osrm_data = resp.json()
        
        if osrm_data.get('code') != 'Ok':
            return jsonify({"erro": "Erro ao consultar as ruas no OSRM."})
            
        
        matriz_metros = osrm_data['distances']
        m_recortada = [[val / 1000.0 for val in linha] for linha in matriz_metros]
        
    except Exception as e:
        return jsonify({"erro": f"Erro de conexão com o OSRM: {str(e)}"})


    si = list(range(n_real))
    vi = avalia(si, n_real, m_recortada)
    
    sf, cf = [], 0
    if metodo == 'encosta':
        sf, cf, _ = metodo_subida_encosta(si, vi, n_real, m_recortada)
    elif metodo == 'tentativas':
        sf, cf, _ = metodo_subida_tentativas(si, vi, n_real, m_recortada, tmax)
    else: 
        sf, cf, _ = metodo_tempera_simulada(si, vi, n_real, m_recortada, ti, tf, fr)
    
    cf = avalia(sf, n_real, m_recortada)
    
    idx_zero = sf.index(0)
    sf_rotacionado = sf[idx_zero:] + sf[:idx_zero]
    sf_rotacionado.append(0) 
    
    return jsonify({
        "ordem_indices": sf_rotacionado,
        "distancia_km": round(cf, 2),
        "metodo_usado": metodo
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)