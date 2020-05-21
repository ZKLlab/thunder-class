import Vue from 'vue';
import VueRouter, { RouteConfig } from 'vue-router';
import Home from '@/views/Home.vue';
import Classroom from '@/views/Classroom.vue';

Vue.use(VueRouter);

const routes: Array<RouteConfig> = [
  {
    path: '/',
    name: 'Home',
    redirect: '/join',
  },
  {
    path: '/new',
    name: 'New',
    component: Home,
  },
  {
    path: '/join',
    name: 'Join',
    component: Home,
  },
  {
    path: '/:id',
    name: 'Classroom',
    component: Classroom,
  },
];

const router = new VueRouter({
  routes,
});

export default router;
