import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.local')
sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

try:
    print("Deletando todos os chunks...")
    sb.table("rag_chunks").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    
    print("Deletando todos os documentos registrados...")
    sb.table("rag_documents").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    
    print("Banco de dados RAG 100% limpo!")
except Exception as e:
    print(f"Erro ao limpar banco: {e}")
