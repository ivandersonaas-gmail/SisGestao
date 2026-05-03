import os
import re
from dotenv import load_dotenv
from supabase import create_client
from sentence_transformers import SentenceTransformer

def expandir_termos(query: str) -> str:
    match = re.search(r'(artigo|art\.?)\s*(\d+)', query, re.IGNORECASE)
    if match:
        numero = match.group(2)
        expansao = f'("artigo {numero}" OR "art. {numero}" OR "art {numero}")'
        query = query.replace(match.group(0), expansao)
    return query

load_dotenv('.env.local')
sb = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))
model = SentenceTransformer('all-MiniLM-L6-v2')

question = 'diga o que tem no art. 81 plano diretor'
query_textual = expandir_termos(question)
query_embedding = [float(x) for x in model.encode(question)]

rpc_res = sb.rpc('search_chunks_hybrid', {
    'query_text': query_textual,
    'query_embedding': query_embedding,
    'match_count': 30,
    'full_text_weight': 1.0,
    'semantic_weight': 1.0,
    'rrf_k': 50
}).execute()

chunks = rpc_res.data if rpc_res.data else []
print('Total results:', len(chunks))
for i, c in enumerate(chunks[:10]):
    print(f'Index {i}:', c['content'][:100].replace('\n', ' '))
