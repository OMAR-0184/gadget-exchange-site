import { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../services/api';

const WS_BASE_URL = API_URL.replace(/^http/, 'ws');

export function useBargain(gadgetId, token) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('connecting'); // connecting, connected, error, closed
  const wsRef = useRef(null);

  useEffect(() => {
    if (!gadgetId || !token) return;

    const wsUrl = `${WS_BASE_URL}/bargain/ws/${gadgetId}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages((prev) => [...prev, data]);
      } catch (err) {
        console.error('Invalid WS message payload', event.data);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket Error:', err);
      setStatus('error');
    };

    ws.onclose = () => {
      setStatus('closed');
    };

    return () => {
      ws.close();
    };
  }, [gadgetId, token]);

  const sendAction = useCallback((actionData) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(actionData));
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);

  return { messages, status, sendAction };
}
