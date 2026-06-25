import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import type { User } from '@geveze/shared';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const doc = await this.usersService.findByEmail(email);
    if (!doc || !doc.passwordHash) return null;
    const ok = await bcrypt.compare(password, doc.passwordHash);
    if (!ok) return null;
    const { passwordHash: _ph, ...rest } = doc.toJSON() as Record<string, unknown>;
    return { ...rest, id: String(rest['_id'] ?? rest['id']) } as unknown as User;
  }

  login(user: User): { token: string; user: Pick<User, 'id' | 'name' | 'email' | 'color' | 'initials' | 'role'> } {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        color: user.color,
        initials: user.initials,
        role: user.role,
      },
    };
  }
}
