import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.local')
sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

try:
    # Supabase python client requires an EQ or similar to delete all, so we delete where question is not null
    res = sb.table("rag_cache").delete().neq("question", "XXXXXXX").execute()
    print("Cache limpo com sucesso!")
except Exception as e:
    print(f"Erro ao limpar cache: {e}")
