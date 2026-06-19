from flask import Flask, request, jsonify
from flask_cors import CORS
import random
import math
import itertools
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



# ==========================================
# ALGORITMO GENÉTICO
# ==========================================

def fitness_pcv(ind, n, m):
    custo = avalia(ind, n, m)
    return 1.0 / custo


def selecao_roleta(pop, fitness):

    soma = sum(fitness)
    r = random.uniform(0, soma)

    acumulado = 0

    for i in range(len(pop)):
        acumulado += fitness[i]

        if acumulado >= r:
            return pop[i].copy()

    return pop[-1].copy()


def selecao_torneio(pop, fitness, k=3):

    candidatos = random.sample(range(len(pop)), k)

    melhor = candidatos[0]

    for i in candidatos[1:]:

        if fitness[i] > fitness[melhor]:
            melhor = i

    return pop[melhor].copy()


def cruzamento_ox(p1, p2, n):

    corte = random.randint(1, n - 1)

    filho = p1[:corte]

    for cidade in p2:
        if cidade not in filho:
            filho.append(cidade)

    return filho


def cruzamento_duplo(p1, p2, n):

    filho1 = cruzamento_ox(p1, p2, n)
    filho2 = cruzamento_ox(p2, p1, n)

    return filho1, filho2

"""
def mutacao(ind, tm, n):

    if random.random() <= tm:

        a, b = random.sample(range(n), 2)

        ind[a], ind[b] = ind[b], ind[a]

    return ind """


