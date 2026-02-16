"""
Copywriting Frameworks Library.

This module contains all the knowledge of great copywriters:
- Gary Halbert, Dan Kennedy, Eugene Schwartz, David Ogilvy
- Modern DR: Stefan Georgi, Justin Goff, Evaldo Albuquerque
- Black/Gray hat techniques (used responsibly)

Each framework has:
- Structure: How to organize the copy
- Psychology: What drives the reader
- Examples: Real-world templates
- Swipes: Fill-in-the-blank patterns
"""

# ═══════════════════════════════════════════════════════════════════
# HEADLINE FRAMEWORKS
# ═══════════════════════════════════════════════════════════════════

HEADLINE_FRAMEWORKS = {
    "4U": {
        "name": "4 U's Formula",
        "elements": ["Urgent", "Unique", "Useful", "Ultra-specific"],
        "formula": "[Urgency] + [Unique angle] + [Usefulness] + [Specific detail]",
        "examples": [
            "HOJE: O Método Único Que Me Fez Ganhar R$47.832 em 7 Dias",
            "Última Chance: Técnica Secreta de Harvard Para Memorizar 50 Páginas/Hora",
        ],
        "swipes": [
            "[Número específico] [Resultado] em [Tempo curto] Usando [Método único]",
            "A [Técnica/Método] de [Autoridade] Que [Resultado] em [Tempo]",
        ],
    },
    "curiosity_gap": {
        "name": "Curiosity Gap",
        "psychology": "O cérebro precisa fechar loops abertos",
        "formula": "Insinue algo valioso sem revelar completamente",
        "examples": [
            "O Erro Que 99% dos Empresários Comete (e Como Evitar)",
            "Ela Faturou R$1M Com Uma Coisa Que Você Faz Todo Dia",
        ],
        "swipes": [
            "O [Erro/Segredo] Que [Percentual]% de [Público] [Faz/Ignora]",
            "Por Que [Resultado Surpreendente] Acontece Quando Você [Ação Simples]",
        ],
    },
    "numbers": {
        "name": "Números Específicos",
        "psychology": "Especificidade = Credibilidade",
        "formula": "Use números ímpares e decimais (47, 3.7, 127)",
        "examples": [
            "127 Empresas Usaram Este Método. 123 Dobraram Faturamento.",
            "De 3.847 Reais Para 47.293 em 90 Dias",
        ],
        "swipes": [
            "[Número ímpar] [Tipo de pessoa] Já [Resultado]. [Percentual específico]% [Resultado maior]",
            "De [Número exato] Para [Número maior exato] em [Dias/Semanas]",
        ],
    },
    "how_to": {
        "name": "How To",
        "psychology": "Promessa de solução prática",
        "formula": "Como [Resultado Desejado] Sem [Objeção Principal]",
        "examples": [
            "Como Perder 10kg Sem Academia, Dieta ou Remédio",
            "Como Vender Para Clientes Premium Sem Parecer Vendedor",
        ],
        "swipes": [
            "Como [Resultado] Sem [Dor 1], [Dor 2] ou [Dor 3]",
            "Como [Ação Simples] Para [Resultado Grande] em [Tempo Curto]",
        ],
    },
    "warning": {
        "name": "Warning/Alerta",
        "psychology": "Medo de perder > Desejo de ganhar (Loss aversion)",
        "formula": "Alerte sobre erro/perigo iminente",
        "examples": [
            "ATENÇÃO: Não Compre Curso de Marketing Antes de Ler Isso",
            "Aviso: O Erro de R$50.000 Que Você Pode Estar Cometendo",
        ],
        "swipes": [
            "ATENÇÃO: Não [Ação] Antes de [Ler/Saber] Isso",
            "Aviso: O [Erro/Perigo] de [Valor/Tempo] Que [Percentual]% [Comete]",
        ],
    },
    "secret": {
        "name": "Segredo Revelado",
        "psychology": "Insider knowledge, exclusividade",
        "formula": "Revele algo que 'eles' não querem que você saiba",
        "examples": [
            "O Segredo de R$1 Bilhão Que Wall Street Esconde de Você",
            "A Técnica Proibida Que Vendedores de Carro Usam (Funciona Para Qualquer Negócio)",
        ],
        "swipes": [
            "O Segredo de [Valor Grande] Que [Autoridade/Instituição] [Esconde/Não Conta]",
            "A [Técnica/Estratégia] [Proibida/Secreta] Que [Insider] Usa",
        ],
    },
}

