import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

load_dotenv()

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=os.getenv("GEMINI_API_KEY"),
    max_output_tokens=250,
    streaming=True
)

# ── Trigger prompts ────────────────────────────────────────────────
TRIGGER_PROMPTS = {
    "sudden_drop": (
        "Engagement just dropped {change}% in under 60 seconds — "
        "{students} students shifted to {states}. "
        "First tell the teacher exactly what just happened and why it likely occurred. "
        "Then give ONE specific immediate action they can take right now to recover attention."
    ),
    "sustained_low": (
        "Engagement has been stuck below 50% for over 90 seconds — "
        "only {attentive} of {total} students are attentive right now. "
        "First explain what this pattern means for the class. "
        "Then give ONE specific energiser or technique the teacher can do immediately."
    ),
    "phone": (
        "A phone was just detected in the classroom. "
        "First tell the teacher what was detected and why it matters for class focus. "
        "Then give ONE calm, non-disruptive action to handle it without embarrassing the student."
    ),
    "sleeping": (
        "{count} student(s) appear to be sleeping right now. "
        "First tell the teacher what this signals about the class energy level. "
        "Then suggest ONE quick energiser they can use immediately to wake up the room."
    ),
    "yawning": (
        "{count} students are yawning — fatigue is visibly building in the class. "
        "First explain what this pattern indicates. "
        "Then suggest ONE short activity or change the teacher can make right now to re-energise."
    ),
    "recovery": (
        "Engagement just recovered from {prev}% back up to {current}% — the class is responding. "
        "First acknowledge what likely worked and what this improvement means. "
        "Then give ONE tip the teacher can use to maintain this momentum."
    ),
    "side_convo": (
        "Side conversations have been detected among students. "
        "First tell the teacher what this behaviour usually means at this point in a lesson. "
        "Then give ONE calm technique to refocus the class without interrupting the lesson flow."
    ),
}

def build_system_prompt(snap: dict) -> str:
    return f"""You are EduPulse Copilot — a calm, smart, real-time AI teaching assistant.

CURRENT CLASSROOM SNAPSHOT:
- Engagement score: {snap.get('class_score', 0)}%
- Students in frame: {snap.get('students', 0)}
- Attentive: {snap.get('attentive', 0)} | Distracted: {snap.get('distracted', 0)}
- Head down: {snap.get('head_down', 0)} | Sleeping: {snap.get('sleeping', 0)} | Yawning: {snap.get('yawning', 0)}
- Phone detected: {snap.get('phone_detected', False)} | Side convo: {snap.get('side_convo', False)}
- Previous score: {snap.get('previous_score', 0)}% → change: {snap.get('score_change', 0)}%

STRICT FORMAT — every response must have exactly 2 parts:
1. WHAT HAPPENED: 1-2 sentences explaining what was detected and why it likely occurred. Use exact numbers from the snapshot.
2. WHAT TO DO: Start with "→" then give ONE specific, immediately actionable suggestion the teacher can do in the next 30 seconds.

RULES:
- Always use both parts. Never skip the suggestion. Never skip the explanation.
- Be direct and calm — teacher is in the middle of a live class.
- Reference exact numbers from the snapshot above.
- Never name individual students — group patterns only.
- Do not start with "I" or "As an AI".
- Total response: max 3 sentences.
"""

async def get_live_alert(trigger: str, session_snapshot: dict, trigger_data: dict):
    """
    Called only when a meaningful event fires (not every second).
    Frontend enforces a 2-minute cooldown per trigger type.
    """
    system = build_system_prompt(session_snapshot)

    try:
        prompt = TRIGGER_PROMPTS[trigger].format(**trigger_data)
    except KeyError:
        prompt = (
            f"Something changed in the classroom. "
            f"Current score: {session_snapshot.get('class_score')}%. "
            f"Tell the teacher what happened and give one suggestion."
        )

    messages = [HumanMessage(content=f"{system}\n\nSITUATION: {prompt}")]

    try:
        async for chunk in llm.astream(messages):
            if chunk.content:
                yield chunk.content
    except Exception as e:
        yield f"Error generating alert: {str(e)[:50]}... Please check your API quota."