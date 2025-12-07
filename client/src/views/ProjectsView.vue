<template>
  <div class="projects-view">
    <div class="header-actions">
      <h2>Quản lý Dự án</h2>
      <div class="actions">
        <button @click="showCreateModal = true" class="btn btn-primary">
          + Tạo dự án mới
        </button>
        <button @click="loadTemplate" class="btn btn-secondary">
          📋 Tải template
        </button>
      </div>
    </div>

    <!-- Project List -->
    <div class="project-list" v-if="!selectedProject">
      <div 
        v-for="project in projects" 
        :key="project.id"
        class="project-card"
        @click="selectProject(project)"
      >
        <div class="project-info">
          <h3>{{ project.name }}</h3>
          <p class="project-meta">
            {{ formatDate(project.createdAt) }} • 
            {{ getTotalItems(project) }} mục
          </p>
        </div>
        <div class="project-actions">
          <button 
            @click.stop="exportProject(project.id)"
            class="btn-icon"
            title="Xuất Excel"
          >
            📊
          </button>
          <button 
            @click.stop="deleteProject(project.id)"
            class="btn-icon btn-danger"
            title="Xóa"
          >
            🗑️
          </button>
        </div>
      </div>
      <div v-if="projects.length === 0" class="empty-state">
        <p>Chưa có dự án nào. Hãy tạo dự án mới để bắt đầu!</p>
      </div>
    </div>

    <!-- Excel-like Grid with Tabs -->
    <div class="grid-container" v-if="selectedProject">
      <div class="grid-header">
        <h3>{{ selectedProject.name }}</h3>
        <div class="grid-actions">
          <button @click="saveProject" class="btn btn-primary">💾 Lưu</button>
          <button @click="addRow" class="btn btn-secondary">+ Thêm dòng</button>
          <button @click="deleteSelectedRows" class="btn btn-danger">🗑️ Xóa dòng</button>
          <button @click="exportCurrentProject" class="btn btn-success">📊 Xuất Excel</button>
          <button @click="backToList" class="btn btn-secondary">← Quay lại</button>
        </div>
      </div>
      
      <!-- Sheet Tabs -->
      <div class="sheet-tabs">
        <button
          v-for="sheetName in sheetNames"
          :key="sheetName"
          @click="selectSheet(sheetName)"
          :class="['tab-button', { active: currentSheet === sheetName }]"
        >
          {{ sheetName }}
        </button>
      </div>
      
      <!-- Grid -->
      <div class="ag-theme-alpine grid-wrapper">
        <ag-grid-vue
          ref="gridRef"
          :columnDefs="currentColumnDefs"
          :rowData="currentGridData"
          :defaultColDef="defaultColDef"
          :enableRangeSelection="true"
          :enableFillHandle="true"
          :enableRangeHandle="true"
          :suppressRowClickSelection="true"
          :rowSelection="'multiple'"
          @cell-value-changed="onCellValueChanged"
          @selection-changed="onSelectionChanged"
          style="height: 600px; width: 100%;"
        />
      </div>
    </div>

    <!-- Create Project Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click="showCreateModal = false">
      <div class="modal-content" @click.stop>
        <h3>Tạo dự án mới</h3>
        <input
          v-model="newProjectName"
          type="text"
          placeholder="Tên dự án"
          class="input-field"
          @keyup.enter="createProject"
        />
        <div class="modal-actions">
          <button @click="createProject" class="btn btn-primary">Tạo</button>
          <button @click="showCreateModal = false" class="btn btn-secondary">Hủy</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed, watch } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'
import api from '../services/api'
import * as XLSX from 'xlsx'

