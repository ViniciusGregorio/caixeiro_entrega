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
    return soma

def sucessor_pcv(atual, va, n, m):
    p = random.randint(0, n - 1)
    flag = True
    melhor = []
    vm = 0
    
    for i in range(n):
        if i != p:
            suc = atual.copy()
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
    
    for t in range(tmax):
        if t == 0:
            atual_start = si.copy()
        else:
            atual_start = list(range(n))
            random.shuffle(atual_start)
            
        va_start = avalia(atual_start, n, m)
        sol_local, custo_local, _ = metodo_subida_encosta(atual_start, va_start, n, m)
        
        if custo_local < va_global:
            melhor_global = sol_local.copy()
            va_global = custo_local
            historico.append({"rota": melhor_global.copy(), "custo": va_global, "obs": f"Tentativa {t+1}"})
            
    return melhor_global, va_global, historico

def metodo_tempera_simulada(si, vi, n, m, ti, tf, fr):
    atual = si.copy()
    va = vi
    melhor_global = atual.copy()
    va_global = va
    historico = []
    
    temperatura = ti
    iteracoes_por_temperatura = 20
    
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
    
  
    _, c_se, _ = metodo_subida_encosta(si, vi, n, m)
    resultados.append(f"SE: Melhor Custo Encontrado = {c_se}")
    

    tmax_vals = [n, max(1, int(n/2)), max(1, int(n/4))]
    for t in tmax_vals:
        _, c_set, _ = metodo_subida_tentativas(si, vi, n, m, t)
        resultados.append(f"SET (TMAX={t}): Melhor Custo = {c_set}")
        
    
    configs_te = [
        (100, 0.1, 0.8), (200, 0.1, 0.8), (500, 0.1, 0.8),
        (200, 0.1, 0.9), (500, 0.1, 0.9),
        (200, 0.01, 0.9), (500, 0.01, 0.9)
    ]
    for ti, tf, fr in configs_te:
        _, c_te, _ = metodo_tempera_simulada(si, vi, n, m, ti, tf, fr)
        resultados.append(f"TE (TI={ti}, TF={tf}, FR={fr}): Melhor Custo = {c_te}")
        
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
    
    if metodo == 'hill':
        sf, cf, historico = metodo_subida_encosta(si, vi, n, matriz)
        nome_metodo = "Subida de Encosta"
        parametros = "Padrão"
    elif metodo == 'hillRestart':
        sf, cf, historico = metodo_subida_tentativas(si, vi, n, matriz, tmax)
        nome_metodo = "Subida de Encosta com Tentativas"
        parametros = f"TMAX = {tmax}"
    elif metodo == 'annealing':
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


# ==========================================
# ROTA: MODO DELIVERY COM MAPA REAL (OSRM)
# ==========================================
@app.route('/calcular_delivery_mapa', methods=['POST'])
def calcular_delivery_mapa():
    dados = request.json
    coords = dados.get('coordenadas', [])
    metodo = dados.get('metodo', 'hill')
    
    tmax = dados.get('tmax', 5)
    ti = dados.get('ti', 100)
    tf = dados.get('tf', 0.1)
    fr = dados.get('fr', 0.8)
    
    n_real = len(coords)
    if n_real < 2:
        return jsonify({"erro": "Adicione pelo menos o Restaurante e um Cliente."})

    # Monta a URL para a API do OSRM (formato: lon,lat;lon,lat...)
    str_coords = ";".join([f"{c['lng']},{c['lat']}" for c in coords])
    url_osrm = f"http://router.project-osrm.org/table/v1/driving/{str_coords}?annotations=distance"
    
    try:
        resp = requests.get(url_osrm)
        osrm_data = resp.json()
        
        if osrm_data.get('code') != 'Ok':
            return jsonify({"erro": "Erro ao consultar as ruas no OSRM."})
            
        # O OSRM devolve uma matriz em metros. Vamos transformar em km.
        matriz_metros = osrm_data['distances']
        m_recortada = [[val / 1000.0 for val in linha] for linha in matriz_metros]
        
    except Exception as e:
        return jsonify({"erro": f"Erro de conexão com o OSRM: {str(e)}"})

    def avalia_tsp(sol, m):
        soma = 0
        for i in range(len(sol) - 1):
            soma += m[sol[i]][sol[i+1]]
        soma += m[sol[-1]][sol[0]]
        return soma

    si = list(range(n_real))
    vi = avalia_tsp(si, m_recortada)
    
    sf, cf = [], 0
    if metodo == 'hill':
        sf, cf, _ = metodo_subida_encosta(si, vi, n_real, m_recortada)
    elif metodo == 'hillRestart':
        sf, cf, _ = metodo_subida_tentativas(si, vi, n_real, m_recortada, tmax)
    else: 
        sf, cf, _ = metodo_tempera_simulada(si, vi, n_real, m_recortada, ti, tf, fr)
    
    cf = avalia_tsp(sf, m_recortada)
    
    idx_zero = sf.index(0)
    sf_rotacionado = sf[idx_zero:] + sf[:idx_zero]
    sf_rotacionado.append(0) # Volta para o restaurante
    
    return jsonify({
        "ordem_indices": sf_rotacionado,
        "distancia_km": round(cf, 2),
        "metodo_usado": metodo
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)