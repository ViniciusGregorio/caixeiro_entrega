let matrizProblema = [];
let solucaoAtual = [];
let custoAtual = 0;
let problemaAG = [];

document.addEventListener("DOMContentLoaded", () => {
    let selectTipo = document.getElementById("tipoExecucao");
    let inputSolucao = document.getElementById("solucaoInicial");

    function checarInput() {
        if (selectTipo.value === "random") {
            inputSolucao.disabled = true;
            inputSolucao.value = ""; 
        } else {
            inputSolucao.disabled = false;
        }
    }

    checarInput();
    selectTipo.addEventListener("change", checarInput);
    toggleParametros(); 
});

function showScreen(id){
    document.querySelectorAll(".screen").forEach(s=>{
        s.classList.remove("active");
    });
    document.getElementById(id).classList.add("active");
    
    if(id === 'appReal') {
        setTimeout(() => initMapa(), 100);
    }
}

function toggleParametros() {
    let metodo = document.getElementById("metodoBusca").value;
    document.getElementById("paramsSET").style.display = (metodo === "tentativas") ? "block" : "none";
    document.getElementById("paramsTE").style.display = (metodo === "tempera") ? "block" : "none";
}

async function gerarProblema(){
    let n = parseInt(document.getElementById("tamProblema").value);
    let tipo = document.getElementById("tipoExecucao").value;
    let inicial = document.getElementById("solucaoInicial").value;
    
    try {
        let response = await fetch('http://127.0.0.1:5000/gerar_problema_pcv', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ tamanho: n, tipo: tipo, inicial: inicial })
        });
        let data = await response.json();
        
        if (data.erro) {
            document.getElementById("saidaBasico").textContent = " [ERRO DE VALIDAÇÃO]\n" + data.erro;
            matrizProblema = []; 
            return; 
        }
        
        matrizProblema = data.matriz;
        solucaoAtual = data.solucao_inicial;
        custoAtual = data.custo_inicial;
        
        let matrizTexto = data.matriz.map(linha => linha.join("\t")).join("\n");
        document.getElementById("saidaBasico").textContent = "=== MATRIZ DE ADJACÊNCIAS ===\n\n" + matrizTexto;
            
    } catch (error) {
        document.getElementById("saidaBasico").textContent = "Erro de conexão! O arquivo app.py está rodando?";
    }
}

function gerarSolucaoInicial() {
    if (matrizProblema.length === 0) {
        alert("Clique em 'Gerar Problema' primeiro!");
        return;
    }
    document.getElementById("saidaBasico").textContent += 
        "\n\n=== SOLUÇÃO INICIAL E AVALIAÇÃO ===" +
        "\nRota Inicial: [" + solucaoAtual.join(", ") + "]" +
        "\nCusto Inicial: " + custoAtual;
}

