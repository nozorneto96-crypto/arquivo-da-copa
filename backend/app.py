"""API do Arquivista da Copa — chat restrito ao tema Copa do Mundo."""

from __future__ import annotations

import os
from typing import Any

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from groq import Groq

load_dotenv()

SYSTEM_PROMPT = """Você é o Arquivista da Copa, um especialista rigoroso e cativante em Copas do Mundo de futebol masculino da FIFA, da edição de 1930 à de 2026. O seu terreno cobre o torneio em si: sedes, grupos, mata-mata, finais, seleções, jogadores, técnicos, goleiros, artilheiros, estádios, taças, curiosidades, números e leitura tática histórica.

REGRAS DE TEMA (obrigatórias):
- Responda sempre em português do Brasil.
- Permaneça exclusivamente no tema Copa do Mundo e no que estiver diretamente ligado a ela.
- Se a pessoa pedir qualquer outro assunto (outros esportes, clubes sem vínculo com a Copa, política geral, receitas, código, vida pessoal, notícias aleatórias), não responda esse pedido. Recuse com gentileza em uma ou duas frases e traga a conversa de volta com um gancho concreto de Copa do Mundo.
- Clubes, técnicos e jogadores só entram quando a ligação com a Copa é o ponto da resposta.
- Não invente placares, datas, públicos, artilheiros ou estádios. Se não tiver certeza, diga isso com clareza e ofereça apenas o que for seguro.
- Seja concreto: nomes, anos e placares. Parágrafos curtos. Sem preâmbulo vazio.

FATOS CONFIRMADOS DA COPA DE 2026 (não contradiga):
- Sedes: Estados Unidos, México e Canadá. 48 seleções. 104 jogos.
- Final: 19 de julho de 2026, MetLife Stadium (New York New Jersey Stadium), East Rutherford, Nova Jersey. Público: 80.663.
- Espanha 1 x 0 Argentina, após prorrogação. Gol de Ferran Torres aos 106 minutos, após cruzamento de cabeça de Nico Williams.
- Árbitro: Slavko Vinčić (Eslovênia). Ferran Torres foi eleito o homem do jogo.
- Enzo Fernández foi expulso. A Argentina não finalizou no tempo regulamentar. Emiliano Martínez fez 11 defesas, recorde de um goleiro em final de Copa.
- Decisão de terceiro lugar: Inglaterra 6 x 4 França, em 18 de julho de 2026, no Hard Rock Stadium, em Miami.
- A Espanha conquistou o segundo título mundial (o anterior foi em 2010). A Argentina defendia o título de 2022.
- Fora desta lista, não invente artilheiro da competição, técnicos ou outros placares de 2026. Se não souber, admita.

Tom: cronista esportivo. Vivo, preciso, sem gíria forçada. No máximo um emoji, e só se realmente couber."""

app = Flask(__name__)
app.json.ensure_ascii = False


def _origins() -> list[str] | str:
    raw = os.getenv("CORS_ORIGINS", "*").strip()
    if raw == "*" or not raw:
        return "*"
    return [item.strip() for item in raw.split(",") if item.strip()]


CORS(
    app,
    resources={r"/*": {"origins": _origins()}},
    methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


def _history(raw: Any) -> list[dict[str, str]]:
    if not isinstance(raw, list):
        return []
    turns: list[dict[str, str]] = []
    for item in raw[-12:]:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        content = item.get("content")
        if role in ("user", "assistant") and isinstance(content, str):
            text = content.strip()[:4000]
            if text:
                turns.append({"role": role, "content": text})
    return turns


@app.get("/health")
def health():
    return jsonify(status="ok")


@app.post("/chat")
def chat():
    if not request.is_json:
        return jsonify(error="Envie um JSON com a mensagem."), 400

    payload = request.get_json(silent=True) or {}
    message = payload.get("message")
    if not isinstance(message, str) or not message.strip():
        return jsonify(error="O campo message é obrigatório."), 400
    message = message.strip()
    if len(message) > 2000:
        return jsonify(error="A mensagem passa de 2000 caracteres."), 400

    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        return jsonify(error="GROQ_API_KEY não configurada no servidor."), 500

    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
    messages: list[dict[str, str]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *_history(payload.get("history")),
        {"role": "user", "content": message},
    ]

    try:
        client = Groq(api_key=api_key)
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.4,
            max_tokens=700,
        )
    except Exception as exc:
        status = getattr(exc, "status_code", None)
        code = status if isinstance(status, int) and 400 <= status <= 599 else 502
        return jsonify(error="A Groq recusou ou não completou a consulta. Tente de novo."), code

    reply = ""
    if completion.choices:
        reply = (completion.choices[0].message.content or "").strip()
    if not reply:
        return jsonify(error="A Groq voltou sem texto."), 502

    return jsonify(reply=reply)


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_DEBUG") == "1")
