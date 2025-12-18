from fastapi import FastAPI
from pydantic import BaseModel
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

SYSTEM_PROMPT = """
Kamu adalah KrisAI.
Asisten AI penulisan kreatif berbahasa Indonesia.
Ramah, jelas, dan membantu.
"""

model = genai.GenerativeModel(
    model_name="models/gemini-1.0-pro",
    system_instruction=SYSTEM_PROMPT
)

chat = model.start_chat(history=[])

app = FastAPI()

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
def chat_ai(req: ChatRequest):
    response = chat.send_message(req.message)
    return {
        "reply": response.text
    }
