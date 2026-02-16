# Filosofia de Qualidade: Anti-AI

> "O sistema precisa garantir que a qualidade final nao tera cara de IA"

Este documento e a regra mais importante do CLAUDE_CAPABILITIES.
Toda capability, todo prompt, toda decisao deve passar por este filtro.

---

## O Problema

IA generativa tem uma "cara". O publico ja reconhece:

### Imagens com cara de IA
- Iluminacao perfeita demais, sem sombras naturais
- Pele de plastico, sem textura real
- Simetria excessiva em rostos
- Fundos genericos e desfocados sem motivo
- Maos com dedos errados
- Texto ilegivel dentro da imagem
- Efeito "stock photo premium" em tudo
- Cores saturadas demais

### Textos com cara de IA
- "No mundo atual...", "Em um cenario cada vez mais..."
- Excesso de adjetivos: "incrivel", "extraordinario", "revolucionario"
- Estrutura identica: intro generica + 3 pontos + conclusao motivacional
- Falta de opiniao real ou posicionamento
- Emojis em excesso ou no lugar errado
- Hashtags genericas (#sucesso #motivacao #empreendedorismo)

### Audio com cara de IA
- Ritmo constante demais, sem variacao natural
- Pausas mecanicas
- Pronuncia perfeita demais (humanos erram sutilmente)
- Falta de respiracao audivel
- Entonacao monotona

### Video com cara de IA
- Movimentos fluidos demais (uncanny valley)
- Fundo completamente estatico
- Iluminacao nao muda durante o clip
- Labios dessincronizados com audio

---

## A Solucao: Regras de Senior

Cada capability tem regras anti-IA embutidas no prompt engineering.
O "banco de dados mental do senior" sabe como evitar cada problema.

### Imagem: Diretor de Fotografia

O prompt nao pede "foto bonita". Ele pede como um diretor de fotografia pediria:

```
ERRADO (cara de IA):
"beautiful woman in a coffee shop, perfect lighting, 8K"

CERTO (cara de humano):
"candid moment of a woman at a coffee shop, morning window light
casting asymmetric shadows, slightly overexposed highlights,
shallow DOF with busy background partially visible, natural skin
texture with minor imperfections, shot on 35mm f/1.8"
```

Regras embutidas em `image.py`:
- Sempre adicionar imperfeicoes naturais (sombras assimetricas, highlights estourados)
- Especificar lente e abertura (isso muda o look drasticamente)
- Preferir "candid" sobre "posed"
- Adicionar contexto ambiental real (nao fundo generico)
- Pedir textura de pele natural
- Evitar simetria perfeita

### Texto: Copywriter Senior

O prompt nao pede "escreva um texto". Ele pede como um copywriter de 15 anos faria:

```
ERRADO (cara de IA):
"Descubra o incrivel sabor do nosso cafe premium, feito com
grãos selecionados das melhores fazendas do mundo"

CERTO (cara de humano):
"Cafe de R$2 e cafe de R$12 usam o mesmo grao.
A diferença? 47 segundos de torra.
Prova: pede um espresso nosso. Se nao sentir a diferença,
a gente devolve."
```

Regras embutidas em `text.py`:
- Especificidade mata genericidade (numeros reais, dados concretos)
- Frase curta > frase longa
- Uma ideia por frase
- Tom de conversa, nao de apresentacao
- Sem superlativos vazios
- Evitar estruturas que toda IA usa (listas de 3, intro+corpo+conclusao)

### Audio: Diretor de Locucao

```
ERRADO (cara de IA):
Estabilidade alta, fala constante, sem variacoes

CERTO (cara de humano):
Variar velocidade entre frases, pausas irregulares,
respiracao audivel entre paragrafos, enfase natural
em palavras-chave (nao todas)
```

Regras embutidas em `audio.py`:
- Estabilidade < 0.7 (permite variacao natural)
- Pausas de duracao variavel (nao sempre 0.5s)
- Script otimizado com hesitacoes naturais para estilo conversational
- Ritmo mais lento que o normal (humanos nao falam em velocidade constante)

### Video: Diretor de Cinema

```
ERRADO (cara de IA):
Pessoa perfeitamente centralizada, fundo desfocado uniforme,
movimento suave e constante

CERTO (cara de humano):
Enquadramento levemente deslocado (regra dos tercos),
fundo com elementos reconheciveis em leve movimento,
micro-tremidas de camera (handheld feel)
```

---

## Checklist Anti-IA (para toda capability)

Antes de entregar qualquer resultado, o sistema deve validar:

### Imagem
- [ ] Tem imperfeicoes naturais?
- [ ] Iluminacao tem direcao e sombras reais?
- [ ] Fundo tem contexto (nao e generico)?
- [ ] Se tem pessoa, a pele tem textura?
- [ ] Nao tem simetria perfeita?

### Texto
- [ ] Tem numeros especificos (nao genericos)?
- [ ] Frases sao curtas e diretas?
- [ ] Nao tem superlativos vazios?
- [ ] Tom e de conversa (nao de apresentacao)?
- [ ] Seria publicavel sem edicao?

### Audio
- [ ] Ritmo varia entre frases?
- [ ] Pausas tem duracao irregular?
- [ ] Nao soa robotico?

### Video
- [ ] Movimentos sao sutis e naturais?
- [ ] Camera tem leve tremida (nao e tripod perfeito)?
- [ ] Iluminacao e consistente com a cena?

---

## Como Implementar

Cada `SKILL.md` deve ter uma secao "Anti-IA" com regras especificas.
Cada `lib/*.py` deve embutir essas regras nos prompts automaticamente.

O usuario nao precisa saber dessas regras.
Ele pede "foto do meu cafe" e recebe algo que parece que um fotografo tirou.
Esse e o superpoder.
