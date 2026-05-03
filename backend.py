from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import create_client
import torch
import gc

torch.set_num_threads(1)
import pdfplumber
import httpx
import traceback
import os
import io
import re

def expandir_termos(query: str) -> str:
    # Se achar "artigo 81" ou "art 81", expande para a busca do Postgres (websearch_to_tsquery)
    match = re.search(r'(artigo|art\.?)\s*(\d+)', query, re.IGNORECASE)
    if match:
        numero = match.group(2)
        expansao = f'("artigo {numero}" OR "art. {numero}" OR "art {numero}")'
        query = query.replace(match.group(0), expansao)
    return query
import requests
from google import genai
from tenacity import retry, wait_exponential, stop_after_attempt
import time

def gerar_documento_hipotetico(pergunta: str) -> str:
    """Implementa a técnica HyDE (Hypothetical Document Embeddings) usando o Gemini para enriquecer a busca vetorial."""
    try:
        from google import genai
        client_gemini = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        prompt_hyde = f"Escreva um trecho em formato de texto jurídico, normativo ou de plano diretor municipal que responda diretamente à pergunta. Use linguagem técnica de direito urbanístico. Escreva apenas o parágrafo hipotético, sem introduções.\n\nPergunta: {pergunta}"
        
        response = client_gemini.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt_hyde
        )
        doc_hipotetico = response.text or ""
        return f"{pergunta} {doc_hipotetico}"
    except Exception as e:
        print(f"HyDE falhou. Usando fallback: {e}")
        return pergunta

@retry(wait=wait_exponential(multiplier=1, min=2, max=10), stop=stop_after_attempt(5))
def _call_groq_final_api(groq_key, context, question, timeout_settings):
    import httpx
    groq_response = httpx.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {groq_key}",
            "Content-Type": "application/json"
        },
        json={
            "model": "llama-3.1-8b-instant",
            "messages": [
                {
                    "role": "system",
                    "content": "Voce e um assistente do SisGestao. Responda APENAS com base nos trechos abaixo. NAO invente informacoes. Cite sempre a fonte."
                },
                {
                    "role": "user",
                    "content": f"Trechos:\n{context}\n\nPergunta: {question}"
                }
            ],
            "max_tokens": 1500
        },
        timeout=timeout_settings
    )
    groq_response.raise_for_status()
    groq_data = groq_response.json()
    return str(groq_data["choices"][0]["message"]["content"])

load_dotenv('.env.local')

app = Flask(__name__)
CORS(app)

@app.errorhandler(Exception)
def handle_exception(e):
    # Ponto 1: Captura erros não tratados (como UnicodeError e JSON errors)
    return jsonify({"error": "Erro Interno no Servidor", "message": str(e), "traceback": traceback.format_exc()}), 500

_model = None

def get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer('all-MiniLM-L6-v2')
    return _model

sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

@app.route("/embed", methods=["POST"])
def embed():
    try:
        payload = request.get_json() or {}
        text = str(payload.get("text", ""))
        model = get_model()
        embedding = [float(x) for x in model.encode(text)]
        return jsonify({"embedding": embedding})
    except Exception as e:
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

import threading
import uuid

# Dicionário de Jobs na memória global do Flask
jobs_status = {}

def processar_pdf_background(temp_path, doc_id, doc_name, job_id):
    try:
        import pdfplumber
        import re

        text = ""
        print(f"Lendo PDF {doc_name} com pdfplumber...")
        with pdfplumber.open(temp_path) as pdf:
            total_pages = len(pdf.pages)
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
                
                # Atualiza progresso do Job
                prog = int(((i + 1) / total_pages) * 100)
                jobs_status[job_id] = {"status": "processing", "progress": min(prog, 99)}

        # Sanitização de Encoding
        text = text.encode('utf-8', 'ignore').decode('utf-8')
        text = text.replace('\x00', '').replace('\u0000', '')

        # Fatiamento e chunking original
        sections = [s.strip() for s in re.split(r'\n{2,}|\[Página \d+\]', text) if len(s.strip()) > 50]
        CHUNK_SIZE = 150
        CHUNK_OVERLAP = 30

        chunks_to_insert = []
        chunk_index = 0

        for section in sections:
            words = section.split()
            for i in range(0, len(words), CHUNK_SIZE - CHUNK_OVERLAP):
                chunk_words = words[i:i + CHUNK_SIZE]
                content_chunk = " ".join(chunk_words)
                if len(content_chunk) < 10:
                    continue

                model = get_model()
                embedding = [float(x) for x in model.encode(content_chunk)]
                chunks_to_insert.append({
                    "document_id": doc_id,
                    "content": content_chunk,
                    "chunk_index": chunk_index,
                    "metadata": {"source_file": doc_name, "section": section[:60]},
                    "embedding": embedding
                })
                chunk_index += 1

        for i in range(0, len(chunks_to_insert), 50):
            sb.table('rag_chunks').insert(chunks_to_insert[i:i+50]).execute()

        jobs_status[job_id] = {"status": "completed", "progress": 100}
        print(f"Sucesso! PDF {doc_name} processado e chunks salvos no Supabase em segundo plano via pdfplumber.")

    except Exception as err:
        print(f"Erro fatal na thread de extração do PDF {doc_name}: {err}")
        jobs_status[job_id] = {"status": "failed", "progress": 100, "error": str(err)}
    finally:
        # Garantia absoluta de limpeza no Windows
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


