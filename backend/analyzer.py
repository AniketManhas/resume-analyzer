import re
import math
from collections import Counter

# Rich dictionary of tech skills mapped by category with canonical display names and aliases
SKILL_DEFINITIONS = {
    "Programming Languages": [
        ("Python", ["python"]),
        ("Java", ["java"]),
        ("C++", ["c++"]),
        ("C#", ["c#"]),
        ("JavaScript", ["javascript", "js"]),
        ("TypeScript", ["typescript", "ts"]),
        ("PHP", ["php"]),
        ("Ruby", ["ruby"]),
        ("Go", ["golang", "go"]),
        ("Swift", ["swift"]),
        ("Kotlin", ["kotlin"]),
        ("Rust", ["rust"]),
        ("SQL", ["sql"]),
    ],
    "Frontend Development": [
        ("React", ["react", "react.js", "reactjs"]),
        ("Angular", ["angular", "angular.js", "angularjs"]),
        ("Vue", ["vue", "vue.js", "vuejs"]),
        ("Next.js", ["next.js", "nextjs"]),
        ("Nuxt.js", ["nuxt", "nuxt.js", "nuxtjs"]),
        ("HTML", ["html", "html5"]),
        ("CSS", ["css", "css3"]),
        ("Sass", ["sass", "scss"]),
        ("Bootstrap", ["bootstrap"]),
        ("Tailwind", ["tailwind", "tailwindcss"]),
        ("jQuery", ["jquery"]),
        ("Flutter", ["flutter"]),
        ("Svelte", ["svelte"]),
    ],
    "Backend Development": [
        ("Node.js", ["node.js", "nodejs"]),
        ("Express", ["express", "express.js", "expressjs"]),
        ("Django", ["django"]),
        ("Flask", ["flask"]),
        ("Spring Boot", ["spring boot", "springboot"]),
        ("ASP.NET", ["asp.net", "aspnet"]),
        ("FastAPI", ["fastapi"]),
        ("Laravel", ["laravel"]),
        ("GraphQL", ["graphql"]),
        ("Nest.js", ["nest.js", "nestjs"]),
    ],
    "Database & Storage": [
        ("MySQL", ["mysql"]),
        ("PostgreSQL", ["postgresql", "postgres"]),
        ("MongoDB", ["mongodb", "mongo"]),
        ("Redis", ["redis"]),
        ("SQLite", ["sqlite"]),
        ("Oracle", ["oracle"]),
        ("MariaDB", ["mariadb"]),
        ("Cassandra", ["cassandra"]),
        ("Firebase", ["firebase"]),
        ("DynamoDB", ["dynamodb"]),
    ],
    "Cloud & DevOps": [
        ("AWS", ["aws", "amazon web services"]),
        ("Azure", ["azure", "microsoft azure"]),
        ("GCP", ["gcp", "google cloud"]),
        ("Docker", ["docker"]),
        ("Kubernetes", ["kubernetes", "k8s"]),
        ("Jenkins", ["jenkins"]),
        ("Git", ["git"]),
        ("GitHub", ["github"]),
        ("GitLab", ["gitlab"]),
        ("CI/CD", ["ci/cd", "cicd"]),
        ("Terraform", ["terraform"]),
        ("Linux", ["linux"]),
        ("Ansible", ["ansible"]),
    ],
    "AI & Data Science": [
        ("Machine Learning", ["machine learning"]),
        ("Deep Learning", ["deep learning"]),
        ("NLP", ["nlp", "natural language processing"]),
        ("TensorFlow", ["tensorflow"]),
        ("PyTorch", ["pytorch"]),
        ("Keras", ["keras"]),
        ("Scikit-Learn", ["scikit-learn", "sklearn"]),
        ("Pandas", ["pandas"]),
        ("NumPy", ["numpy"]),
        ("Matplotlib", ["matplotlib"]),
        ("Seaborn", ["seaborn"]),
        ("Computer Vision", ["computer vision"]),
        ("OpenCV", ["opencv"]),
    ]
}

