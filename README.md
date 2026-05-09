#  PathFinder: Otimização de Rotas de Delivery

O **PathFinder** é um sistema inteligente de roteirização desenvolvido para otimizar trajetos de entrega de comida e vendedores ambulantes na cidade de Cruzeiro-SP. O projeto combina algoritmos clássicos de **Programação Linear** e **Busca Local** com tecnologias modernas de mapeamento geoespacial.

---

##  Funcionalidades Principais

### 1.  Laboratório de Algoritmos (Académico)
* **Resolução de PCV (Problema do Caixeiro Viajante):** Teste de algoritmos em matrizes de adjacência aleatórias ou fixas.
* **Análise Comparativa:** Execução automatizada baseada nos parâmetros da **Tabela 1** (Requisito da Disciplina), comparando o desempenho entre diferentes métodos.
* **Logs em Tempo Real:** Terminal interativo que exibe o histórico de soluções aceitas e a evolução do custo (distância).

### 2.  Simulador de Delivery Real (Cruzeiro-SP)
* **Mapa Interativo:** Integração com *Leaflet.js* e *OpenStreetMap*.
* **Geocodificação Inteligente:** Pesquisa de endereços com *autocomplete* e tratamento de termos (ignora automaticamente "Rua", "Travessa", etc. para buscas mais precisas).
* **Matriz de Distâncias Real:** Consumo da API *OSRM* para calcular distâncias baseadas na malha viária real (considerando curvas e sentidos de ruas).
* **Cálculo de Ciclo Fechado:** Garante que o estafeta parta do restaurante, visite todos os pontos e retorne à base.
* **Estimativa de Custos:** Cálculo automático de gasto de combustível baseado no consumo da moto e preço da gasolina.

### 3.  Módulo Genético (Beta)
* Visualização gráfica da evolução de *fitness* utilizando *Chart.js*.
* Estrutura preparada para implementação futura de algoritmos genéticos aplicados a rotas.

---

##  Tecnologias Utilizadas

**Backend:**
* Python 3.x
* Flask (Micro-framework Web)
* Flask-CORS (Segurança e comunicação)
* Requests (Consumo de APIs externas)

**Frontend:**
* HTML5 & CSS3 (Design moderno com foco em UX)
* JavaScript (ES6+)
* Leaflet.js (Mapas interativos)
* Chart.js (Gráficos de desempenho)

**APIs Externas:**
* **OSRM (Open Source Routing Machine):** Cálculo de matrizes de distância.
* **Nominatim (OpenStreetMap):** Pesquisa e identificação de endereços.

---

##  Algoritmos Implementados

O sistema utiliza três métodos principais de melhoria para encontrar a rota ideal:

1.  **Subida de Encosta (Hill Climbing):** Algoritmo de busca local que aceita apenas mudanças que reduzem o custo imediato.
2.  **Subida de Encosta com Tentativas (Restart):** Executa múltiplas buscas a partir de pontos iniciais aleatórios para evitar mínimos locais.
3.  **Têmpera Simulada (Simulated Annealing):** Inspirado na metalurgia, permite aceitar rotas piores no início para explorar o mapa e escapar de becos sem saída matemáticos, "esfriando" o sistema até encontrar o melhor resultado.

---

##  Como Executar o Projeto

1. **Instale as dependências:**
   
   python -m pip install flask flask-cors requests

1. **Inicie o servidor Backend:**

   python app.py

1. **Abra o sistema:**

   Basta abrir o ficheiro index.html em qualquer navegador

   obs: se o mapa iterativo apresentar erro, basta iniciar um servidor web para o Front-end:
   python -m http.server 8000 
   ou instalar a extensão "live server" e iniciar o index com ela

## Contexto Académico

**Disciplina: Programação Linear**

**Professor: Luis Fernando de Almeida**

**Instituição: FATEC Cruzeiro - SP**

**Desenvolvedores: Vinicius Gregorio & Robson Indalecio Barbosa Ribeiro**