import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';
async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    configureApp(app);
    const port = Number(process.env.PORT ?? '4000');
    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
        throw new Error('PORT must be an integer between 1 and 65535.');
    }
    await app.listen(port);
}
await bootstrap();
//# sourceMappingURL=main.js.map