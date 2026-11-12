import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
export function configureApp(app) {
    app.use(helmet());
    app.setGlobalPrefix('api');
    app.enableCors({
        origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
        credentials: true,
    });
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
}
//# sourceMappingURL=configure-app.js.map