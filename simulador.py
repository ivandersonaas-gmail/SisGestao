import os
import re
from dotenv import load_dotenv
from supabase import create_client
from sentence_transformers import SentenceTransformer
import cohere

# 1. Carrega as chaves do seu arquivo .env.local (Sem mexer no seu servidor rodando)
load_dotenv('.env.local')
sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
co = cohere.Client(os.getenv("COHERE_API_KEY"))

# 2. A pergunta exata que deu erro no seu navegador
pergunta_original = "mostre o artigo no qual fala sobre a definição de parcelamento um texto que corresponda"

# 3. A Nova Lista de Bloqueio (Simulação da nossa Raquete Elétrica)
# Adicionei: mostre, fala, texto, corresponda, artigo, sobre
stopwords_novas = {
    'qual', 'quais', 'é', 'a', 'o', 'que', 'diga', 'de', 'do', 'da', 'em', 'um', 'uma', 
    'para', 'com', 'os', 'as', 'existe', 'algum', 'tipo', 'como', 'onde', 'quando', 
    'porque', 'por', 'esta', 'está', 'sao', 'são', 
    # NOVAS PALAVRAS BLOQUEADAS ABAIXO:
    'mostre', 'fala', 'texto', 'corresponda', 'artigo', 'sobre', 'no'
}

# 4. A função que simula a limpeza da frase
def limpar_frase(query):
    words = re.findall(r'\b\w{3,}\b', query.lower())
    keywords = [w for w in words if w not in stopwords_novas]
    return " OR ".join(keywords) if keywords else query

frase_limpa_para_o_banco = limpar_frase(pergunta_original)

print(f"=== INICIO DA SIMULACAO ===")
print(f"Pergunta do Usuário: '{pergunta_original}'")
print(f"O que o banco de dados vai ler: '{frase_limpa_para_o_banco}'\n")

# 5. Executando a Busca no Banco (com os exatos mesmos limites do backend.py)
query_embedding = [float(x) for x in model.encode(pergunta_original)]

res = sb.rpc('search_chunks_hybrid', {
    'query_text': frase_limpa_para_o_banco,
    'query_embedding': query_embedding,
    'match_count': 30,         # O LIMITE OFICIAL DE 30
    'full_text_weight': 0.1,   # O PESO OFICIAL
    'semantic_weight': 1.0,    # O PESO OFICIAL
    'rrf_k': 50
}).execute()

chunks_vencedores = res.data
print(f"O banco de dados pescou {len(chunks_vencedores)} resultados (O Limite).\n")

# 6. Enviando para a Cohere Ler (Apenas os 30 que o banco pescou)
print("=== A COHERE ESTÁ LENDO OS 30 TEXTOS... ===")
docs_for_rerank = [c.get('content', '') for c in chunks_vencedores]

rerank_response = co.rerank(
    model="rerank-multilingual-v3.0",
    query=pergunta_original,
    documents=docs_for_rerank,
    top_n=3
)

print("\n=== RESULTADO FINAL (O QUE A IA IA TE MOSTRAR) ===")
for result in rerank_response.results:
    texto = chunks_vencedores[result.index]['content'].split('\n')[0:3]
    texto_limpo = " ".join(texto)
    print(f"RANK {result.index + 1} (Score: {result.relevance_score:.4f}): {texto_limpo}")
