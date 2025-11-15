import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from dotenv import load_dotenv
from datetime import timedelta
from ingest import ingest_documents_for_user, get_collection, ingest_documents_for_class, get_class_collection, regenerate_material_summary, regenerate_user_file_summary
from query import answer_question_for_user, answer_question_for_class
from auth import register_user, authenticate_user, get_user_name
from user_storage import get_user_files, remove_file_for_user, get_class_files, remove_file_for_class, update_material_summary, update_user_file_summary
from classes_storage import (
    create_class, get_class, list_classes_for_user, 
    add_member, is_member_of_class, is_teacher_for_class,
    regenerate_invite_code, get_class_members, update_class
)

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)  # allow localhost:3000 by default

# JWT Configuration
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "your-secret-key-change-in-production")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)
jwt = JWTManager(app)

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    name = data.get("name", "User")
    
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
    
    user_id, error = register_user(email, password, name)
    if error:
        return jsonify({"error": error}), 400
    
    access_token = create_access_token(identity=email)
    return jsonify({"access_token": access_token, "email": email, "name": name})

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
    
    user, error = authenticate_user(email, password)
    if error:
        return jsonify({"error": error}), 401
    
    access_token = create_access_token(identity=email)
    return jsonify({"access_token": access_token, "email": user["email"], "name": user["name"]})

@app.route("/upload", methods=["POST"])
@jwt_required()
def upload():
    user_email = get_jwt_identity()
    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "No files provided"}), 400

    try:
        ingest_documents_for_user(user_email, files)
        return jsonify({"status": "ok", "message": "Documents ingested"})
    except Exception as e:
        print("Upload error:", e)
        return jsonify({"error": str(e)}), 500

@app.route("/files", methods=["GET"])
@jwt_required()
def list_files():
    user_email = get_jwt_identity()
    try:
        files = get_user_files(user_email)
        return jsonify({"files": files})
    except Exception as e:
        print("List files error:", e)
        return jsonify({"error": str(e)}), 500

@app.route("/files/<filename>", methods=["DELETE"])
@jwt_required()
def delete_file(filename):
    user_email = get_jwt_identity()
    try:
        collection = get_collection()
        success = remove_file_for_user(user_email, filename, collection)
        if success:
            return jsonify({"status": "ok", "message": f"File {filename} deleted"})
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        print("Delete file error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/files/<filename>/summary", methods=["POST"])
@jwt_required()
def generate_user_file_summary(filename):
    """Generate or regenerate summary for a user's personal file"""
    user_email = get_jwt_identity()
    
    try:
        summary = regenerate_user_file_summary(user_email, filename)
        
        # Update the summary in storage
        update_user_file_summary(user_email, filename, summary)
        
        return jsonify({
            "status": "ok",
            "summary": summary,
            "filename": filename
        })
    except Exception as e:
        print("Generate user file summary error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/ask", methods=["POST"])
@jwt_required()
def ask():
    user_email = get_jwt_identity()
    data = request.get_json()
    if not data or "question" not in data:
        return jsonify({"error": "Missing 'question'"}), 400

    question = data["question"]
    level = data.get("level", "beginner")
    tone = data.get("tone", "neutral")
    class_id = data.get("class_id")  # Optional class context

    try:
        if class_id:
            # Class-scoped QA
            if not is_member_of_class(user_email, class_id):
                return jsonify({"error": "Not a member of this class"}), 403
            answer, sources = answer_question_for_class(class_id, user_email, question, level, tone)
        else:
            # User-scoped QA (personal uploads)
            answer, sources = answer_question_for_user(user_email, question, level, tone)
        
        return jsonify({"answer": answer, "sources": sources})
    except Exception as e:
        print("Ask error:", e)
        return jsonify({"error": str(e)}), 500


# ===== Class Management Endpoints =====

@app.route("/classes", methods=["POST"])
@jwt_required()
def create_class_route():
    """Create a new class (user becomes teacher)"""
    user_email = get_jwt_identity()
    data = request.get_json()
    
    name = data.get("name")
    description = data.get("description", "")
    
    if not name:
        return jsonify({"error": "Class name is required"}), 400
    
    try:
        class_id, error = create_class(user_email, name, description)
        if error:
            return jsonify({"error": error}), 400
        
        class_info = get_class(class_id)
        return jsonify({
            "class_id": class_id,
            "name": class_info["name"],
            "description": class_info["description"],
            "invite_code": class_info["invite_code"]
        })
    except Exception as e:
        print("Create class error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/classes", methods=["GET"])
@jwt_required()
def list_classes():
    """List all classes the user is a member of"""
    user_email = get_jwt_identity()
    
    try:
        classes = list_classes_for_user(user_email)
        return jsonify({"classes": classes})
    except Exception as e:
        print("List classes error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/classes/<class_id>", methods=["GET"])
