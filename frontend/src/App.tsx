import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import ChatPage from './components/ChatPage';
import { API_URL } from './config';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [userId, setUserId] = useState<number | null>(
    localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId')!) : null
  );
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (token) {
      socketRef.current = io(API_URL, { auth: { token } });
    }
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const handleLogin = (newToken: string, newUserId: number) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('userId', String(newUserId));
    setToken(newToken);
    setUserId(newUserId);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    socketRef.current?.disconnect();
    socketRef.current = null;
    setToken(null);
    setUserId(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/chat" /> : <LoginPage onLogin={handleLogin} />} />
        <Route path="/register" element={token ? <Navigate to="/chat" /> : <RegisterPage onLogin={handleLogin} />} />
        <Route
          path="/chat"
          element={
            token && socketRef.current ? (
              <ChatPage token={token} userId={userId!} socket={socketRef.current} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="*" element={<Navigate to={token ? '/chat' : '/login'} />} />
      </Routes>
    </BrowserRouter>
  );
}
