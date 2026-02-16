"""
Text generation engine for CLAUDE_CAPABILITIES.

Implements:
  Pilar 1 - Prompt Engineering Encapsulado (especialista em copy)
  Pilar 4 - Iteration Loop (ajustar tom, tamanho, CTA sem reescrever)
  Pilar 5 - Fallback Chain (Gemini Flash → Gemini Pro → GPT-4o-mini)

Usage:
  from claude_capabilities.text import generate_copy, enhance_brief

  # Dry-run
  result = generate_copy("headline pro meu café", "headline", dry_run=True)

  # Full execution
  result = generate_copy("headline pro meu café", "headline")
"""

import json
import urllib.error
import urllib.request
from typing import Optional

from claude_capabilities.cost import CostTracker
from claude_capabilities.keys import get_optional

tracker = CostTracker()

# ═══════════════════════════════════════════════════════════════════
# PILAR 1: CONHECIMENTO DE ESPECIALISTA EM COPYWRITING
# Cada tipo de copy tem estrutura, tom e técnicas específicas
# ═══════════════════════════════════════════════════════════════════

COPY_FRAMEWORKS = {
    "headline": {
        "structure": "Máximo 10 palavras. Direto ao ponto. Um benefício claro.",
        "techniques": [
            "Números específicos (7 dias, 3 passos, 47% mais)",
            "Palavras de poder (Grátis, Novo, Exclusivo, Segredo, Descubra)",
            "Urgência sutil (Agora, Hoje, Finalmente)",
            "Curiosidade (Como, Por que, O que)",
        ],
        "avoid": ["Jargão técnico", "Promessas vagas", "Mais de uma ideia"],
        "examples": [
            "7 Dias Para Dobrar Suas Vendas (Sem Gastar Mais)",
            "O Segredo dos Cafés que Vendem 3x Mais",
            "Por Que 87% dos Negócios Ignoram Isso",
        ],
    },
    "cta": {
        "structure": "Verbo de ação + Benefício. Máximo 5 palavras.",
        "techniques": [
            "Começar com verbo no imperativo (Descubra, Baixe, Comece)",
            "Incluir resultado (Grátis, Agora, Seu)",
            "Criar micro-compromisso (Ver como funciona, Testar grátis)",
        ],
        "avoid": ["Enviar", "Submeter", "Clique aqui", "Saiba mais genérico"],
        "examples": [
            "Quero Vender Mais",
            "Testar Grátis por 7 Dias",
            "Baixar Meu Guia Agora",
            "Ver Resultados Reais",
        ],
    },
    "description": {
        "structure": "Problema → Agitação → Solução → Benefício. 2-4 frases.",
        "techniques": [
            "Começar com dor/frustração do cliente",
            "Pintar cenário negativo de não resolver",
            "Apresentar solução como óbvia",
            "Terminar com transformação/resultado",
        ],
        "avoid": ["Falar de funcionalidades", "Linguagem corporativa", "Texto genérico"],
        "examples": [
            "Cansado de posts que ninguém vê? Enquanto você perde horas criando conteúdo, seus concorrentes estão roubando seus clientes. Com o [Produto], você cria uma semana de conteúdo em 20 minutos.",
        ],
    },
    "social_post": {
        "structure": "Hook (1 linha) + Desenvolvimento (3-5 linhas) + CTA + Hashtags",
        "techniques": [
            "Primeira linha PRECISA parar o scroll",
            "Usar quebras de linha para respiração",
            "Emojis estratégicos (não decorativos)",
            "Perguntas retóricas engajam",
        ],
        "avoid": ["Parágrafos longos", "Emojis em excesso", "Hashtags no meio do texto"],
        "platform_rules": {
            "instagram": "2200 chars max, 30 hashtags max, emojis OK",
            "linkedin": "3000 chars max, profissional, menos emojis",
            "twitter": "280 chars, provocativo, threads se necessário",
            "facebook": "Mais informal, perguntas funcionam bem",
        },
    },
    "email_subject": {
        "structure": "Máximo 50 caracteres. Curiosidade ou benefício claro.",
        "techniques": [
            "Personalização [Nome]",
            "Números funcionam (3 dicas, 7 dias)",
            "Emojis no início aumentam abertura",
            "Minúsculas parecem mais pessoais",
        ],
        "avoid": ["CAPS LOCK", "!!!", "Spam triggers (Grátis, Ganhe, Parabéns)"],
        "examples": [
            "a coisa que ninguém te conta sobre vendas",
            "[Nome], esqueci de te mandar isso",
            "🔥 3 erros que matam sua conversão",
        ],
    },
    "ad_copy": {
        "structure": "Hook + Problema + Solução + Prova + CTA",
        "techniques": [
            "Primeiras 3 segundos são tudo (video) / primeira linha (texto)",
            "Especificidade gera credibilidade",
            "Prova social quando possível",
            "Um CTA claro, não três",
        ],
        "platforms": {
            "facebook": "Texto acima da imagem: curto. Descrição: pode ser longa.",
            "google": "Headlines 30 chars, descriptions 90 chars",
            "youtube": "Hook em 5 segundos ou perde",
        },
    },
    "bio": {
        "structure": "Quem você é + O que você faz + Para quem + Resultado + CTA",
        "techniques": [
            "Números de prova (10k alunos, 5 anos, R$1M)",
            "Emoji para separar seções",
            "Link na última linha",
        ],
        "examples": [
            "☕ Fundador @CaféNobre\n📈 Ajudo cafeterias a vender 3x mais\n🎯 +200 clientes transformados\n👇 Baixe o guia grátis",
        ],
    },
}

