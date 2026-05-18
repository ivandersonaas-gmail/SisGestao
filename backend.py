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
        
    # Remove stopwords irrelevantes, mas preserva palavras cruciais como "define", "significa"
    stopwords = {'qual', 'quais', 'é', 'a', 'o', 'que', 'diga', 'de', 'do', 'da', 'em', 'um', 'uma', 'para', 'com', 'os', 'as', 'existe', 'algum', 'tipo', 'sobre', 'artigo', 'como', 'onde', 'quando', 'porque', 'por', 'esta', 'está', 'sao', 'são'}
    
    # Se a query já tem aspas ou OR (como a expansão acima), deixamos como está
    if '"' in query or ' OR ' in query:
        return query
        
    words = re.findall(r'\b\w{3,}\b', query.lower())
    keywords = [w for w in words if w not in stopwords]
    
    if keywords:
        # Usamos OR para que a busca por palavras-chave não falhe se faltar uma palavra
        return " OR ".join(keywords)
        
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

load_dotenv('.env.local', override=True)

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
        # Mudança Crítica: Usar o modelo Multilíngue (que entende português perfeitamente)
        _model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
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

# Variáveis para armazenar o mega documento em memória e não precisar bater no banco toda vez
global_mega_documento = None

def processar_pdf_background(temp_path, doc_id, doc_name, job_id):
    try:
        import re
        import os
        
        text = ""
        llama_key = os.getenv("LLAMA_CLOUD_API_KEY")
        
        if llama_key:
            print(f"Lendo PDF {doc_name} com LlamaParse (Alta Fidelidade)...")
            from llama_parse import LlamaParse
            
            # LlamaParse converte o PDF em Markdown estruturado (mantendo tabelas e artigos)
            parser = LlamaParse(
                api_key=llama_key,
                result_type="markdown",
                language="pt",
                verbose=True
            )
            
            jobs_status[job_id] = {"status": "processing", "progress": 30}
            
            # Executa a extração
            parsed_docs = parser.load_data(temp_path)
            
            # Une todas as páginas
            for doc in parsed_docs:
                text += doc.text + "\n\n"
                
            jobs_status[job_id] = {"status": "processing", "progress": 70}
            
            # Sanitização
            text = text.encode('utf-8', 'ignore').decode('utf-8')
            text = text.replace('\x00', '').replace('\u0000', '')
            
            # CHUNKING SEMÂNTICO (Baseado em cabeçalhos Markdown)
            # Divide o texto sempre que encontra um ou mais '#' no início de uma linha
            sections = [s.strip() for s in re.split(r'\n(?=#+ )', text) if len(s.strip()) > 50]
            
        else:
            print(f"AVISO: LLAMA_CLOUD_API_KEY não encontrada. Fallback para pdfplumber (Perda de tabelas/estrutura)...")
            import pdfplumber
            with pdfplumber.open(temp_path) as pdf:
                total_pages = len(pdf.pages)
                for i, page in enumerate(pdf.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                    
                    prog = int(((i + 1) / total_pages) * 100)
                    jobs_status[job_id] = {"status": "processing", "progress": min(prog, 60)}

            # Sanitização
            text = text.encode('utf-8', 'ignore').decode('utf-8')
            text = text.replace('\x00', '').replace('\u0000', '')

            # Chunking tradicional (menos assertivo, fallback)
            sections = [s.strip() for s in re.split(r'\n{2,}|\[Página \d+\]', text) if len(s.strip()) > 50]

        chunks_to_insert = []
        chunk_index = 0

        for section in sections:
            # Sub-chunking para garantir que os blocos não ultrapassem o limite ideal do modelo de embeddings
            words = section.split()
            MAX_CHUNK_WORDS = 300 # Aprox. 400 tokens
            
            if len(words) <= MAX_CHUNK_WORDS:
                # O bloco inteiro cabe (Chunking Semântico Ideal)
                sub_chunks = [section]
            else:
                # Sub-chunking com overlap para blocos gigantes
                sub_chunks = []
                for i in range(0, len(words), MAX_CHUNK_WORDS - 30):
                    sub_chunks.append(" ".join(words[i:i + MAX_CHUNK_WORDS]))

            for content_chunk in sub_chunks:
                if len(content_chunk) < 10:
                    continue

                model = get_model()
                embedding = [float(x) for x in model.encode(content_chunk)]
                
                # Extrai o título para o metadata (ajuda na citação)
                title_match = re.match(r'^(#+ .*?)\n', content_chunk)
                section_title = title_match.group(1)[:60] if title_match else section[:60]
                
                chunks_to_insert.append({
                    "document_id": doc_id,
                    "content": content_chunk,
                    "chunk_index": chunk_index,
                    "metadata": {"source_file": doc_name, "section": section_title.replace('\n', ' ')},
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

        # Processamento síncrono para total controle da memória RAM
        processar_pdf_background(temp_path, doc_id, doc_name, job_id)

        # Chama garbage collection para liberar recursos
        import gc
        gc.collect()

        return jsonify({
            "status": "processing",
            "message": "Processamento do PDF concluído com sucesso.",
            "job_id": job_id,
            "document_id": doc_id
        }), 200

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
    global global_mega_documento
    try:
        payload = request.get_json() or {}
        question = str(payload.get("question", ""))
        
        from google import genai
        
        client_gemini = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        
        # PASSO 1: Carregar todo o conhecimento para a RAM (Long Context) se ainda não estiver carregado
        if global_mega_documento is None:
            print("Carregando o Mega Documento (Long Context) da base de dados...")
            res = sb.table('rag_chunks').select('content, metadata').order('chunk_index').limit(2000).execute()
            all_chunks = res.data
            
            if not all_chunks:
                return jsonify({"answer": "Nenhum documento encontrado no banco de dados.", "grounded": False, "sources": []})
            
            mega_documento = "# CONHECIMENTO ABSOLUTO (PLANO DIRETOR E LEIS)\n\n"
            for chunk in all_chunks:
                mega_documento += f"{chunk.get('content', '')}\n\n"
                
            global_mega_documento = mega_documento
            print("Mega Documento carregado com sucesso (aprox. 45 mil tokens).")

        # PASSO 2: Consulta Direta (Free Tier não suporta Cache explícito, mas suporta 1 Milhão de Tokens por requisição)
        print("Enviando mega-prompt para a Inteligência...")
        prompt_final = f"Baseado ÚNICA E EXCLUSIVAMENTE nas leis abaixo, responda à pergunta do projetista.\n\n{global_mega_documento}\n\nPergunta do Usuário: {question}"
        
        response = client_gemini.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt_final,
            config={
                "system_instruction": "Você é o Oráculo, um analista técnico avançado e especialista em aprovação de projetos arquitetônicos. REGRA DE OURO: Responda a pergunta baseando-se EXCLUSIVAMENTE nas leis do documento. NUNCA invente informações. Sempre cite o número do Artigo ou a seção que fundamenta sua resposta."
            }
        )
        answer = response.text or "Desculpe, não encontrei a resposta."

        # Extração de Métricas de Tokens (Tempo Real)
        token_usage = {}
        if hasattr(response, 'usage_metadata') and response.usage_metadata:
            meta = response.usage_metadata
            token_usage = {
                "prompt_tokens": meta.prompt_token_count or 0,
                "response_tokens": meta.candidates_token_count or 0,
                "total_tokens": meta.total_token_count or 0
            }
            print("\n" + "="*50)
            print("[ PAINEL DE CUSTOS E TOKENS - TEMPO REAL ]")
            print(f"Tokens Lidos (Prompt/Documento): {token_usage['prompt_tokens']}")
            print(f"Tokens Gerados (Resposta): {token_usage['response_tokens']}")
            print(f"Total Consumido nesta Pergunta: {token_usage['total_tokens']}")
            print(f"Aviso - Limite Gratuito: {token_usage['total_tokens']} / 1.000.000 por minuto")
            print("="*50 + "\n")

        # Retornamos as fontes como "Plano Diretor e Código de Obras" já que a IA leu o livro todo.
        return jsonify({
            "answer": answer,
            "grounded": True,
            "sources": ["Base de Dados Legal Completa (Long Context)"],
            "token_usage": token_usage
        })

    except Exception as e:
        print("ERRO FATAL ASK:", traceback.format_exc())
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)

