# Arquivo da Copa — API

Backend Flask que conversa com a Groq e mantém o chat dentro do tema Copa do Mundo.

## Criar do zero com uv

```bash
uv init --python 3.12 copa-backend
cd copa-backend
uv add flask flask-cors python-dotenv gunicorn groq
```

Este repositório já traz o `pyproject.toml`. A partir da pasta `backend`:

```bash
uv sync
cp .env.example .env
# edite GROQ_API_KEY
uv run python app.py
```

Saúde: `GET http://127.0.0.1:5000/health`

Chat:

```bash
curl -s http://127.0.0.1:5000/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Quem ganhou a Copa de 1970?","history":[]}'
```

## Deploy no Render

- Runtime: Python
- Build: `uv sync`
- Start: `uv run gunicorn -b 0.0.0.0:$PORT app:app`
- Variáveis: `GROQ_API_KEY` (obrigatória), `GROQ_MODEL` (opcional), `CORS_ORIGINS` (opcional; use `*` ou a origem do GitHub Pages / Netlify, por exemplo `https://usuario.github.io`)

O arquivo `.env` não vai para o git. No Render as chaves entram pelo painel de Environment.
