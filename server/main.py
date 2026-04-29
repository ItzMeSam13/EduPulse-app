# main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from attention.router import router as attention_router

app = FastAPI(title="EduPulse API")

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(attention_router, prefix="/attention", tags=["Attention"])

@app.get("/")
def root():
    return {"status": "EduPulse backend running"}