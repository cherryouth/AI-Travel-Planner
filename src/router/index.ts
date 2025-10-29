import { createRouter, createWebHistory } from 'vue-router';

export const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
  },
  {
    path: '/planner',
    name: 'planner',
    component: () => import('../views/PlannerView.vue'),
  },
  {
    path: '/budget',
    name: 'budget',
    component: () => import('../views/BudgetView.vue'),
  },
  {
    path: '/map',
    name: 'map',
    component: () => import('../views/MapView.vue'),
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../views/ProfileView.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
