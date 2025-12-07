import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import ProjectsView from '../views/ProjectsView.vue'
import StatisticsView from '../views/StatisticsView.vue'

const routes = [
  {
    path: '/',
    name: 'Projects',
    component: ProjectsView
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: StatisticsView
  }
]

// Sử dụng hash mode cho GitHub Pages để tránh vấn đề với routing
// Hoặc có thể dùng history mode với base path
const router = createRouter({
  history: process.env.NODE_ENV === 'production' 
    ? createWebHashHistory() 
    : createWebHistory(),
  routes
})

export default router

