# Laboratório de Fechamento com IA

Experimento aberto da [Theasier](https://www.theasier.com.br/ferramentas/laboratorio-de-fechamento):
até onde a IA ajuda no fechamento mensal de um escritório de contabilidade, e o que
precisa conferi-la.

**Tudo aqui é fictício.** O cenário (extrato, notas fiscais, comprovantes, conversa de
WhatsApp) é gerado por código a partir de uma semente. Nenhum dado real de cliente.
Este repositório **não deve receber dado real**.

## A ideia

> Regra primeiro; IA onde a regra falha; a regra confere a IA; a pessoa decide; tudo rotulado e medido.

1. **Motor por regras** (`src/motor`): lê OFX e NF-e e concilia o que é determinístico.
2. **IA onde a regra falha** (`src/ia`): leitura de comprovantes em imagem, vínculo de
   pendências, agente que descreve o que falta e redator da cobrança.
3. **Conferência pela regra**: toda leitura da IA passa por verificações (valor, data, beneficiário).
4. **Gabarito** (`dataset/gabarito.json`): cada linha tem a resposta certa, então o resultado é medido, não opinado.

## Resultado em uma linha

Das 64 linhas do extrato, 54 cabiam à regra: ela resolve 50 e aponta 4 como pendentes; a IA lê
comprovantes que a regra não alcança e a conferência barra os erros dela. Os números
completos e a comparação entre seis modelos estão em `resultados/` e no
[placar](placar/index.html). Eles valem para **este cenário e estes modelos nas datas
dos testes**, não são um ranking geral de modelos.

## Como usar

Requer Node 20 ou superior.

```bash
npm install
npm test                  # testes do gerador, motor e métricas
npm run gerar             # regenera o cenário em dataset/ (mesma semente, mesmo resultado)
npm run avaliar:regras    # baseline só com regras, sem custo e sem rede
```

Os avaliadores de IA (`scripts/avaliar-ia.js`, `avaliar-agente.js`, `avaliar-pipeline.js`)
chamam modelos pelo [OpenRouter](https://openrouter.ai) e **cobram na sua conta**. Para
rodá-los, crie a sua própria chave e exporte `OPENROUTER_API_KEY`. Há teto de gasto
(`TETO_USD`) e cache por hash do pedido, então repetir uma execução idêntica não gasta de novo.
Sem chave, tudo o que não é IA continua funcionando.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `dataset/` | cenário fictício, gabarito e manifesto com hashes |
| `src/cenario` | gerador determinístico |
| `src/motor` | leitores OFX/NF-e e regras de conciliação |
| `src/ia` | provedor, extrator, cascata, agente e redator |
| `src/avaliacao` | métricas (intervalo de Wilson) e pontuação |
| `scripts/` | execução dos avaliadores e geração do placar |
| `resultados/` | saídas reais das execuções, com data |
| `placar/` | página estática com o placar |

## Limites honestos

- Um cenário, uma semente, seis modelos: indica, não prova.
- Os modelos mudam; vários já têm versão mais nova que a testada.
- A descrição das pendências feita pela IA não passou por conferência automática equivalente.

## Licença

MIT. Veja `LICENSE`.
