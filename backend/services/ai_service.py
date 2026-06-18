"""
AI Service — Google Gemini API for all resume intelligence tasks.
Uses gemini-1.5-flash (free tier) by default; switch to gemini-1.5-pro for higher quality.
"""
import json
import re
import google.generativeai as genai
from core.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

def _get_model():
    return genai.GenerativeModel(
        model_name=settings.GEMINI_MODEL,
        generation_config=genai.GenerationConfig(
            temperature=0.3,
            max_output_tokens=2048,
        )
    )

def _clean_json(raw: str) -> str:
    """Strip markdown fences from Gemini output."""
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    cleaned = cleaned.strip("`").strip()
    return cleaned

async def _ask(prompt: str) -> str:
    model = _get_model()
    response = model.generate_content(prompt)
    return response.text


async def analyze_resume(resume_text: str, job_description: str = None) -> dict:
    """Full ATS analysis — returns structured JSON."""
    jd_block = f"\n\nJob Description:\n{job_description}" if job_description else ""

    prompt = f"""You are an expert ATS (Applicant Tracking System) analyzer and career coach.
Analyze the resume below and return ONLY valid JSON with no markdown, no backticks, no explanation.

Return exactly this JSON structure:
{{
  "ats_score": <integer 0-100>,
  "match_score": <integer 0-100>,
  "grade": "<A+|A|B+|B|C|D|F>",
  "sections": {{
    "formatting": <0-100>,
    "keywords": <0-100>,
    "experience": <0-100>,
    "education": <0-100>,
    "skills": <0-100>
  }},
  "keywords": {{
    "found": ["<keyword>", ...],
    "missing": ["<keyword>", ... 8-12 items]
  }},
  "skills": {{
    "technical": ["<skill>", ...],
    "soft": ["<skill>", ...],
    "missing": ["<skill>", ... 5-7 items]
  }},
  "strengths": ["<strength>", "<strength>", "<strength>"],
  "suggestions": ["<suggestion>", ... 5 specific actionable items],
  "red_flags": ["<issue>", ...],
  "summary": "<2-3 sentence executive summary>"
}}

Resume:
{resume_text}{jd_block}"""

    raw = await _ask(prompt)
    return json.loads(_clean_json(raw))


async def rewrite_resume(
    resume_text: str,
    job_description: str = None,
    missing_keywords: list = None,
    target_role: str = None,
) -> str:
    """Rewrite resume for maximum ATS performance."""
    kw_line = f"\nEnsure these keywords appear naturally: {', '.join(missing_keywords)}" if missing_keywords else ""
    jd_line = f"\nTarget Job Description:\n{job_description}" if job_description else ""
    role_line = f"\nTarget Role: {target_role}" if target_role else ""

    prompt = f"""You are a professional ATS resume writer. Rewrite the resume below following these rules:
1. Use clear section headers: SUMMARY, EXPERIENCE, EDUCATION, SKILLS, CERTIFICATIONS
2. Start every bullet with a strong action verb (Led, Built, Designed, Increased, Reduced, etc.)
3. Quantify achievements wherever possible (%, $, numbers, scale)
4. Maintain keyword density of 2-3% for target role
5. Plain text only — no tables, columns, headers/footers (ATS unfriendly)
6. Keep content truthful — enhance presentation, never fabricate
{kw_line}{jd_line}{role_line}

Return ONLY the rewritten resume text. No explanations, no preamble.

Original Resume:
{resume_text}"""

    return await _ask(prompt)


async def generate_interview_questions(
    resume_text: str,
    job_description: str = None,
    target_role: str = None,
) -> dict:
    """Generate categorized interview questions tailored to the candidate."""
    context = f"\nJob Description:\n{job_description}" if job_description else ""
    role = f"\nTarget Role: {target_role}" if target_role else ""

    prompt = f"""You are a senior interview coach. Generate targeted interview questions based on this candidate's background.
Return ONLY valid JSON, no markdown, no backticks:

{{
  "behavioral": [
    {{"q": "<question>", "tip": "<STAR method answering tip>"}},
    {{"q": "<question>", "tip": "<tip>"}},
    {{"q": "<question>", "tip": "<tip>"}},
    {{"q": "<question>", "tip": "<tip>"}},
    {{"q": "<question>", "tip": "<tip>"}}
  ],
  "technical": [
    {{"q": "<question>", "tip": "<what interviewer is assessing>"}},
    {{"q": "<question>", "tip": "<tip>"}},
    {{"q": "<question>", "tip": "<tip>"}},
    {{"q": "<question>", "tip": "<tip>"}},
    {{"q": "<question>", "tip": "<tip>"}}
  ],
  "situational": [
    {{"q": "<question>", "tip": "<key points to cover>"}},
    {{"q": "<question>", "tip": "<tip>"}},
    {{"q": "<question>", "tip": "<tip>"}}
  ],
  "culture_fit": [
    {{"q": "<question>", "tip": "<what to emphasize>"}},
    {{"q": "<question>", "tip": "<tip>"}}
  ]
}}

Resume:
{resume_text}{context}{role}"""

    raw = await _ask(prompt)
    return json.loads(_clean_json(raw))
