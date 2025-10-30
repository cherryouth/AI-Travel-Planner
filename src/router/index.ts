import { createRouter, createWebHistory } from 'vue-router';
import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { useAuthStore } from '../stores/auth';

export const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/planner',
    name: 'planner',
    component: () => import('../views/PlannerView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/budget',
    name: 'budget',
    component: () => import('../views/BudgetView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/map',
    name: 'map',
    component: () => import('../views/MapView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../views/ProfileView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/auth',
    redirect: '/auth/login',
    meta: { requiresAuth: false },
  },
  {
    path: '/auth/login',
    name: 'auth-login',
    component: () => import('../views/AuthView.vue'),
    meta: { requiresAuth: false },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

async function handleAuthGuard(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext,
) {
  const authStore = useAuthStore();
  await authStore.init();

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth !== false);
  const isAuthenticated = authStore.isAuthenticated;

  if (!requiresAuth) {
    if (to.name === 'auth-login' && isAuthenticated) {
      return next({ path: '/' });
    }
    return next();
  }

  if (!isAuthenticated) {
    const redirectQuery =
      to.fullPath && to.fullPath !== '/' ? { redirect: to.fullPath } : undefined;

    if (redirectQuery) {
      return next({ name: 'auth-login', query: redirectQuery });
    }

    return next({ name: 'auth-login' });
  }

  return next();
}

router.beforeEach(handleAuthGuard);

export default router;
