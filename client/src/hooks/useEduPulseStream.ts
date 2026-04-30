"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
	ConnectionStatus,
	EduPulseFrame,
	UseEduPulseStreamReturn,
} from "@/types/edupulse";

const MAX_TIMELINE_LENGTH = 60;
const RECONNECT_BASE_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

/**
 * useEduPulseStream
 *
 * Manages a WebSocket connection to the EduPulse backend, exposing:
 *  - `currentFrame`        – the latest flat payload from engine.py
 *  - `timelineBuffer`      – rolling window of up to 60 payloads (for chart)
 *  - `status`              – connection lifecycle state
 *  - `sessionStartTime`    – Date set when startStream is called
 *  - `runningAverageScore` – continuously calculated average of class_score
 *  - `peakScore`           – highest class_score in the session
 *  - `scoreHistory`        – full array of every class_score (for Firestore save)
 *  - `startStream` / `stopStream` – manual controls
 */
export function useEduPulseStream(url: string): UseEduPulseStreamReturn {
	const [currentFrame, setCurrentFrame] = useState<EduPulseFrame | null>(null);
	const [timelineBuffer, setTimelineBuffer] = useState<EduPulseFrame[]>([]);
	const [status, setStatus] = useState<ConnectionStatus>("disconnected");
	const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
	const [runningAverageScore, setRunningAverageScore] = useState<number>(0);
	const [peakScore, setPeakScore] = useState<number>(0);
	const [scoreHistory, setScoreHistory] = useState<number[]>([]);

	// ── Refs to survive across closures & reconnect cycles ──────────────
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const reconnectAttemptRef = useRef(0);
	const manualCloseRef = useRef(false);
	const mountedRef = useRef(true);
	const scoreSumRef = useRef<number>(0);
	const scoreCountRef = useRef<number>(0);

	// ── Core connect logic ──────────────────────────────────────────────
	const connect = useCallback(() => {
		if (
			wsRef.current?.readyState === WebSocket.OPEN ||
			wsRef.current?.readyState === WebSocket.CONNECTING
		) {
			return;
		}
		if (!mountedRef.current) return;

		manualCloseRef.current = false;
		setStatus("connecting");

		const ws = new WebSocket(url);
		wsRef.current = ws;

		ws.onopen = () => {
			if (!mountedRef.current) {
				ws.close();
				return;
			}
			setStatus("connected");
			reconnectAttemptRef.current = 0;
		};

		ws.onmessage = (event: MessageEvent) => {
			try {
				const frame: EduPulseFrame = JSON.parse(event.data as string);

				setCurrentFrame(frame);
				setTimelineBuffer((prev) => {
					const next = [...prev, frame];
					return next.length > MAX_TIMELINE_LENGTH
						? next.slice(next.length - MAX_TIMELINE_LENGTH)
						: next;
				});

				// Track running average, peak, and full history using class_score
				if (typeof frame.class_score === "number") {
					scoreSumRef.current += frame.class_score;
					scoreCountRef.current += 1;
					const avg = scoreSumRef.current / scoreCountRef.current;
					setRunningAverageScore(Math.round(avg * 10) / 10);

					setPeakScore((prev) => Math.max(prev, frame.class_score));
					setScoreHistory((prev) => [...prev, frame.class_score]);
				}
			} catch {
				console.warn("[useEduPulseStream] Failed to parse frame:", event.data);
			}
		};

		ws.onerror = () => {
			if (!mountedRef.current) return;
			setStatus("error");
		};

		ws.onclose = () => {
			if (!mountedRef.current) return;
			wsRef.current = null;
			setStatus("disconnected");

			if (!manualCloseRef.current) {
				const attempt = reconnectAttemptRef.current;
				const delay = Math.min(
					RECONNECT_BASE_DELAY_MS * Math.pow(2, attempt),
					MAX_RECONNECT_DELAY_MS,
				);
				reconnectAttemptRef.current = attempt + 1;
				console.info(
					`[useEduPulseStream] Reconnecting in ${delay}ms (attempt ${attempt + 1})…`,
				);

				reconnectTimerRef.current = setTimeout(() => {
					if (mountedRef.current && !manualCloseRef.current) {
						connect();
					}
				}, delay);
			}
		};
	}, [url]);

	// ── Disconnect helper ───────────────────────────────────────────────
	const disconnect = useCallback(() => {
		if (reconnectTimerRef.current) {
			clearTimeout(reconnectTimerRef.current);
			reconnectTimerRef.current = null;
		}
		if (wsRef.current) {
			wsRef.current.close();
			wsRef.current = null;
		}
	}, []);

	// ── Public controls ─────────────────────────────────────────────────
	const startStream = useCallback(() => {
		// Reset all session tracking state for a fresh session
		setSessionStartTime(new Date());
		scoreSumRef.current = 0;
		scoreCountRef.current = 0;
		setRunningAverageScore(0);
		setPeakScore(0);
		setScoreHistory([]);
		setCurrentFrame(null);
		setTimelineBuffer([]);

		manualCloseRef.current = false;
		reconnectAttemptRef.current = 0;
		connect();
	}, [connect]);

	const stopStream = useCallback(() => {
		manualCloseRef.current = true;
		disconnect();
		setStatus("disconnected");
	}, [disconnect]);

	// ── Lifecycle: auto-connect on mount, clean up on unmount ───────────
	useEffect(() => {
		mountedRef.current = true;
		setSessionStartTime(new Date());
		connect();

		return () => {
			mountedRef.current = false;
			manualCloseRef.current = true;
			disconnect();
		};
	}, [connect, disconnect]);

	return {
		currentFrame,
		timelineBuffer,
		status,
		sessionStartTime,
		runningAverageScore,
		peakScore,
		scoreHistory,
		startStream,
		stopStream,
	};
}
