import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { BCRYPT_SALT_ROUNDS, JWT_EXPIRATION } from '../constants';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    this.jwtSecret = process.env.JWT_SECRET;
    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }

  private async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async register(username: string, password: string): Promise<{ token: string; userId: number }> {
    if (username.length < 3) {
      throw new BadRequestException('Username must be at least 3 characters');
    }

    const existing = await this.userRepository.findOne({ where: { username } });
    if (existing) {
      throw new BadRequestException('Username already taken');
    }

    const hashed = await this.hashPassword(password);
    const user = this.userRepository.create({ username, password: hashed });
    const saved = await this.userRepository.save(user);
    const token = jwt.sign({ userId: saved.id, username }, this.jwtSecret, { expiresIn: JWT_EXPIRATION });
    return { token, userId: saved.id };
  }

  async login(username: string, password: string): Promise<{ token: string; userId: number } | null> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.username = :username', { username })
      .getOne();

    if (!user) {
      return null;
    }

    const valid = await this.comparePassword(password, user.password);
    if (!valid) {
      return null;
    }

    const token = jwt.sign({ userId: user.id, username }, this.jwtSecret, { expiresIn: JWT_EXPIRATION });
    return { token, userId: user.id };
  }

  verifyToken(token: string): { userId: number; username: string } | null {
    try {
      return jwt.verify(token, this.jwtSecret) as { userId: number; username: string };
    } catch {
      return null;
    }
  }
}
