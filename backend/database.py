import sqlite3
import os
import json
import uuid
import datetime
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

class DatabaseAdapter:
    def __init__(self):
        self.use_mongodb = False
        self.mongo_client = None
        self.mongo_db = None
        self.sqlite_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "resume_analyzer.db")
        
        # Read Mongo URI
        mongo_uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017/")
        try:
            # Try to connect with a short timeout so it doesn't hang the app start
            self.mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
            # Trigger server connection check
            self.mongo_client.server_info()
            self.mongo_db = self.mongo_client["resume_analyzer"]
            self.use_mongodb = True
            print("Successfully connected to MongoDB.")
        except Exception as e:
            print(f"MongoDB connection failed: {e}. Falling back to SQLite database at {self.sqlite_path}")
            self.use_mongodb = False
            self._init_sqlite()
            
    def _init_sqlite(self):
        conn = sqlite3.connect(self.sqlite_path)
        cursor = conn.cursor()
        # Create users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL
            )
        ''')
        # Create resumes table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS resumes (
                resume_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                filename TEXT,
                resume_text TEXT,
                score INTEGER,
                ats_score INTEGER,
                skills TEXT, -- JSON array
                match_percentage INTEGER,
                missing_skills TEXT, -- JSON array
                suggestions TEXT, -- JSON array
                score_breakdown TEXT, -- JSON object
                skills_by_category TEXT, -- JSON object
                ats_checks TEXT, -- JSON array
                upload_date TEXT,
                FOREIGN KEY (user_id) REFERENCES users (user_id)
            )
        ''');
        
        # Migration: Add score_breakdown column if table already exists without it
        try:
            cursor.execute("ALTER TABLE resumes ADD COLUMN score_breakdown TEXT;")
        except sqlite3.OperationalError:
            # Column already exists
            pass
            
        # Migration: Add skills_by_category column if table already exists without it
        try:
            cursor.execute("ALTER TABLE resumes ADD COLUMN skills_by_category TEXT;")
        except sqlite3.OperationalError:
            # Column already exists
            pass

        # Migration: Add ats_checks column if table already exists without it
        try:
            cursor.execute("ALTER TABLE resumes ADD COLUMN ats_checks TEXT;")
        except sqlite3.OperationalError:
            # Column already exists
            pass
            
        conn.commit()
        conn.close()

    def create_user(self, name, email, password_hash):
        user_id = str(uuid.uuid4())
        if self.use_mongodb:
            # Check if user already exists
            if self.mongo_db.users.find_one({"email": email}):
                return None
            user = {
                "user_id": user_id,
                "name": name,
                "email": email,
                "password_hash": password_hash
            }
            self.mongo_db.users.insert_one(user)
            return user
        else:
            conn = sqlite3.connect(self.sqlite_path)
            cursor = conn.cursor()
            try:
                cursor.execute(
                    "INSERT INTO users (user_id, name, email, password_hash) VALUES (?, ?, ?, ?)",
                    (user_id, name, email, password_hash)
                )
                conn.commit()
                user = {
                    "user_id": user_id,
                    "name": name,
                    "email": email,
                    "password_hash": password_hash
                }
                return user
            except sqlite3.IntegrityError:
                return None
            finally:
                conn.close()

    def get_user_by_email(self, email):
        if self.use_mongodb:
            return self.mongo_db.users.find_one({"email": email})
        else:
            conn = sqlite3.connect(self.sqlite_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
            row = cursor.fetchone()
            conn.close()
            if row:
                return dict(row)
            return None

    def save_resume_analysis(self, user_id, filename, analysis):
        resume_id = str(uuid.uuid4())
        upload_date = datetime.datetime.now().isoformat()
        
        # Extract fields
        score = analysis.get("score", 0)
        ats_score = analysis.get("ats_score", 0)
        skills = analysis.get("skills", [])
        match_percentage = analysis.get("match_percentage", 0)
        missing_skills = analysis.get("missing_skills", [])
        suggestions = analysis.get("suggestions", [])
        resume_text = analysis.get("resume_text", "")
        score_breakdown = analysis.get("score_breakdown", {})
        skills_by_category = analysis.get("skills_by_category", {})
        ats_checks = analysis.get("ats_checks", [])
        
        if self.use_mongodb:
            resume = {
                "resume_id": resume_id,
                "user_id": user_id,
                "filename": filename,
                "resume_text": resume_text,
                "score": score,
                "score_breakdown": score_breakdown,
                "ats_score": ats_score,
                "skills": skills,
                "skills_by_category": skills_by_category,
                "ats_checks": ats_checks,
                "match_percentage": match_percentage,
                "missing_skills": missing_skills,
                "suggestions": suggestions,
                "upload_date": upload_date
            }
            self.mongo_db.resumes.insert_one(resume)
            resume.pop("_id", None)
            return resume
        else:
            conn = sqlite3.connect(self.sqlite_path)
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO resumes 
                (resume_id, user_id, filename, resume_text, score, ats_score, skills, match_percentage, missing_skills, suggestions, score_breakdown, skills_by_category, ats_checks, upload_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    resume_id,
                    user_id,
                    filename,
                    resume_text,
                    score,
                    ats_score,
                    json.dumps(skills),
                    match_percentage,
                    json.dumps(missing_skills),
                    json.dumps(suggestions),
                    json.dumps(score_breakdown),
                    json.dumps(skills_by_category),
                    json.dumps(ats_checks),
                    upload_date
                )
            )
            conn.commit()
            conn.close()
            return {
                "resume_id": resume_id,
                "user_id": user_id,
                "filename": filename,
                "resume_text": resume_text,
                "score": score,
                "score_breakdown": score_breakdown,
                "ats_score": ats_score,
                "skills": skills,
                "skills_by_category": skills_by_category,
                "ats_checks": ats_checks,
                "match_percentage": match_percentage,
                "missing_skills": missing_skills,
                "suggestions": suggestions,
                "upload_date": upload_date
            }

    def get_user_resumes(self, user_id):
        if self.use_mongodb:
            resumes = list(self.mongo_db.resumes.find({"user_id": user_id}))
            for r in resumes:
                r.pop("_id", None)
            return resumes
        else:
            conn = sqlite3.connect(self.sqlite_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM resumes WHERE user_id = ? ORDER BY upload_date DESC", (user_id,))
            rows = cursor.fetchall()
            conn.close()
            resumes = []
            for row in rows:
                r = dict(row)
                r["skills"] = json.loads(r["skills"] or "[]")
                r["missing_skills"] = json.loads(r["missing_skills"] or "[]")
                r["suggestions"] = json.loads(r["suggestions"] or "[]")
                r["score_breakdown"] = json.loads(r["score_breakdown"] or "{}")
                r["skills_by_category"] = json.loads(r["skills_by_category"] or "{}")
                r["ats_checks"] = json.loads(r["ats_checks"] or "[]")
                resumes.append(r)
            return resumes

# Global DB Instance
db = DatabaseAdapter()