export default {
  name: 'ProjectsView',
  components: {
    AgGridVue
  },
  setup() {
    const projects = ref([])
    const selectedProject = ref(null)
    const showCreateModal = ref(false)
    const newProjectName = ref('')
    const gridRef = ref(null)
    const currentSheet = ref('Vật liệu')
    const selectedRows = ref([])

    // Sheet names matching Excel structure
    const sheetNames = ['Vật liệu', 'Nhân công', 'Máy thi công', 'Tổng hợp']

    // Column definitions for each sheet
    const getColumnDefs = (sheetName) => {
      const baseNumericDef = {
      type: 'numericColumn',
      filter: 'agNumberColumnFilter',
      valueParser: (params) => {
        const value = params.newValue
        if (value === null || value === undefined || value === '') {
          return null
        }
        return parseFloat(value)
        },
        valueFormatter: (params) => {
          if (params.value !== null && params.value !== undefined && params.value !== '') {
            return new Intl.NumberFormat('vi-VN').format(params.value)
          }
          return ''
        }
      }

      switch (sheetName) {
        case 'Vật liệu':
          return [
            { field: 'stt', headerName: 'STT', width: 80, editable: false, valueGetter: (params) => params.node.rowIndex + 1 },
            { field: 'maHieu', headerName: 'Mã hiệu', width: 120, editable: true },
            { field: 'ttVatTu', headerName: 'TT Vật tư', width: 100, editable: true, ...baseNumericDef },
            { field: 'vatLieuPhu', headerName: 'Vật liệu phụ', width: 120, editable: true, ...baseNumericDef },
            { field: 'tenVatTu', headerName: 'Tên vật tư', width: 250, editable: true },
            { field: 'donVi', headerName: 'Đơn vị', width: 100, editable: true },
            { field: 'heSoCongTac', headerName: 'Hệ số công tác', width: 130, editable: true, ...baseNumericDef },
            { field: 'nguonMua', headerName: 'Nguồn mua', width: 180, editable: true },
            { field: 'khoiLuong', headerName: 'Khối lượng', width: 120, editable: true, ...baseNumericDef },
            { field: 'giaGoc', headerName: 'Giá gốc', width: 150, editable: true, ...baseNumericDef },
            { 
              field: 'thanhTienGiaGoc', 
              headerName: 'Thành tiền giá gốc', 
        width: 180,
        editable: false,
        valueGetter: (params) => {
                const kl = parseFloat(params.data?.khoiLuong) || 0
                const gia = parseFloat(params.data?.giaGoc) || 0
                return kl * gia
        },
        valueFormatter: (params) => {
          if (params.value) {
            return new Intl.NumberFormat('vi-VN').format(params.value)
          }
          return ''
        },
        cellStyle: { fontWeight: 'bold' }
      },
            { field: 'giaThongBao', headerName: 'Giá thông báo', width: 150, editable: true, ...baseNumericDef },
            { 
              field: 'thanhTienGiaTB', 
              headerName: 'Thành tiền giá TB', 
              width: 180, 
              editable: false,
              valueGetter: (params) => {
                const kl = parseFloat(params.data?.khoiLuong) || 0
                const gia = parseFloat(params.data?.giaThongBao) || 0
                return kl * gia
              },
              valueFormatter: (params) => {
                if (params.value) {
                  return new Intl.NumberFormat('vi-VN').format(params.value)
                }
                return ''
              },
              cellStyle: { fontWeight: 'bold' }
            }
          ]
        
        case 'Nhân công':
          return [
            { field: 'stt', headerName: 'STT', width: 80, editable: false, valueGetter: (params) => params.node.rowIndex + 1 },
            { field: 'maHieu', headerName: 'Mã hiệu', width: 120, editable: true },
            { field: 'ttNhanCong', headerName: 'TT Nhân công', width: 130, editable: true, ...baseNumericDef },
            { field: 'tenNhanCong', headerName: 'Tên nhân công', width: 250, editable: true },
            { field: 'donVi', headerName: 'Đơn vị', width: 100, editable: true },
            { field: 'heSoCongTac', headerName: 'Hệ số công tác', width: 130, editable: true, ...baseNumericDef },
            { field: 'khoiLuong', headerName: 'Khối lượng', width: 120, editable: true, ...baseNumericDef },
            { field: 'donGia', headerName: 'Đơn giá', width: 150, editable: true, ...baseNumericDef },
            { 
              field: 'thanhTien', 
              headerName: 'Thành tiền', 
              width: 180, 
              editable: false,
              valueGetter: (params) => {
                const kl = parseFloat(params.data?.khoiLuong) || 0
                const gia = parseFloat(params.data?.donGia) || 0
                return kl * gia
              },
              valueFormatter: (params) => {
                if (params.value) {
                  return new Intl.NumberFormat('vi-VN').format(params.value)
                }
                return ''
              },
              cellStyle: { fontWeight: 'bold' }
            }
          ]
        
        case 'Máy thi công':
          return [
            { field: 'stt', headerName: 'STT', width: 80, editable: false, valueGetter: (params) => params.node.rowIndex + 1 },
            { field: 'maHieu', headerName: 'Mã hiệu', width: 120, editable: true },
            { field: 'ttMay', headerName: 'TT Máy', width: 100, editable: true, ...baseNumericDef },
            { field: 'tenMay', headerName: 'Tên máy', width: 250, editable: true },
            { field: 'donVi', headerName: 'Đơn vị', width: 100, editable: true },
            { field: 'heSoCongTac', headerName: 'Hệ số công tác', width: 130, editable: true, ...baseNumericDef },
            { field: 'khoiLuong', headerName: 'Khối lượng', width: 120, editable: true, ...baseNumericDef },
            { field: 'donGia', headerName: 'Đơn giá', width: 150, editable: true, ...baseNumericDef },
            { 
              field: 'thanhTien', 
              headerName: 'Thành tiền', 
              width: 180, 
              editable: false,
              valueGetter: (params) => {
                const kl = parseFloat(params.data?.khoiLuong) || 0
                const gia = parseFloat(params.data?.donGia) || 0
                return kl * gia
              },
              valueFormatter: (params) => {
                if (params.value) {
                  return new Intl.NumberFormat('vi-VN').format(params.value)
                }
                return ''
              },
              cellStyle: { fontWeight: 'bold' }
            }
          ]
        
        case 'Tổng hợp':
          return [
            { field: 'stt', headerName: 'STT', width: 100, editable: true },
            { field: 'noiDungChiPhi', headerName: 'NỘI DUNG CHI PHÍ', width: 300, editable: true },
            { field: 'cachTinh', headerName: 'CÁCH TÍNH', width: 200, editable: true },
            { 
              field: 'giaTri', 
              headerName: 'GIÁ TRỊ', 
              width: 200, 
              editable: true,
              ...baseNumericDef
            },
            { field: 'kyHieu', headerName: 'KÝ HIỆU', width: 120, editable: true }
          ]
        
        default:
          return []
      }
    }

    const currentColumnDefs = computed(() => getColumnDefs(currentSheet.value))

    const currentGridData = computed(() => {
      if (!selectedProject.value?.sheets?.[currentSheet.value]) {
        return []
      }
      return selectedProject.value.sheets[currentSheet.value].data || []
    })

    const defaultColDef = {
      resizable: true,
      sortable: true,
      filter: true,
      editable: true
    }

    const getTotalItems = (project) => {
      if (!project.sheets) return 0
      return Object.values(project.sheets).reduce((sum, sheet) => {
        return sum + (sheet.data?.length || 0)
      }, 0)
    }

    const loadProjects = async () => {
      try {
        const response = await api.getProjects()
        projects.value = response.data
      } catch (error) {
        console.error('Error loading projects:', error)
        alert('Lỗi khi tải danh sách dự án')
      }
    }

    const selectProject = async (project) => {
      try {
        const response = await api.getProject(project.id)
        selectedProject.value = response.data
        
        // Initialize sheets if they don't exist
        if (!selectedProject.value.sheets) {
          selectedProject.value.sheets = {
            'Vật liệu': { headers: [], data: [] },
            'Nhân công': { headers: [], data: [] },
            'Máy thi công': { headers: [], data: [] },
            'Tổng hợp': { headers: [], data: [] }
          }
        }
        
        // Ensure all sheets exist
        sheetNames.forEach(sheetName => {
          if (!selectedProject.value.sheets[sheetName]) {
            selectedProject.value.sheets[sheetName] = { headers: [], data: [] }
          }
        })
        
        currentSheet.value = 'Vật liệu'
      } catch (error) {
        console.error('Error loading project:', error)
        alert('Lỗi khi tải dự án')
      }
    }

    const selectSheet = (sheetName) => {
      currentSheet.value = sheetName
      selectedRows.value = []
    }

    const saveProject = async () => {
      if (!selectedProject.value) return
      
      try {
        await api.updateProject(selectedProject.value.id, {
          name: selectedProject.value.name,
          sheets: selectedProject.value.sheets
        })
        alert('Đã lưu thành công!')
      } catch (error) {
        console.error('Error saving project:', error)
        alert('Lỗi khi lưu dự án')
      }
    }

    const createProject = async () => {
      if (!newProjectName.value.trim()) {
        alert('Vui lòng nhập tên dự án')
        return
      }
      
      try {
        const response = await api.createProject({
          name: newProjectName.value,
          sheets: {
            'Vật liệu': { headers: [], data: [] },
            'Nhân công': { headers: [], data: [] },
            'Máy thi công': { headers: [], data: [] },
            'Tổng hợp': { headers: [], data: [] }
          }
        })
        projects.value.push(response.data)
        showCreateModal.value = false
        newProjectName.value = ''
        selectProject(response.data)
      } catch (error) {
        console.error('Error creating project:', error)
        alert('Lỗi khi tạo dự án')
      }
    }

    const deleteProject = async (id) => {
      if (!confirm('Bạn có chắc muốn xóa dự án này?')) return
      
      try {
        await api.deleteProject(id)
        projects.value = projects.value.filter(p => p.id !== id)
        if (selectedProject.value?.id === id) {
          selectedProject.value = null
        }
      } catch (error) {
        console.error('Error deleting project:', error)
        alert('Lỗi khi xóa dự án')
      }
    }

    const addRow = () => {
      if (!selectedProject.value?.sheets?.[currentSheet.value]) {
        return
      }
      
      const emptyRow = getEmptyRowForSheet(currentSheet.value)
      selectedProject.value.sheets[currentSheet.value].data.push(emptyRow)
    }

    const getEmptyRowForSheet = (sheetName) => {
      switch (sheetName) {
        case 'Vật liệu':
          return {
            stt: '',
            maHieu: '',
            ttVatTu: '',
            vatLieuPhu: '',
            tenVatTu: '',
            donVi: '',
            heSoCongTac: '',
            nguonMua: '',
            khoiLuong: '',
            giaGoc: '',
            thanhTienGiaGoc: '',
            giaThongBao: '',
            thanhTienGiaTB: ''
          }
        case 'Nhân công':
          return {
            stt: '',
            maHieu: '',
            ttNhanCong: '',
            tenNhanCong: '',
            donVi: '',
            heSoCongTac: '',
            khoiLuong: '',
            donGia: '',
            thanhTien: ''
          }
        case 'Máy thi công':
          return {
            stt: '',
            maHieu: '',
            ttMay: '',
            tenMay: '',
            donVi: '',
            heSoCongTac: '',
            khoiLuong: '',
            donGia: '',
            thanhTien: ''
          }
        case 'Tổng hợp':
          return {
            stt: '',
            noiDungChiPhi: '',
            cachTinh: '',
            giaTri: '',
            kyHieu: ''
          }
        default:
          return {}
      }
    }

    const deleteSelectedRows = () => {
      if (!gridRef.value || selectedRows.value.length === 0) {
        alert('Vui lòng chọn dòng cần xóa')
        return
      }
      
      if (!confirm(`Bạn có chắc muốn xóa ${selectedRows.value.length} dòng đã chọn?`)) {
        return
      }
      
      const selectedIndexes = selectedRows.value.map(row => 
        selectedProject.value.sheets[currentSheet.value].data.indexOf(row)
      ).sort((a, b) => b - a) // Sort descending to delete from end
      
      selectedIndexes.forEach(index => {
        selectedProject.value.sheets[currentSheet.value].data.splice(index, 1)
      })
      
      selectedRows.value = []
    }

    const backToList = () => {
      selectedProject.value = null
      currentSheet.value = 'Vật liệu'
      selectedRows.value = []
    }

    const onCellValueChanged = (params) => {
      // Auto-calculate totals
      if (currentSheet.value === 'Vật liệu') {
        if (params.colDef.field === 'khoiLuong' || params.colDef.field === 'giaGoc') {
          params.api.refreshCells({
            rowNodes: [params.node],
            columns: ['thanhTienGiaGoc']
          })
        }
        if (params.colDef.field === 'khoiLuong' || params.colDef.field === 'giaThongBao') {
          params.api.refreshCells({
            rowNodes: [params.node],
            columns: ['thanhTienGiaTB']
          })
        }
      } else if (currentSheet.value === 'Nhân công' || currentSheet.value === 'Máy thi công') {
        if (params.colDef.field === 'khoiLuong' || params.colDef.field === 'donGia') {
        params.api.refreshCells({
          rowNodes: [params.node],
            columns: ['thanhTien']
          })
        }
      }
    }

    const onSelectionChanged = () => {
      if (gridRef.value) {
        selectedRows.value = gridRef.value.api.getSelectedRows()
      }
    }

    const exportCurrentProject = async () => {
      if (!selectedProject.value) return
      await exportProject(selectedProject.value.id)
    }

    const exportProject = async (projectId) => {
      try {
        const response = await api.exportToExcel(projectId)
        const blob = new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        
        const project = projects.value.find(p => p.id === projectId)
        link.download = `${project?.name || 'project'}_${Date.now()}.xlsx`
        link.click()
        window.URL.revokeObjectURL(url)
      } catch (error) {
        console.error('Error exporting project:', error)
        alert('Lỗi khi xuất file Excel')
      }
    }

    const loadTemplate = () => {
      const templateData = {
        'Vật liệu': [
          { maHieu: 'V00066', ttVatTu: 388, vatLieuPhu: 0, tenVatTu: 'Băng dính', donVi: 'cuộn', khoiLuong: 4.5, giaGoc: 10000 },
          { maHieu: 'V26286', ttVatTu: 1907, vatLieuPhu: 0, tenVatTu: 'Bể chứa nước Inox', donVi: 'bể', khoiLuong: 1, giaGoc: 2050000 }
        ],
        'Nhân công': [
          { maHieu: 'N0006', ttNhanCong: 1, tenNhanCong: 'Nhân công bậc 3.5/7', donVi: 'công', khoiLuong: 100, donGia: 250000 }
        ],
        'Máy thi công': [
          { maHieu: 'M0001', ttMay: 1, tenMay: 'Máy trộn bê tông', donVi: 'ca', khoiLuong: 5, donGia: 500000 }
        ]
      }
      
      const wb = XLSX.utils.book_new()
      Object.keys(templateData).forEach(sheetName => {
        const ws = XLSX.utils.json_to_sheet(templateData[sheetName])
        XLSX.utils.book_append_sheet(wb, ws, sheetName)
      })
      
      XLSX.writeFile(wb, 'template_du_toan.xlsx')
    }

    const formatDate = (dateString) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleDateString('vi-VN')
    }

    onMounted(() => {
      loadProjects()
    })

    return {
      projects,
      selectedProject,
      showCreateModal,
      newProjectName,
      gridRef,
      currentSheet,
      sheetNames,
      currentColumnDefs,
      currentGridData,
      defaultColDef,
      selectedRows,
      getTotalItems,
      selectProject,
      selectSheet,
      saveProject,
      createProject,
      deleteProject,
      addRow,
      deleteSelectedRows,
      backToList,
      onCellValueChanged,
      onSelectionChanged,
      exportCurrentProject,
      exportProject,
      loadTemplate,
      formatDate
    }
  }
}
</script>

