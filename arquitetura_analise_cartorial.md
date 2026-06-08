# Arquitetura Neuro-Simbólica: Sistema de Análise Cartorial e Despachantes

**Objetivo:** Alcançar 99% de precisão no cruzamento de dados, checklist e análise de inconsistências em dezenas de PDFs e Plantas Arquitetônicas.

## O Desafio Prático
Sistemas RAG tradicionais ou Chatbots puros falham e "alucinam" ao cruzar regras complexas, pois tratam a lógica como probabilidade de linguagem. Para precisão de 99%, a extração de dados deve ser separada da tomada de decisão lógica.

## Desenho da Arquitetura Proposta

### 1. Motor de Ingestão e Classificação (O Triador)
* **Função:** Recebe o pacote do despachante (ex: 15 PDFs variados).
* **Ação:** Uma IA rápida não lê o conteúdo profundo, apenas classifica: "Isso é uma Identidade", "Isso é um Contrato", "Isso é uma Planta".

### 2. Agentes de Extração Especializados (O "Leitor")
* **Função:** Extrair dados brutos sem tomar decisões.
* **Ação:** Para cada documento classificado, um modelo específico (incluindo IA de Visão para Plantas) é acionado com um Prompt rígido.
* **Saída Obrigatória:** JSON estrito. (Ex: `{"cpf": "123", "area_planta": 150}`). Isso elimina a alucinação narrativa.

### 3. Motor de Regras Determinístico (O "Juiz" - A Garantia dos 99%)
* **Função:** Aplicar a lógica de negócio e cruzar dados.
* **Ação:** Feito puramente em Código Tradicional (Python/Node), não em IA.
* **Mecânica:** O código recebe os JSONs extraídos e executa verificações matemáticas/lógicas exatas (ex: `if planta.area > iptu.area: alertar()`). 
* **Resultado:** Precisão absoluta nas inconsistências encontradas.

### 4. Motor RAG Apenas para Consultas Legais
* **Função:** Base de conhecimento para fundamentar recusas.
* **Ação:** Abriga a legislação da prefeitura e normas de cartório usando Chunking com Sobreposição. Acionado apenas para justificar os alertas gerados pelo Motor de Regras.

### 5. Interface "Humano no Loop" (Painel de Auditoria)
* **Função:** O sistema não "Aprova", ele "Audita".
* **Ação:** Mostra ao analista humano as inconsistências encontradas, exibindo o recorte exato da página do PDF (Bounding Box) onde o dado foi lido, permitindo que o humano dê o "Aceite" final.

---
*Nota: Este documento foi salvo a pedido do usuário para ser resgatado no futuro mediante a frase "traga o que eu pedir pra vc armazenar sobre o sistema de analise".*

---

## 🚀 Integração e Automação de Extração via n8n (Mistral OCR)

Abaixo está o planejamento técnico gravado para a automação da extração de dados do processo de licenciamento usando o fluxo de n8n já validado com Mistral OCR:

### 1. Roteiro do Fluxo no n8n (Webhook-driven)
* **Gatilho Inicial:** Substituir a leitura manual do Google Drive por um nó de **Webhook (POST)** que receberá o binário do PDF enviado diretamente pelo SisGestão.
* **Processamento:** O fluxo realiza o OCR via Mistral e alimenta a **Cadeia de LLM (Mistral)**.
* **Prompt da IA (Structured JSON):** O Mistral deve ser instruído a responder estritamente em formato JSON estruturado com os dados necessários (ex: áreas, distâncias, zoneamento).
* **Nó Final (Respond to Webhook):** Conecta a saída do LLM diretamente a um nó de resposta HTTP para enviar o JSON de volta para o SisGestão, eliminando o uso de documentos Word ou Google Docs intermediários.

### 2. Implementação no SisGestão
* **Envio de Documento:** Criar uma rota/função que capta os PDFs anexados na aba do processo e faz a requisição `POST` com o arquivo binário para a URL do Webhook do n8n.
* **Interface do Usuário:** Adicionar o botão `🤖 Preencher Checklist via IA (n8n)` na interface da Auditoria Técnica.
* **Preenchimento Automático:** Ao receber a resposta JSON de sucesso do n8n, o frontend React atualiza o estado `checklistData.projeto_residencial` populando os campos e acionando instantaneamente as regras de validação visual e cálculos na tela.

