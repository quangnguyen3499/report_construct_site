import axios from 'axios'
import mockApi from './mockData'

// Check if we're in test mode (no backend)
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true' || 
                      import.meta.env.MODE === 'test' ||
                      !import.meta.env.VITE_API_BASE_URL

// API base URL - thay đổi khi deploy backend
// Development: '/api' (proxy qua vite)
// Production: 'https://your-backend-url.com/api'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Use mock data if in test mode, otherwise use real API
const apiService = USE_MOCK_DATA ? mockApi : {
  // Projects
  getProjects() {
    return api.get('/projects')
  },
  
  getProject(id) {
    return api.get(`/projects/${id}`)
  },
  
  createProject(data) {
    return api.post('/projects', data)
  },
  
  updateProject(id, data) {
    return api.put(`/projects/${id}`, data)
  },
  
  deleteProject(id) {
    return api.delete(`/projects/${id}`)
  },
  
  // Statistics
  getStatistics() {
    return api.get('/statistics')
  },
  
  // Export
  exportToExcel(projectId) {
    return api.post('/export', { projectId }, {
      responseType: 'blob'
    })
  },

  // Load master data
  getMasterData() {
    return api.get('/master-data')
  },
}

export default apiService

