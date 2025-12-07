<template>
  <div class="statistics-view">
    <div class="header">
      <h2>Thống kê Dự án</h2>
      <button @click="loadStatistics" class="btn btn-secondary">🔄 Làm mới</button>
    </div>

    <div v-if="loading" class="loading">Đang tải...</div>

    <div v-else-if="statistics">
      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="summary-card">
          <div class="card-icon">📊</div>
          <div class="card-content">
            <h3>{{ statistics.totalProjects }}</h3>
            <p>Tổng số dự án</p>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon">💰</div>
          <div class="card-content">
            <h3>{{ formatCurrency(totalAllProjects) }}</h3>
            <p>Tổng chi phí tất cả dự án</p>
          </div>
        </div>
      </div>

      <!-- Projects Statistics -->
      <div class="projects-stats">
        <div 
          v-for="project in statistics.projects" 
          :key="project.id"
          class="project-stat-card"
        >
          <div class="project-stat-header">
            <h3>{{ project.name }}</h3>
            <div class="project-stat-badge">
              {{ project.itemCount }} mục
            </div>
          </div>

          <div class="project-total">
            <span class="label">Tổng chi phí:</span>
            <span class="value">{{ formatCurrency(project.totalCost) }}</span>
          </div>

          <!-- Materials Breakdown -->
          <div class="materials-section">
            <h4>Thành phần vật liệu:</h4>
            <div class="materials-list">
              <div 
                v-for="material in project.materials" 
                :key="material.name"
                class="material-item"
              >
                <div class="material-info">
                  <span class="material-name">{{ material.name }}</span>
                  <span class="material-quantity">
                    {{ formatNumber(material.totalQuantity) }} 
                    <span class="unit">(đơn vị)</span>
                  </span>
                </div>
                <div class="material-cost">
                  {{ formatCurrency(material.totalCost) }}
                </div>
              </div>
            </div>
            <div v-if="project.materials.length === 0" class="no-materials">
              Chưa có dữ liệu vật liệu
            </div>
          </div>
        </div>

        <div v-if="statistics.projects.length === 0" class="empty-state">
          <p>Chưa có dự án nào để thống kê</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import api from '../services/api'

export default {
  name: 'StatisticsView',
  setup() {
    const statistics = ref(null)
    const loading = ref(true)

    const totalAllProjects = computed(() => {
      if (!statistics.value) return 0
      return statistics.value.projects.reduce((sum, project) => {
        return sum + (project.totalCost || 0)
      }, 0)
    })

    const loadStatistics = async () => {
      loading.value = true
      try {
        const response = await api.getStatistics()
        statistics.value = response.data
      } catch (error) {
        console.error('Error loading statistics:', error)
        alert('Lỗi khi tải thống kê')
      } finally {
        loading.value = false
      }
    }

    const formatCurrency = (value) => {
      if (!value && value !== 0) return '0 ₫'
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
      }).format(value)
    }

    const formatNumber = (value) => {
      if (!value && value !== 0) return '0'
      return new Intl.NumberFormat('vi-VN').format(value)
    }

    onMounted(() => {
      loadStatistics()
    })

    return {
      statistics,
      loading,
      totalAllProjects,
      loadStatistics,
      formatCurrency,
      formatNumber
    }
  }
}
</script>

<style scoped>
.statistics-view {
  background: white;
  border-radius: 10px;
  padding: 2rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header h2 {
  color: #333;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: #6c757d;
  font-size: 1.2rem;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.summary-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.card-icon {
  font-size: 3rem;
}

.card-content h3 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.card-content p {
  opacity: 0.9;
  font-size: 0.9rem;
}

.projects-stats {
  display: grid;
  gap: 2rem;
}

.project-stat-card {
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 10px;
  padding: 2rem;
  transition: all 0.3s;
}

.project-stat-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.project-stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #dee2e6;
}

.project-stat-header h3 {
  color: #333;
  font-size: 1.5rem;
}

.project-stat-badge {
  background: #667eea;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
}

.project-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  border: 2px solid #667eea;
}

.project-total .label {
  font-size: 1.1rem;
  color: #6c757d;
  font-weight: 500;
}

.project-total .value {
  font-size: 1.5rem;
  color: #667eea;
  font-weight: bold;
}

.materials-section {
  margin-top: 1.5rem;
}

.materials-section h4 {
  color: #333;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.materials-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.material-item {
  background: white;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #dee2e6;
  transition: all 0.3s;
}

.material-item:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.material-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.material-name {
  font-weight: 600;
  color: #333;
  font-size: 1rem;
}

.material-quantity {
  color: #6c757d;
  font-size: 0.9rem;
}

.material-quantity .unit {
  font-size: 0.8rem;
  opacity: 0.7;
}

.material-cost {
  font-size: 1.1rem;
  font-weight: bold;
  color: #28a745;
}

.no-materials {
  text-align: center;
  padding: 2rem;
  color: #6c757d;
  background: white;
  border-radius: 8px;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #6c757d;
}
</style>

