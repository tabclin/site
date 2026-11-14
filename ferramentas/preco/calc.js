// Calculadora de preço TabClin: contas puras (sem tela). Percentuais de entrada em 0–100. Conta por unidade.

/** Lê número no formato brasileiro ("2,50", "1.234,56", "R$ 8", "12%") ou com ponto decimal ("8.5"). */
export function lerNumero(texto) {
  let s = String(texto ?? "").replace(/R\$|%|\s/g, "")
  if (!s) return NaN
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".")
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "")
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN
}

const invalidoPct = (x) => !Number.isFinite(x) || x < 0 || x > 100

/** Já vendo por `preco`: quanto sobra? */
export function analisar({ preco, custo, variaveis, fixas }) {
  if (!Number.isFinite(preco) || preco <= 0) return { ok: false, erro: "preco" }
  if (!Number.isFinite(custo) || custo < 0) return { ok: false, erro: "custo" }
  if (invalidoPct(variaveis) || invalidoPct(fixas)) return { ok: false, erro: "percentual" }
  const contrib = preco - custo - (preco * variaveis) / 100
  const lucro = contrib - (preco * fixas) / 100
  const produto = (custo / preco) * 100
  return {
    ok: true,
    markup: custo === 0 ? null : (preco / custo - 1) * 100,
    contribuicao: { reais: contrib, pct: (contrib / preco) * 100 },
    lucro: { reais: lucro, pct: (lucro / preco) * 100 },
    barra: { produto, variaveis, estrutura: fixas, lucro: 100 - produto - variaveis - fixas },
  }
}

/** Quero lucrar `lucro`%: por quanto vendo? (markup divisor) */
export function calcularPreco({ custo, variaveis, fixas, lucro }) {
  if (!Number.isFinite(custo) || custo <= 0) return { ok: false, erro: "custo" }
  if (invalidoPct(variaveis) || invalidoPct(fixas) || invalidoPct(lucro)) return { ok: false, erro: "percentual" }
  const soma = variaveis + fixas + lucro
  if (soma >= 100) return { ok: false, erro: "impossivel", soma }
  const multiplicador = 1 / (1 - soma / 100)
  const preco = custo * multiplicador
  return { ok: true, preco, multiplicador, markup: (preco / custo - 1) * 100 }
}

const n0 = (x) => (Number.isFinite(x) ? x : 0)
export const somaDetalhes = ({ imposto, cartao, comissao, outros }) => n0(imposto) + n0(cartao) + n0(comissao) + n0(outros)
export const fixasPct = (despesasMes, faturamentoMes) =>
  Number.isFinite(faturamentoMes) && faturamentoMes > 0 && Number.isFinite(despesasMes) ? (despesasMes / faturamentoMes) * 100 : null

const fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
export const brl = (n) => fmtBRL.format(n).replace(/\s/g, " ")
export function pct(n) {
  const r = Math.round(n * 10) / 10
  return r.toLocaleString("pt-BR", { minimumFractionDigits: Number.isInteger(r) ? 0 : 1, maximumFractionDigits: 1 }) + "%"
}

const vez = (n) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Frases em português simples para o resultado de `analisar`. tipo: ok | alerta | perigo */
export function explicarAnalise(r) {
  if (!r?.ok) return []
  const m = [r.lucro.reais >= 0
    ? { tipo: "ok", texto: `De cada R$ 100 vendidos, sobram ${brl(r.lucro.pct)} de lucro.` }
    : { tipo: "perigo", texto: `De cada R$ 100 vendidos, faltam ${brl(-r.lucro.pct)} para pagar todos os custos.` }]
  if (r.markup !== null && r.markup >= 100 && r.lucro.reais >= 0)
    m.push({ tipo: "alerta", texto: `Seu markup é ${pct(r.markup)}, mas o que sobra de verdade é ${pct(r.lucro.pct)}. Markup olha para o custo; margem olha para o preço.` })
  if (r.contribuicao.reais < 0)
    m.push({ tipo: "perigo", texto: "Esse preço não paga nem o produto e os custos da venda. Quanto mais vender, mais perde." })
  else if (r.lucro.reais < 0)
    m.push({ tipo: "perigo", texto: `Esse preço dá prejuízo: cada venda paga o produto e ainda deixa ${brl(r.contribuicao.reais)} para a estrutura, mas no seu volume atual isso não cobre as despesas fixas. Por isso vender mais reduz o prejuízo — ou ajuste o preço, o custo ou as despesas fixas.` })
  return m
}

/** Frases para o resultado de `calcularPreco`. `entrada.lucro` = lucro desejado (%). */
export function explicarPreco(r, entrada) {
  if (r?.erro === "impossivel")
    return [{ tipo: "perigo", texto: `Impossível: custos variáveis + despesas fixas + lucro somam ${pct(r.soma)} do preço. Não sobraria nada do preço para pagar o produto — por isso nenhum preço fecha essa conta. Reduza algum desses percentuais.` }]
  if (!r?.ok) return []
  return [{ tipo: "ok", texto: `Para lucrar ${pct(entrada.lucro)}, venda por ${brl(r.preco)}: é o custo multiplicado por ${vez(r.multiplicador)}.` }]
}
