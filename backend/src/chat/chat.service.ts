import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from '../entities/room.entity';
import { Message } from '../entities/message.entity';
import { DEFAULT_PAGE_SIZE } from '../constants';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  async getRooms(): Promise<Room[]> {
    return this.roomRepository.find();
  }

  async createRoom(name: string, description?: string): Promise<Room> {
    const existing = await this.roomRepository.findOne({ where: { name } });
    if (existing) {
      return existing;
    }
    const room = this.roomRepository.create({ name, description });
    return this.roomRepository.save(room);
  }

  async getMessages(roomId: number, page: number = 1, limit: number = DEFAULT_PAGE_SIZE): Promise<{ messages: Message[]; total: number }> {
    const [messages, total] = await this.messageRepository.findAndCount({
      where: { roomId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { messages, total };
  }

  async saveMessage(roomId: number, userId: number, content: string, senderName: string): Promise<Message> {
    const message = this.messageRepository.create({
      roomId,
      userId,
      content,
      senderName,
    });
    return this.messageRepository.save(message);
  }

  async deleteMessage(messageId: number, userId: number): Promise<boolean> {
    const msg = await this.messageRepository.findOne({ where: { id: messageId } });
    if (!msg) return false;
    if (msg.userId !== userId) return false;
    await this.messageRepository.delete(messageId);
    return true;
  }
}
