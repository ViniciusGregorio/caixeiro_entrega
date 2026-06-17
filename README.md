# 🧭 PathFinder: Inteligência em Otimização de Rotas e Logística

O **PathFinder** é um sistema de roteirização desenvolvido para solucionar o clássico *Problema do Caixeiro Viajante (PCV)*. O foco da aplicação é otimizar trajetos para entregas de delivery e logística na cidade de Cruzeiro-SP. O projeto combina algoritmos de **Busca Local** e **Computação Evolutiva** com tecnologias de mapeamento geoespacial.

---

##  Funcionalidades Principais

### 1. 🔍 Laboratório de Algoritmos (Módulo Acadêmico)
* **Resolução de PCV Teórico:** Teste em matrizes de adjacência aleatórias ou inseridas manualmente.
* **Análise Comparativa de Ganhos:** Execução automatizada baseada nos parâmetros. O sistema calcula não apenas a melhor rota, mas o **Ganho (%)** e a economia de distância absoluta em relação à rota inicial cega.
* **Logs em Tempo Real:** Terminal interativo que exibe o histórico passo a passo das soluções aceitas pelo algoritmo.

### 2. 🏍️ Simulador de Delivery Real (Cruzeiro-SP)
* **Mapa Interativo CartoDB:** Integração com mapas em *Dark Mode* de alta performance, projetados para destacar as rotas sem causar fadiga visual.
* **Geocodificação Inteligente:** Pesquisa de endereços via *Nominatim* com *autocomplete* e limpeza de termos (ignora "Rua", "Travessa" etc., para buscas precisas).
* **Traçado pelas Ruas:** Consumo do endpoint `/route` da API *OSRM* para desenhar a linha da rota seguindo perfeitamente o asfalto, curvas e mãos das vias (GeoJSON), superando as linhas retas tradicionais.
* **Dinâmica de Entregas:** Cálculo de ciclo fechado (o entregador obrigatoriamente parte e retorna ao restaurante). Popup interativo nas marcações para exclusão individual de pontos.
* **Dashboard Financeiro:** Cálculo automático de custo de combustível com base no consumo da moto (km/L) e no preço da gasolina.

### 3. 🧬 Módulo Genético (Evolução Computacional)
Motor genético completo para simular a seleção natural aplicada a rotas:
* **Seleção:** Suporte a métodos de *Roleta* (proporcional ao fitness) e *Torneio*.
* **Cruzamento OX (Order Crossover):** Arquitetura que garante o nascimento de descendentes perfeitos, sem cidades repetidas ou ausentes.
* **Mutação por Translocação em Bloco:** Evolução do *swap*. Extrai e move blocos inteiros da rota para preservar "mini-caminhos" eficientes.
* **Monitoramento Gráfico:** Acompanhamento dinâmico da curva de minimização do custo utilizando *Chart.js*.
* Suporte a Elitismo e controle fino de gerações, taxa de mutação e população.

---

##  Stack Tecnológico

**Backend:**
* Python 3.x
* Flask (Micro-framework Web API)
* Flask-CORS (Segurança)
* Requests (Consumo de APIs externas)

**Frontend:**
* HTML5 & CSS3 (Design moderno, Grid Layout, Cards Interativos e Modais Dinâmicos)
* JavaScript (ES6+ assíncrono)
* Leaflet.js & CartoDB (Mapas e Tilesets de alta performance)
* Chart.js (Gráficos analíticos)

**APIs Externas:**
* **OSRM (Open Source Routing Machine):** Cálculo de matrizes de distância e extração de geometria de vias.
* **Nominatim (OpenStreetMap):** Autocomplete e geolocalização.

---

##  Algoritmos Implementados

O sistema conta com um pop-up interativo na interface que explica a lógica de cada um dos quatro métodos matemáticos implementados:

1. **Subida de Encosta (Hill Climbing):** Busca local gulosa que analisa a vizinhança e caminha em direção à melhoria imediata.
2. **Subida de Encosta com Tentativas (Restart):** Executa saltos aleatórios (*random restarts*) para forçar o sistema a escapar de Mínimos Locais e encontrar o Mínimo Global.
3. **Têmpera Simulada (Simulated Annealing):** Inspirado no resfriamento de metais, aceita rotas piores de propósito no início (com base em probabilidade termodinâmica) para explorar melhor o mapa.
4. **Algoritmo Genético (AG):** Motor de evolução simultânea de populações usando as regras clássicas de aptidão de Darwin adaptadas ao PCV.

---

##  Como Executar o Projeto

1. **Instale as dependências do Python:**
```bash
   python -m pip install flask flask-cors requests
   rode py app.py e clique no link(ou abra com a extensão live server)