# Pre-compile regex patterns for fast, robust matching
COMPILED_SKILLS = []
for category, skill_list in SKILL_DEFINITIONS.items():
    for display_name, aliases in skill_list:
        # Sort aliases by length descending so multi-word variants match before single words
        sorted_aliases = sorted(aliases, key=len, reverse=True)
        alias_patterns = []
        for a in sorted_aliases:
            if a.startswith('.'):
                alias_patterns.append(rf'(?<![a-zA-Z0-9]){re.escape(a)}(?![a-zA-Z0-9])')
            else:
                # Prevent matching extensions or emails (e.g., Next.js matching standalone js)
                alias_patterns.append(rf'(?<![a-zA-Z0-9\.@]){re.escape(a)}(?![a-zA-Z0-9])')
        combined_pattern = re.compile('|'.join(alias_patterns), re.IGNORECASE)
        COMPILED_SKILLS.append((category, display_name, combined_pattern))

# Backwards compatibility mapping
SKILL_CATEGORIES = {
    category: [display_name for display_name, _ in skill_list]
    for category, skill_list in SKILL_DEFINITIONS.items()
}

def extract_skills(text):
    found_skills = {cat: [] for cat in SKILL_DEFINITIONS}
    found_flat = []
    for category, display_name, pattern in COMPILED_SKILLS:
        if pattern.search(text):
            if display_name not in found_skills[category]:
                found_skills[category].append(display_name)
                found_flat.append(display_name)
    return found_skills, found_flat

def calculate_resume_score(text, skills_flat):
    # Total score out of 100
    # Skills: 30 marks
    # Projects: 25 marks
    # Education: 15 marks
    # Experience: 20 marks
    # Certifications: 10 marks
    
    # 1. Skills (max 30): 3 points per skill, up to 10 skills
    skills_score = min(len(skills_flat) * 3, 30)
    
    # 2. Projects (max 25): Check for projects section and count bullet indicators
    projects_score = 0
    projects_keywords = ['project', 'projects', 'portfolio', 'personal work', 'academic project']
    has_projects_section = any(re.search(rf'\b{kw}\b', text, re.IGNORECASE) for kw in projects_keywords)
    if has_projects_section:
        projects_score = 15
        # Look for details or multiple projects (e.g. bullet points, Github links, keywords)
        github_matches = len(re.findall(r'github\.com', text, re.IGNORECASE))
        project_count = len(re.findall(r'\b(?:built|developed|created|implemented)\b', text, re.IGNORECASE))
        if github_matches > 0 or project_count >= 2:
            projects_score = 25
    
    # 3. Education (max 15): Check for education section
    education_score = 0
    edu_keywords = ['education', 'university', 'college', 'degree', 'bachelor', 'master', 'phd', r'b\.tech', r'm\.tech', 'btech', 'mtech', 'schooling', 'gpa', 'cgpa']
    has_edu_section = any(re.search(rf'\b{kw}\b', text, re.IGNORECASE) for kw in edu_keywords)
    if has_edu_section:
        education_score = 10
        # If specific degrees are found
        degree_patterns = [r'\b(?:bachelor|master|phd|b\.?tech|m\.?tech|b\.?s|m\.?s|degree)\b']
        if any(re.search(pat, text, re.IGNORECASE) for pat in degree_patterns):
            education_score = 15
            
    # 4. Experience (max 20)
    experience_score = 0
    exp_keywords = ['experience', 'employment', 'work history', 'professional background', 'intern', 'internship', 'job', 'position']
    has_exp_section = any(re.search(rf'\b{kw}\b', text, re.IGNORECASE) for kw in exp_keywords)
    if has_exp_section:
        experience_score = 12
        # Look for action verbs representing accomplishments
        actions = ['managed', 'led', 'designed', 'optimized', 'collaborated', 'increased', 'reduced', 'solved']
        action_count = sum(1 for act in actions if re.search(rf'\b{act}\b', text, re.IGNORECASE))
        if action_count >= 2:
            experience_score = 20
            
    # 5. Certifications (max 10)
    cert_score = 0
    cert_keywords = ['certification', 'certifications', 'certified', 'credential', 'credentials', 'license', 'licenses']
    has_cert = any(re.search(rf'\b{kw}\b', text, re.IGNORECASE) for kw in cert_keywords)
    if has_cert:
        cert_score = 10
        
    total_score = skills_score + projects_score + education_score + experience_score + cert_score
    
    return {
        "total": total_score,
        "breakdown": {
            "skills": skills_score,
            "projects": projects_score,
            "education": education_score,
            "experience": experience_score,
            "certifications": cert_score
        }
    }

