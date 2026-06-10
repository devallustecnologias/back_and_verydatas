import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  // transform: true (coerção de tipos). whitelist REMOVIDO: vários DTOs ainda não
  // têm decorators class-validator e o whitelist descartava seus campos (ex. amount
  // no estorno -> 500). Reativar whitelist só após decorar todos os DTOs.
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const config = new DocumentBuilder()
    .setTitle('Veridata API')
    .setDescription('The Veridata API description')
    .setVersion('0.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET obrigatorio em producao');
  }

  await app.listen(process.env.PORT ?? 8007);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
