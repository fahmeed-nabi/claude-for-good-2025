# Classes API Documentation

This document describes the new Classes feature endpoints for the TeachTwin backend.

## Overview

Teachers can create classes, upload class-specific materials, and invite students. Students can join classes via invite codes and ask questions based on the class materials. Only teachers can upload/delete materials.

## Authentication

All endpoints require JWT authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. Create a Class

**POST** `/classes`

Create a new class. The authenticated user becomes the teacher.

**Request Body:**
```json
{
  "name": "Introduction to Python",
  "description": "Beginner Python programming course"
}
```

**Response (201):**
```json
{
  "class_id": "class_abc123xyz",
  "name": "Introduction to Python",
  "description": "Beginner Python programming course",
  "invite_code": "xYz123AbC456"
}
```

---

### 2. List User's Classes

**GET** `/classes`

List all classes the authenticated user is a member of (as teacher or student).

**Response (200):**
```json
{
  "classes": [
    {
      "class_id": "class_abc123xyz",
      "name": "Introduction to Python",
      "description": "Beginner Python programming course",
      "role": "teacher",
      "teacher_email": "teacher@example.com",
      "created_at": "..."
    },
    {
      "class_id": "class_def456uvw",
      "name": "Data Structures",
      "description": "Advanced data structures",
      "role": "student",
      "teacher_email": "prof@example.com",
      "created_at": "..."
    }
  ]
}
```

---

### 3. Get Class Details

**GET** `/classes/<class_id>`

Get details about a specific class (members only).

**Response (200):**
```json
{
  "class_id": "class_abc123xyz",
  "name": "Introduction to Python",
  "description": "Beginner Python programming course",
  "teacher_email": "teacher@example.com",
  "created_at": "...",
  "is_teacher": true,
  "invite_code": "xYz123AbC456",  // Only shown to teachers
  "members": [
    {
      "email": "teacher@example.com",
      "role": "teacher",
      "status": "active",
      "joined_at": "..."
    },
    {
      "email": "student1@example.com",
      "role": "student",
      "status": "active",
      "joined_at": "..."
    }
  ]
}
```

---

### 4. Regenerate Invite Code

**POST** `/classes/<class_id>/invite`

Regenerate the invite code for a class (teacher only).

**Response (200):**
```json
{
  "invite_code": "newCode789Xyz"
}
```

**Error (403):**
```json
{
  "error": "Only teachers can regenerate invite codes"
}
```

---

### 5. Join a Class

**POST** `/classes/<class_id>/join`

Join a class using an invite code.

**Request Body:**
```json
{
  "invite_code": "xYz123AbC456"
}
```

**Response (200):**
```json
{
  "status": "ok",
  "message": "Successfully joined Introduction to Python",
  "class_id": "class_abc123xyz"
}
```

**Error (400):**
```json
{
  "error": "Invalid invite code"
}
```
or
```json
{
  "error": "Already a member of this class"
}
```

---

### 6. List Class Materials

**GET** `/classes/<class_id>/materials`

List all uploaded materials for a class (members only).

**Response (200):**
```json
{
  "files": [
    {
      "filename": "lecture_01.pdf",
      "chunks": 15,
      "uploaded_by": "teacher@example.com",
      "uploaded_at": "..."
    },
    {
      "filename": "syllabus.pdf",
      "chunks": 3,
      "uploaded_by": "teacher@example.com",
      "uploaded_at": "..."
    }
  ]
}
```

**Error (403):**
```json
{
  "error": "Not a member of this class"
}
```

---

### 7. Upload Class Materials

**POST** `/classes/<class_id>/upload`

Upload materials to a class (teacher only).

**Request:**
- Content-Type: `multipart/form-data`
- Field: `files` (multiple files allowed)

**Response (200):**
```json
{
  "status": "ok",
  "message": "Materials uploaded successfully"
}
```

**Error (403):**
```json
{
  "error": "Only teachers can upload materials"
}
```

---

### 8. Delete Class Material

**DELETE** `/classes/<class_id>/materials/<filename>`

Delete a material from a class (teacher only).

**Response (200):**
```json
{
  "status": "ok",
  "message": "File lecture_01.pdf deleted"
}
```

**Error (403):**
```json
{
  "error": "Only teachers can delete materials"
}
```

**Error (404):**
```json
{
  "error": "File not found"
}
```

---

### 9. Ask a Question (Updated)

**POST** `/ask`

Ask a question. Now supports optional `class_id` parameter for class-scoped questions.

**Request Body:**
```json
{
  "question": "What is a list comprehension?",
  "level": "beginner",
  "tone": "friendly",
  "class_id": "class_abc123xyz"  // Optional: if provided, queries class materials
}
```

If `class_id` is provided, the question is answered using that class's materials (user must be a member).
If `class_id` is omitted, the question is answered using the user's personal uploaded materials.

**Response (200):**
```json
{
  "answer": "A list comprehension is...",
  "sources": ["lecture_01.pdf", "syllabus.pdf"]
}
```

**Error (403):**
```json
{
  "error": "Not a member of this class"
}
```

---

## Example Workflow

### Teacher Creates a Class and Uploads Materials

1. **Login/Register** to get JWT token
2. **Create class:**
   ```bash
   curl -X POST http://localhost:5001/classes \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"name": "Python 101", "description": "Intro to Python"}'
   ```
   Response includes `class_id` and `invite_code`

3. **Upload materials:**
   ```bash
   curl -X POST http://localhost:5001/classes/<class_id>/upload \
     -H "Authorization: Bearer <token>" \
     -F "files=@lecture1.pdf" \
     -F "files=@lecture2.pdf"
   ```

4. **Share invite code** with students

---

### Student Joins a Class and Asks Questions

1. **Login/Register** to get JWT token
2. **Join class:**
   ```bash
   curl -X POST http://localhost:5001/classes/<class_id>/join \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"invite_code": "xYz123AbC456"}'
   ```

3. **List classes:**
   ```bash
   curl -X GET http://localhost:5001/classes \
     -H "Authorization: Bearer <token>"
   ```

4. **Ask question:**
   ```bash
   curl -X POST http://localhost:5001/ask \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "question": "What is a Python list?",
       "level": "beginner",
       "tone": "friendly",
       "class_id": "<class_id>"
     }'
   ```

---

## Data Storage

- **Classes:** `backend/data/classes.json`
- **Memberships:** `backend/data/memberships.json`
- **Class Files Index:** `backend/data/class_files_index.json`
- **Chroma Collections:** Per-class collections named `course_materials_<class_id>`

---

## Notes

- Invite codes are permanent until regenerated by the teacher
- Each class has its own isolated Chroma collection for vector storage
- Students can be members of multiple classes
- Teachers can manage multiple classes
- File deletions remove both the Chroma embeddings and the file index entry