def check_ats_compatibility(text, email, phone):
    ats_score = 100
    checks = []
    
    # 1. Missing Heading Checks
    headings = {
        "Education": r'\b(?:education|academic|studies)\b',
        "Experience": r'\b(?:experience|employment|work|history)\b',
        "Projects": r'\b(?:projects|portfolio|accomplishments)\b',
        "Skills": r'\b(?:skills|technologies|proficiencies|expertise)\b'
    }
    
    for heading, pattern in headings.items():
        if not re.search(pattern, text, re.IGNORECASE):
            ats_score -= 15
            checks.append({
                "type": "heading_missing",
                "label": heading,
                "status": "fail",
                "message": f"Section heading '{heading}' was not found. ATS parsers rely on standard headings to categorize details."
            })
        else:
            checks.append({
                "type": "heading_missing",
                "label": heading,
                "status": "pass",
                "message": f"Section heading '{heading}' was successfully detected."
            })
            
    # 2. Contact Info Checks
    if not email:
        ats_score -= 10
        checks.append({
            "type": "contact",
            "label": "Email Contact",
            "status": "fail",
            "message": "No email address detected. Recruiter ATS systems will fail to parse your contact info."
        })
    else:
        checks.append({
            "type": "contact",
            "label": "Email Contact",
            "status": "pass",
            "message": "Email address successfully detected."
        })
        
    if not phone:
        ats_score -= 10
        checks.append({
            "type": "contact",
            "label": "Phone Number",
            "status": "fail",
            "message": "No phone number detected. It is highly recommended to add contact details."
        })
    else:
        checks.append({
            "type": "contact",
            "label": "Phone Number",
            "status": "pass",
            "message": "Phone number successfully detected."
        })
        
    # 3. Formatting issues (Complex Tables / Fonts / Non-Standard chars check)
    # Checks for weird unicode chars (excluding basic punctuation/symbols)
    # If the text has high non-ascii character ratio
    non_ascii = len([c for c in text if ord(c) > 127])
    ascii_chars = len(text)
    non_ascii_ratio = non_ascii / max(ascii_chars, 1)
    
    if non_ascii_ratio > 0.05:
        ats_score -= 10
        checks.append({
            "type": "formatting",
            "label": "Fancy Fonts/Icons",
            "status": "fail",
            "message": "High count of non-standard symbols detected. Avoid complex icons or custom font glyphs that scramble text parsers."
        })
    else:
        checks.append({
            "type": "formatting",
            "label": "Fancy Fonts/Icons",
            "status": "pass",
            "message": "Text formatting uses clean, parseable characters."
        })
        
    # Check for links
    has_links = "github.com" in text.lower() or "linkedin.com" in text.lower()
    if not has_links:
        ats_score -= 10
        checks.append({
            "type": "formatting",
            "label": "Professional Links",
            "status": "fail",
            "message": "No LinkedIn or GitHub link was found. Adding links helps recruiters instantly verify credentials."
        })
    else:
        checks.append({
            "type": "formatting",
            "label": "Professional Links",
            "status": "pass",
            "message": "Professional profile links (GitHub/LinkedIn) detected."
        })
        
    ats_score = max(ats_score, 10) # Floor score at 10
    
    return {
        "score": ats_score,
        "checks": checks
    }