def mutacao_translocacao(ind, tm, n):
    if random.random() <= tm: 
        tamanho_bloco = random.randint(1, max(1, n // 3))  
        origem = random.randint(0, n - tamanho_bloco)  
        bloco = ind[origem : origem + tamanho_bloco]   
        ind_sem_bloco = ind[:origem] + ind[origem + tamanho_bloco:]             
        destino = random.randint(0, len(ind_sem_bloco))
        ind = ind_sem_bloco[:destino] + bloco + ind_sem_bloco[destino:]
        
    return ind


def ordenar_populacao(pop, m):

    return sorted(
        pop,
        key=lambda ind: avalia(ind, len(ind), m)
    )


def gerar_descendentes(pop, fitness, n, tp, tc, tm, metodo):

    descendentes = []

    while len(descendentes) < (2 * tp):


        if metodo == "torneio":
            pai1 = selecao_torneio(pop, fitness)
            pai2 = selecao_torneio(pop, fitness)
        else:
            pai1 = selecao_roleta(pop, fitness)
            pai2 = selecao_roleta(pop, fitness)

        if random.random() <= tc:
            filho1, filho2 = cruzamento_duplo(pai1, pai2, n)
        else:
            filho1 = pai1.copy()
            filho2 = pai2.copy()

        filho1 = mutacao_translocacao(filho1, tm, n)
        filho2 = mutacao_translocacao(filho2, tm, n)

        descendentes.append(filho1)
        descendentes.append(filho2)

    return descendentes


def nova_populacao(pop, descendentes, m, tp, ig):

    elite = max(2, int(tp * ig))

    pop = ordenar_populacao(pop, m)
    descendentes = ordenar_populacao(descendentes, m)

    nova = []

    nova.extend(pop[:elite])

    faltam = tp - elite

    nova.extend(descendentes[:faltam])

    return nova

@app.route('/executar_ag', methods=['POST'])
def executar_ag():

    dados = request.json

    n = dados.get('tamanho')
    m = dados.get('matriz')

    tp = dados.get('tamanho_pop', 50)
    ng = dados.get('geracoes', 100)

    tc = dados.get('taxa_cruzamento', 0.8)
    tm = dados.get('taxa_mutacao', 0.05)

    metodo = dados.get('metodo_selecao', 'roleta')

    ig = dados.get('intervalo_geracao', 0.2)

    populacao = []

    for _ in range(tp):

        individuo = list(range(n))
        random.shuffle(individuo)
        populacao.append(individuo)

    populacao = ordenar_populacao(populacao, m)

    melhor_global = populacao[0].copy()

    melhor_custo_global = avalia(
        melhor_global,
        n,
        m
    )

    historico_custos = []

    for geracao in range(ng):
        fitness = [
            fitness_pcv(ind, n, m)
            for ind in populacao
        ]

        descendentes = gerar_descendentes(
            populacao,
            fitness,
            n,
            tp,
            tc,
            tm,
            metodo
        )

        populacao = nova_populacao(
            populacao,
            descendentes,
            m,
            tp,
            ig
        )

        populacao = ordenar_populacao(
            populacao,
            m
        )

        melhor_geracao = populacao[0]

        custo_geracao = avalia(
            melhor_geracao,
            n,
            m
        )

        if custo_geracao < melhor_custo_global:
            melhor_custo_global = custo_geracao
            melhor_global = melhor_geracao.copy()
        historico_custos.append(
            melhor_custo_global
        )

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
    
    
    ag_pop = dados.get('ag_pop', 50)
    ag_gens = dados.get('ag_gens', 100)
    ag_mut = 0.05
    ag_cross = 0.8
    
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
    elif metodo == 'tempera':
        sf, cf, _ = metodo_tempera_simulada(si, vi, n_real, m_recortada, ti, tf, fr)
    elif metodo == 'genetico':
       
        populacao = []
        for _ in range(ag_pop):
            ind = list(range(n_real))
            random.shuffle(ind)
            populacao.append(ind)
            
        populacao = ordenar_populacao(populacao, m_recortada)
        melhor_global = populacao[0].copy()
        melhor_custo_global = avalia(melhor_global, n_real, m_recortada)
        
        for geracao in range(ag_gens):
            fitness = [fitness_pcv(ind, n_real, m_recortada) for ind in populacao]
            descendentes = gerar_descendentes(populacao, fitness, n_real, ag_pop, ag_cross, ag_mut, "roleta")
            populacao = nova_populacao(populacao, descendentes, m_recortada, ag_pop, 0.2)
            populacao = ordenar_populacao(populacao, m_recortada)
            
            custo_geracao = avalia(populacao[0], n_real, m_recortada)
            if custo_geracao < melhor_custo_global:
                melhor_custo_global = custo_geracao
                melhor_global = populacao[0].copy()
        
        sf = melhor_global
        cf = melhor_custo_global
    
   
    cf = avalia(sf, n_real, m_recortada)
    idx_zero = sf.index(0)
    sf_rotacionado = sf[idx_zero:] + sf[:idx_zero]
    sf_rotacionado.append(0) 
    
    return jsonify({
        "ordem_indices": sf_rotacionado,
        "distancia_km": round(cf, 2),
        "metodo_usado": metodo
    })


# GERAÇÃO DO RELATÓRIO FINAL

@app.route('/gerar_relatorio', methods=['POST'])
def gerar_relatorio():
    N = 50
    simulacoes = 20

    TP_list = [10, 50, 100]
    NG_list = [10, 50, 100, 200]
    TC_list = [0.2, 0.5, 0.8]
    TM_list = [0, 0.2, 0.8]
    IG_list = [0, 0.1, 0.7]


    m_fixa = [[0 if i == j else random.randint(1, 20) for j in range(N)] for i in range(N)]
    si_fixa = list(range(N))
    random.shuffle(si_fixa)
    vi_fixa = avalia(si_fixa, N, m_fixa)


    print("\n" + "="*60)
    print("📋 DADOS FIXOS PARA COLOCAR NO RELATÓRIO DO WORD:")
    print("Solução Inicial Fixa:")
    print(si_fixa)
    print(f"Custo Inicial (Vi): {vi_fixa}")
    print("="*60 + "\n")

   
    instancias = []
    for _ in range(simulacoes):
        instancias.append({"matriz": m_fixa, "si": si_fixa.copy(), "vi": vi_fixa})
    resultados_ag = []
    todas_combinacoes = list(itertools.product(TP_list, NG_list, TC_list, TM_list, IG_list))

    print(f"Iniciando laboratório. Testando {len(todas_combinacoes)} combinações do Genético...")

    for tp, ng, tc, tm, ig in todas_combinacoes:
        ganhos = []
        for inst in instancias:
            m, si, vi = inst["matriz"], inst["si"], inst["vi"]

            pop = [list(range(N)) for _ in range(tp)]
            for ind in pop: random.shuffle(ind)
            pop[0] = si.copy()
            pop = ordenar_populacao(pop, m)
            
            melhor_custo_global = avalia(pop[0], N, m)

            for geracao in range(ng):
                fitness = [fitness_pcv(ind, N, m) for ind in pop]
                desc = gerar_descendentes(pop, fitness, N, tp, tc, tm, "roleta")
                pop = nova_populacao(pop, desc, m, tp, ig)
                pop = ordenar_populacao(pop, m)
                
                custo = avalia(pop[0], N, m)
                if custo < melhor_custo_global:
                    melhor_custo_global = custo
            
            vf = melhor_custo_global
            ganho_perc = 100 * ((vi - vf) / vi) if vi > 0 else 0
            ganhos.append(ganho_perc)

        ganho_medio = sum(ganhos) / simulacoes
        resultados_ag.append({
            "parametros": f"TP:{tp} | NG:{ng} | TC:{tc} | TM:{tm} | IG:{ig}",
            "tp": tp, "ng": ng, "tc": tc, "tm": tm, "ig": ig,
            "ganho_medio": ganho_medio
        })

    resultados_ag.sort(key=lambda x: x["ganho_medio"], reverse=True)
    top_3_ag = resultados_ag[:3]

    print("Genético Concluído. Iniciando Parametros Locais...")

    tabela_final = []

    # 1. 3 Melhores Configurações do AG 
    for i, config in enumerate(top_3_ag):
        tabela_final.append({
            "metodo": f"Algoritmo Genético (Top {i+1})",
            "parametros": config["parametros"],
            "ganho_medio": config["ganho_medio"]
        })

    # 2. Subida de Encosta 
    ganhos_se = []
    for inst in instancias:
        _, cf, _ = metodo_subida_encosta(inst["si"], inst["vi"], N, inst["matriz"])
        ganho = 100 * ((inst["vi"] - cf) / inst["vi"])
        ganhos_se.append(ganho)
    tabela_final.append({"metodo": "Subida de Encosta (SE)", "parametros": "Configuração Única", "ganho_medio": sum(ganhos_se)/simulacoes})

    # 3. Subida com Tentativas (SET) 
    for tmax in [N, int(N/2)]:
        ganhos_set = []
        for inst in instancias:
            _, cf, _ = metodo_subida_tentativas(inst["si"], inst["vi"], N, inst["matriz"], tmax)
            ganhos_set.append(100 * ((inst["vi"] - cf) / inst["vi"]))
        tabela_final.append({"metodo": "Subida c/ Tentativas (SET)", "parametros": f"TMAX = {tmax}", "ganho_medio": sum(ganhos_set)/simulacoes})

    # 4. Têmpera Simulada (TS) 
    configs_ts = [[2000, 0.1, 0.8], [2000, 0.01, 0.8], [2000, 0.1, 0.9], [2000, 0.01, 0.9]]
    for ti, tf, fr in configs_ts:
        ganhos_ts = []
        for inst in instancias:
            _, cf, _ = metodo_tempera_simulada(inst["si"], inst["vi"], N, inst["matriz"], ti, tf, fr)
            ganhos_ts.append(100 * ((inst["vi"] - cf) / inst["vi"]))
        tabela_final.append({"metodo": "Têmpera Simulada (TS)", "parametros": f"TI={ti} | TF={tf} | FR={fr}", "ganho_medio": sum(ganhos_ts)/simulacoes})

    # Classificação Final
    tabela_final.sort(key=lambda x: x["ganho_medio"], reverse=True)

    print("[LOG] Análise global finalizada com sucesso. Retornando payload.")
    return jsonify({
        "top_ag": top_3_ag,
        "tabela_comparativa": tabela_final
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)