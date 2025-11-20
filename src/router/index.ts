import { createRouter, createWebHashHistory } from 'vue-router';

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        { path: '/', component: () => import('@/views/Home/Index.vue') },
        { path: '/test', component: () => import('@/views/Test/Index.vue') },
    ],
});

export default router;
