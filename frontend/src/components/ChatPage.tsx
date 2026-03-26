import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import RoomList from './RoomList';
import MessageItem from './MessageItem';
import Header from './Header';
import { API_URL } from '../config';

interface Room {
  id: number;
  name: string;
  description?: string;
}

interface MessageData {
  id: number;
  roomId: number;
  content: string;
  username: string;
  senderName: string;
  createdAt: string;
  userId: number;
}

interface Props {
  token: string;
  userId: number;
  socket: Socket;
  onLogout: () => void;
}

export default function ChatPage({ token, userId, socket, onLogout }: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [username, setUsername] = useState('');
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const selectedRoomRef = useRef<Room | null>(null);

  useEffect(() => {
    selectedRoomRef.current = selectedRoom;
  }, [selectedRoom]);

  useEffect(() => {
    fetchRooms();
    fetchCurrentUser();

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onNewMessage = (message: MessageData) => {
      const current = selectedRoomRef.current;
      if (current && message.roomId === current.id) {
        setMessages(prev => [...prev, message]);
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('newMessage', onNewMessage);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('newMessage', onNewMessage);
    };
  }, [socket]);

  const fetchCurrentUser = async () => {
    const res = await fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const user = await res.json();
    if (user?.username) {
      setUsername(user.username);
    }
  };

  const fetchRooms = async () => {
    const res = await fetch(`${API_URL}/chat/rooms`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setRooms(data);
  };

  const fetchMessages = useCallback(async (roomId: number) => {
    setLoadingMessages(true);
    const res = await fetch(`${API_URL}/chat/rooms/${roomId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setMessages(data.messages || []);
    setLoadingMessages(false);
  }, [token]);

  const handleRoomSelect = (room: Room) => {
    if (selectedRoom) {
      socket.emit('leaveRoom', { roomId: selectedRoom.id });
    }
    setSelectedRoom(room);
    socket.emit('joinRoom', { roomId: room.id });
    fetchMessages(room.id);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedRoom) return;

    socket.emit('sendMessage', {
      roomId: selectedRoom.id,
      content: newMessage,
    });

    setNewMessage('');
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;

    await fetch(`${API_URL}/chat/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newRoomName, description: newRoomDesc }),
    });

    setNewRoomName('');
    setNewRoomDesc('');
    setShowCreateRoom(false);
    fetchRooms();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ width: '250px', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column', padding: '10px', backgroundColor: '#f5f5f5' }}>
        <Header username={username} isConnected={isConnected} onLogout={onLogout} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0 }}>Rooms</h3>
          <button onClick={() => setShowCreateRoom(!showCreateRoom)} style={{ fontSize: '20px', cursor: 'pointer', border: 'none', background: 'none' }}>+</button>
        </div>

        {showCreateRoom && (
          <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <input placeholder="Room name" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} style={{ padding: '5px' }} />
            <input placeholder="Description (optional)" value={newRoomDesc} onChange={e => setNewRoomDesc(e.target.value)} style={{ padding: '5px' }} />
            <button onClick={handleCreateRoom} style={{ padding: '5px', cursor: 'pointer' }}>Create</button>
          </div>
        )}

        <RoomList rooms={rooms} selectedRoom={selectedRoom} onSelectRoom={handleRoomSelect} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedRoom ? (
          <>
            <div style={{ padding: '10px', borderBottom: '1px solid #ddd', backgroundColor: '#f9f9f9' }}>
              <h3 style={{ margin: 0 }}>#{selectedRoom.name}</h3>
              {selectedRoom.description && <p style={{ margin: '5px 0 0', color: '#666', fontSize: '14px' }}>{selectedRoom.description}</p>}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
              {loadingMessages ? (
                <p>Loading messages...</p>
              ) : (
                messages.map((msg) => (
                  <MessageItem
                    key={msg.id}
                    message={msg}
                    isOwn={msg.userId === userId}
                  />
                ))
              )}
            </div>

            <div style={{ display: 'flex', padding: '10px', borderTop: '1px solid #ddd', gap: '10px' }}>
              <input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                style={{ flex: 1, padding: '8px', fontSize: '16px' }}
              />
              <button onClick={handleSendMessage} style={{ padding: '8px 16px', fontSize: '16px', cursor: 'pointer' }}>
                Send
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <p style={{ color: '#666' }}>Select a room to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
