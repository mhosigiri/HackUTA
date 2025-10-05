import os
import PyPDF2
from sentence_transformers import SentenceTransformer
import chromadb
import google.generativeai as genai
from dotenv import load_dotenv


class EmbeddingFunction:
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
    
    def name(self):
        return "all-MiniLM-L6-v2"
    
    def embed_documents(self, input_text):
        try:
            return [self.model.encode(text).tolist() for text in input_text]
        except Exception as e:
            print(f"[Embedding Error] {e}")
            return [[0.0] * 384 for _ in input_text]
    
    def embed_query(self, input_text):
        try:
            if isinstance(input, str):
                return self.model.encode([input])[0].tolist()
            else:
                return [self.model.encode(q).tolist() for q in input_text]
        except Exception as e:
            print(f"[Query Embedding Error] {e}")
            return [0.0] * 384


# query 
def query_docs(collection, question, n = 2):
    results = collection.query(query_texts = [question], n_results = n)

    extracted_docs = [doc for sublist in results["documents"] for doc in sublist]

    print("==== Retrieving Docs ====")
    return extracted_docs


# generate response

def generate_response(question, extracted_docs):
    context = "\n\n".join(extracted_docs)

    prompt = (
        "You are an assitant for mortgage guidance and related question-answering tasks. Use the following pieces of"
        "retrieved context to answer the question. If you don't know the answer, say that you "
        "don't know. Use absolutely needed sentences only and keep the answer concise."
        "\n\nContext:\n" + context + "\n\nQuestion:\n" + question
    )

    model = genai.GenerativeModel("models/gemini-2.5-pro")

    response = model.generate_content(prompt)

    return response.text

# load all pdfs
def load_documents(path):
    print("====LOADING DOCUMENTS====")
    documents = []
    for filename in os.listdir(path):
        if filename.endswith(".pdf"):
            pdf_path = os.path.join(path, filename)
            reader = PyPDF2.PdfReader(pdf_path)
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text:
                    documents.append({
                        "id": f"{filename}_page_{i+1}",
                        "pdf_name": filename,
                        "page_number": i+1,
                        "text": text
                    })
    return documents

def split_text(text, chunk_size = 1000, chunk_overlap = 20):
    chunks = []
    start = 0
    while start<len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - chunk_overlap
    return chunks

if __name__ == "__main__":
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables")
    
    genai.configure(api_key = api_key)

    i = 0 # used as index for chromadb


    # Create embedding function
    embedding_function = EmbeddingFunction()

    # Initialize ChromaDB client
    chroma_client = chromadb.PersistentClient(path="./chroma_db")

    collection = chroma_client.get_or_create_collection(
        name = "Mortgages_Collection"
    )   


    # get the pdf's path
    path = "./documents"
    documents = load_documents(path)
    print("Lenght of docs = ", len(documents))

    print(f"Loaded {len(documents)} documents successfully")

    
    # Test the embedding function
    chunked_docs = []
    for docs in documents:
        chunks = split_text(docs["text"])
        print("==== Splitting docs into chunks and embedding ====")
        for i, chunk in enumerate(chunks):
            collection.upsert(
                documents = [chunk],
                embeddings = embedding_function.embed_documents([chunk]),
                metadatas = [{
                    "pdf_name": docs["pdf_name"],
                    "page_number": docs["page_number"]
                }],
                ids = [f"{docs['pdf_name'].replace('.pdf','')}_page_{docs['page_number']}_chunk_{i}"]
            )
    
    question  = "What does Hazardous Materials mean in Mortgages?"
    extracted_docs = query_docs(collection, question)
    answer = generate_response(question, extracted_docs)

    print(collection.count())
    print(answer)
