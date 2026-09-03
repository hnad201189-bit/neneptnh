import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Phục vụ giao diện thật cùng gốc với API (http://localhost:3000) — tránh hẳn
  // vấn đề CORS/mixed-content khi gọi từ một trang HTTPS công khai vào localhost.
  app.useStaticAssets(join(process.cwd(), "public"));

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`Nề Nếp Số — máy chủ đang chạy tại port ${port} (0.0.0.0)`);
}
bootstrap();
