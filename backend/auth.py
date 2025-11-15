import os
import json
import bcrypt
from datetime import timedelta
from flask import jsonify

# Simple file-based user storage (for demo purposes)
USERS_FILE = "./data/users.json"

def ensure_users_file():
    os.makedirs("./data", exist_ok=True)
    if not os.path.exists(USERS_FILE):
        with open(USERS_FILE, "w") as f:
            json.dump({}, f)

def load_users():
    ensure_users_file()
    with open(USERS_FILE, "r") as f:
        return json.load(f)

def save_users(users):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f, indent=2)

def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def check_password(password, hashed):
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def register_user(email, password, name):
    users = load_users()
    
    if email in users:
        return None, "User already exists"
    
    users[email] = {
        "password": hash_password(password),
        "name": name,
        "created_at": str(os.times())
    }
    
    save_users(users)
    return email, None

def authenticate_user(email, password):
    users = load_users()
    
    if email not in users:
        return None, "Invalid credentials"
    
    user = users[email]
    if not check_password(password, user["password"]):
        return None, "Invalid credentials"
    
    return {
        "email": email,
        "name": user.get("name", "User")
    }, None


def get_user_name(email: str) -> str:
    """Get user's display name by email"""
    users = load_users()
    user = users.get(email)
    if user:
        return user.get("name", email)
    return email
