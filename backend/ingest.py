import os
import io
from typing import List
import chromadb
from chromadb.config import Settings
from pypdf import PdfReader
from user_storage import add_file_for_user, add_file_for_class
from classes_storage import is_teacher_for_class
import anthropic
from dotenv import load_dotenv

load_dotenv()

# Ensure data directory exists
os.makedirs("./data/vectorstore", exist_ok=True)

# Initialize ChromaDB with proper settings for 0.5.x
chroma_client = chromadb.PersistentClient(
    path="./data/vectorstore",
    settings=Settings(anonymized_telemetry=False)
)

# Initialize Anthropic client for summaries
anthropic_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

collection = chroma_client.get_or_create_collection("course_materials")


def get_collection():
    """Return the ChromaDB collection for external use"""
    return collection


def extract_text_from_pdf(file_storage) -> str:
    # file_storage is Werkzeug FileStorage
    file_bytes = file_storage.read()
    pdf = PdfReader(io.BytesIO(file_bytes))
    pages = []
    for page in pdf.pages:
        text = page.extract_text()
        if text:
            pages.append(text)
    return "\n".join(pages)


def extract_text_from_plain(file_storage) -> str:
    file_bytes = file_storage.read()
    try:
        return file_bytes.decode("utf-8", errors="ignore")
    except Exception:
        return ""


def chunk_text(text: str, size: int = 800, overlap: int = 100) -> List[str]:
    chunks = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + size, n)
        chunk = text[start:end]
        chunks.append(chunk)
        start += size - overlap
    return chunks


def generate_summary(text: str, filename: str) -> str:
    """Generate a concise summary of the document using Claude"""
    try:
        # Limit text to first 15000 characters to stay within token limits
        text_sample = text[:15000] if len(text) > 15000 else text
        
        message = anthropic_client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=300,
            messages=[{
                "role": "user",
                "content": f"Please provide a concise 2-3 sentence summary of this educational material titled '{filename}':\n\n{text_sample}"
            }]
        )
        return message.content[0].text
    except Exception as e:
        print(f"Error generating summary: {e}")
        return "Summary not available"


def ingest_documents(files):
    docs = []
    ids = []
    metadatas = []

    for f in files:
        filename = f.filename or "unknown"

        if filename.lower().endswith(".pdf"):
            text = extract_text_from_pdf(f)
        else:
            text = extract_text_from_plain(f)

        if not text.strip():
            continue

        chunks = chunk_text(text)

        for i, chunk in enumerate(chunks):
            docs.append(chunk)
            ids.append(f"{filename}-{i}")
            metadatas.append({"source": filename})

    if docs:
        collection.add(
            documents=docs,
            ids=ids,
            metadatas=metadatas,
        )
        # PersistentClient auto-persists, no need to call persist()


def ingest_documents_for_user(user_email: str, files):
    """Ingest documents and associate them with a specific user"""
    docs = []
    ids = []
    metadatas = []
    file_chunk_map = {}  # filename -> (list of chunk ids, full text)

    for f in files:
        filename = f.filename or "unknown"
        
        if filename.lower().endswith(".pdf"):
            text = extract_text_from_pdf(f)
        else:
            text = extract_text_from_plain(f)

        if not text.strip():
            continue

        chunks = chunk_text(text)
        chunk_ids = []

        for i, chunk in enumerate(chunks):
            chunk_id = f"{user_email}:{filename}:{i}"
            docs.append(chunk)
            ids.append(chunk_id)
            metadatas.append({
                "source": filename,
                "user": user_email
            })
            chunk_ids.append(chunk_id)

        if chunk_ids:
            file_chunk_map[filename] = (chunk_ids, text)

    if docs:
        collection.add(
            documents=docs,
            ids=ids,
            metadatas=metadatas,
        )
        
        # Track files for this user with summaries
        for filename, (chunk_ids, full_text) in file_chunk_map.items():
            summary = generate_summary(full_text, filename)
            add_file_for_user(user_email, filename, chunk_ids, summary)


def get_class_collection(class_id: str):
    """Get or create a class-specific ChromaDB collection"""
    collection_name = f"course_materials_{class_id}"
    return chroma_client.get_or_create_collection(collection_name)


def ingest_documents_for_class(teacher_email: str, class_id: str, files):
    """
    Ingest documents for a specific class (teacher only).
    Creates a class-specific Chroma collection and generates summaries.
    """
    # Verify teacher permission
    if not is_teacher_for_class(teacher_email, class_id):
        raise PermissionError("Only teachers can upload materials to this class")
    
    # Get class-specific collection
    class_collection = get_class_collection(class_id)
    
    docs = []
    ids = []
    metadatas = []
    file_chunk_map = {}  # filename -> (list of chunk ids, full text for summary)

    for f in files:
        filename = f.filename or "unknown"
        
        if filename.lower().endswith(".pdf"):
            text = extract_text_from_pdf(f)
        else:
            text = extract_text_from_plain(f)

        if not text.strip():
            continue

        chunks = chunk_text(text)
        chunk_ids = []

        for i, chunk in enumerate(chunks):
            chunk_id = f"{class_id}:{filename}:{i}"
            docs.append(chunk)
            ids.append(chunk_id)
            metadatas.append({
                "source": filename,
                "class_id": class_id,
                "uploaded_by": teacher_email
            })
            chunk_ids.append(chunk_id)

        if chunk_ids:
            file_chunk_map[filename] = (chunk_ids, text)

    if docs:
        class_collection.add(
            documents=docs,
            ids=ids,
            metadatas=metadatas,
        )
        
        # Track files for this class with summaries
        for filename, (chunk_ids, full_text) in file_chunk_map.items():
            summary = generate_summary(full_text, filename)
            add_file_for_class(class_id, filename, chunk_ids, teacher_email, summary)


def get_material_text_from_collection(class_id: str, filename: str) -> str:
    """Retrieve the full text of a material from its chunks"""
    try:
        collection = get_class_collection(class_id)
        
        # Get all chunks for this file
        # Chunks are stored with IDs like: class_id:filename:chunk_number
        results = collection.get(
            where={"source": filename}
        )
        
        if not results or not results['documents']:
            return ""
        
        # Combine all chunks
        full_text = " ".join(results['documents'])
        return full_text
    except Exception as e:
        print(f"Error retrieving material text: {e}")
        return ""


def regenerate_material_summary(class_id: str, filename: str) -> str:
    """Regenerate summary for an existing material"""
    text = get_material_text_from_collection(class_id, filename)
    if not text:
        return "Unable to retrieve material content"
    
    return generate_summary(text, filename)


def get_user_file_text_from_collection(user_email: str, filename: str) -> str:
    """Retrieve the full text of a user file from its chunks"""
    try:
        # Get all chunks for this file
        results = collection.get(
            where={"$and": [{"source": filename}, {"user": user_email}]}
        )
        
        if not results or not results['documents']:
            return ""
        
        # Combine all chunks
        full_text = " ".join(results['documents'])
        return full_text
    except Exception as e:
        print(f"Error retrieving user file text: {e}")
        return ""


def regenerate_user_file_summary(user_email: str, filename: str) -> str:
    """Regenerate summary for an existing user file"""
    text = get_user_file_text_from_collection(user_email, filename)
    if not text:
        return "Unable to retrieve file content"
    
    return generate_summary(text, filename)