# ═══════════════════════════════════════════════════════════════════
# BODY COPY FRAMEWORKS
# ═══════════════════════════════════════════════════════════════════

BODY_FRAMEWORKS = {
    "AIDA": {
        "name": "Attention-Interest-Desire-Action",
        "structure": [
            ("Attention", "Capture com headline forte ou fato chocante"),
            ("Interest", "Desenvolva com informação relevante"),
            ("Desire", "Crie desejo com benefícios e prova"),
            ("Action", "CTA claro e urgente"),
        ],
        "template": """
[ATENÇÃO: Headline que para o scroll]

[INTERESSE: Pergunta ou fato que conecta com a dor]
Você já [situação frustrante]? Não está sozinho. [Estatística ou validação].

[DESEJO: Pinte o resultado]
Imagine [cenário desejado]. [Prova de que é possível].

[AÇÃO: CTA direto]
[Verbo] agora e [benefício imediato].
""",
    },
    "PAS": {
        "name": "Problem-Agitate-Solve",
        "structure": [
            ("Problem", "Identifique a dor específica"),
            ("Agitate", "Intensifique a dor, mostre consequências"),
            ("Solve", "Apresente a solução como óbvia"),
        ],
        "template": """
[PROBLEMA]
Você [dor/frustração específica]?

[AGITAÇÃO]
E o pior é que quanto mais você [tenta X], pior fica. 
[Consequência 1]. [Consequência 2]. [Consequência 3 emocional].

[SOLUÇÃO]
Mas não precisa ser assim. 
[Introdução da solução] que [benefício principal].
""",
    },
    "PASTOR": {
        "name": "Problem-Amplify-Story-Testimony-Offer-Response",
        "structure": [
            ("Problem", "Dor específica do público"),
            ("Amplify", "Intensifique as consequências"),
            ("Story", "Sua história ou de cliente"),
            ("Testimony", "Prova social"),
            ("Offer", "O que você oferece"),
            ("Response", "CTA com urgência"),
        ],
        "use_case": "Cartas de venda longas, VSLs",
    },
    "BAB": {
        "name": "Before-After-Bridge",
        "structure": [
            ("Before", "Situação atual dolorosa"),
            ("After", "Situação desejada transformada"),
            ("Bridge", "Como ir de A para B (seu produto)"),
        ],
        "template": """
[ANTES]
Há [tempo], eu estava [situação ruim]. 
[Detalhe emocional]. [Consequência na vida].

[DEPOIS]
Hoje, [situação transformada].
[Métrica de sucesso]. [Como a vida mudou].

[PONTE]
O que mudou? [Sua solução].
[Como funciona em 1-2 frases].
""",
    },
    "QUEST": {
        "name": "Qualify-Understand-Educate-Stimulate-Transition",
        "structure": [
            ("Qualify", "Filtre o público certo"),
            ("Understand", "Mostre que entende a dor"),
            ("Educate", "Ensine algo valioso"),
            ("Stimulate", "Crie desejo pela solução"),
            ("Transition", "Leve para a oferta"),
        ],
        "use_case": "Emails, webinars, conteúdo educacional",
    },
    "star_chain_hook": {
        "name": "Star-Chain-Hook (Gary Halbert)",
        "structure": [
            ("Star", "Apresente o herói (cliente/produto)"),
            ("Chain", "Encadeie benefícios (chain of benefits)"),
            ("Hook", "Gancho final com CTA"),
        ],
        "use_case": "Direct mail, cartas de venda",
    },
}

# ═══════════════════════════════════════════════════════════════════
# FASCINATIONS (Bullet Points que Vendem)
# ═══════════════════════════════════════════════════════════════════

FASCINATION_FORMULAS = {
    "secret_of": "O segredo de [resultado] que [autoridade] usa",
    "how_to": "Como [resultado] sem [objeção] (pág. [X])",
    "why": "Por que [fato surpreendente] e o que isso significa para você",
    "what_never": "O que [autoridade] NUNCA vai te contar sobre [tema]",
    "the_truth": "A verdade sobre [mito comum] que pode estar [consequência negativa]",
    "warning": "AVISO: [ação comum] pode estar [consequência] — veja como evitar",
    "little_known": "Um [método/técnica] pouco conhecido que [resultado]",
    "instant": "O jeito mais rápido de [resultado] — funciona em [tempo]",
    "proven": "[Número] [pessoas/empresas] já usaram isso para [resultado]",
    "mistake": "O erro de R$[valor] que [percentual]% de [público] comete",
}

