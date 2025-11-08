import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ 
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'], 
    credentials: true,
    allowedHeaders: 'Content-Type,Authorization'
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}
bootstrap();
