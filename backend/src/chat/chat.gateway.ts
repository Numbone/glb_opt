import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { AuthService } from '../auth/auth.service';
import { ROOM_KEY_PREFIX } from '../constants';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
  ) {}

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string;
    if (!token) {
      client.disconnect();
      return;
    }

    const decoded = this.authService.verifyToken(token);
    if (!decoded) {
      client.disconnect();
      return;
    }

    client.data.userId = decoded.userId;
    client.data.username = decoded.username;
  }

  handleDisconnect(_client: Socket) {}

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@MessageBody() data: { roomId: number }, @ConnectedSocket() client: Socket) {
    const roomKey = ROOM_KEY_PREFIX + data.roomId;
    client.join(roomKey);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(@MessageBody() data: { roomId: number; content: string }, @ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    const username = client.data.username;

    if (!userId || !username) {
      return;
    }

    const message = await this.chatService.saveMessage(data.roomId, userId, data.content, username);

    const roomKey = ROOM_KEY_PREFIX + data.roomId;
    this.server.to(roomKey).emit('newMessage', {
      ...message,
      username,
    });
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(@MessageBody() data: { roomId: number }, @ConnectedSocket() client: Socket) {
    const roomKey = ROOM_KEY_PREFIX + data.roomId;
    client.leave(roomKey);
  }
}