@app.route("/process_document", methods=["POST"])
@app.route("/api/process_document", methods=["POST"])
def process_document():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "Arquivo não encontrado na requisição"}), 400

        doc_id = request.form.get('document_id')
        doc_name = request.form.get('document_name', 'Documento Desconhecido')

        file = request.files['file']

        import tempfile

        # Salva o arquivo temporariamente para a thread ler
        temp_fd, temp_path = tempfile.mkstemp(suffix=".pdf")
        os.close(temp_fd)
        file.save(temp_path)

        job_id = str(uuid.uuid4())
        jobs_status[job_id] = {"status": "processing", "progress": 0}

        # Dispara processamento em segundo plano usando Thread (equivalente a FastAPI BackgroundTasks no Flask)
        thread = threading.Thread(target=processar_pdf_background, args=(temp_path, doc_id, doc_name, job_id))
        thread.start()

        return jsonify({
            "status": "processing",
            "message": "Processamento do PDF iniciado em segundo plano.",
            "job_id": job_id,
            "document_id": doc_id
        }), 202

    except Exception as e:
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500


@app.route("/job_status/<job_id>", methods=["GET"])
@app.route("/api/job_status/<job_id>", methods=["GET"])
def job_status(job_id):
    job = jobs_status.get(job_id)
    if not job:
        return jsonify({"error": "Job não encontrado"}), 404
    return jsonify(job), 200


