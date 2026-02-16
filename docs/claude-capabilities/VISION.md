# CLAUDE_CAPABILITIES - Visao do Projeto

## O que e

Um **pacote instalavel** (`pip install claude-capabilities`) que transforma qualquer agente de texto em um agente com capacidades reais de entrega.

Sem o pacote: o agente gera texto bom.
Com o pacote: o agente gera imagem, audio, video, deploy — com qualidade de senior.

## A Tese Central

> Uma skill e apenas um manual. Um senior nao tem so conhecimento tecnico — se fosse isso, bastava ler a documentacao. O senior tem um background de vivencia, um banco de dados mental que faz ele combinar, decidir e alterar para o resultado final acontecer.

O CLAUDE_CAPABILITIES encapsula essa vivencia:
- **SKILL.md** = o manual (o que a ferramenta faz)
- **lib/** = o banco de dados mental (como combinar, decidir, otimizar)
- **Pilares 1-6** = o julgamento do senior (quando usar cada tecnica)

## Logica "Se e Somente Se"

O sistema opera com condicionalidade rigorosa:

```
SE eu tenho a ferramenta (API key configurada)
E SOMENTE SE eu tenho as informacoes necessarias (prompt, contexto, parametros)
ENTAO eu entrego o resultado completo
SENAO eu informo exatamente o que falta
```

Isso significa:
- Sem API key de imagem? O sistema diz "preciso de GOOGLE_API_KEY_GEMINI para gerar imagem"
- Sem contexto suficiente? O sistema pergunta o que falta antes de agir
- Nunca gera resultado incompleto ou de baixa qualidade por falta de informacao

## Modelo de Distribuicao

### Instalacao
```bash
pip install claude-capabilities
```

### Quem usa
Outros desenvolvedores que tem agentes proprios (Claude Code, GPT, agentes custom).
Eles instalam o pacote e o agente deles ganha superpoderes.

### API Keys
Cada usuario configura suas proprias keys.
Excecao: o criador (dis) pode criar produtos onde ele fornece as keys para o usuario final.

## Tres Modos de Operacao

O usuario escolhe como o sistema se comporta:

### 1. Modo Confirmacao (padrao)
- Dry-run antes de tudo
- Mostra custo estimado
- Pede confirmacao antes de gastar

### 2. Modo Autonomo
- Usuario define budget: "gaste ate $5"
- Sistema executa cadeia completa sem perguntar
- Para se o budget acabar

### 3. Modo Batch
- Usuario agenda: "gera 30 posts para a semana"
- Sistema executa em background
- Entrega pacote pronto quando terminar

## Cadeia de Capabilities

### Atomicas
Fazem UMA coisa com qualidade de senior:
- `image-gen` — foto profissional a partir de descricao vaga
- `copywriter` — texto de alta conversao
- `tts` — voz natural com ritmo otimizado
- `video-gen` — video a partir de imagem ou texto
- `deploy-page` — publica HTML vivo

### Compostas
Orquestram atomicas para entrega completa:
- `content-pack` — imagem + copy + hashtags
- `landing-page` — copy + imagem + HTML + deploy (URL viva)
- `ugc-video` — personagem + cenas + video + voz + montagem

### Customizaveis
- O usuario pode criar suas proprias cadeias
- O sistema pode sugerir novas cadeias baseado no pedido
- Cadeias sao editaveis e ajustaveis

## Qualidade

Dois modos:
- **Standard** — melhor custo-beneficio (Gemini Flash, Edge TTS, Pexels)
- **Premium** — melhor qualidade possivel (Imagen 4, ElevenLabs, Kling)

O usuario escolhe. O sistema respeita.

## Memoria (Opcional)

- O usuario pode pedir para o agente salvar informacoes de marca
- Tom de voz, paleta de cores, estilo visual, publico-alvo
- Salvo em `.state/brand/` — persiste entre sessoes
- O sistema usa automaticamente nas geracoes futuras
- Nao e obrigatorio — funciona perfeitamente sem memoria

## O que NAO e

- Nao e um framework de agentes (nao substitui LangChain, CrewAI)
- Nao e uma plataforma (nao tem UI propria)
- Nao e um agente (nao pensa sozinho)

E uma **camada de capacidade** que qualquer agente pode usar para parar de so gerar texto e comecar a entregar trabalho completo.

## Proximo Passo: pip install

Para ser instalavel, o projeto precisa:

1. `setup.py` ou `pyproject.toml` — configuracao do pacote
2. Entry points CLI — `capabilities image-gen --prompt "cafe" --dry-run`
3. Resolucao de paths — funcionar de qualquer diretorio
4. Discovery de CLAUDE.md — o agente encontra as capabilities automaticamente
5. Comando `capabilities init` — cria .env e estrutura no projeto do usuario
