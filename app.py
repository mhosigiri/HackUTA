import os
import PyPDF2
from sentence_transformers import SentenceTransformer
import chromadb
import google.generativeai as genai
from dotenv import load_dotenv
from flask import Flask, request, send_file, jsonify
from elevenlabs.client import ElevenLabs
from io import BytesIO

# --- RAG SYSTEM COMPONENTS ---

class EmbeddingFunction:
    """Custom embedding function for ChromaDB."""
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.embedding_dimension = 384
    
    def name(self):
        return "all-MiniLM-L6-v2"
    
    def embed_documents(self, input_text):
        try:
            return [self.model.encode(text).tolist() for text in input_text]
        except Exception as e:
            print(f"[Embedding Error] {e}")
            return [[0.0] * self.embedding_dimension for _ in input_text]
    
    def embed_query(self, input_text):
        try:
            if isinstance(input_text, str):
                return self.model.encode(input_text).tolist()
            else:
                 return [self.model.encode(q).tolist() for q in input_text]
        except Exception as e:
            print(f"[Query Embedding Error] {e}")
            return [0.0] * self.embedding_dimension


def query_docs(collection, question, embedding_function, n=2):
    """Performs similarity search in ChromaDB."""
    
    results = collection.query(query_texts = [question], n_results = n)
    extracted_docs = [doc for sublist in results.get("documents", []) for doc in sublist]
    
    print("==== Retrieving Docs ====")
    return extracted_docs


def generate_response(question, extracted_docs):
    """Generates a response from Gemini based on retrieved context."""
    if not extracted_docs:
        return "I couldn't find any relevant documents to answer your question."
        
    context = "\n\n".join(extracted_docs)

    prompt = (
        "You are an assistant for mortgage guidance and related question-answering tasks. Use the following pieces of"
        "retrieved context to answer the question. If you don't know the answer, say that you "
        "don't know. Use absolutely needed sentences only and keep the answer concise."
        "\n\nContext:\n" + context + "\n\nQuestion:\n" + question
    )

    try:
        model = genai.GenerativeModel("models/gemini-2.5-pro")
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"[Gemini API Error] {e}")
        return "An error occurred while generating the AI response."


def load_documents(path):
    """Loads text content from all PDF files in a directory (by page)."""
    print("====LOADING DOCUMENTS====")
    documents = []
    try:
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
    except FileNotFoundError:
        print(f"Error: Directory not found at {path}. No PDFs loaded.")
        
    return documents

def split_text(text, chunk_size=1000, chunk_overlap=20):
    """Splits a long text string into smaller chunks with overlap."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - chunk_overlap
        if end >= len(text):
            break
    return chunks

# --- ELEVENLABS TTS COMPONENTS ---

def text_to_speech(text, elevenlabs_client, voice_id="JBFqnCBsd6RMkjVDRZzb"):
    """Converts text to speech using the ElevenLabs API."""
    try:
        audio_generator = elevenlabs_client.text_to_speech.convert(
            text=text,
            voice_id=voice_id,
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128",
        )
        audio_bytes = b"".join(list(audio_generator))
        return audio_bytes
    except Exception as e:
        print(f"[ElevenLabs TTS Error] {e}")
        return None

# --- FLASK APPLICATION ---

# Global variables for the RAG system
embedding_function = None
collection = None
elevenlabs = None

app = Flask(__name__, static_folder="static")

@app.route("/")
def index():
    """Serves the main HTML page."""
    return app.send_static_file("index.html")

@app.route("/ai-tts", methods=["POST"])
def ai_tts():
    """Handles query, generates AI text, and converts to speech."""
    if collection is None or elevenlabs is None:
        return jsonify({"error": "RAG or ElevenLabs systems not initialized."}), 500

    user_query = request.json.get("query", "")

    if not user_query:
        return jsonify({"error": "No query provided."}), 400

    # 1. RAG: Retrieve relevant documents
    extracted_docs = query_docs(collection, user_query, embedding_function)
    
    # 2. RAG: Generate response from Gemini
    ai_text = generate_response(user_query, extracted_docs)
    print("AI Text:", ai_text)
    
    # 3. ElevenLabs: Convert text to speech
    audio_bytes = text_to_speech(ai_text, elevenlabs_client=elevenlabs) 
    
    if audio_bytes:
        return send_file(BytesIO(audio_bytes), mimetype="audio/mpeg")
    else:
        return jsonify({"error": "Failed to generate audio."}), 500

if __name__ == "__main__":
    load_dotenv()
    
    # --- RAG/GEMINI SETUP ---
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if gemini_api_key:
        genai.configure(api_key=gemini_api_key)
        
        embedding_function = EmbeddingFunction()
        chroma_client = chromadb.PersistentClient(path="./chroma_db")
        collection = chroma_client.get_or_create_collection(
            name="Mortgages_Collection",
        ) 

        # Load documents and embed/upsert IF the collection is empty (fast startup on subsequent runs)
        if collection.count() == 0:
            path = "./documents"
            documents = load_documents(path)
            print(f"Loaded {len(documents)} documents successfully")

            if documents:
                print("==== Splitting docs into chunks and embedding ====")
                for docs in documents:
                    chunks = split_text(docs["text"])
                    
                    # Batch data for efficient upsert
                    chunk_ids = []
                    chunk_embeddings = []
                    chunk_metadatas = []
                    
                    for i, chunk in enumerate(chunks):
                        chunk_embeddings.extend(embedding_function.embed_documents([chunk]))
                        chunk_metadatas.append({
                            "pdf_name": docs["pdf_name"],
                            "page_number": docs["page_number"]
                        })
                        chunk_ids.append(f"{docs['pdf_name'].replace('.pdf','')}_page_{docs['page_number']}_chunk_{i}")
                    
                    try:
                        collection.upsert(
                            documents=chunks,
                            embeddings=chunk_embeddings,
                            metadatas=chunk_metadatas,
                            ids=chunk_ids
                        )
                    except Exception as e:
                        print(f"Error during upsert for document {docs['pdf_name']}: {e}")
                
                print(f"Total chunks in collection: {collection.count()}")

        # Test the system with the original question after setup (optional)
        test_question = "What are Mortgages?"
        extracted_docs = query_docs(collection, test_question, embedding_function)
        test_answer = generate_response(test_question, extracted_docs)
        print("\n--- Test RAG Output ---")
        print(f"Question: {test_question}")
        print(f"Answer: {test_answer}\n-----------------------\n")
        
    else:
        print("GEMINI_API_KEY not found. RAG system will not be initialized.")
        
    # --- ELEVENLABS SETUP ---
    elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY")
    if elevenlabs_api_key:
        try:
            elevenlabs = ElevenLabs(api_key=elevenlabs_api_key)
            print("ElevenLabs Client Initialized.")
        except Exception as e:
            print(f"Failed to initialize ElevenLabs client: {e}")
    else:
        print("ELEVENLABS_API_KEY not found. TTS will fail.")

    # --- FLASK RUN ---
    app.run(debug=True, port=8000, host='0.0.0.0')