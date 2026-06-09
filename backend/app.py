import os
import dotenv
dotenv.load_dotenv()
import datetime
import jwt
import bcrypt

from functools import wraps
from flask import Flask, request, jsonify
from flask_cors import CORS
from database import db
from parser import parse_resume
from analyzer import analyze_resume_content, match_job_description
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests


app = Flask(__name__)
# Enable CORS for React frontend running locally
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

SECRET_KEY = os.environ.get("JWT_SECRET", "super-secret-analyzer-key-998877")

# Middleware: Auth token validation decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Check authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                
        if not token:
            return jsonify({"message": "Access denied. Authentication token is missing."}), 401
            
        try:
            # Decode token
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            current_user_id = data.get("user_id")
            current_user_email = data.get("email")
            if not current_user_id or not current_user_email:
                raise ValueError("Token missing user credentials")
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Session expired. Please log in again."}), 401
        except Exception as e:
            return jsonify({"message": "Access denied. Invalid token."}), 401
            
        return f(current_user_id, current_user_email, *args, **kwargs)
    return decorated

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "database": "mongodb" if db.use_mongodb else "sqlite_fallback",
        "timestamp": datetime.datetime.now().isoformat()
    }), 200

# Auth Routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not name or not email or not password:
        return jsonify({"message": "Name, email, and password are required fields."}), 400
        
    # Check if user already exists
    existing_user = db.get_user_by_email(email)
    if existing_user:
        return jsonify({"message": "An account with this email already exists."}), 400
        
    # Hash password
    salt = bcrypt.gensalt()
    password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    # Save user
    user = db.create_user(name, email, password_hash)
    if not user:
        return jsonify({"message": "Failed to create user account. Please try again."}), 500
        
    # Generate Token
    payload = {
        "user_id": user["user_id"],
        "email": user["email"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    if isinstance(token, bytes):
        token = token.decode('utf-8')
        
    return jsonify({
        "message": "User registered successfully",
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "name": user["name"],
            "email": user["email"]
        }
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({"message": "Email and password are required fields."}), 400
        
    user = db.get_user_by_email(email)
    if not user:
        return jsonify({"message": "Invalid email or password."}), 401
        
    # Verify password
    hashed = user.get("password_hash", "")
    if not bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8')):
        return jsonify({"message": "Invalid email or password."}), 401
        
    # Generate Token
    payload = {
        "user_id": user["user_id"],
        "email": user["email"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    if isinstance(token, bytes):
        token = token.decode('utf-8')
        
    return jsonify({
        "message": "Logged in successfully",
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "name": user["name"],
            "email": user["email"]
        }
    }), 200

@app.route('/api/auth/google', methods=['POST'])
def google_login():
    data = request.get_json() or {}
    token = data.get('id_token')
    
    if not token:
        return jsonify({"message": "Google ID token is required."}), 400
        
    try:
        # Verify Firebase ID token
        firebase_project_id = os.environ.get("FIREBASE_PROJECT_ID")
        
        # Verify the ID token against Google's certificates
        decoded_token = id_token.verify_oauth2_token(
            token, 
            google_requests.Request(),
            audience=firebase_project_id
        )
        
        # Verify issuer is Firebase (securetoken.google.com/<projectId>)
        iss = decoded_token.get('iss')
        if not iss or not iss.startswith("https://securetoken.google.com/"):
            raise ValueError("Invalid token issuer")
            
        email = decoded_token.get('email', '').strip().lower()
        name = decoded_token.get('name', 'Google User').strip()
        
        if not email:
            return jsonify({"message": "Email address not provided in Google profile."}), 400
            
        # Check if user already exists in database
        user = db.get_user_by_email(email)
        if not user:
            # Auto-register Google user
            user = db.create_user(name, email, "")
            if not user:
                return jsonify({"message": "Failed to register new Google account."}), 500
                
        # Generate our session token (JWT)
        payload = {
            "user_id": user["user_id"],
            "email": user["email"],
            "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
        }
        session_token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
        if isinstance(session_token, bytes):
            session_token = session_token.decode('utf-8')
            
        return jsonify({
            "message": "Logged in successfully with Google",
            "token": session_token,
            "user": {
                "user_id": user["user_id"],
                "name": user["name"],
                "email": user["email"]
            }
        }), 200
        
    except Exception as e:
        print(f"Google authentication error: {e}")
        return jsonify({"message": f"Google authentication failed: {str(e)}"}), 401

# Resume Upload & Analysis Routes
@app.route('/api/resume/upload', methods=['POST'])
@token_required
def upload_resume(current_user_id, current_user_email):
    if 'file' not in request.files:
        return jsonify({"message": "No file part in request. Please upload a file."}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "No file selected for upload."}), 400
        
    filename = file.filename
    _, ext = os.path.splitext(filename.lower())
    if ext not in ['.pdf', '.docx', '.doc', '.txt']:
        return jsonify({"message": "Unsupported file format. Please upload PDF, DOCX, or TXT."}), 400
        
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    try:
        file.save(filepath)
        
        # Parse resume content
        parsed = parse_resume(filepath)
        if not parsed.get("text", "").strip():
            raise ValueError("No text could be extracted from the uploaded document. Please check the file formatting.")
            
        # Run detailed NLP resume analysis
        analysis = analyze_resume_content(parsed)
        # Store original text for Job matching comparisons
        analysis["resume_text"] = parsed["text"]
        
        # Save to database log
        record = db.save_resume_analysis(current_user_id, filename, analysis)
        
        # Clean up temp file from server uploads folder
        if os.path.exists(filepath):
            os.remove(filepath)
            
        return jsonify({
            "message": "Resume uploaded and analyzed successfully",
            "data": record
        }), 200
        
    except Exception as e:
        # Securely remove temporary upload if it exists
        if os.path.exists(filepath):
            os.remove(filepath)
        print(f"Upload error details: {e}")
        return jsonify({"message": f"Resume analysis failed: {str(e)}"}), 500

# Job matching Route
@app.route('/api/resume/compare', methods=['POST'])
@token_required
def compare_resume(current_user_id, current_user_email):
    data = request.get_json() or {}
    jd_text = data.get("job_description", "").strip()
    resume_id = data.get("resume_id")
    
    if not jd_text:
        return jsonify({"message": "Job description text is required for comparison."}), 400
        
    if not resume_id:
        return jsonify({"message": "Resume reference ID is required."}), 400
        
    # Retrieve resume records for user
    resumes = db.get_user_resumes(current_user_id)
    target_resume = next((r for r in resumes if r["resume_id"] == resume_id), None)
    
    if not target_resume:
        return jsonify({"message": "The selected resume was not found in your account."}), 404
        
    # Get raw text
    resume_text = target_resume.get("resume_text", "")
    if not resume_text:
        # Fallback to reconstructing from filename or list of skills if missing
        # But it should be present now.
        resume_text = " ".join(target_resume.get("skills", []))
        
    # Calculate JD similarity and matching/missing skills
    match_result = match_job_description(resume_text, jd_text)
    
    return jsonify({
        "message": "Job matching analysis completed",
        "resume_id": resume_id,
        "match_percentage": match_result["match_percentage"],
        "matching_skills": match_result["matching_skills"],
        "missing_skills": match_result["missing_skills"],
        "jd_skills_detected": match_result["jd_skills_detected"]
    }), 200

# History Route
@app.route('/api/dashboard/history', methods=['GET'])
@token_required
def get_history(current_user_id, current_user_email):
    try:
        resumes = db.get_user_resumes(current_user_id)
        # Avoid sending massive raw texts down to save payload bandwidth
        for r in resumes:
            r.pop("resume_text", None)
        return jsonify({
            "history": resumes
        }), 200
    except Exception as e:
        return jsonify({"message": f"Failed to retrieve history: {str(e)}"}), 500

if __name__ == '__main__':
    # Running Flask Server locally on port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
