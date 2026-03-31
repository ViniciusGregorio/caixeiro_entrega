let problema = []
let problemaAG = []


function showScreen(id){

document.querySelectorAll(".screen").forEach(s=>{

s.classList.remove("active")

})

document.getElementById(id).classList.add("active")

}


function gerarProblema(){

let n = parseInt(document.getElementById("tamProblema").value)

problema=[]

for(let i=0;i<n;i++){

problema.push(Math.floor(Math.random()*100))

}

document.getElementById("saidaBasico").textContent =
"Problema gerado:\n"+problema.join(",")

}



function avaliar(sol){

let soma=0

for(let v of sol){

soma+=v

}

return soma

}



function executarBasico(){

let metodo=document.getElementById("metodoBusca").value

let atual=[...problema]

for(let i=0;i<atual.length;i++){

atual[i]+=Math.floor(Math.random()*5-2)

}

let score=avaliar(atual)

document.getElementById("saidaBasico").textContent+=

"\n\nMetodo: "+metodo+
"\nSolução encontrada: "+atual.join(",")+
"\nScore: "+score

}



function gerarProblemaAG(){

let n=parseInt(document.getElementById("agTam").value)

problemaAG=[]

for(let i=0;i<n;i++){

problemaAG.push(Math.random())

}

document.getElementById("saidaAG").textContent=
"Problema AG gerado tamanho "+n

}



function fitness(ind){

let soma=0

for(let g of ind){

soma+=g

}

return soma

}



function executarAG(){

let popSize=parseInt(document.getElementById("pop").value)

let gens=parseInt(document.getElementById("gens").value)

let mut=parseFloat(document.getElementById("mut").value)


let populacao=[]


for(let i=0;i<popSize;i++){

let ind=[]

for(let j=0;j<problemaAG.length;j++){

ind.push(Math.random())

}

populacao.push(ind)

}


let melhores=[]


for(let g=0;g<gens;g++){

populacao.sort((a,b)=>fitness(b)-fitness(a))

melhores.push(fitness(populacao[0]))


for(let i=popSize/2;i<popSize;i++){

let pai=populacao[Math.floor(Math.random()*popSize/2)]

let mae=populacao[Math.floor(Math.random()*popSize/2)]

let filho=[]


for(let j=0;j<pai.length;j++){

let gene=Math.random()<0.5 ? pai[j] : mae[j]


if(Math.random()<mut){

gene=Math.random()

}

filho.push(gene)

}


populacao[i]=filho

}

}


mostrarGrafico(melhores)

document.getElementById("saidaAG").textContent=

"Melhor fitness final: "+melhores[melhores.length-1]

}



function mostrarGrafico(dados){

let ctx=document.getElementById("grafico")

new Chart(ctx,{

type:"line",

data:{

labels:dados.map((_,i)=>i),

datasets:[{

data:dados

}]

}

})

}
