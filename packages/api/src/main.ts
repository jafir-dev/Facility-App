import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { SecurityConfig } from './config/security.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security configuration
  const securityConfig = app.get(SecurityConfig);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Security headers
  app.use((req, res, next) => {
    const headers = securityConfig.securityHeaders;
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    next();
  });

  // CORS configuration
  app.enableCors({
    origin: securityConfig.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Rate limiting
  // Note: You'll need to install @nestjs/throttler
  // app.use(throttlerMiddleware);

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Zariya Facility App API')
    .setDescription('API for Zariya Facility Management Application')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Start the application
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
}

bootstrap().catch(console.error);