import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Calculator from '../views/Calculator.vue'
import Modeling from '../views/Modeling.vue'
import Results from '../views/Results.vue'
import Allocation from '../views/Allocation.vue'
import FaultTree from '../views/FaultTree.vue'
import Login from '../views/Login.vue'
import { useAuth } from '@/composables/useAuth'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/modeling', name: 'Modeling', component: Modeling },
  { path: '/calculator', name: 'Calculator', component: Calculator },
  { path: '/results', name: 'Results', component: Results },
  { path: '/allocation', name: 'Allocation', component: Allocation },
  { path: '/fault-tree', name: 'FaultTree', component: FaultTree },
  { path: '/login', name: 'Login', component: Login }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

const auth = useAuth()

router.beforeEach((to, from, next) => {
  auth.init()
  const isAuthenticated = auth.isAuthenticated.value

  if (!isAuthenticated && to.path !== '/login') {
    const query = to.fullPath && to.fullPath !== '/' ? { redirect: to.fullPath } : {}
    next({ path: '/login', query })
    return
  }

  if (isAuthenticated && to.path === '/login') {
    next({ path: '/' })
    return
  }

  next()
})

export default router