# ═══════════════════════════════════════════════════════════════════
# CTA FRAMEWORKS
# ═══════════════════════════════════════════════════════════════════

CTA_FORMULAS = {
    "value_first": {
        "formula": "[Benefício Principal] + [Verbo de Ação]",
        "examples": [
            "Quero Dobrar Minhas Vendas",
            "Acessar Meu Treinamento Grátis",
        ],
    },
    "fomo": {
        "formula": "[Escassez] + [Ação]",
        "examples": [
            "Garantir Minha Vaga (Últimas 7)",
            "Pegar o Desconto Antes que Acabe",
        ],
    },
    "low_commitment": {
        "formula": "[Micro-compromisso] + [Sem risco]",
        "examples": [
            "Ver Como Funciona (Grátis)",
            "Testar Por 7 Dias",
        ],
    },
    "result_focused": {
        "formula": "[Resultado Específico] + [Prazo]",
        "examples": [
            "Começar a Vender em 24h",
            "Montar Meu Funil Hoje",
        ],
    },
}

# ═══════════════════════════════════════════════════════════════════
# EMAIL SUBJECT LINE FORMULAS
# ═══════════════════════════════════════════════════════════════════

EMAIL_SUBJECT_FORMULAS = {
    "curiosity": [
        "aquela coisa que te falei...",
        "você viu isso?",
        "preciso te contar uma coisa",
        "[Nome], não abre esse email se...",
    ],
    "fomo": [
        "última chance ⏰",
        "fechando em [X] horas",
        "você vai perder isso?",
        "não dá pra esperar mais",
    ],
    "personal": [
        "uma pergunta rápida",
        "posso te pedir um favor?",
        "[Nome], sobre aquilo...",
        "te devo uma resposta",
    ],
    "value": [
        "🎁 presente pra você",
        "[X] [resultado] em [tempo]",
        "o que [autoridade] me ensinou",
        "copiado: meu [template/script/processo]",
    ],
    "controversy": [
        "por que eu discordo de [guru/método]",
        "a mentira que te contaram sobre [tema]",
        "unpopular opinion: [afirmação]",
        "isso vai irritar algumas pessoas",
    ],
}

# ═══════════════════════════════════════════════════════════════════
# POWER WORDS
# ═══════════════════════════════════════════════════════════════════

POWER_WORDS = {
    "urgency": ["Agora", "Hoje", "Imediato", "Última", "Urgente", "Limitado"],
    "exclusivity": ["Secreto", "Revelado", "Exclusivo", "VIP", "Insider", "Restrito"],
    "greed": ["Grátis", "Bônus", "Desconto", "Economize", "Lucro", "Riqueza"],
    "fear": ["Evite", "Perigo", "Risco", "Erro", "Fracasso", "Perder"],
    "trust": ["Comprovado", "Garantido", "Científico", "Oficial", "Certificado"],
    "curiosity": ["Descubra", "Conheça", "Revele", "Mistério", "Segredo"],
    "simplicity": ["Fácil", "Simples", "Rápido", "Passo-a-passo", "Qualquer pessoa"],
    "results": ["Resultado", "Transformação", "Sucesso", "Conquista", "Realização"],
}

# ═══════════════════════════════════════════════════════════════════
# BLACK/GRAY HAT TECHNIQUES (Use responsibly)
# ═══════════════════════════════════════════════════════════════════

GRAY_TECHNIQUES = {
    "pattern_interrupt": {
        "description": "Quebrar padrão mental para forçar atenção",
        "examples": [
            "PARE. Isso vai mudar tudo.",
            "Eu sei o que você está pensando...",
            "Antes de fechar essa página...",
        ],
    },
    "false_close": {
        "description": "Fingir que a oportunidade acabou, depois 'reabrir'",
        "example": "Acabou... ou quase. Consegui mais 10 vagas.",
    },
    "social_proof_stack": {
        "description": "Acumular provas sociais em sequência",
        "structure": "[Número] pessoas + [Resultado] + [Screenshot/Depoimento]",
    },
    "future_pacing": {
        "description": "Fazer a pessoa se visualizar no futuro com o resultado",
        "template": "Imagine você daqui a [tempo]... [cenário desejado detalhado]",
    },
    "takeaway_selling": {
        "description": "Dizer que talvez não seja para ela (inverso)",
        "example": "Isso não é para todo mundo. Se você [objeção], talvez não seja para você.",
    },
    "anchoring": {
        "description": "Ancorar preço alto antes de revelar o real",
        "example": "Normalmente isso custaria R$5.000... Hoje: R$497",
    },
}
