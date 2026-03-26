import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { UsersModule } from './users/users.module';
import { User } from './entities/user.entity';
import { Room } from './entities/room.entity';
import { Message } from './entities/message.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'chatdb',
      entities: [User, Room, Message],
      synchronize: true,
    }),
    AuthModule,
    ChatModule,
    UsersModule,
  ],
})
export class AppModule {}
