import os
import time
from markitdown import MarkItDown
from supabase import create_client, Client
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from google import genai

# ==============================================================================
# CONFIGURAÇÕES E CHAVES DE API
# ==============================================================================
load_dotenv('.env.local')

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", os.environ.get("SUPABASE_URL"))
SUPABASE_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY", os.environ.get("SUPABASE_KEY"))
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY or not GEMINI_API_KEY:
    raise ValueError("Chaves da API não encontradas no .env.local!")

# Inicializar Clientes
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
ai_client = genai.Client(api_key=GEMINI_API_KEY)

# Inicializar MarkItDown
md = MarkItDown(enable_plugins=True)

# Inicializar Text Splitter (LangChain)
# Isso garante que cortes não mutilem tabelas e parágrafos importantes
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=2000,
    chunk_overlap=400,
    separators=["\n\n", "\n", " ", ""]
)

# Inicializar App Flask
app = Flask(__name__)
CORS(app) # Permite que o React (localhost:5173) consiga chamar esta API sem erros de política cruzada

# ==============================================================================
# FUNÇÕES CORE
# ==============================================================================

def gerar_embedding(texto: str) -> list[float]:
    """Gera o embedding de 384 dimensões usando a API oficial do Google-GenAI"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = ai_client.models.embed_content(
                model='gemini-embedding-001',
                contents=texto,
                config={'output_dimensionality': 384}
            )
            # Extrai a matriz vetorial retornada pela API
            return response.embeddings[0].values
        except Exception as e:
            error_str = str(e)
            if '429' in error_str or 'RESOURCE_EXHAUSTED' in error_str:
                if attempt < max_retries - 1:
                    print(f"\n[!] Cota excedida (Erro 429). Aguardando 20 segundos antes de tentar novamente (Tentativa {attempt+1}/{max_retries})...")
                    import time
                    time.sleep(20)
                else:
                    raise e
            else:
                raise e

def processar_arquivo_singular(doc_id: str, storage_path: str, file_name: str):
    """Realiza o download, extração, fatiamento e vetorização do documento."""
    temp_pdf_path = f"temp_{doc_id}.pdf"
    
    try:
        print(f"\n[{doc_id}] Baixando arquivo do Supabase: {storage_path}")
        
        # 1. Download do arquivo do storage do Supabase
        res_download = supabase.storage.from_("rag-documents").download(storage_path)
        with open(temp_pdf_path, "wb") as f:
            f.write(res_download)
            
        # 2. Extração via MarkItDown
        print(f"[{doc_id}] Extraindo Markdown (estruturando tabelas)...")
        result = md.convert(temp_pdf_path)
        full_text = result.text_content
        
        if not full_text or len(full_text.strip()) == 0:
            print(f"[{doc_id}] AVISO: O texto extraído está vazio.")
            return

        # 3. Fatiamento Semântico com LangChain
        print(f"[{doc_id}] Fatiando texto semanticamente com LangChain...")
        # Cria documentos semânticos a partir do texto completo
        chunks = text_splitter.split_text(full_text)
        
        # 4. Geração de Embeddings e Inserção
        chunks_para_inserir = []
        total_chunks = len(chunks)
        
        for i, chunk in enumerate(chunks):
            print(f"[{doc_id}] Gerando embedding para chunk {i+1}/{total_chunks}...")
            
            # Chama a nova API oficial
            vetor = gerar_embedding(chunk)
            
            chunks_para_inserir.append({
                "document_id": doc_id,
                "content": chunk,
                "embedding": vetor,
                "chunk_index": i,
                "metadata": {
                    "source_file": file_name
                }
            })
            time.sleep(3) # Pausa maior (3s) para evitar Rate Limit por minuto
            
        # 5. Inserção Batch no Supabase
        print(f"[{doc_id}] Inserindo {len(chunks_para_inserir)} chunks vetorizados no Supabase...")
        if chunks_para_inserir:
            response_db = supabase.table("rag_chunks").insert(chunks_para_inserir).execute()
            # O Supabase Python não levanta exceção de banco de dados automaticamente. Precisamos validar:
            if hasattr(response_db, 'error') and response_db.error:
                raise Exception(f"Erro fatal ao inserir no banco: {response_db.error}")
            
        print(f"[{doc_id}] Processamento finalizado com sucesso!")

    except Exception as e:
        print(f"[{doc_id}] Erro durante o processamento: {str(e)}")
        raise e
        
    finally:
        # Limpeza do arquivo temporário
        if os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)

# ==============================================================================
# ROTAS FLASK (API ORIENTADA A EVENTOS)
# ==============================================================================

@app.route('/webhook', methods=['POST'])
def handle_webhook():
    """
    Rota Webhook para processamento imediato.
    O Supabase deve enviar um payload com as informações do novo documento inserido.
    """
    try:
        payload = request.json
        print("\n=== WEBHOOK RECEBIDO ===")
        
        # O payload pode variar dependendo da configuração do webhook do Supabase.
        # Considerando o payload padrão do tipo "record" do webhook:
        record = payload.get("record", {})
        
        doc_id = record.get("id")
        storage_path = record.get("storage_path")
        file_name = record.get("name")
        
        if not doc_id or not storage_path:
            return jsonify({"status": "error", "message": "Payload inválido. Falta ID ou storage_path."}), 400
            
        print(f"Documento detectado: {file_name}")
        
        # Roda o fluxo principal de RAG
        processar_arquivo_singular(doc_id, storage_path, file_name)
        
        return jsonify({"status": "success", "message": f"Documento {file_name} processado."}), 200

    except Exception as e:
        print(f"Erro no webhook: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Rota simples para verificar se o serviço está rodando."""
    return jsonify({"status": "healthy"}), 200

if __name__ == "__main__":
    print("=====================================================")
    print("🚀 Iniciando Servidor de Processamento RAG (SisGestão)")
    print("=====================================================")
    print("Aguardando chamadas POST na rota http://localhost:5000/webhook\n")
    # Roda o servidor web na porta 5000
    app.run(host="0.0.0.0", port=5000)
