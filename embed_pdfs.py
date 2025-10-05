import os
import glob
from PyPDF2 import PdfReader
import chromadb
from chromadb.utils import embedding_functions
from sentence_transformers import SentenceTransformer

CHROMA_DB_PATH = "chroma_db"
COLLECTION_NAME = "legal_docs"
PDF_FOLDER = "MortgageDocuments"

model = SentenceTransformer("all-MiniLM-L6-v2")
embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
collection = chroma_client.get_or_create_collection(
    name=COLLECTION_NAME,
    embedding_function=embedding_function
)

pdf_files = glob.glob(os.path.join(PDF_FOLDER, "*.pdf"))
for pdf_file in pdf_files:
    reader = PdfReader(pdf_file)
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text:
            collection.add(
                documents=[text],
                ids=[f"{os.path.basename(pdf_file)}_page_{i+1}"],
                metadatas=[{"pdf_name": os.path.basename(pdf_file), "page": i+1}],
            )
    print(f"Loaded {pdf_file}")
print("All PDFs loaded and embedded.")
