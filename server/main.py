# main.py — FastAPI server
# Run with: uvicorn main:app --reload --port 8000
#
# Endpoints:
#   POST /session/start               → engine.py       (video file)
#   POST /session/start?source=webcam → engine_webcam.py (live webcam)
#   POST /session/stop
#   GET  /session/status
#   WS   /ws/metrics

import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
import engine
import engine_webcam

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten this in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Track which engine is currently active
_active_engine = None


@app.post("/session/start")
def start_session(source: str = Query(default="video")):
    global _active_engine

    # Stop whichever engine is already running
    if _active_engine == "video" and engine.is_running():
        engine.stop()
    elif _active_engine == "webcam" and engine_webcam.is_running():
        engine_webcam.stop()

    if source == "webcam":
        if engine_webcam.is_running():
            return {"status": "already_running", "source": "webcam"}
        engine_webcam.start()
        _active_engine = "webcam"
        return {"status": "started", "source": "webcam"}
    else:
        if engine.is_running():
            return {"status": "already_running", "source": "video"}
        engine.start()
        _active_engine = "video"
        return {"status": "started", "source": "video"}


@app.post("/session/stop")
def stop_session():
    global _active_engine
    if _active_engine == "video":
        engine.stop()
    elif _active_engine == "webcam":
        engine_webcam.stop()
    _active_engine = None
    return {"status": "stopped"}


@app.get("/session/status")
def session_status():
    running = (
        engine.is_running() if _active_engine == "video"
        else engine_webcam.is_running() if _active_engine == "webcam"
        else False
    )
    return {
        "running": running,
        "source":  _active_engine or "none"
    }


@app.websocket("/ws/metrics")
async def websocket_metrics(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            try:
                # Pull from whichever engine is active
                if _active_engine == "video":
                    data = engine.metrics_queue.get_nowait()
                elif _active_engine == "webcam":
                    data = engine_webcam.metrics_queue.get_nowait()
                else:
                    data = None

                if data:
                    await websocket.send_json(data)

            except Exception:
                pass  # queue empty — just wait

            await asyncio.sleep(0.5)

    except WebSocketDisconnect:
        print("Frontend disconnected from WebSocket.")