# Tons de voz disponíveis
TONE_PROFILES = {
    "urgente": {
        "description": "Cria senso de escassez e FOMO",
        "words": ["agora", "últimas", "hoje", "não perca", "antes que", "enquanto"],
        "punctuation": "!", 
    },
    "autoridade": {
        "description": "Posiciona como especialista confiável",
        "words": ["comprovado", "estudos mostram", "especialistas", "método", "sistema"],
        "punctuation": ".",
    },
    "casual": {
        "description": "Conversa entre amigos, próximo",
        "words": ["olha", "sabe", "tipo", "real", "papo reto"],
        "punctuation": "...",
    },
    "inspiracional": {
        "description": "Motiva e eleva",
        "words": ["imagine", "transforme", "alcance", "realize", "conquiste"],
        "punctuation": "!",
    },
    "provocativo": {
        "description": "Desafia crenças, polêmico",
        "words": ["pare de", "esqueça", "a verdade é", "ninguém fala sobre"],
        "punctuation": "?!",
    },
}


def enhance_brief(
    user_input: str,
    copy_type: str,
    tone: str = "autoridade",
    platform: Optional[str] = None,
    brand_context: Optional[str] = None,
) -> dict:
    """
    Pilar 1: Transforma pedido vago em brief completo de copywriting.
    
    Returns dict with:
        - enhanced_prompt: Prompt otimizado para o LLM
        - framework: Estrutura e técnicas aplicadas
        - constraints: Limitações de plataforma
        - preview: O que o usuário pode esperar
    """
    framework = COPY_FRAMEWORKS.get(copy_type, COPY_FRAMEWORKS["description"])
    tone_profile = TONE_PROFILES.get(tone, TONE_PROFILES["autoridade"])
    
    # Construir contexto de plataforma
    platform_context = ""
    if platform:
        if copy_type == "social_post" and platform in framework.get("platform_rules", {}):
            platform_context = framework["platform_rules"][platform]
        elif copy_type == "ad_copy" and platform in framework.get("platforms", {}):
            platform_context = framework["platforms"][platform]
    
    # Construir prompt otimizado para o LLM
    enhanced_prompt = f"""
PAPEL: Você é um copywriter especialista em Direct Response Marketing com 15 anos de experiência.
Você estudou os mestres: David Ogilvy, Gary Halbert, Eugene Schwartz, Dan Kennedy.

TAREFA: Criar {copy_type} para: {user_input}

ESTRUTURA OBRIGATÓRIA:
{framework['structure']}

TÉCNICAS A APLICAR:
{chr(10).join(f"- {t}" for t in framework['techniques'])}

EVITAR A TODO CUSTO:
{chr(10).join(f"- {a}" for a in framework['avoid'])}

TOM DE VOZ: {tone} — {tone_profile['description']}
Palavras características: {', '.join(tone_profile['words'])}

{f'CONTEXTO DA MARCA: {brand_context}' if brand_context else ''}
{f'REGRAS DA PLATAFORMA: {platform_context}' if platform_context else ''}

EXEMPLOS DE REFERÊNCIA (estilo, não copiar):
{chr(10).join(f"- {e}" for e in framework.get('examples', ['N/A'])[:3])}

IMPORTANTE:
- Entregue APENAS o copy final, sem explicações
- Se for headline/CTA, entregue 3 variações
- Se for texto longo, entregue 1 versão polida
- Use português brasileiro natural
"""
    
    return {
        "enhanced_prompt": enhanced_prompt,
        "copy_type": copy_type,
        "tone": tone,
        "platform": platform,
        "framework": {
            "structure": framework["structure"],
            "techniques": framework["techniques"][:3],
        },
        "preview": f"Vou gerar {copy_type} com tom {tone}" + (f" para {platform}" if platform else ""),
    }


def _call_gemini(prompt: str, model: str = "gemini-2.0-flash") -> Optional[str]:
    """Call Gemini API for text generation."""
    api_key = get_optional("GOOGLE_API_KEY_GEMINI")
    if not api_key:
        return None
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.8,
            "topP": 0.9,
            "maxOutputTokens": 1024,
        },
    }
    
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            
            # Track cost (Gemini Flash: ~$0.10/1M input, ~$0.40/1M output)
            input_tokens = len(prompt.split()) * 1.3  # Rough estimate
            output_tokens = len(text.split()) * 1.3
            cost = (input_tokens * 0.0000001) + (output_tokens * 0.0000004)
            tracker.add("gemini_flash_text", round(cost, 6), f"{int(input_tokens)}in/{int(output_tokens)}out")
            
            return text
    except Exception as e:
        print(f"[text.py] Gemini error: {e}")
        return None


