import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateRoomDto } from '../dto/create-room.dto';
import { PaginationDto } from '../dto/pagination.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('rooms')
  async getRooms() {
    return this.chatService.getRooms();
  }

  @Post('rooms')
  async createRoom(@Body() dto: CreateRoomDto) {
    return this.chatService.createRoom(dto.name, dto.description);
  }

  @Get('rooms/:roomId/messages')
  async getMessages(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.chatService.getMessages(roomId, pagination.page, pagination.limit);
  }
}
