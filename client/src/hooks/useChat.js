import { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../services/api';

const WS_BASE_URL = API_URL.replace(/^http/, 'ws');

export function useChat(gadgetId, token, receiverId) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('connecting');
  const wsRef = useRef(null);

  useEffect(() => {
    if (!gadgetId || !token || !receiverId) return;

    // Chat endpoint per docs: ws://<host>/v1/chat/ws/{gadget_id}?token=...&receiver_id=...
    const wsUrl = `${WS_BASE_URL}/chat/ws/${gadgetId}?token=${token}&receiver_id=${receiverId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Per docs, Initial connect sends type: 'history'
        if (data.type === 'history') {
          setMessages(data.messages || []);
        } 
        // Per docs, Regular messages come as type: 'message'
        else if (data.type === 'message') {
          setMessages((prev) => [...prev, data]);
        }
      } catch {
        console.error('Invalid Chat WS message', event.data);
      }
    };

    ws.onerror = (err) => {
      console.error('Chat WebSocket Error:', err);
      setStatus('error');
    };

    ws.onclose = () => {
      setStatus('closed');
    };

    return () => {
      ws.close();
    };
  }, [gadgetId, token, receiverId]);

  const sendMessage = useCallback((text) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ message: text }));
    }
  }, []);

  return { messages, status, sendMessage };
}