@app.route("/ask", methods=["POST"])
@app.route("/api/ask", methods=["POST"])
def ask():
    try:
        payload = request.get_json() or {}
        question = str(payload.get("question", ""))
        groq_key = os.getenv("GROQ_API_KEY")
        model = get_model()
        query_embedding = [float(x) for x in model.encode(question)]
        use_cache = bool(payload.get("use_cache", True))

        # --- PONTO 5: Cache Semântico ---
        if use_cache:
            try:
                cache_res = sb.rpc('search_cache', {
                    'query_embedding': query_embedding,
                    'match_threshold': 0.95,
                    'match_count': 1
                }).execute()
                
                if cache_res.data and len(cache_res.data) > 0:
                    return jsonify({
                        "answer": cache_res.data[0]['answer'],
                        "grounded": True,
                        "sources": cache_res.data[0]['sources'],
                        "cached": True
                    })
            except Exception as e:
                print("Erro ou cache não existe:", e)

        # --- PONTO 4: Busca Híbrida RPC ---
        try:
            # Prepara a query textual expandida para bater exatamente com variações do Postgres
            query_textual = expandir_termos(question)
            
            # Se a pergunta pedir um artigo específico, evitamos HyDE para não desviar a busca
            if re.search(r'(artigo|art\.?)\s*\d+', question, re.IGNORECASE):
                query_embedding_hyde = query_embedding
            else:
                texto_enriquecido = gerar_documento_hipotetico(question)
                query_embedding_hyde = [float(x) for x in model.encode(texto_enriquecido)]
            
            # Faz uma única chamada híbrida ao Supabase resolvendo conflitos de overloading
            rpc_res = sb.rpc('search_chunks_hybrid', {
                'query_text': query_textual,
                'query_embedding': query_embedding_hyde,
                'match_count': 30,
                'full_text_weight': 1.0,
                'semantic_weight': 1.0,
                'rrf_k': 50
            }).execute()
            
            # O response.data já contém os top 30 chunks com a nota RRF final
            chunks_vencedores = rpc_res.data if rpc_res.data else []
            
            print("====== DIAGNÓSTICO: CHUNKS VENCEDORES RRF ======")
            for idx, cv in enumerate(chunks_vencedores):
                print(f"\n--- [Posição {idx}] ---")
                conteudo_seguro = cv.get('content', '').encode('ascii', 'ignore').decode('ascii', 'ignore')
                print(conteudo_seguro)
            print("===============================================")
            
            top_scored = chunks_vencedores[:5]
            
            # Context Window Expansion: Busca vizinhos via banco de dados
            final_chunks = []
            seen_ids = set()
            
            for chunk in top_scored:
                if chunk['id'] in seen_ids:
                    continue
                
                doc_id = chunk.get('document_id')
                c_idx = chunk.get('chunk_index')
                
                if doc_id is None or c_idx is None:
                    final_chunks.append(chunk)
                    seen_ids.add(chunk['id'])
                    continue
                
                # Pega as 3 fatias em volta de uma vez
                neighbors_res = sb.table('rag_chunks').select('id, content, chunk_index, metadata')\
                    .eq('document_id', doc_id)\
                    .in_('chunk_index', [c_idx - 1, c_idx, c_idx + 1]).execute()
                    
                neighbors = neighbors_res.data
                neighbors.sort(key=lambda x: x.get('chunk_index', 0))
                
                merged_content = "\n... ".join([n.get('content', '') for n in neighbors])
                
                final_chunks.append({
                    "content": merged_content,
                    "metadata": chunk.get('metadata', {})
                })
                
                for n in neighbors:
                    seen_ids.add(n['id'])
                    
            chunks = final_chunks
        except Exception as e:
            print("Erro na busca RPC:", e)
            chunks = []

        if not chunks:
            return jsonify({"answer": "Nao encontrei informacoes nos documentos fornecidos.", "grounded": False, "sources": []})

        context = ""
        sources = []
        for i, c in enumerate(chunks):
            content_text = str(c.get("content", ""))
            source = str(c.get("metadata", {}).get("source_file", ""))
            context += f"Trecho {i+1} [Fonte: {source}]:\n{content_text}\n\n"
            if source and source not in sources:
                sources.append(source)

        # Removemos o truncamento bruto de context[:8000] pois agora temos fatias bem delimitadas.

        # Chamada ao Gemini 2.5 Flash com Fallback para a Groq em caso de erro 429 de Quota
        answer = ""
        try:
            from google import genai
            client_gemini = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
            prompt_final = f"Você é um assistente do SisGestão. Responda APENAS com base nos trechos abaixo. NÃO invente informações. Cite sempre a fonte.\n\nTrechos:\n{context}\n\nPergunta: {question}"
            
            response = client_gemini.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt_final
            )
            answer = response.text or "Sem resposta"
        except Exception as e_gemini:
            print(f"Erro no Gemini (429 ou quota): {e_gemini}. Tentando Fallback na Groq...")
            groq_key = os.getenv("GROQ_API_KEY")
            if groq_key:
                try:
                    import httpx
                    groq_response = httpx.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {groq_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": "llama-3.1-8b-instant",
                            "messages": [
                                {
                                    "role": "system",
                                    "content": "Voce e um assistente do SisGestao. Responda APENAS com base nos trechos abaixo. NAO invente informacoes. Cite sempre a fonte."
                                },
                                {
                                    "role": "user",
                                    "content": f"Trechos:\n{context}\n\nPergunta: {question}"
                                }
                            ],
                            "max_tokens": 1500
                        },
                        timeout=30.0
                    )
                    groq_response.raise_for_status()
                    groq_data = groq_response.json()
                    answer = str(groq_data["choices"][0]["message"]["content"])
                except Exception as e_groq:
                    print(f"Fallback na Groq também falhou: {e_groq}. Usando resposta local de emergência.")
                    answer = "As cotas de uso das APIs de IA (Gemini e Groq) foram temporariamente excedidas no momento. Mas aqui estão os trechos exatos encontrados no seu documento que respondem à pergunta:\n\n"
                    for idx, c in enumerate(chunks):
                        answer += f"**Trecho {idx+1} [Fonte: {c.get('metadata', {}).get('source_file', 'Documento')}]:**\n{c.get('content', '')}\n\n"
            else:
                answer = "A API do Gemini retornou erro de limite de quota e nenhuma chave Groq foi encontrada. Aqui estão os trechos exatos:\n\n"
                for idx, c in enumerate(chunks):
                    answer += f"**Trecho {idx+1} [Fonte: {c.get('metadata', {}).get('source_file', 'Documento')}]:**\n{c.get('content', '')}\n\n"

        # Salvar no Cache Semântico se for uma resposta válida (Não negativa ou de erro)
        try:
            erros_comuns = ["infelizmente", "não foi possível", "não há menção", "não encontrei", "não há", "cotas de uso", "quota"]
            if not any(err in answer.lower() for err in erros_comuns):
                sb.table('rag_cache').insert({
                    "question": question,
                    "question_embedding": query_embedding,
                    "answer": answer,
                    "sources": sources
                }).execute()
        except Exception as e:
            print("Aviso: Falha ao salvar no cache:", e)

        return jsonify({
            "answer": answer,
            "grounded": True,
            "sources": sources
        })

    except Exception as e:
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)
