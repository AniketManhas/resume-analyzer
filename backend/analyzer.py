import re
import math
from collections import Counter

# Rich dictionary of tech skills mapped by category
SKILL_CATEGORIES = {
    "Programming Languages": ["python", "java", "c\\+\\+", "c#", "javascript", "typescript", "php", "ruby", "go", "golang", "swift", "kotlin", "rust", "sql"],
    "Frontend Development": ["react", "angular", "vue", "next\\.js", "nextjs", "nuxt", "html", "css", "sass", "bootstrap", "tailwind", "jquery", "flutter", "svelte"],
    "Backend Development": ["node\\.js", "nodejs", "express", "django", "flask", "spring boot", "springboot", "asp\\.net", "fastapi", "laravel", "graphql", "nest\\.js", "nestjs"],
    "Database & Storage": ["mysql", "postgresql", "postgres", "mongodb", "redis", "sqlite", "oracle", "mariadb", "cassandra", "firebase", "dynamodb"],
    "Cloud & DevOps": ["aws", "azure", "gcp", "docker", "kubernetes", "jenkins", "git", "github", "gitlab", "ci/cd", "terraform", "linux", "ansible"],
    "AI & Data Science": ["machine learning", "deep learning", "nlp", "natural language processing", "tensorflow", "pytorch", "keras", "scikit-learn", "pandas", "numpy", "matplotlib", "seaborn", "computer vision", "opencv"]
}

# Compile regex patterns for fast skill matching
SKILL_PATTERNS = {}
for category, skills in SKILL_CATEGORIES.items():
    patterns = []
    for skill in skills:
        # If the skill contains special characters (like c++, node.js, .net), match it carefully
        if re.search(r'[^a-zA-Z0-9]', skill):
            escaped = re.escape(skill)
            # Match boundary or whitespace
            patterns.append((skill, re.compile(rf'(?:^|[\s,;:\.\|]){escaped}(?:$|[\s,;:\.\|])', re.IGNORECASE)))
        else:
            patterns.append((skill, re.compile(rf'\b{skill}\b', re.IGNORECASE)))
    SKILL_PATTERNS[category] = patterns

def extract_skills(text):
    found_skills = {}
    found_flat = []
    for category, patterns in SKILL_PATTERNS.items():
        found_skills[category] = []
        for raw_name, pattern in patterns:
            # Format raw name for display (e.g. c\+\+ -> C++, next\.js -> Next.js)
            display_name = raw_name.replace('\\+', '+').replace('\\.', '.').title()
            if display_name.lower() == 'sql':
                display_name = 'SQL'
            elif display_name.lower() == 'html':
                display_name = 'HTML'
            elif display_name.lower() == 'css':
                display_name = 'CSS'
            elif display_name.lower() == 'gcp':
                display_name = 'GCP'
            elif display_name.lower() == 'aws':
                display_name = 'AWS'
            elif display_name.lower() == 'nlp':
                display_name = 'NLP'
            elif display_name.lower() == 'ci/cd':
                display_name = 'CI/CD'
            elif display_name.lower() == 'nextjs':
                display_name = 'Next.js'
            elif display_name.lower() == 'nodejs':
                display_name = 'Node.js'
            elif display_name.lower() == 'springboot':
                display_name = 'Spring Boot'
                
            if pattern.search(text):
                # Avoid duplicates
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
        
    # Check for quantitative indicators (numbers/percentages)
    has_metrics = bool(re.search(r'\b(?:\d+%|\d+\s*hours|\$\d+|\d+\+)\b', text))
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
