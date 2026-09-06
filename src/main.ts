import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join, sep } from "path";
import cookieParser from "cookie-parser";
import compression from "compression";
import { Response } from "express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Nén gzip mọi response (HTML/JS/CSS/JSON) — giảm đáng kể thời gian tải trên
  // mạng chậm, nhất là khi server đặt xa (Render Singapore) so với người dùng.
  app.use(compression());
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
  // Ảnh trong /assets gần như không đổi — cache dài hạn để trình duyệt không tải
  // lại mỗi lần; index.html/app.js cache ngắn để người dùng luôn thấy bản mới.
  app.useStaticAssets(join(process.cwd(), "public"), {
    setHeaders: (res: Response, path: string) => {
      if (path.includes(`${sep}assets${sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
      } else {
        res.setHeader("Cache-Control", "public, max-age=60");
      }
    },
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`Nề Nếp Số — máy chủ đang chạy tại port ${port} (0.0.0.0)`);
}
bootstrap();
