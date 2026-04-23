// ==========================================
// VARIÁVEIS GLOBAIS (Busca Local / PCV)
// ==========================================
let matrizProblema = [];
let solucaoAtual = [];
let custoAtual = 0;

// Variável global do Algoritmo Genético
let problemaAG = [];

document.addEventListener("DOMContentLoaded", () => {
    let selectTipo = document.getElementById("tipoExecucao");
    let inputSolucao = document.getElementById("solucaoInicial");

    // Função que checa o select e desabilita/habilita o input
    function checarInput() {
        if (selectTipo.value === "random") {
            inputSolucao.disabled = true;
            inputSolucao.value = ""; // Limpa o campo para evitar confusão
        } else {
            inputSolucao.disabled = false;
        }
    }

    // Executa uma vez ao abrir a página (já que o padrão é Aleatório)
    checarInput();

    // Escuta toda vez que o usuário trocar a opção no select
    selectTipo.addEventListener("change", checarInput);
});
// ==========================================
// NAVEGAÇÃO DO MENU
// ==========================================
function showScreen(id){
    document.querySelectorAll(".screen").forEach(s=>{
        s.classList.remove("active");
    });
    document.getElementById(id).classList.add("active");
}

// ==========================================
// COMUNICAÇÃO COM O BACKEND PYTHON (Busca Local)
// ==========================================
async function gerarProblema(){
    // Captura os valores do layout
    let n = parseInt(document.getElementById("tamProblema").value);
    let tipo = document.getElementById("tipoExecucao").value;
    let inicial = document.getElementById("solucaoInicial").value;
    
    try {
        let response = await fetch('http://127.0.0.1:5000/gerar_problema_pcv', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                tamanho: n,
                tipo: tipo,
                inicial: inicial
            })
        });
        
        let data = await response.json();
        
        matrizProblema = data.matriz;
        solucaoAtual = data.solucao_inicial;
        custoAtual = data.custo_inicial;
        
        let matrizTexto = data.matriz.map(linha => linha.join("\t")).join("\n");
        
        document.getElementById("saidaBasico").textContent = 
            "=== DADOS GERADOS NO SERVIDOR ===\n\n" +
            "Matriz de Distâncias (" + n + "x" + n + "):\n" + matrizTexto +
            "\n\nRota Inicial Fixada: [" + solucaoAtual.join(", ") + "]" +
            "\nCusto da Rota Inicial: " + custoAtual + " km/tempo";
            
    } catch (error) {
        document.getElementById("saidaBasico").textContent = "Erro de conexão! O arquivo app.py está rodando?";
    }
}

async function executarBasico(){
    if (matrizProblema.length === 0) {
        alert("Gere o problema primeiro!");
        return;
    }

    let metodo = document.getElementById("metodoBusca").value;
    
    document.getElementById("saidaBasico").textContent += "\n\nProcessando otimização no Python...";
    
    try {
        let response = await fetch('http://127.0.0.1:5000/executar_basico', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                metodo: metodo,
                matriz: matrizProblema,
                solucao_inicial: solucaoAtual
            })
        });
        
        let data = await response.json();
        
        if(data.erro) {
            document.getElementById("saidaBasico").textContent += "\n\n[ERRO]: " + data.erro;
            return;
        }
        
        document.getElementById("saidaBasico").textContent += 
            "\n\n=== RESULTADO DA OTIMIZAÇÃO ===" +
            "\nMétodo Aplicado: " + data.nome_metodo +
            "\nMelhor Rota Encontrada: [" + data.solucao_final.join(", ") + "]" +
            "\nCusto da Melhor Rota: " + data.custo_final + " km/tempo";
            
    } catch (error) {
        document.getElementById("saidaBasico").textContent += "\n\nErro na execução. O backend está rodando?";
    }
}

// ==========================================
// CÓDIGO ORIGINAL - ALGORITMO GENÉTICO (FRONTEND)
// ==========================================
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

// Variável para guardar o gráfico e conseguir destruí-lo antes de criar outro
let chartInstance = null; 

function mostrarGrafico(dados){
    let ctx=document.getElementById("grafico");
    
    // Destrói o gráfico antigo se você clicar em "Executar AG" várias vezes
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