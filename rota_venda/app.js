
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
}


function toggleParametros() {
    let metodo = document.getElementById("metodoBusca").value;
    document.getElementById("paramsSET").style.display = (metodo === "hillRestart") ? "block" : "none";
    document.getElementById("paramsTE").style.display = (metodo === "annealing") ? "block" : "none";
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
            document.getElementById("saidaBasico").textContent = "❌ [ERRO DE VALIDAÇÃO]\n" + data.erro;
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
        alert("Gere o problema primeiro!"); return;
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


// ==========================================
// MODO DELIVERY REAL (Cruzeiro-SP)
// ==========================================

function toggleParametrosReal() {
    let metodo = document.getElementById("metodoReal").value;
    document.getElementById("paramsRealSET").style.display = (metodo === "hillRestart") ? "block" : "none";
    document.getElementById("paramsRealTE").style.display = (metodo === "annealing") ? "block" : "none";
}

async function calcularDelivery() {
    let checkboxes = document.querySelectorAll('#listaBairros input[type="checkbox"]:checked');
    let destinos = Array.from(checkboxes).map(cb => parseInt(cb.value));

    if (destinos.length === 0) {
        alert("Selecione ao menos um bairro!");
        return;
    }

    let payload = {
        destinos: destinos,
        metodo: document.getElementById("metodoReal").value,
        tmax: parseInt(document.getElementById("tmaxReal").value),
        ti: parseFloat(document.getElementById("tiReal").value),
        tf: parseFloat(document.getElementById("tfReal").value),
        fr: parseFloat(document.getElementById("frReal").value)
    };

    let saidaDelivery = document.getElementById("saidaDelivery");
    
    // Agora sim, garantidamente usando o += para adicionar e não apagar!
    saidaDelivery.textContent += "\n\n⏳ Processando nova rota...";

    try {
        let response = await fetch('http://127.0.0.1:5000/calcular_delivery_real', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        let data = await response.json();

        if (data.erro) {
            saidaDelivery.textContent += "\n[ERRO] " + data.erro;
            return;
        }

        let preco = parseFloat(document.getElementById("precoGasolina").value);
        let consumo = parseFloat(document.getElementById("consumoMoto").value);
        let custo = (data.distancia_km / consumo) * preco;

        // Monta o bloquinho de resultado
        let res = "\n==================================";
        res += "\nMÉTODO: " + (data.metodo_usado.toUpperCase());
        res += "\n🚩 PARTIDA: " + data.rota_bairros[0];
        res += "\n📦 ENTREGAS: " + data.rota_bairros.slice(1, -1).join(" ➔ ");
        res += "\n🏁 RETORNO: " + data.rota_bairros[data.rota_bairros.length - 1];
        res += "\n----------------------------------";
        res += "\n🛣️ TOTAL: " + data.distancia_km + " km   |   ⛽ CUSTO: R$ " + custo.toFixed(2);
        res += "\n==================================";

        saidaDelivery.textContent += res;
        saidaDelivery.scrollTop = saidaDelivery.scrollHeight;

    } catch (e) {
        saidaDelivery.textContent += "\nErro na conexão com o Python.";
    }
}