def get_suggestions(resume_score, ats_score, text, skills_flat, email, phone):
    suggestions = []
    
    # Core score suggestions
    if resume_score < 50:
        suggestions.append("Your overall resume score is low. Try adding detailed project descriptions and expanding the skills section.")
    elif resume_score < 75:
        suggestions.append("Your resume is average. Boost your score by listing technical credentials or professional certifications.")
        
    # Skill related suggestions
    if len(skills_flat) < 5:
        suggestions.append("Add more industry-relevant technical keywords. A list of 8-12 skills helps your profile match basic queries.")
        
    # Link check
    if "github.com" not in text.lower():
        suggestions.append("Include a link to your GitHub profile to highlight actual source code and projects.")
    if "linkedin.com" not in text.lower():
        suggestions.append("Include your LinkedIn profile link to establish professional credibility.")
        
    # Content quality suggestion
    action_words = ['managed', 'led', 'designed', 'optimized', 'collaborated', 'increased', 'reduced']
    action_count = sum(1 for act in action_words if re.search(rf'\b{act}\b', text, re.IGNORECASE))
    if action_count < 3:
        suggestions.append("Use strong action verbs (e.g., 'Optimized', 'Engineered', 'Spearheaded') at the beginning of bullet points.")
        
    # Check for quantitative indicators (numbers/percentages/scale/time)
    metrics_pattern = r'(?:\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?\s*(?:hours?|hrs?|seconds?|secs?|s|ms|minutes?|mins?|days?|weeks?|months?)\b|[\$\€\£\₹]\s*\d+|\b\d+\s*[kKmMbB]\+?\b|\b\d+\+(?!\w)|\b\d+x\b|\b(?:increased|reduced|improved|decreased|cut|boosted|saved|grew)\b[^\.\n;]{1,40}?\b\d+)'
    has_metrics = bool(re.search(metrics_pattern, text, re.IGNORECASE))
    if not has_metrics:
        suggestions.append("Incorporate measurable metrics (e.g., 'increased efficiency by 15%', 'reduced page-load by 2s') to quantify impact.")
        
    # Header alerts
    if not re.search(r'\b(?:education|academic)\b', text, re.IGNORECASE):
        suggestions.append("Add a distinct 'Education' section outlining your degree, university name, and graduation year.")
    if not re.search(r'\b(?:experience|employment|work)\b', text, re.IGNORECASE):
        suggestions.append("Add an 'Experience' or 'Internships' section summarizing your professional work history.")
        
    # Default fallbacks if everything is perfect
    if not suggestions:
        suggestions.append("Your resume looks highly optimized! Double check formatting spacing and proofread for any micro-typos.")
        
    return suggestions

def match_job_description(resume_text, jd_text):
    # 1. Clean both text documents
    def get_words(t):
        return re.findall(r'\b[a-zA-Z]{2,}\b', t.lower())
        
    resume_words = get_words(resume_text)
    jd_words = get_words(jd_text)
    
    # 2. Extract skills from Job Description
    _, jd_skills_flat = extract_skills(jd_text)
    _, resume_skills_flat = extract_skills(resume_text)
    
    # 3. Calculate skill overlap
    if jd_skills_flat:
        matching_skills = [s for s in jd_skills_flat if s in resume_skills_flat]
        missing_skills = [s for s in jd_skills_flat if s not in resume_skills_flat]
        skill_coverage = len(matching_skills) / len(jd_skills_flat)
    else:
        # Fallback if no specific skills found in Job Description
        matching_skills = []
        missing_skills = []
        skill_coverage = 1.0
        
    # 4. Pure Python TF-IDF / Cosine Similarity calculation
    # Vectorize words by frequency count
    r_counts = Counter(resume_words)
    j_counts = Counter(jd_words)
    
    # Set of unique words across both
    vocab = set(r_counts.keys()).intersection(set(j_counts.keys()))
    
    # Simple cosine similarity on common terms
    dot_product = sum(r_counts[w] * j_counts[w] for w in vocab)
    r_magnitude = math.sqrt(sum(r_counts[w] ** 2 for w in r_counts))
    j_magnitude = math.sqrt(sum(j_counts[w] ** 2 for w in j_counts))
    
    content_similarity = 0.0
    if r_magnitude and j_magnitude:
        content_similarity = dot_product / (r_magnitude * j_magnitude)
        
    # 5. Combined match score calculation
    # 60% based on skill matching, 40% based on general vocabulary overlap (cosine)
    match_percentage = int((skill_coverage * 60) + (content_similarity * 40))
    match_percentage = min(max(match_percentage, 15), 98) # Keep between 15% and 98% for realistic feel
    
    return {
        "match_percentage": match_percentage,
        "matching_skills": matching_skills,
        "missing_skills": missing_skills,
        "jd_skills_detected": jd_skills_flat
    }

def analyze_resume_content(resume_data):
    text = resume_data.get("text", "")
    email = resume_data.get("email")
    phone = resume_data.get("phone")
    
    skills_by_cat, skills_flat = extract_skills(text)
    score_details = calculate_resume_score(text, skills_flat)
    ats_details = check_ats_compatibility(text, email, phone)
    
    suggestions = get_suggestions(
        score_details["total"], 
        ats_details["score"], 
        text, 
        skills_flat, 
        email, 
        phone
    )
    
    return {
        "score": score_details["total"],
        "score_breakdown": score_details["breakdown"],
        "ats_score": ats_details["score"],
        "ats_checks": ats_details["checks"],
        "skills_by_category": skills_by_cat,
        "skills": skills_flat,
        "suggestions": suggestions,
        "email": email,
        "phone": phone
    }
