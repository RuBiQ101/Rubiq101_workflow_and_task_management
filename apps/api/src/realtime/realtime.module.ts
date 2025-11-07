import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev_jwt_secret_change_me',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [RealtimeGateway, RealtimeService, PrismaService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
