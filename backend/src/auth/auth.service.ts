import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findOneByEmail(
      registerDto.email,
    );
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      // agencyId is never accepted from the client; joining an existing agency
      // must go through a signed invite flow (out of scope). Public register can
      // only create a fresh agency (via agencyName) or a user with no agency.
      let agencyId: string | undefined;

      if (registerDto.agencyName) {
        const agency = await tx.agency.create({
          data: {
            name: registerDto.agencyName,
            contactEmail: registerDto.email,
            subscriptionTier: 'STARTER',
          },
        });
        agencyId = agency.id;
      }

      const user = await tx.user.create({
        data: {
          email: registerDto.email,
          password: hashedPassword,
          name: registerDto.name,
          role:
            registerDto.role || (registerDto.agencyName ? 'OWNER' : 'AGENT'),
          agencyId: agencyId,
        },
      });

      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        agencyId: user.agencyId,
      };
      return {
        access_token: await this.jwtService.signAsync(payload),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          agencyId: user.agencyId,
        },
      };
    });
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findOneByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      agencyId: user.agencyId,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        agencyId: user.agencyId,
      },
    };
  }
}
