import os
import chromadb
from chromadb.config import Settings
from user_storage import get_user_chunk_ids
from classes_storage import is_member_of_class

# Load Claude API key
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise RuntimeError("Missing ANTHROPIC_API_KEY environment variable.")

# Lazy load Anthropic client to avoid initialization errors
_client = None

def get_client():
    global _client
    if _client is None:
        from anthropic import Anthropic
        _client = Anthropic(api_key=ANTHROPIC_API_KEY)
    return _client

MODEL = "claude-3-5-haiku-20241022"

# ChromaDB persistent store with same settings as ingest.py
chroma_client = chromadb.PersistentClient(
    path="./data/vectorstore",
    settings=Settings(anonymized_telemetry=False)
)
collection = chroma_client.get_or_create_collection("course_materials")


def answer_question(question: str, level: str, tone: str):
    # RAG retrieval
    results = collection.query(query_texts=[question], n_results=4)

    if not results["documents"] or not results["documents"][0]:
        return (
            "I couldn't find anything in the uploaded course materials that answers this.",
            [],
        )

    contexts = results["documents"][0]
    sources_meta = results["metadatas"][0]

    context_block = "\n\n---\n\n".join(contexts)
    source_list = list({m["source"] for m in sources_meta if "source" in m})

    level_instructions = {
        "beginner": "Explain as if the student is new to the topic. Use plain language, concrete examples, and analogies.",
        "advanced": "Provide a concise, technical explanation assuming strong background knowledge.",
    }

    style_prompt = level_instructions.get(level, level_instructions["beginner"])

    tone_prompt = {
        "friendly": "Use an encouraging, friendly tone.",
        "neutral": "Use a clear and neutral tone.",
        "formal": "Use a professional, formal academic tone.",
    }.get(tone, "Use a clear and neutral tone.")

    system_prompt = (
        "You are a digital twin of a university professor. "
        "Answer ONLY using the provided course materials. "
        "If the answer is not clearly present, say you cannot find it."
    )

    user_prompt = f"""
Course materials context:

{context_block}

---

Instructions:
- {style_prompt}
- {tone_prompt}
- Answer ONLY using the context.
- Cite which document filenames were used.
- If unclear, say: "This is not clearly specified in the course materials."

Question: {question}
"""

    # Get client and make API call
    client = get_client()
    response = client.messages.create(
        model=MODEL,
        max_tokens=800,
        system=system_prompt,
        messages=[
            {"role": "user", "content": user_prompt},
        ],
    )

    # Anthropic returns a list of content blocks
    answer_text = "".join(block.text for block in response.content)

    return answer_text, source_list


def answer_question_for_user(user_email: str, question: str, level: str, tone: str):
    """Answer a question using only documents belonging to the specified user"""
    # Get all chunk IDs for this user
    user_chunk_ids = get_user_chunk_ids(user_email)
    
    if not user_chunk_ids:
        return (
            "You haven't uploaded any course materials yet. Please upload documents first.",
            [],
        )
    
    # Query only user's documents using where filter
    results = collection.query(
        query_texts=[question],
        n_results=4,
        where={"user": user_email}
    )

    if not results["documents"] or not results["documents"][0]:
        return (
            "I couldn't find anything in your uploaded course materials that answers this.",
            [],
        )

    contexts = results["documents"][0]
    sources_meta = results["metadatas"][0]

    context_block = "\n\n---\n\n".join(contexts)
    source_list = list({m["source"] for m in sources_meta if "source" in m})

    level_instructions = {
        "beginner": "Explain as if the student is new to the topic. Use plain language, concrete examples, and analogies.",
        "advanced": "Provide a concise, technical explanation assuming strong background knowledge.",
    }

    style_prompt = level_instructions.get(level, level_instructions["beginner"])

    tone_prompt = {
        "friendly": "Use an encouraging, friendly tone.",
        "neutral": "Use a clear and neutral tone.",
        "formal": "Use a professional, formal academic tone.",
    }.get(tone, "Use a clear and neutral tone.")

    system_prompt = (
        "You are a digital twin of a university professor. "
        "Answer ONLY using the provided course materials. "
        "If the answer is not clearly present, say you cannot find it."
    )

    user_prompt = f"""
Course materials context:

{context_block}

---

Instructions:
- {style_prompt}
- {tone_prompt}
- Answer ONLY using the context.
- Cite which document filenames were used.
- If unclear, say: "This is not clearly specified in the course materials."

Question: {question}
"""

    # Get client and make API call
    client = get_client()
    response = client.messages.create(
        model=MODEL,
        max_tokens=800,
        system=system_prompt,
        messages=[
            {"role": "user", "content": user_prompt},
        ],
    )

    # Anthropic returns a list of content blocks
    answer_text = "".join(block.text for block in response.content)

    return answer_text, source_list


def answer_question_for_class(class_id: str, user_email: str, question: str, level: str, tone: str):
    """
    Answer a question using documents from a specific class.
    User must be a member (teacher or student) of the class.
    """
    # Verify membership
    if not is_member_of_class(user_email, class_id):
        return (
            "You are not a member of this class.",
            [],
        )
    
    # Get class-specific collection
    collection_name = f"course_materials_{class_id}"
    try:
        class_collection = chroma_client.get_collection(collection_name)
    except Exception:
        return (
            "No materials have been uploaded to this class yet.",
            [],
        )
    
    # Query class documents
    results = class_collection.query(
        query_texts=[question],
        n_results=4
    )

    if not results["documents"] or not results["documents"][0]:
        return (
            "I couldn't find anything in this class's materials that answers this question.",
            [],
        )

    contexts = results["documents"][0]
    sources_meta = results["metadatas"][0]

    context_block = "\n\n---\n\n".join(contexts)
    source_list = list({m["source"] for m in sources_meta if "source" in m})

    level_instructions = {
        "beginner": "Explain as if the student is new to the topic. Use plain language, concrete examples, and analogies.",
        "advanced": "Provide a concise, technical explanation assuming strong background knowledge.",
    }

    style_prompt = level_instructions.get(level, level_instructions["beginner"])

    tone_prompt = {
        "friendly": "Use an encouraging, friendly tone.",
        "neutral": "Use a clear and neutral tone.",
        "formal": "Use a professional, formal academic tone.",
    }.get(tone, "Use a clear and neutral tone.")

    system_prompt = (
        "You are a digital twin of a university professor. "
        "Answer ONLY using the provided course materials. "
        "If the answer is not clearly present, say you cannot find it."
    )

    user_prompt = f"""
Course materials context:

{context_block}

---

Instructions:
- {style_prompt}
- {tone_prompt}
- Answer ONLY using the context.
- Cite which document filenames were used.
- If unclear, say: "This is not clearly specified in the course materials."

Question: {question}
"""

    # Get client and make API call
    client = get_client()
    response = client.messages.create(
        model=MODEL,
        max_tokens=800,
        system=system_prompt,
        messages=[
            {"role": "user", "content": user_prompt},
        ],
    )

    # Anthropic returns a list of content blocks
    answer_text = "".join(block.text for block in response.content)

    return answer_text, source_list
