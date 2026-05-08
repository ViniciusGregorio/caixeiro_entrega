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
    
    document.getElementById("saidaBasico").textContent += "\n\nProcessando otimização no Python...";
    
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

function gerarProblemaAG(){
    let n=parseInt(document.getElementById("agTam").value);
    problemaAG=[];
    
    for(let i=0;i<n;i++){
        problemaAG.push(Math.random());
    }
    
    document.getElementById("saidaAG").textContent= "Problema AG gerado tamanho "+n;
}

function fitness(ind){
    let soma=0;
    for(let g of ind){
        soma+=g;
    }
    return soma;
}

function executarAG(){
    let popSize=parseInt(document.getElementById("pop").value);
    let gens=parseInt(document.getElementById("gens").value);
    let mut=parseFloat(document.getElementById("mut").value);

    let populacao=[];
    for(let i=0;i<popSize;i++){
        let ind=[];
        for(let j=0;j<problemaAG.length;j++){
            ind.push(Math.random());
        }
        populacao.push(ind);
    }

    let melhores=[];
    for(let g=0;g<gens;g++){
        populacao.sort((a,b)=>fitness(b)-fitness(a));
        melhores.push(fitness(populacao[0]));
        for(let i=popSize/2;i<popSize;i++){
            let pai=populacao[Math.floor(Math.random()*popSize/2)];
            let mae=populacao[Math.floor(Math.random()*popSize/2)];
            let filho=[];
            for(let j=0;j<pai.length;j++){
                let gene=Math.random()<0.5 ? pai[j] : mae[j];
                if(Math.random()<mut){
                    gene=Math.random();
                }
                filho.push(gene);
            }
            populacao[i]=filho;
        }
    }

    mostrarGrafico(melhores);
    document.getElementById("saidaAG").textContent= "Melhor fitness final: "+melhores[melhores.length-1];
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
                label: "Evolução do Fitness",
                data:dados,
                borderColor: "#38bdf8",
                backgroundColor: "rgba(56, 189, 248, 0.1)",
                tension: 0.1
            }]
        }
    });
}


// MODO DELIVERY (Leaflet + OSRM + Nominatim)

let mapaDelivery = null;
let coordenadas = []; 
let marcadores = [];
let linhaRota = null;
let timeoutBusca = null;

function toggleParametrosReal() {
    let metodo = document.getElementById("metodoReal").value;
    document.getElementById("paramsRealSET").style.display = (metodo === "tentativas") ? "block" : "none";
    document.getElementById("paramsRealTE").style.display = (metodo === "tempera") ? "block" : "none";
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
        let termoLimpo = limparTermoBusca(query); // Aplica a limpeza aqui
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

    let termoLimpo = limparTermoBusca(query); // Aplica a limpeza aqui também
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
    
    // Guardamos o 'nomeRuaBase' para recriar o ponto com o texto certo se algum outro for apagado
    coordenadas.push({lat: lat, lng: lng, nome: nomeFinal, ruaBase: nomeRuaBase});

    let marcador = L.circleMarker([lat, lng], {
        color: 'black', fillColor: cor, fillOpacity: 1, radius: 9
    }).addTo(mapaDelivery);

    marcador.bindTooltip(nomeFinal, {permanent: true, direction: 'top', offset: [0, -10]}).openTooltip();

    // NOVIDADE: Adiciona o Popup com o botão de excluir
    let popupContent = `
        <div style="text-align: center; color: black; font-family: sans-serif;">
            <b style="font-size: 14px; display: block; margin-bottom: 10px;">${nomeFinal}</b>
            <button onclick="removerPonto(${id_ponto})" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">🗑️ Excluir Ponto</button>
        </div>
    `;
    marcador.bindPopup(popupContent);

    marcadores.push(marcador);
}

// NOVIDADE: Função global para excluir o ponto e redesenhar o mapa
window.removerPonto = function(index) {
    // 1. Remove do array de coordenadas
    coordenadas.splice(index, 1);
    
    // 2. Limpa todos os desenhos (marcadores e linhas) do mapa
    marcadores.forEach(m => mapaDelivery.removeLayer(m));
    marcadores = [];
    if (linhaRota) mapaDelivery.removeLayer(linhaRota);
    
    // 3. Faz um backup e zera as coordenadas
    let backupCoords = [...coordenadas];
    coordenadas = [];
    
    // 4. Re-adiciona os pontos um por um (isso atualiza as tags "Cliente 1, Cliente 2" na ordem correta)
    backupCoords.forEach(ponto => {
        adicionarPontoNoMapa(ponto.lat, ponto.lng, ponto.ruaBase);
    });
    
    // 5. Avisa o usuário na tela preta
    let saidaDelivery = document.getElementById("saidaDelivery");
    saidaDelivery.textContent += `\n\n⚠️ [AVISO] Ponto removido! Se uma rota já estava desenhada, clique em "Calcular Rota Otimizada" para refazer a matemática.`;
    saidaDelivery.scrollTop = saidaDelivery.scrollHeight;
    
    // Fecha o popup que estava aberto
    mapaDelivery.closePopup();
};

function limparMapa() {
    coordenadas = [];
    marcadores.forEach(m => mapaDelivery.removeLayer(m));
    marcadores = [];
    if (linhaRota) mapaDelivery.removeLayer(linhaRota);
    document.getElementById("saidaDelivery").textContent = "Mapa limpo!.";
}

// Fecha as sugestões se clicar fora
document.addEventListener('click', function(event) {
    let input = document.getElementById('buscaEndereco');
    let lista = document.getElementById('listaSugestoes');
    if (event.target !== input && event.target !== lista) {
        if(lista) lista.style.display = 'none';
    }
});

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
        fr: parseFloat(document.getElementById("frReal").value)
    };

    let saidaDelivery = document.getElementById("saidaDelivery");
    saidaDelivery.textContent += "\n\n Calculando distâncias...";

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
        let pontosDaRota = data.ordem_indices.map(idx => [coordenadas[idx].lat, coordenadas[idx].lng]);
        linhaRota = L.polyline(pontosDaRota, {color: '#ef4444', weight: 4, dashArray: '10, 10'}).addTo(mapaDelivery);

        let preco = parseFloat(document.getElementById("precoGasolina").value);
        let consumo = parseFloat(document.getElementById("consumoMoto").value);
        let custo = (data.distancia_km / consumo) * preco;

        let txtRota = data.ordem_indices.map(idx => coordenadas[idx].nome).join("\n ➔ ");

        let res = "\n==================================";
        res += "\nMÉTODO: " + (data.metodo_usado.toUpperCase());
        res += "\n ROTA OTIMIZADA:\n" + txtRota;
        res += "\n----------------------------------";
        res += "\n TOTAL: " + data.distancia_km + " km   |   CUSTO: R$ " + custo.toFixed(2);
        res += "\n==================================";

        saidaDelivery.textContent += res;
        saidaDelivery.scrollTop = saidaDelivery.scrollHeight;

    } catch (e) {
        saidaDelivery.textContent += "\nErro na conexão com a API ou Python.";
    }
}