import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Calculator from '../views/Calculator.vue'
import Results from '../views/Results.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/calculator', name: 'Calculator', component: Calculator },
  { path: '/results', name: 'Results', component: Results }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router