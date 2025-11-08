/**
 * Example: Redis Adapter for Horizontal Scaling
 * 
 * This file shows how to configure Socket.IO with Redis adapter for horizontal scaling
 * across multiple server instances. This is optional and only needed if you plan to
 * run multiple backend instances behind a load balancer.
 * 
 * INSTALLATION:
 * pnpm add @socket.io/redis-adapter ioredis
 * 
 * ENVIRONMENT VARIABLE:
 * REDIS_URL=redis://localhost:6379
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.FRONTEND_URL || '*',
    ],
    credentials: true,
  });

  // Global validation pipe
  app.useValidationPipe(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  );

  /**
   * OPTIONAL: Configure Redis Adapter for Socket.IO
   * Uncomment this section if you want to enable horizontal scaling
   */
  /*
  if (process.env.REDIS_URL) {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    await pubClient.connect();
    await subClient.connect();

    // Get the Socket.IO server instance from RealtimeGateway
    const httpServer = app.getHttpServer();
    const io = httpServer?.io;

    if (io) {
      io.adapter(createAdapter(pubClient, subClient));
      console.log('✅ Redis adapter enabled for Socket.IO');
    } else {
      console.warn('⚠️  Socket.IO server not found, Redis adapter not configured');
    }
  } else {
    console.log('ℹ️  REDIS_URL not configured, using default Socket.IO adapter');
  }
  */

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`🔌 WebSocket available at: ws://localhost:${port}/realtime`);
}

bootstrap();