<style scoped>
.projects-view {
  background: white;
  border-radius: 10px;
  padding: 2rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header-actions h2 {
  color: #333;
}

.actions {
  display: flex;
  gap: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover {
  background: #218838;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

.project-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.project-card {
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-card:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.project-info h3 {
  color: #333;
  margin-bottom: 0.5rem;
}

.project-meta {
  color: #6c757d;
  font-size: 0.9rem;
}

.project-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 5px;
  transition: background 0.3s;
}

.btn-icon:hover {
  background: rgba(0,0,0,0.1);
}

.btn-danger:hover {
  background: rgba(220, 53, 69, 0.1);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #6c757d;
}

.grid-container {
  margin-top: 2rem;
}

.grid-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.grid-header h3 {
  color: #333;
}

.grid-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.sheet-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 2px solid #dee2e6;
}

.tab-button {
  padding: 0.75rem 1.5rem;
  border: none;
  background: transparent;
  color: #6c757d;
  cursor: pointer;
  font-weight: 500;
  border-bottom: 3px solid transparent;
  transition: all 0.3s;
  margin-bottom: -2px;
}

.tab-button:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.tab-button.active {
  color: #667eea;
  border-bottom-color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.grid-wrapper {
  border: 1px solid #dee2e6;
  border-radius: 5px;
  overflow: hidden;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  min-width: 400px;
}

.modal-content h3 {
  margin-bottom: 1.5rem;
  color: #333;
}

.input-field {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #dee2e6;
  border-radius: 5px;
  font-size: 1rem;
  margin-bottom: 1.5rem;
}

.input-field:focus {
  outline: none;
  border-color: #667eea;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}
</style>
