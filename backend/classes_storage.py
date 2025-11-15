import os
import json
import secrets
from typing import List, Dict, Optional, Tuple

# Storage files
CLASSES_FILE = "./data/classes.json"
MEMBERSHIPS_FILE = "./data/memberships.json"


def ensure_class_files():
    """Ensure storage files exist"""
    os.makedirs("./data", exist_ok=True)
    
    if not os.path.exists(CLASSES_FILE):
        with open(CLASSES_FILE, "w") as f:
            json.dump({}, f)
    
    if not os.path.exists(MEMBERSHIPS_FILE):
        with open(MEMBERSHIPS_FILE, "w") as f:
            json.dump({}, f)


def load_classes() -> Dict:
    """Load all classes"""
    ensure_class_files()
    with open(CLASSES_FILE, "r") as f:
        return json.load(f)


def save_classes(classes: Dict):
    """Save classes"""
    with open(CLASSES_FILE, "w") as f:
        json.dump(classes, f, indent=2)


def load_memberships() -> Dict:
    """Load all memberships"""
    ensure_class_files()
    with open(MEMBERSHIPS_FILE, "r") as f:
        return json.load(f)


def save_memberships(memberships: Dict):
    """Save memberships"""
    with open(MEMBERSHIPS_FILE, "w") as f:
        json.dump(memberships, f, indent=2)


def generate_invite_code() -> str:
    """Generate a random invite code"""
    return secrets.token_urlsafe(16)


def create_class(teacher_email: str, name: str, description: str = "") -> Tuple[str, Optional[str]]:
    """
    Create a new class with the teacher as owner.
    Returns (class_id, error)
    """
    classes = load_classes()
    memberships = load_memberships()
    
    # Generate unique class ID
    class_id = f"class_{secrets.token_urlsafe(8)}"
    
    # Generate invite code
    invite_code = generate_invite_code()
    
    # Create class
    classes[class_id] = {
        "name": name,
        "description": description,
        "teacher_email": teacher_email,
        "invite_code": invite_code,
        "created_at": str(os.times())
    }
    
    # Add teacher as member
    if class_id not in memberships:
        memberships[class_id] = {}
    
    memberships[class_id][teacher_email] = {
        "role": "teacher",
        "status": "active",
        "joined_at": str(os.times())
    }
    
    save_classes(classes)
    save_memberships(memberships)
    
    return class_id, None


def get_class(class_id: str) -> Optional[Dict]:
    """Get class details by ID"""
    classes = load_classes()
    return classes.get(class_id)


def update_class(class_id: str, teacher_email: str, name: Optional[str] = None, description: Optional[str] = None) -> Tuple[bool, Optional[str]]:
    """
    Update class name and/or description (teacher only).
    Returns (success, error)
    """
    # Verify teacher permission
    if not is_teacher_for_class(teacher_email, class_id):
        return False, "Only teachers can update class details"
    
    classes = load_classes()
    
    if class_id not in classes:
        return False, "Class not found"
    
    # Update fields if provided
    if name is not None:
        classes[class_id]["name"] = name
    if description is not None:
        classes[class_id]["description"] = description
    
    save_classes(classes)
    return True, None


def list_classes_for_user(user_email: str) -> List[Dict]:
    """
    List all classes the user is a member of (as teacher or student).
    Returns list of class info with role.
    """
    classes = load_classes()
    memberships = load_memberships()
    
    user_classes = []
    
    for class_id, members in memberships.items():
        if user_email in members:
            class_info = classes.get(class_id)
            if class_info:
                user_classes.append({
                    "class_id": class_id,
                    "name": class_info["name"],
                    "description": class_info.get("description", ""),
                    "role": members[user_email]["role"],
                    "teacher_email": class_info["teacher_email"],
                    "created_at": class_info.get("created_at", ""),
                })
    
    return user_classes


def verify_invite_code(class_id: str, invite_code: str) -> bool:
    """Verify if invite code matches the class"""
    classes = load_classes()
    class_info = classes.get(class_id)
    
    if not class_info:
        return False
    
    return class_info.get("invite_code") == invite_code


def regenerate_invite_code(class_id: str, teacher_email: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Regenerate invite code for a class (teacher only).
    Returns (new_invite_code, error)
    """
    if not is_teacher_for_class(teacher_email, class_id):
        return None, "Only teachers can regenerate invite codes"
    
    classes = load_classes()
    class_info = classes.get(class_id)
    
    if not class_info:
        return None, "Class not found"
    
    new_code = generate_invite_code()
    classes[class_id]["invite_code"] = new_code
    save_classes(classes)
    
    return new_code, None


def add_member(class_id: str, user_email: str, invite_code: str) -> Tuple[bool, Optional[str]]:
    """
    Add a user to a class as a student using invite code.
    Returns (success, error)
    """
    # Verify invite code
    if not verify_invite_code(class_id, invite_code):
        return False, "Invalid invite code"
    
    memberships = load_memberships()
    
    if class_id not in memberships:
        memberships[class_id] = {}
    
    # Check if already a member
    if user_email in memberships[class_id]:
        return False, "Already a member of this class"
    
    # Add as student
    memberships[class_id][user_email] = {
        "role": "student",
        "status": "active",
        "joined_at": str(os.times())
    }
    
    save_memberships(memberships)
    return True, None


def get_membership(class_id: str, user_email: str) -> Optional[Dict]:
    """Get user's membership info for a class"""
    memberships = load_memberships()
    
    if class_id not in memberships:
        return None
    
    return memberships[class_id].get(user_email)


def is_member_of_class(user_email: str, class_id: str) -> bool:
    """Check if user is a member (teacher or student) of the class"""
    membership = get_membership(class_id, user_email)
    return membership is not None and membership.get("status") == "active"


def is_teacher_for_class(user_email: str, class_id: str) -> bool:
    """Check if user is a teacher for the class"""
    membership = get_membership(class_id, user_email)
    return membership is not None and membership.get("role") == "teacher"


def get_class_members(class_id: str) -> List[Dict]:
    """Get all members of a class"""
    memberships = load_memberships()
    
    if class_id not in memberships:
        return []
    
    members = []
    for email, info in memberships[class_id].items():
        members.append({
            "email": email,
            "role": info["role"],
            "status": info["status"],
            "joined_at": info.get("joined_at", "")
        })
    
    return members