async function executarBasico(){
    if (matrizProblema.length === 0) {
        alert("Gere o problema primeiro!");
        return;
    }

    let metodo = document.getElementById("metodoBusca").value;
    let tmax = document.getElementById("tmax") ? parseInt(document.getElementById("tmax").value) : 5;
    let ti = document.getElementById("ti") ? parseFloat(document.getElementById("ti").value) : 100;
    let tf = document.getElementById("tf") ? parseFloat(document.getElementById("tf").value) : 0.1;
    let fr = document.getElementById("fr") ? parseFloat(document.getElementById("fr").value) : 0.8;

    let payload = {
        metodo: metodo,
        matriz: matrizProblema,
        solucao_inicial: solucaoAtual,
        tmax: tmax,
        ti: ti,
        tf: tf,
        fr: fr
    };
    
    document.getElementById("saidaBasico").textContent += "\n\nProcessando...";
    
    try {
        let response = await fetch('http://127.0.0.1:5000/executar_basico', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        let data = await response.json();
        
        if(data.erro) {
            document.getElementById("saidaBasico").textContent += "\n\n[ERRO]: " + data.erro;
            return;
        }
        
        let saida = "";
        if (metodo === "comparativa") {
            saida = "\n\n=== RESULTADO DA ANÁLISE COMPARATIVA ===\n\n" + data.resultado_comparativo;
        } else {
            saida = "\n\n=== RESULTADO DA EXECUÇÃO ===\n";
            saida += "Método: " + data.nome_metodo + "\n";
            saida += "Parâmetros Usados: " + data.parametros + "\n";
            if (data.historico && data.historico.length > 0) {
                saida += "\n--- Histórico de Soluções Aceitas ---\n";
                data.historico.forEach((passo, index) => {
                    saida += `Passo ${index + 1}: [${passo.rota.join(", ")}] | Custo: ${passo.custo} ${passo.obs ? '('+passo.obs+')' : ''}\n`;
                });
            }
            saida += "\n>>> MELHOR ROTA FINAL: [" + data.solucao_final.join(", ") + "]";
            saida += "\n>>> CUSTO FINAL: " + data.custo_final;
        }

        document.getElementById("saidaBasico").textContent += saida;
    } catch (error) {
        document.getElementById("saidaBasico").textContent += "\n\nErro na execução. O backend está rodando?";
    }
}


async function chamarAG() {
    if (matrizProblema.length === 0) {
        alert("Volte na aba 'Algoritmo Básico' e gere a Matriz do Problema primeiro!");
        return;
    }

    let payload = {
        tamanho: matrizProblema.length,
        matriz: matrizProblema,
        tamanho_pop: parseInt(document.getElementById("ag_pop").value),
        geracoes: parseInt(document.getElementById("ag_gens").value),
        taxa_mutacao: parseFloat(document.getElementById("ag_mut").value),
        taxa_cruzamento: parseFloat(document.getElementById("ag_cross").value),
        metodo_selecao: document.getElementById("ag_selecao").value,
        elitismo: document.getElementById("ag_elitismo").checked,
        intervalo_geracao: parseFloat(document.getElementById("ag_ig").value),
    };

    document.getElementById("saidaAG").textContent = "🧬 Cruzando gerações e evoluindo população...\nAguarde alguns instantes.";

    try {
        let response = await fetch('http://127.0.0.1:5000/executar_ag', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        
        let data = await response.json();

        if(data.erro) {
            document.getElementById("saidaAG").textContent = "❌ [ERRO]: " + data.erro;
            return;
        }

        document.getElementById("saidaAG").textContent = 
            "=== RESULTADO ALGORITMO GENÉTICO ===\n\n" +
            "📍 Melhor Rota Evoluída: [" + data.melhor_rota.join(", ") + "]\n" +
            "🛣️ Custo (Distância): " + data.melhor_custo;

        // O Chart.js agora vai desenhar uma curva DESCENDENTE (minimizando o custo!)
        mostrarGrafico(data.historico_custos);

    } catch (e) {
        document.getElementById("saidaAG").textContent = "Erro na conexão com a API do Genético.";
    }
}

let chartInstance = null;
function mostrarGrafico(dados){
    let ctx=document.getElementById("grafico");
    if(chartInstance != null){
        chartInstance.destroy();
    }
    chartInstance = new Chart(ctx,{
        type:"line",
        data:{
            labels:dados.map((_,i)=>i),
            datasets:[{
                label: "Evolução do Custo",
                data:dados,
                borderColor: "#38bdf8",
                backgroundColor: "rgba(56, 189, 248, 0.1)",
                tension: 0.1
            }]
        }
    });
}


// MODO DELIVERY - Leaflet + OSRM + Nominatim

let mapaDelivery = null;
let coordenadas = []; 
let marcadores = [];
let linhaRota = null;
let timeoutBusca = null;

function toggleParametrosReal() {
    let metodo = document.getElementById("metodoReal").value;
    document.getElementById("paramsRealSET").style.display = (metodo === "tentativas") ? "block" : "none";
    document.getElementById("paramsRealTE").style.display = (metodo === "tempera") ? "block" : "none";
    document.getElementById("paramsRealAG").style.display = (metodo === "genetico") ? "block" : "none";
}

function initMapa() {
    if (mapaDelivery !== null) {
        mapaDelivery.invalidateSize();
        return;
    }
    
    mapaDelivery = L.map('mapaDelivery').setView([-22.5761, -44.9631], 14);
    
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(mapaDelivery);

    mapaDelivery.on('click', async function(e) {
        let lat = e.latlng.lat;
        let lng = e.latlng.lng;
        
        try {
            let response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            let data = await response.json();
            
            let nomeRua = data.address.road || "Rua não identificada";
            let numero = data.address.house_number ? `, ${data.address.house_number}` : "";
            let bairro = data.address.suburb ? ` - ${data.address.suburb}` : "";
            
            let nomeCompleto = `${nomeRua}${numero}${bairro}`;
            adicionarPontoNoMapa(lat, lng, nomeCompleto);
        } catch(err) {
            adicionarPontoNoMapa(lat, lng, "Local desconhecido");
        }
    });
}

function limparTermoBusca(termo) {
    return termo.replace(/^(rua|r\.|avenida|av\.|travessa|tv\.|praça|praca|pça|alameda|al\.|rodovia|rod\.|viela)\s+/i, '').trim();
}

async function sugerirEnderecos() {
    let query = document.getElementById('buscaEndereco').value;
    let lista = document.getElementById('listaSugestoes');
    
    if (query.trim().length < 4) {
        lista.style.display = 'none';
        return;
    }

    clearTimeout(timeoutBusca);
    
    timeoutBusca = setTimeout(async () => {
        let termoLimpo = limparTermoBusca(query); 
        let pesquisa = `${termoLimpo}, Cruzeiro, SP, Brasil`;
        
        try {
            let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(pesquisa)}&limit=5`);
            let data = await response.json();
            
            lista.innerHTML = ''; 
            
            if(data.length > 0) {
                lista.style.display = 'block';
                
                data.forEach(item => {
                    let div = document.createElement('div');
                    div.textContent = item.display_name.split(', Cruzeiro')[0]; 
                    div.style.padding = '10px';
                    div.style.cursor = 'pointer';
                    div.style.borderBottom = '1px solid #334155';
                    div.style.color = '#e2e8f0';
                    
                    div.onmouseover = () => { div.style.background = '#38bdf8'; div.style.color = '#0f172a'; };
                    div.onmouseout = () => { div.style.background = 'transparent'; div.style.color = '#e2e8f0'; };
                    
                    div.onclick = () => {
                        document.getElementById('buscaEndereco').value = div.textContent;
                        lista.style.display = 'none'; 
                        
                        let lat = parseFloat(item.lat);
                        let lng = parseFloat(item.lon);
                        
                        adicionarPontoNoMapa(lat, lng, item.name || div.textContent);
                        mapaDelivery.setView([lat, lng], 16);
                    };
                    lista.appendChild(div);
                });
            } else {
                lista.style.display = 'none';
            }
        } catch(err) {
            console.log("Erro no Autocomplete");
        }
    }, 600); 
}

async function buscarEndereco() {
    let query = document.getElementById('buscaEndereco').value;
    if(query.trim() === "") return;

    let termoLimpo = limparTermoBusca(query); 
    let pesquisa = `${termoLimpo}, Cruzeiro, SP, Brasil`;
    document.getElementById('buscaEndereco').value = "A pesquisar...";

    try {
        let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(pesquisa)}`);
        let data = await response.json();

        if (data.length > 0) {
            let lat = parseFloat(data[0].lat);
            let lng = parseFloat(data[0].lon);
            let nomeRua = data[0].name || query;
            
            adicionarPontoNoMapa(lat, lng, nomeRua);
            mapaDelivery.setView([lat, lng], 16);
        } else {
            alert("Endereço não encontrado em Cruzeiro. Tente adicionar o nome do bairro.");
        }
    } catch(err) {
        alert("Erro ao pesquisar endereço.");
    }
    
    document.getElementById('buscaEndereco').value = "";
}

function adicionarPontoNoMapa(lat, lng, nomeRuaBase) {
    let id_ponto = coordenadas.length;
    let cor = id_ponto === 0 ? '#ef4444' : '#3b82f6';
    let titulo = id_ponto === 0 ? "PONTO INICIAL" : `📦 ${id_ponto}`;
    let nomeFinal = id_ponto === 0 ? `Restaurante (${nomeRuaBase})` : `${titulo} - ${nomeRuaBase}`;
    
    coordenadas.push({lat: lat, lng: lng, nome: nomeFinal, ruaBase: nomeRuaBase});

    let marcador = L.circleMarker([lat, lng], {
        color: 'black', fillColor: cor, fillOpacity: 1, radius: 9
    }).addTo(mapaDelivery);
    marcador.bindTooltip(nomeFinal, {permanent: true, direction: 'top', offset: [0, -10]}).openTooltip();

    
    let popupContent = `
        <div style="text-align: center; color: black; font-family: sans-serif;">
            <b style="font-size: 14px; display: block; margin-bottom: 10px;">${nomeFinal}</b>
            <button onclick="removerPonto(${id_ponto})" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">🗑️ Excluir Ponto</button>
        </div>
    `;
    marcador.bindPopup(popupContent);

    marcadores.push(marcador);
}


window.removerPonto = function(index) {
    coordenadas.splice(index, 1);
    
    marcadores.forEach(m => mapaDelivery.removeLayer(m));
    marcadores = [];
    if (linhaRota) mapaDelivery.removeLayer(linhaRota);
    
    let backupCoords = [...coordenadas];
    coordenadas = [];
    
    backupCoords.forEach(ponto => {
        adicionarPontoNoMapa(ponto.lat, ponto.lng, ponto.ruaBase);
    });
    
    let saidaDelivery = document.getElementById("saidaDelivery");
    saidaDelivery.textContent += `\n\n⚠️ [AVISO] Ponto removido!\nSe uma rota já estava desenhada, clique em "Calcular Rota Otimizada" para refazer a matemática.`;
    saidaDelivery.scrollTop = saidaDelivery.scrollHeight;
    
    mapaDelivery.closePopup();
};

function limparMapa() {
    coordenadas = [];
    marcadores.forEach(m => mapaDelivery.removeLayer(m));
    marcadores = [];
    if (linhaRota) mapaDelivery.removeLayer(linhaRota);
    document.getElementById("saidaDelivery").textContent = "Mapa limpo!";
}

document.addEventListener('click', function(event) {
    let input = document.getElementById('buscaEndereco');
    let lista = document.getElementById('listaSugestoes');
    if (event.target !== input && event.target !== lista) {
        if(lista) lista.style.display = 'none';
    }
});

const infoAlgoritmos = {
    'encosta': {
        titulo: '⛰️ Subida de Encosta (Hill Climbing)',
        texto: 'É um algoritmo de busca local "guloso". Ele analisa as rotas vizinhas à atual e sempre dá um passo na direção que diminui a distância imediatamente. A sua principal desvantagem é que pode ficar preso facilmente em "mínimos locais" (becos sem saída matemáticos), encerrando a busca sem descobrir que existia uma rota melhor do outro lado do mapa.'
    },
    'tentativas': {
        titulo: '🔄 Subida com Tentativas (Restart)',
        texto: 'Resolve a fraqueza (miopia) da Subida de Encosta clássica. Quando o algoritmo percebe que ficou preso num mínimo local, ele salva o melhor resultado e "pula de paraquedas" num ponto totalmente aleatório do mapa (random shuffle), reiniciando a busca. Ao fazer isso várias vezes (TMAX), as chances de encontrar o Mínimo Global (a rota perfeita) aumentam drasticamente.'
    },
    'tempera': {
        titulo: '🔥 Têmpera Simulada (Simulated Annealing)',
        texto: 'Inspirado no processo de resfriamento de metais na metalurgia. É a heurística clássica mais inteligente. Para fugir de Mínimos Locais, ele aceita escolher uma rota <b>pior</b> de propósito no início da busca. A probabilidade de ele aceitar um "erro" diminui à medida que o sistema "esfria", forçando o algoritmo a refinar o resultado no final. É altamente convergente.'
    },
    'genetico': {
        titulo: '🧬 Algoritmo Genético',
        texto: 'Inspirado na teoria de Darwin e seleção natural, ele evolui uma população inteira simultaneamente. As melhores rotas sobrevivem (Torneio/Roleta) e cruzam entre si utilizando o <b>Cruzamento OX</b> para gerar filhos saudáveis. Ocasionalmente, ocorrem mutações biológicas através de <b>Translocação em Bloco</b> para manter a diversidade do DNA e evitar a estagnação da espécie.'
    }
};

function abrirModalInfo(chave) {
    let dados = infoAlgoritmos[chave];
    document.getElementById('modalTitle').innerHTML = dados.titulo;
    document.getElementById('modalText').innerHTML = dados.texto;
    
    // Mostra o modal com animação
    document.getElementById('modalInfo').style.display = 'flex';
    setTimeout(() => {
        document.getElementById('modalInfo').classList.add('show');
    }, 10);
}

function fecharModalInfo(event, force=false) {
    // Só fecha se clicou no X ou fora da caixa do modal
    if (force || event.target.id === 'modalInfo') {
        let modal = document.getElementById('modalInfo');
        modal.classList.remove('show');
        // Espera a animação de desaparecer antes de dar display: none
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

async function calcularDeliveryMapa() {
    if (coordenadas.length < 2) {
        alert("Adicione ao menos 1 Restaurante (Ponto inicial) e 1 Cliente!");
        return;
    }

    let payload = {
        coordenadas: coordenadas.map(c => ({lat: c.lat, lng: c.lng})),
        metodo: document.getElementById("metodoReal").value,
        tmax: parseInt(document.getElementById("tmaxReal").value),
        ti: parseFloat(document.getElementById("tiReal").value),
        tf: parseFloat(document.getElementById("tfReal").value),
        fr: parseFloat(document.getElementById("frReal").value),
        ag_pop: document.getElementById("agPopReal") ? parseInt(document.getElementById("agPopReal").value) : 50,
        ag_gens: document.getElementById("agGensReal") ? parseInt(document.getElementById("agGensReal").value) : 100
    };
    
    let saidaDelivery = document.getElementById("saidaDelivery");
    saidaDelivery.textContent += "\n\n Calculando distâncias reais e otimizando ...";

    try {
        let response = await fetch('http://127.0.0.1:5000/calcular_delivery_mapa', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        let data = await response.json();

        if (data.erro) {
            saidaDelivery.textContent += "\n[ERRO] " + data.erro;
            return;
        }

        if (linhaRota) mapaDelivery.removeLayer(linhaRota);
        saidaDelivery.textContent += "\n Buscando ruas no OSRM...";

        
        try {
            let coordsOrdenadasStr = data.ordem_indices.map(idx => `${coordenadas[idx].lng},${coordenadas[idx].lat}`).join(';');
            let routeResponse = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsOrdenadasStr}?overview=full&geometries=geojson`);
            let routeData = await routeResponse.json();

            if (routeData.code === 'Ok') {
                let pontosDaRua = routeData.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
                linhaRota = L.polyline(pontosDaRua, {color: '#3b82f6', weight: 5, opacity: 0.8}).addTo(mapaDelivery);
            } else {
                throw new Error("OSRM não encontrou a rota das ruas.");
            }
        } catch(err) {
          
            let pontosDaRota = data.ordem_indices.map(idx => [coordenadas[idx].lat, coordenadas[idx].lng]);
            linhaRota = L.polyline(pontosDaRota, {color: '#ef4444', weight: 4, dashArray: '10, 10'}).addTo(mapaDelivery);
        }

        let preco = parseFloat(document.getElementById("precoGasolina").value);
        let consumo = parseFloat(document.getElementById("consumoMoto").value);
        let custo = (data.distancia_km / consumo) * preco;

        let txtRota = data.ordem_indices.map(idx => coordenadas[idx].nome).join("\n ➔ ");

        let res = "\n==================================";
        res += "\nMÉTODO: " + (data.metodo_usado.toUpperCase());
        res += "\n📍 ROTA OTIMIZADA:\n" + txtRota;
        res += "\n----------------------------------";
        res += "\n🛣️ TOTAL: " + data.distancia_km + " km   |   ⛽ CUSTO: R$ " + custo.toFixed(2);
        res += "\n==================================";

        saidaDelivery.textContent += res;
        saidaDelivery.scrollTop = saidaDelivery.scrollHeight;

    } catch (e) {
        saidaDelivery.textContent += "\nErro na conexão com a API ou Python.";
    }
}


// MÓDULO DO RELATÓRIO FINAL E PDF

async function gerarRelatorioFinal() {
    document.getElementById('btnRelatorio').disabled = true;
    document.getElementById('loadingRelatorio').style.display = 'block';
    document.getElementById('resultadoRelatorio').style.display = 'none';

    try {
        let response = await fetch('http://127.0.0.1:5000/gerar_relatorio', { method: 'POST' });
        let data = await response.json();

        if (data.erro) {
            alert("Falha no processamento: " + data.erro);
            document.getElementById('loadingRelatorio').style.display = 'none';
            document.getElementById('btnRelatorio').disabled = false;
            return;
        }

        // 1. Preenche Tabela do Top 10 AG
        let htmlAG = "";
        data.top_ag.forEach((ag, index) => {
            htmlAG += `<tr>
                <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">${index + 1}º</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1;">${ag.tp}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1;">${ag.ng}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1;">${ag.tc}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1;">${ag.tm}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1;">${ag.ig}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #0369a1;">${ag.ganho_medio.toFixed(2)}%</td>
            </tr>`;
        });
        document.getElementById('tabelaAG').innerHTML = htmlAG;

        // 2. Preenche Tabela Global
        let htmlGlobal = "";
        data.tabela_comparativa.forEach((item, index) => {
            htmlGlobal += `<tr>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${index + 1}º</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1;">${item.metodo}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1;">${item.parametros}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #0369a1;">${item.ganho_medio.toFixed(2)}%</td>
            </tr>`;
        });
        document.getElementById('tabelaGlobal').innerHTML = htmlGlobal;

        document.getElementById('loadingRelatorio').style.display = 'none';
        document.getElementById('resultadoRelatorio').style.display = 'block';

    } catch(e) {
        alert("Ocorreu uma exceção do tipo Timeout. Devido à alta demanda computacional, a requisição excedeu o tempo de resposta padrão. Acompanhe a execução no terminal do servidor Python.");
        document.getElementById('loadingRelatorio').style.display = 'none';
    }
    document.getElementById('btnRelatorio').disabled = false;
}

function exportarPDF() {
    let elemento = document.getElementById('conteudoPDF');
    let opt = {
        margin:       15,
        filename:     'Relatorio_Final_PathFinder.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(elemento).save();
}