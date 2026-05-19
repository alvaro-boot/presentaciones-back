import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UserRole } from '../common/enums';
import { User } from '../entities/user.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersRepo.findOne({ where: { email } });
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? user : null;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    return this.tokenResponse(user);
  }

  tokenResponse(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async seedAdmin(): Promise<void> {
    const email = this.config.get<string>('ADMIN_EMAIL', 'admin@cootravir.com');
    const exists = await this.usersRepo.findOne({ where: { email } });
    if (exists) return;

    const password = this.config.get<string>('ADMIN_PASSWORD', 'Admin123!');
    const hash = await bcrypt.hash(password, 10);
    const admin = this.usersRepo.create({
      email,
      passwordHash: hash,
      name: this.config.get<string>('ADMIN_NAME', 'Administrador'),
      role: UserRole.ADMIN,
    });
    await this.usersRepo.save(admin);
  }
}
