@echo off
color 0B
echo =======================================================
echo     SISGESTAO - INICIANDO ECOSSISTEMA COMPLETO
echo =======================================================
echo.

echo [1/4] Iniciar API Principal (backend.py - Porta 8000)...
start cmd /k "title Backend API 8000 && python backend.py"

echo [2/4] Iniciar Processador RAG (processador_pdf.py - Porta 5000)...
start cmd /k "title Processador PDF 5000 && python processador_pdf.py"

echo [3/4] Iniciar Webhook Localtunnel (Porta 5000)...
start cmd /k "title Localtunnel 5000 && npx localtunnel --port 5000 --subdomain sglu-webhook-fixo-2026"

echo [4/4] Iniciar Frontend React/Vite...
start cmd /k "title Frontend Vite && npm run dev"

echo.
echo =======================================================
echo Todos os servicos foram inicializados em novas janelas!
echo Acompanhe os logs nas janelas abertas.
echo =======================================================