@jwt_required()
def get_class_details(class_id):
    """Get class details (members only)"""
    user_email = get_jwt_identity()
    
    if not is_member_of_class(user_email, class_id):
        return jsonify({"error": "Not a member of this class"}), 403
    
    try:
        class_info = get_class(class_id)
        if not class_info:
            return jsonify({"error": "Class not found"}), 404
        
        members = get_class_members(class_id)
        is_teacher = is_teacher_for_class(user_email, class_id)
        
        response = {
            "class_id": class_id,
            "name": class_info["name"],
            "description": class_info.get("description", ""),
            "teacher_email": class_info["teacher_email"],
            "teacher_name": get_user_name(class_info["teacher_email"]),
            "created_at": class_info.get("created_at", ""),
            "is_teacher": is_teacher,
            "members": members
        }
        
        # Only show invite code to teachers
        if is_teacher:
            response["invite_code"] = class_info.get("invite_code")
        
        return jsonify(response)
    except Exception as e:
        print("Get class error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/classes/<class_id>", methods=["PUT", "PATCH"])
@jwt_required()
def update_class_details(class_id):
    """Update class details (teacher only)"""
    user_email = get_jwt_identity()
    data = request.get_json()
    
    name = data.get("name")
    description = data.get("description")
    
    if not name and description is None:
        return jsonify({"error": "Provide at least name or description to update"}), 400
    
    try:
        success, error = update_class(class_id, user_email, name, description)
        if error:
            return jsonify({"error": error}), 403 if "Only teachers" in error else 404
        
        class_info = get_class(class_id)
        return jsonify({
            "status": "ok",
            "message": "Class updated successfully",
            "class": {
                "class_id": class_id,
                "name": class_info["name"],
                "description": class_info.get("description", "")
            }
        })
    except Exception as e:
        print("Update class error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/classes/<class_id>/invite", methods=["POST"])
@jwt_required()
def regenerate_invite(class_id):
    """Regenerate invite code for a class (teacher only)"""
    user_email = get_jwt_identity()
    
    try:
        new_code, error = regenerate_invite_code(class_id, user_email)
        if error:
            return jsonify({"error": error}), 403
        
        return jsonify({"invite_code": new_code})
    except Exception as e:
        print("Regenerate invite error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/classes/<class_id>/join", methods=["POST"])
@jwt_required()
def join_class(class_id):
    """Join a class using invite code"""
    user_email = get_jwt_identity()
    data = request.get_json()
    
    invite_code = data.get("invite_code")
    if not invite_code:
        return jsonify({"error": "Invite code is required"}), 400
    
    try:
        success, error = add_member(class_id, user_email, invite_code)
        if error:
            return jsonify({"error": error}), 400
        
        class_info = get_class(class_id)
        return jsonify({
            "status": "ok",
            "message": f"Successfully joined {class_info['name']}",
            "class_id": class_id
        })
    except Exception as e:
        print("Join class error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/classes/<class_id>/materials", methods=["GET"])
@jwt_required()
def list_class_materials(class_id):
    """List uploaded materials for a class (members only)"""
    user_email = get_jwt_identity()
    
    if not is_member_of_class(user_email, class_id):
        return jsonify({"error": "Not a member of this class"}), 403
    
    try:
        files = get_class_files(class_id)
        return jsonify({"files": files})
    except Exception as e:
        print("List class materials error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/classes/<class_id>/upload", methods=["POST"])
@jwt_required()
def upload_class_materials(class_id):
    """Upload materials to a class (teacher only)"""
    user_email = get_jwt_identity()
    
    if not is_teacher_for_class(user_email, class_id):
        return jsonify({"error": "Only teachers can upload materials"}), 403
    
    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "No files provided"}), 400

    try:
        ingest_documents_for_class(user_email, class_id, files)
        return jsonify({"status": "ok", "message": "Materials uploaded successfully"})
    except Exception as e:
        print("Upload class materials error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/classes/<class_id>/materials/<filename>", methods=["DELETE"])
@jwt_required()
def delete_class_material(class_id, filename):
    """Delete a material from a class (teacher only)"""
    user_email = get_jwt_identity()
    
    if not is_teacher_for_class(user_email, class_id):
        return jsonify({"error": "Only teachers can delete materials"}), 403
    
    try:
        collection = get_class_collection(class_id)
        success = remove_file_for_class(class_id, filename, collection)
        if success:
            return jsonify({"status": "ok", "message": f"File {filename} deleted"})
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        print("Delete class material error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/classes/<class_id>/materials/<filename>/summary", methods=["POST"])
@jwt_required()
def generate_material_summary(class_id, filename):
    """Generate or regenerate summary for a specific material"""
    user_email = get_jwt_identity()
    
    # Allow both teachers and students to generate summaries
    if not is_member_of_class(user_email, class_id):
        return jsonify({"error": "Not a member of this class"}), 403
    
    try:
        summary = regenerate_material_summary(class_id, filename)
        
        # Update the summary in storage
        update_material_summary(class_id, filename, summary)
        
        return jsonify({
            "status": "ok",
            "summary": summary,
            "filename": filename
        })
    except Exception as e:
        print("Generate summary error:", e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)
