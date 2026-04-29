# main.py
from server.distraction import router as distraction_router
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
app.include_router(distraction_router, prefix="/distraction", tags=["Distraction"])
app.include_router(attention_router, prefix="/attention", tags=["Attention"])

@app.get("/")
def root():
    return {"status": "EduPulse backend running"}