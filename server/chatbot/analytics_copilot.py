import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage

load_dotenv()

llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",
    google_api_key=os.getenv("GEMINI_API_KEY"),
    max_output_tokens=500,
    streaming=True
)

def build_analytics_system_prompt(session_data: dict, compare_data: dict = None) -> str:
    # Sample every 5th timeline point to save tokens
    timeline = session_data.get("timeline", [])
    sampled = timeline[::5] if len(timeline) > 20 else timeline

    prompt = f"""You are EduPulse Copilot — an AI teaching assistant helping a teacher review their session.

SESSION DATA:
- Duration: {session_data.get('duration', 0)} minutes
- Average engagement: {session_data.get('avg_score', 0)}%
- Peak score: {session_data.get('peak_score', 0)}% at minute {session_data.get('peak_minute', 0)}
- Worst score: {session_data.get('worst_score', 0)}% at minute {session_data.get('worst_minute', 0)}
- Time attentive: {session_data.get('attentive_pct', 0)}% | Distracted: {session_data.get('distracted_pct', 0)}%
- Phone detections: {session_data.get('phone_count', 0)}
- Sleeping events: {session_data.get('sleeping_count', 0)}
- Yawning events: {session_data.get('yawning_count', 0)}
- Distraction events: {session_data.get('drop_events', 0)}
- Engagement timeline (sampled): {sampled}

RULES:
- Be specific — reference exact minutes and scores.
- Never mention individual students — group patterns only.
- Max 4 sentences unless asked for a list.
- For suggestions, use a numbered list.
- Keep language simple and encouraging — teacher is not a data analyst.
- Do not start with "I" or "As an AI".
"""

    if compare_data:
        prompt += f"""
COMPARISON SESSION:
- Duration: {compare_data.get('duration', 0)} min | Avg: {compare_data.get('avg_score', 0)}%
- Peak: {compare_data.get('peak_score', 0)}% at min {compare_data.get('peak_minute', 0)}
- Worst: {compare_data.get('worst_score', 0)}% at min {compare_data.get('worst_minute', 0)}
- Attentive: {compare_data.get('attentive_pct', 0)}% | Phone: {compare_data.get('phone_count', 0)} | Sleep: {compare_data.get('sleeping_count', 0)}
"""
    return prompt


async def chat(
    user_message: str,
    session_data: dict,
    history: list,
    compare_data: dict = None
):
    """
    Streams analytics chatbot response.
    history = list of {role: 'user'|'assistant', content: str}
    """
    system = build_analytics_system_prompt(session_data, compare_data)
    messages = []

    if not history:
        messages.append(HumanMessage(content=f"{system}\n\nTeacher: {user_message}"))
    else:
        # Inject system into very first human turn only
        messages.append(HumanMessage(content=f"{system}\n\nTeacher: {history[0]['content']}"))
        for i, msg in enumerate(history):
            if i == 0:
                continue
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            else:
                messages.append(AIMessage(content=msg["content"]))
        messages.append(HumanMessage(content=user_message))

    async for chunk in llm.astream(messages):
        if chunk.content:
            yield chunk.content