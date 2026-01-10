import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
// import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AllExceptionsFilter } from './core/filters/http-exception.filter';

async function bootstrap() {

  const app = await NestFactory.create(AppModule);
  // app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  
  app.use(helmet());
  app.enableCors(); 
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix('api');
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  const config = new DocumentBuilder()
    .setTitle('Shoppi API')
    .setDescription('Documentation de l\'API E-commerce YouShop')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3003);
  Logger.log(`🚀 Application is running on: http://localhost:3003/api`);
  Logger.log(`📑 Swagger is running on: http://localhost:3003/api/docs`);
}
bootstrap();