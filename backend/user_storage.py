import os
import json
import chromadb
from typing import List, Tuple

# Track uploaded files per user
FILES_INDEX = "./data/files_index.json"
CLASS_FILES_INDEX = "./data/class_files_index.json"

def ensure_files_index():
    os.makedirs("./data", exist_ok=True)
    if not os.path.exists(FILES_INDEX):
        with open(FILES_INDEX, "w") as f:
            json.dump({}, f)
    if not os.path.exists(CLASS_FILES_INDEX):
        with open(CLASS_FILES_INDEX, "w") as f:
            json.dump({}, f)

def load_files_index():
    ensure_files_index()
    with open(FILES_INDEX, "r") as f:
        return json.load(f)

def save_files_index(index):
    with open(FILES_INDEX, "w") as f:
        json.dump(index, f, indent=2)

def add_file_for_user(user_email: str, filename: str, chunk_ids: List[str], summary: str = ""):
    """Track which chunks belong to which file for a user"""
    index = load_files_index()
    
    if user_email not in index:
        index[user_email] = {}
    
    index[user_email][filename] = {
        "chunk_ids": chunk_ids,
        "uploaded_at": str(os.times()),
        "summary": summary
    }
    
    save_files_index(index)

def get_user_files(user_email: str) -> List[dict]:
    """Get list of files uploaded by a user"""
    index = load_files_index()
    user_files = index.get(user_email, {})
    
    return [
        {
            "filename": filename,
            "chunks": len(data["chunk_ids"]),
            "uploaded_at": data.get("uploaded_at", "unknown"),
            "summary": data.get("summary", "")
        }
        for filename, data in user_files.items()
    ]

def get_user_chunk_ids(user_email: str) -> List[str]:
    """Get all chunk IDs for a user's documents"""
    index = load_files_index()
    user_files = index.get(user_email, {})
    
    all_ids = []
    for file_data in user_files.values():
        all_ids.extend(file_data["chunk_ids"])
    
    return all_ids

def remove_file_for_user(user_email: str, filename: str, collection) -> bool:
    """Remove a file and its chunks from storage"""
    index = load_files_index()
    
    if user_email not in index or filename not in index[user_email]:
        return False
    
    # Get chunk IDs to delete
    chunk_ids = index[user_email][filename]["chunk_ids"]
    
    # Delete from ChromaDB
    try:
        collection.delete(ids=chunk_ids)
    except Exception as e:
        print(f"Error deleting chunks: {e}")
    
    # Remove from index
    del index[user_email][filename]
    save_files_index(index)
    
    return True


def load_class_files_index():
    ensure_files_index()
    with open(CLASS_FILES_INDEX, "r") as f:
        return json.load(f)


def save_class_files_index(index):
    with open(CLASS_FILES_INDEX, "w") as f:
        json.dump(index, f, indent=2)


def add_file_for_class(class_id: str, filename: str, chunk_ids: List[str], uploaded_by: str, summary: str = ""):
    """Track which chunks belong to which file for a class"""
    index = load_class_files_index()
    
    if class_id not in index:
        index[class_id] = {}
    
    index[class_id][filename] = {
        "chunk_ids": chunk_ids,
        "uploaded_by": uploaded_by,
        "uploaded_at": str(os.times()),
        "summary": summary
    }
    
    save_class_files_index(index)


def get_class_files(class_id: str) -> List[dict]:
    """Get list of files uploaded to a class"""
    index = load_class_files_index()
    class_files = index.get(class_id, {})
    
    return [
        {
            "filename": filename,
            "chunks": len(data["chunk_ids"]),
            "uploaded_by": data.get("uploaded_by", "unknown"),
            "uploaded_at": data.get("uploaded_at", "unknown"),
            "summary": data.get("summary", "")
        }
        for filename, data in class_files.items()
    ]


def get_class_chunk_ids(class_id: str) -> List[str]:
    """Get all chunk IDs for a class's documents"""
    index = load_class_files_index()
    class_files = index.get(class_id, {})
    
    all_ids = []
    for file_data in class_files.values():
        all_ids.extend(file_data["chunk_ids"])
    
    return all_ids


def remove_file_for_class(class_id: str, filename: str, collection) -> bool:
    """Remove a file and its chunks from class storage"""
    index = load_class_files_index()
    
    if class_id not in index or filename not in index[class_id]:
        return False
    
    # Get chunk IDs to delete
    chunk_ids = index[class_id][filename]["chunk_ids"]
    
    # Delete from ChromaDB
    try:
        collection.delete(ids=chunk_ids)
    except Exception as e:
        print(f"Error deleting chunks: {e}")
    
    # Remove from index
    del index[class_id][filename]
    save_class_files_index(index)
    
    return True


def update_material_summary(class_id: str, filename: str, summary: str) -> bool:
    """Update the summary for a specific material"""
    index = load_class_files_index()
    
    if class_id not in index or filename not in index[class_id]:
        return False
    
    index[class_id][filename]["summary"] = summary
    save_class_files_index(index)
    return True


def update_user_file_summary(user_email: str, filename: str, summary: str) -> bool:
    """Update the summary for a specific user file"""
    index = load_files_index()
    
    if user_email not in index or filename not in index[user_email]:
        return False
    
    index[user_email][filename]["summary"] = summary
    save_files_index(index)
    return True
