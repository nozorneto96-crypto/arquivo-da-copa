# Arquivo da Copa — frontend

Site estático (`index.html`, `styles.css`, `script.js`). Sem build.

1. Abra `script.js` e ajuste a constante `API_URL` para o endereço do backend.
2. Sirva a pasta (ou abra o `index.html`) e publique no GitHub Pages ou Netlify apontando para esta pasta como raiz.

Local, com o Flask em `http://127.0.0.1:5000`:

```bash
python3 -m http.server 4173
```

Depois do deploy do Render, troque `API_URL` pela URL pública, por exemplo `https://arquivo-da-copa.onrender.com`, e publique de novo.
