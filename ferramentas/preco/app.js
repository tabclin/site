// Liga o formulário às contas de calc.js. Nada é salvo.
import { lerNumero, analisar, calcularPreco, somaDetalhes, fixasPct, brl, pct, explicarAnalise, explicarPreco } from "./calc.js"

const $ = (id) => document.getElementById(id)
const val = (id) => lerNumero($(id).value)
const pctVazio0 = (id) => ($(id).value.trim() === "" ? 0 : val(id))
const fmtCampo = (n) => (Math.round(n * 10) / 10).toLocaleString("pt-BR")

// abas
function abrir(qual) {
  const analisa = qual === "analisar"
  $("abaAnalisar").setAttribute("aria-selected", analisa); $("abaCalcular").setAttribute("aria-selected", !analisa)
  $("fAnalisar").hidden = !analisa; $("fCalcular").hidden = analisa
  $("resultado").hidden = true
}
$("abaAnalisar").onclick = () => abrir("analisar")
$("abaCalcular").onclick = () => abrir("calcular")

// ajudas
const alterna = (botao, caixa, txt) => { $(botao).onclick = () => { const a = $(caixa).classList.toggle("aberto"); $(botao).textContent = (a ? "▾ " : "▸ ") + txt } }
alterna("detalhar", "subVar", "detalhar (imposto, cartão, comissão…)")
alterna("naoSei", "subFixas", "não sei esse número")
for (const id of ["imposto", "cartao", "comissao", "outros"])
  $(id).addEventListener("input", () => { $("variaveis").value = fmtCampo(somaDetalhes({ imposto: val("imposto"), cartao: val("cartao"), comissao: val("comissao"), outros: val("outros") })) })
for (const id of ["despMes", "fatMes"])
  $(id).addEventListener("input", () => { const f = fixasPct(val("despMes"), val("fatMes")); $("fixas").value = f === null ? "" : fmtCampo(f) })

// resultado
function mostraBarra(b) {
  const partes = { produto: b.produto, variaveis: b.variaveis, estrutura: b.estrutura, lucro: Math.max(0, b.lucro) }
  const total = Math.max(100, b.produto + b.variaveis + b.estrutura + Math.max(0, b.lucro))
  for (const [k, v] of Object.entries(partes)) $("barra").querySelector(`[data-parte=${k}]`).style.width = (Math.max(0, v) / total) * 100 + "%"
  $("barra").classList.toggle("preju", b.lucro < 0)
  const itens = [["produto", "Produto", b.produto, "#94a3b8"], ["variaveis", "Custos da venda", b.variaveis, "var(--amarelo)"],
    ["estrutura", "Estrutura", b.estrutura, "var(--azul)"], ["lucro", b.lucro < 0 ? "Prejuízo" : "Lucro", b.lucro, b.lucro < 0 ? "var(--verm)" : "var(--verde)"]]
  $("legenda").innerHTML = itens.map(([, nome, v, cor]) => `<span><i style="background:${cor}"></i>${nome}<em>${brl(v)}</em></span>`).join("")
}
function mostraMensagens(m) {
  $("explicacoes").innerHTML = m.map((x) => `<div class="msg ${x.tipo}">${x.texto}</div>`).join("")
}
const limpaErros = () => { for (const id of ["ePreco", "eCusto", "ePct", "ecCusto", "ecPct"]) $(id).textContent = "" }
const MSG = { preco: ["ePreco", "Informe o preço de venda (maior que zero)."], custo: ["eCusto", "Informe o custo do produto."], percentual: ["ePct", "Os percentuais vão de 0 a 100."] }
const MSGc = { custo: ["ecCusto", "Informe o custo do produto (maior que zero)."], percentual: ["ecPct", "Os percentuais vão de 0 a 100."] }

$("fAnalisar").onsubmit = (e) => {
  e.preventDefault(); limpaErros()
  const r = analisar({ preco: val("preco"), custo: val("custo"), variaveis: pctVazio0("variaveis"), fixas: pctVazio0("fixas") })
  if (!r.ok) { const [onde, txt] = MSG[r.erro]; $(onde).textContent = txt; $("resultado").hidden = true; return }
  $("linhaPreco").hidden = true; $("blocoBarra").hidden = false
  mostraBarra(r.barra)
  $("markup").textContent = r.markup === null ? "—" : pct(r.markup)
  $("contrib").innerHTML = `${pct(r.contribuicao.pct)}<small>${brl(r.contribuicao.reais)} por unidade</small>`
  $("lucro").innerHTML = `${pct(r.lucro.pct)}<small>${brl(r.lucro.reais)} por unidade</small>`
  mostraMensagens(explicarAnalise(r))
  $("resultado").hidden = false
}

$("fCalcular").onsubmit = (e) => {
  e.preventDefault(); limpaErros()
  const ent = { custo: val("cCusto"), variaveis: pctVazio0("cVariaveis"), fixas: pctVazio0("cFixas"), lucro: pctVazio0("cLucro") }
  const r = calcularPreco(ent)
  if (!r.ok && r.erro !== "impossivel") { const [onde, txt] = MSGc[r.erro]; $(onde).textContent = txt; $("resultado").hidden = true; return }
  const ok = r.ok
  $("blocoBarra").hidden = !ok; $("linhaPreco").hidden = !ok
  for (const id of ["markup", "contrib", "lucro"]) $(id).closest(".num").hidden = !ok
  if (ok) {
    const a = analisar({ preco: r.preco, custo: ent.custo, variaveis: ent.variaveis, fixas: ent.fixas })
    mostraBarra(a.barra)
    $("precoSug").innerHTML = `${brl(r.preco)}<small>custo × ${r.multiplicador.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</small>`
    $("markup").textContent = pct(r.markup)
    $("contrib").innerHTML = `${pct(a.contribuicao.pct)}<small>${brl(a.contribuicao.reais)} por unidade</small>`
    $("lucro").innerHTML = `${pct(a.lucro.pct)}<small>${brl(a.lucro.reais)} por unidade</small>`
  }
  mostraMensagens(explicarPreco(r, ent))
  $("resultado").hidden = false
}
// ao voltar para a aba Analisar, as linhas escondidas pela aba Calcular reaparecem
$("abaAnalisar").addEventListener("click", () => { for (const id of ["markup", "contrib", "lucro"]) $(id).closest(".num").hidden = false })

// exemplos ilustrativos (salgado de padaria)
const preenche = (pares) => { for (const [id, v] of pares) $(id).value = v }
$("exemplo").onclick = () => preenche([["preco", "8,00"], ["custo", "2,50"], ["variaveis", "12"], ["fixas", "30"]])
$("cExemplo").onclick = () => preenche([["cCusto", "2,50"], ["cVariaveis", "12"], ["cFixas", "30"], ["cLucro", "25"]])