def _call_openai(prompt: str, model: str = "gpt-4o-mini") -> Optional[str]:
    """Fallback to OpenAI."""
    api_key = get_optional("OPENAI_API_KEY")
    if not api_key:
        return None
    
    url = "https://api.openai.com/v1/chat/completions"
    
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.8,
        "max_tokens": 1024,
    }
    
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode(),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            text = data["choices"][0]["message"]["content"]
            
            # Track cost (GPT-4o-mini: ~$0.15/1M input, ~$0.60/1M output)
            usage = data.get("usage", {})
            input_tokens = usage.get("prompt_tokens", 0)
            output_tokens = usage.get("completion_tokens", 0)
            cost = (input_tokens * 0.00000015) + (output_tokens * 0.0000006)
            tracker.add("openai_4o_mini_text", round(cost, 6), f"{input_tokens}in/{output_tokens}out")
            
            return text
    except Exception as e:
        print(f"[text.py] OpenAI error: {e}")
        return None


def generate_copy(
    user_input: str,
    copy_type: str = "description",
    tone: str = "autoridade",
    platform: Optional[str] = None,
    brand_context: Optional[str] = None,
    dry_run: bool = False,
    iterate_from: Optional[str] = None,
    iterate_instruction: Optional[str] = None,
) -> dict:
    """
    Generate copy using the text engine.
    
    Args:
        user_input: What the user wants copy for
        copy_type: headline, cta, description, social_post, email_subject, ad_copy, bio
        tone: urgente, autoridade, casual, inspiracional, provocativo
        platform: instagram, linkedin, twitter, facebook, google, youtube
        brand_context: Optional brand voice/context info
        dry_run: If True, only returns the enhanced prompt without generating
        iterate_from: Previous copy to iterate on (Pilar 4)
        iterate_instruction: How to change it ("mais urgente", "mais curto")
    
    Returns:
        dict with: copy, cost, provider, enhanced_prompt, framework
    """
    # Pilar 4: Iteration
    if iterate_from and iterate_instruction:
        iteration_prompt = f"""
COPY ORIGINAL:
{iterate_from}

INSTRUÇÃO DE AJUSTE: {iterate_instruction}

Aplique o ajuste mantendo a essência e estrutura. Entregue apenas a versão ajustada.
"""
        if dry_run:
            return {
                "dry_run": True,
                "iteration_prompt": iteration_prompt,
                "estimated_cost": 0.001,
                "preview": f"Vou ajustar o copy: {iterate_instruction}",
            }
        
        # Try Gemini first
        result = _call_gemini(iteration_prompt)
        if result:
            return {
                "copy": result,
                "provider": "gemini",
                "cost": tracker.get_session_cost(),
                "iteration": True,
            }
        
        # Fallback to OpenAI
        result = _call_openai(iteration_prompt)
        if result:
            return {
                "copy": result,
                "provider": "openai",
                "cost": tracker.get_session_cost(),
                "iteration": True,
            }
        
        return {"error": "All providers failed", "copy": None}
    
    # Normal generation
    brief = enhance_brief(user_input, copy_type, tone, platform, brand_context)
    
    if dry_run:
        return {
            "dry_run": True,
            "enhanced_prompt": brief["enhanced_prompt"],
            "framework": brief["framework"],
            "preview": brief["preview"],
            "estimated_cost": 0.002,  # ~500 tokens in/out at Gemini Flash rates
        }
    
    # Pilar 5: Fallback chain
    # Try Gemini Flash first (cheapest)
    result = _call_gemini(brief["enhanced_prompt"], "gemini-2.0-flash")
    if result:
        return {
            "copy": result,
            "provider": "gemini_flash",
            "cost": tracker.get_session_cost(),
            "copy_type": copy_type,
            "tone": tone,
            "platform": platform,
        }
    
    # Fallback to Gemini Pro
    result = _call_gemini(brief["enhanced_prompt"], "gemini-1.5-pro")
    if result:
        return {
            "copy": result,
            "provider": "gemini_pro",
            "cost": tracker.get_session_cost(),
            "copy_type": copy_type,
            "tone": tone,
            "platform": platform,
        }
    
    # Final fallback: OpenAI
    result = _call_openai(brief["enhanced_prompt"])
    if result:
        return {
            "copy": result,
            "provider": "openai",
            "cost": tracker.get_session_cost(),
            "copy_type": copy_type,
            "tone": tone,
            "platform": platform,
        }
    
    return {"error": "All providers failed", "copy": None}


# Available copy types for reference
COPY_TYPES = list(COPY_FRAMEWORKS.keys())
TONES = list(TONE_PROFILES.keys())
