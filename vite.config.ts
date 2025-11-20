import { fileURLToPath, URL } from 'node:url';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { createHtmlPlugin } from 'vite-plugin-html';
import { version } from './package.json';

dayjs.extend(utc);
dayjs.extend(timezone);

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        createHtmlPlugin({
            inject: {
                data: {
                    buildTime: dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss'),
                    version,
                },
            },
        }),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    css: {
        preprocessorOptions: {
            scss: {
                additionalData: `
                        @use "@/assets/style/mixins.scss" as *;
                    `,
            },
        },
    },
});
