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
      <div v-for="project in projects" :key="project.id" class="project-card" @click="selectProject(project)">
        <div class="project-info">
          <h3>{{ project.name }}</h3>
          <p class="project-meta">
            {{ formatDate(project.createdAt) }} •
            {{ getTotalItems(project) }} mục
          </p>
        </div>
        <div class="project-actions">
          <button @click.stop="exportProject(project.id)" class="btn-icon" title="Xuất Excel">
            📊
          </button>
          <button @click.stop="deleteProject(project.id)" class="btn-icon btn-danger" title="Xóa">
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
        <button v-for="sheetName in sheetNames" :key="sheetName" @click="selectSheet(sheetName)"
          :class="['tab-button', { active: currentSheet === sheetName }]">
          {{ sheetName }}
        </button>
        <button @click="showAddSheetModal = true" class="tab-button tab-add" title="Thêm sheet mới">
          +
        </button>
      </div>

      <!-- Jspreadsheet Component -->
      <div class="spreadsheet-wrapper">
        <Spreadsheet ref="spreadsheetRef" :toolbar="toolbarConfig">
          <Worksheet ref="worksheetRef" :data="spreadsheetData" :columns="spreadsheetColumns"
            :minDimensions="spreadsheetMinDimensions" :allowInsertRow="allowInsertRow"
            :allowInsertColumn="allowInsertColumn" :allowDeleteRow="allowDeleteRow"
            :allowDeleteColumn="allowDeleteColumn" :tableOverflow="true" :tableWidth="'100%'" :tableHeight="'600px'"
            :columnSorting="columnSorting" :columnResize="columnResize" :rowDrag="rowDrag"
            :selectionCopy="selectionCopy" :filters="filters" :contextMenu="contextMenu" :editing="editing"
            :defaultColAlign="defaultColAlign" :defaultColFormat="defaultColFormat" :mergeCells="mergeCells"
            :nestedHeaders="nestedHeaders" :pagination="pagination" />
        </Spreadsheet>
      </div>
    </div>

    <!-- Create Project Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click="showCreateModal = false">
      <div class="modal-content" @click.stop>
        <h3>Tạo dự án mới</h3>
        <input v-model="newProjectName" type="text" placeholder="Tên dự án" class="input-field"
          @keyup.enter="createProject" />
        <div class="modal-actions">
          <button @click="createProject" class="btn btn-primary">Tạo</button>
          <button @click="showCreateModal = false" class="btn btn-secondary">Hủy</button>
        </div>
      </div>
    </div>

    <!-- Add Sheet Modal -->
    <div v-if="showAddSheetModal" class="modal-overlay" @click="showAddSheetModal = false">
      <div class="modal-content" @click.stop>
        <h3>Thêm Sheet Mới</h3>
        <input v-model="newSheetName" type="text" placeholder="Tên sheet (ví dụ: Ghi chú, Chi tiết...)"
          class="input-field" @keyup.enter="addSheet" />
        <div class="modal-actions">
          <button @click="addSheet" class="btn btn-primary">Thêm</button>
          <button @click="showAddSheetModal = false" class="btn btn-secondary">Hủy</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { Spreadsheet, Worksheet } from '@jspreadsheet-ce/vue'
import api from '../services/api'
import * as XLSX from 'xlsx'

export default {
  name: 'ProjectsView',
  components: {
    Spreadsheet,
    Worksheet
  },
  setup() {
    const projects = ref([])
    const selectedProject = ref(null)
    const showCreateModal = ref(false)
    const newProjectName = ref('')
    const showAddSheetModal = ref(false)
    const newSheetName = ref('')
    const spreadsheetRef = ref(null)
    const worksheetRef = ref(null)
    const currentSheet = ref('Vật liệu')

    // Sheet names matching Excel structure
    const sheetNames = ref(['Vật liệu', 'Nhân công', 'Định Mức Xây Dựng', 'Máy thi công', 'Tổng hợp'])

    // Helper function to get the jspreadsheet instance
    const getJspreadsheetInstance = () => {
      if (!worksheetRef.value) {
        console.error('worksheetRef not available')
        return null
      }

      const component = worksheetRef.value

      // Try multiple paths to find the jspreadsheet instance
      if (component && component.jexcel) {
        return component.jexcel
      }

      if (component && component.$el && component.$el.jexcel) {
        return component.$el.jexcel
      }

      // Try to find it in the component's instance
      if (component && component.instance) {
        return component.instance
      }

      console.error('jspreadsheet instance not found', { component, keys: Object.keys(component || {}) })
      return null
    }

    // Get column definitions for each sheet
    const getColumns = (sheetName) => {
      switch (sheetName) {
        case 'Vật liệu':
          return [
            { title: 'STT', width: 80, type: 'numeric', readOnly: true },
            { title: 'Mã hiệu', width: 120 },
            { title: 'TT Vật tư', width: 100, type: 'numeric' },
            { title: 'Vật liệu phụ', width: 120, type: 'numeric' },
            { title: 'Tên vật tư', width: 250 },
            { title: 'Đơn vị', width: 100 },
            { title: 'Hệ số công tác', width: 130, type: 'numeric' },
            { title: 'Nguồn mua', width: 180 },
            { title: 'Khối lượng', width: 120, type: 'numeric' },
            { title: 'Giá gốc', width: 150, type: 'numeric' },
            { title: 'Thành tiền giá gốc', width: 180, type: 'numeric', readOnly: true },
            { title: 'Giá thông báo', width: 150, type: 'numeric' },
            { title: 'Thành tiền giá TB', width: 180, type: 'numeric', readOnly: true }
          ]

        case 'Nhân công':
          return [
            { title: 'STT', width: 80, type: 'numeric', readOnly: true },
            { title: 'Mã hiệu', width: 120 },
            { title: 'TT Nhân công', width: 130, type: 'numeric' },
            { title: 'Tên nhân công', width: 250 },
            { title: 'Đơn vị', width: 100 },
            { title: 'Hệ số công tác', width: 130, type: 'numeric' },
            { title: 'Khối lượng', width: 120, type: 'numeric' },
            { title: 'Đơn giá', width: 150, type: 'numeric' },
            { title: 'Thành tiền', width: 180, type: 'numeric', readOnly: true }
          ]

        case 'Máy thi công':
          return [
            { title: 'STT', width: 80, type: 'numeric', readOnly: true },
            { title: 'Mã hiệu', width: 120 },
            { title: 'TT Máy', width: 100, type: 'numeric' },
            { title: 'Tên máy', width: 250 },
            { title: 'Đơn vị', width: 100 },
            { title: 'Hệ số công tác', width: 130, type: 'numeric' },
            { title: 'Khối lượng', width: 120, type: 'numeric' },
            { title: 'Đơn giá', width: 150, type: 'numeric' },
            { title: 'Thành tiền', width: 180, type: 'numeric', readOnly: true }
          ]

        case 'Tổng hợp':
          return [
            { title: 'STT', width: 100 },
            { title: 'NỘI DUNG CHI PHÍ', width: 300 },
            { title: 'CÁCH TÍNH', width: 200 },
            { title: 'GIÁ TRỊ', width: 200, type: 'numeric' },
            { title: 'KÝ HIỆU', width: 120 }
          ]
        case 'Định Mức Xây Dựng':
          return [
            { title: 'STT', width: 80, type: 'numeric', readOnly: true },
            { title: 'Mã hiệu đơn giá', width: 150 },
            { title: 'Mã hiệu VL, NC, M', width: 150 },
            { title: 'Tên công tác', width: 400 },
            { title: 'Đơn vị', width: 100 },
            { title: 'Định mức', width: 150, type: 'numeric' },
            { title: 'Loại', width: 120 }
          ]

        default:
          return []
      }
    }

    // Convert data to Jspreadsheet format (array of arrays)
    const convertDataToSpreadsheet = (data) => {
      if (!data || data.length === 0) {
        return [[]]
      }

      return data.map((row, index) => {
        const rowArray = []
        const columns = getColumns(currentSheet.value)

        columns.forEach((col, colIndex) => {
          const fieldName = getFieldNameFromColumn(col.title)
          let value = row[fieldName] !== undefined ? row[fieldName] : ''

          // Auto-calculate STT
          if (col.title === 'STT') {
            value = index + 1
          }

          // Auto-calculate totals
          if (currentSheet.value === 'Vật liệu') {
            if (col.title === 'Thành tiền giá gốc') {
              const kl = parseFloat(row.khoiLuong) || 0
              const gia = parseFloat(row.giaGoc) || 0
              value = kl * gia
            } else if (col.title === 'Thành tiền giá TB') {
              const kl = parseFloat(row.khoiLuong) || 0
              const gia = parseFloat(row.giaThongBao) || 0
              value = kl * gia
            }
          } else if (currentSheet.value === 'Nhân công' || currentSheet.value === 'Máy thi công') {
            if (col.title === 'Thành tiền') {
              const kl = parseFloat(row.khoiLuong) || 0
              const gia = parseFloat(row.donGia) || 0
              value = kl * gia
            }
          }

          rowArray.push(value)
        })

        return rowArray
      })
    }

    // Convert spreadsheet data back to object format
    const convertSpreadsheetToData = (spreadsheetData) => {
      if (!spreadsheetData || spreadsheetData.length === 0) {
        return []
      }

      const columns = getColumns(currentSheet.value)
      return spreadsheetData.map((row, rowIndex) => {
        const rowObj = {}
        columns.forEach((col, colIndex) => {
          const fieldName = getFieldNameFromColumn(col.title)
          let value = row[colIndex] !== undefined ? row[colIndex] : ''

          // Skip STT (auto-calculated)
          if (col.title === 'STT') {
            return
          }

          // Skip calculated fields
          if (col.readOnly) {
            return
          }

          // Convert numeric values
          if (col.type === 'numeric' && value !== '') {
            value = parseFloat(value) || 0
          }

          rowObj[fieldName] = value
        })
        return rowObj
      })
    }

    // Map column title to field name
    const getFieldNameFromColumn = (title) => {
      const mapping = {
        'STT': 'stt',
        'Mã hiệu': 'maHieu',
        'TT Vật tư': 'ttVatTu',
        'Vật liệu phụ': 'vatLieuPhu',
        'Tên vật tư': 'tenVatTu',
        'Đơn vị': 'donVi',
        'Hệ số công tác': 'heSoCongTac',
        'Nguồn mua': 'nguonMua',
        'Khối lượng': 'khoiLuong',
        'Giá gốc': 'giaGoc',
        'Thành tiền giá gốc': 'thanhTienGiaGoc',
        'Giá thông báo': 'giaThongBao',
        'Thành tiền giá TB': 'thanhTienGiaTB',
        'TT Nhân công': 'ttNhanCong',
        'Tên nhân công': 'tenNhanCong',
        'Đơn giá': 'donGia',
        'Thành tiền': 'thanhTien',
        'TT Máy': 'ttMay',
        'Tên máy': 'tenMay',
        'NỘI DUNG CHI PHÍ': 'noiDungChiPhi',
        'CÁCH TÍNH': 'cachTinh',
        'GIÁ TRỊ': 'giaTri',
        'KÝ HIỆU': 'kyHieu',
        'Mã hiệu đơn giá': 'maHieuDonGia',
        'Mã hiệu VL, NC, M': 'maHieuVLNCM',
        'Tên công tác': 'tenCongTac',
        'Định mức': 'dinhMuc',
        'Loại': 'loai'
      }
      return mapping[title] || title.toLowerCase().replace(/\s+/g, '')
    }

    // Spreadsheet data
    const spreadsheetData = computed(() => {
      if (!selectedProject.value?.sheets?.[currentSheet.value]) {
        return [[]]
      }

      const sheetData = selectedProject.value.sheets[currentSheet.value].data || []
      return convertDataToSpreadsheet(sheetData)
    })

    // Spreadsheet columns
    const spreadsheetColumns = computed(() => {
      return getColumns(currentSheet.value)
    })

    // Spreadsheet min dimensions
    const spreadsheetMinDimensions = computed(() => {
      const dataLength = spreadsheetData.value.length
      const colsLength = spreadsheetColumns.value.length
      return [Math.max(10, dataLength), colsLength]
    })

    // Additional spreadsheet options (expose a broad set of jspreadsheet options)
    const allowInsertRow = ref(true)
    const allowInsertColumn = ref(false)
    const allowDeleteRow = ref(true)
    const allowDeleteColumn = ref(false)
    const columnSorting = ref(true)
    const columnResize = ref(true)
    const rowDrag = ref(false)
    const selectionCopy = ref(true)
    const filters = ref(true)
    const contextMenu = ref(true)
    const editing = ref(true)
    const defaultColAlign = ref('left')
    const defaultColFormat = ref(null)
    // Some advanced options can cause rendering differences in the jspreadsheet wrapper
    // Use conservative defaults so mock data renders correctly
    const mergeCells = ref(null)
    const nestedHeaders = ref(null)
    const pagination = ref(false)

    // Toolbar configuration
    const toolbarConfig = computed(() => {
      return {
        items: [
          {
            content: 'save',
            tooltip: 'Lưu dự án',
            onclick: function () {
              saveProject()
            }
          },
          {
            type: 'divisor'
          },
          {
            type: 'select',
            width: '140px',
            options: ['Arial', 'Calibri', 'Times New Roman', 'Courier New', 'Verdana'],
            render: function (e) {
              return '<span style="font-family:' + e + '">' + e + '</span>'
            },
            onchange: function (a, b, c, d) {
              if (!spreadsheetRef.value) return
              const spreadsheet = spreadsheetRef.value.current
              if (spreadsheet && spreadsheet.length > 0) {
                const styleChanges = {}
                const cellNames = spreadsheet[0].getSelected(true)
                cellNames.forEach(cellName => {
                  styleChanges[cellName] = 'font-family: ' + d
                })
                spreadsheet[0].setStyle(styleChanges)
              }
            }
          },
          {
            type: 'select',
            width: '70px',
            options: ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24'],
            render: function (e) {
              return e + 'px'
            },
            onchange: function (a, b, c, d) {
              if (!spreadsheetRef.value) return
              const spreadsheet = spreadsheetRef.value.current
              if (spreadsheet && spreadsheet.length > 0) {
                const styleChanges = {}
                const cellNames = spreadsheet[0].getSelected(true)
                cellNames.forEach(cellName => {
                  styleChanges[cellName] = 'font-size: ' + d + 'px'
                })
                spreadsheet[0].setStyle(styleChanges)
              }
            }
          },
          {
            type: 'divisor'
          },
          {
            type: 'i',
            content: 'format_bold',
            tooltip: 'Bold (Ctrl+B)',
            onclick: function () {
              if (!spreadsheetRef.value) return
              const spreadsheet = spreadsheetRef.value.current
              if (spreadsheet && spreadsheet.length > 0) {
                const styleChanges = {}
                const cellNames = spreadsheet[0].getSelected(true)
                cellNames.forEach(cellName => {
                  styleChanges[cellName] = 'font-weight: bold'
                })
                spreadsheet[0].setStyle(styleChanges)
              }
            }
          },
          {
            type: 'i',
            content: 'format_italic',
            tooltip: 'Italic (Ctrl+I)',
            onclick: function () {
              if (!spreadsheetRef.value) return
              const spreadsheet = spreadsheetRef.value.current
              if (spreadsheet && spreadsheet.length > 0) {
                const styleChanges = {}
                const cellNames = spreadsheet[0].getSelected(true)
                cellNames.forEach(cellName => {
                  styleChanges[cellName] = 'font-style: italic'
                })
                spreadsheet[0].setStyle(styleChanges)
              }
            }
          },
          {
            type: 'i',
            content: 'format_underlined',
            tooltip: 'Underline (Ctrl+U)',
            onclick: function () {
              if (!spreadsheetRef.value) return
              const spreadsheet = spreadsheetRef.value.current
              if (spreadsheet && spreadsheet.length > 0) {
                const styleChanges = {}
                const cellNames = spreadsheet[0].getSelected(true)
                cellNames.forEach(cellName => {
                  styleChanges[cellName] = 'text-decoration: underline'
                })
                spreadsheet[0].setStyle(styleChanges)
              }
            }
          },
          {
            type: 'divisor'
          },
          {
            type: 'i',
            content: 'format_align_left',
            tooltip: 'Align Left',
            onclick: function () {
              if (!spreadsheetRef.value) return
              const spreadsheet = spreadsheetRef.value.current
              if (spreadsheet && spreadsheet.length > 0) {
                const styleChanges = {}
                const cellNames = spreadsheet[0].getSelected(true)
                cellNames.forEach(cellName => {
                  styleChanges[cellName] = 'text-align: left'
                })
                spreadsheet[0].setStyle(styleChanges)
              }
            }
          },
          {
            type: 'i',
            content: 'format_align_center',
            tooltip: 'Align Center',
            onclick: function () {
              if (!spreadsheetRef.value) return
              const spreadsheet = spreadsheetRef.value.current
              if (spreadsheet && spreadsheet.length > 0) {
                const styleChanges = {}
                const cellNames = spreadsheet[0].getSelected(true)
                cellNames.forEach(cellName => {
                  styleChanges[cellName] = 'text-align: center'
                })
                spreadsheet[0].setStyle(styleChanges)
              }
            }
          },
          {
            type: 'i',
            content: 'format_align_right',
            tooltip: 'Align Right',
            onclick: function () {
              if (!spreadsheetRef.value) return
              const spreadsheet = spreadsheetRef.value.current
              if (spreadsheet && spreadsheet.length > 0) {
                const styleChanges = {}
                const cellNames = spreadsheet[0].getSelected(true)
                cellNames.forEach(cellName => {
                  styleChanges[cellName] = 'text-align: right'
                })
                spreadsheet[0].setStyle(styleChanges)
              }
            }
          },
          {
            type: 'divisor'
          },
          {
            type: 'i',
            content: 'attach_money',
            tooltip: 'Currency Format',
            onclick: function () {
              if (!spreadsheetRef.value) return
              const spreadsheet = spreadsheetRef.value.current
              if (spreadsheet && spreadsheet.length > 0) {
                const cellNames = spreadsheet[0].getSelected(true)
                cellNames.forEach(cellName => {
                  const cell = spreadsheet[0].getCell(cellName)
                  if (cell) {
                    const value = parseFloat(cell.innerHTML) || 0
                    spreadsheet[0].setValue(cellName, new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND'
                    }).format(value))
                  }
                })
              }
            }
          },
          {
            type: 'i',
            content: 'percent',
            tooltip: 'Percent Format',
            onclick: function () {
              if (!spreadsheetRef.value) return
              const spreadsheet = spreadsheetRef.value.current
              if (spreadsheet && spreadsheet.length > 0) {
                const cellNames = spreadsheet[0].getSelected(true)
                cellNames.forEach(cellName => {
                  const cell = spreadsheet[0].getCell(cellName)
                  if (cell) {
                    const value = parseFloat(cell.innerHTML) || 0
                    spreadsheet[0].setValue(cellName, (value * 100).toFixed(2) + '%')
                  }
                })
              }
            }
          },
          {
            type: 'divisor'
          },
          {
            type: 'i',
            content: 'border_color',
            tooltip: 'Border',
            onclick: function () {
              if (!spreadsheetRef.value) return
              const spreadsheet = spreadsheetRef.value.current
              if (spreadsheet && spreadsheet.length > 0) {
                const styleChanges = {}
                const cellNames = spreadsheet[0].getSelected(true)
                cellNames.forEach(cellName => {
                  styleChanges[cellName] = 'border: 1px solid #000'
                })
                spreadsheet[0].setStyle(styleChanges)
              }
            }
          },
          {
            type: 'divisor'
          },
          {
            type: 'i',
            content: 'content_copy',
            tooltip: 'Copy (Ctrl+C)',
            onclick: function () {
              if (!spreadsheetRef.value) return
              const spreadsheet = spreadsheetRef.value.current
              if (spreadsheet && spreadsheet.length > 0) {
                spreadsheet[0].copy()
              }
            }
          },
          {
            type: 'i',
            content: 'content_paste',
            tooltip: 'Paste (Ctrl+V)',
            onclick: function () {
              if (!spreadsheetRef.value) return
              const spreadsheet = spreadsheetRef.value.current
              if (spreadsheet && spreadsheet.length > 0) {
                spreadsheet[0].paste()
              }
            }
          },
          {
            type: 'i',
            content: 'delete',
            tooltip: 'Clear Format',
            onclick: function () {
              if (!spreadsheetRef.value) return
              const spreadsheet = spreadsheetRef.value.current
              if (spreadsheet && spreadsheet.length > 0) {
                const styleChanges = {}
                const cellNames = spreadsheet[0].getSelected(true)
                cellNames.forEach(cellName => {
                  styleChanges[cellName] = ''
                })
                spreadsheet[0].setStyle(styleChanges)
              }
            }
          },
          {
            type: 'divisor'
          },
          {
            content: 'file_download',
            tooltip: 'Xuất Excel',
            onclick: function () {
              exportCurrentProject()
            }
          }
        ]
      }
    })

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
      // Save current sheet data before switching
      saveCurrentSheetData()
      currentSheet.value = sheetName
    }

    const saveCurrentSheetData = () => {
      if (!spreadsheetRef.value || !selectedProject.value) return

      try {
        const spreadsheet = spreadsheetRef.value.current
        if (spreadsheet && spreadsheet.length > 0) {
          const data = spreadsheet[0].getData()
          const convertedData = convertSpreadsheetToData(data)
          selectedProject.value.sheets[currentSheet.value].data = convertedData
        }
      } catch (error) {
        console.error('Error saving sheet data:', error)
      }
    }

    const saveProject = async () => {
      if (!selectedProject.value) return

      // Save current sheet before saving
      saveCurrentSheetData()

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

    const addSheet = () => {
      if (!newSheetName.value.trim()) {
        alert('Vui lòng nhập tên sheet')
        return
      }

      if (!selectedProject.value) {
        alert('Vui lòng chọn dự án trước')
        return
      }

      const sheetName = newSheetName.value.trim()

      // Check if sheet already exists
      if (selectedProject.value.sheets && selectedProject.value.sheets[sheetName]) {
        alert('Sheet này đã tồn tại')
        return
      }

      // Add new sheet with empty data
      if (!selectedProject.value.sheets) {
        selectedProject.value.sheets = {}
      }

      selectedProject.value.sheets[sheetName] = { headers: [], data: [] }
      sheetNames.value.push(sheetName)

      // Switch to the new sheet
      currentSheet.value = sheetName

      showAddSheetModal.value = false
      newSheetName.value = ''
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
      const jspreadsheet = getJspreadsheetInstance()
      if (!jspreadsheet) {
        alert('Lỗi: Không thể truy cập bảng tính')
        return
      }

      try {
        jspreadsheet.insertRow()
      } catch (error) {
        console.error('Error adding row:', error)
        alert('Lỗi khi thêm dòng: ' + error.message)
      }
    }

    const deleteSelectedRows = () => {
      const jspreadsheet = getJspreadsheetInstance()
      if (!jspreadsheet) {
        alert('Lỗi: Không thể truy cập bảng tính')
        return
      }

      try {
        const selectedRows = jspreadsheet.getSelectedRows(true)
        if (selectedRows.length === 0) {
          alert('Vui lòng chọn dòng cần xóa')
          return
        }

        if (!confirm(`Bạn có chắc muốn xóa ${selectedRows.length} dòng đã chọn?`)) {
          return
        }

        // Delete rows in reverse order to maintain indices
        selectedRows.sort((a, b) => b - a).forEach(rowIndex => {
          jspreadsheet.deleteRow(rowIndex)
        })

        // Sync deleted data back to project state
        saveCurrentSheetData()
      } catch (error) {
        console.error('Error deleting rows:', error)
        alert('Lỗi khi xóa dòng: ' + error.message)
      }
    }

    const backToList = () => {
      saveCurrentSheetData()
      selectedProject.value = null
      currentSheet.value = 'Vật liệu'
    }

    const exportCurrentProject = async () => {
      if (!selectedProject.value) return
      await exportProject(selectedProject.value.id)
    }

    const exportProject = async (projectId) => {
      try {
        const response = await api.exportToExcel(projectId)

        // Handle both Blob (from mock) and ArrayBuffer/Blob (from axios)
        let blob
        if (response.data instanceof Blob) {
          blob = response.data
        } else {
          blob = new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          })
        }

        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url

        const project = projects.value.find(p => p.id === projectId)
        link.download = `${project?.name || 'project'}_${Date.now()}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } catch (error) {
        console.error('Error exporting project:', error)
        alert('Lỗi khi xuất file Excel: ' + (error.message || 'Unknown error'))
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
        'Định Mức Xây Dựng': [
          { stt: 1, maHieuDonGia: 'AA.11111', maHieuVLNCM: '', tenCongTac: 'Phát rừng tạo mặt bằng bằng thủ công - loại I', donVi: '100m2', dinhMuc: '' }
        ],
        'Máy thi công': [
          { maHieu: 'M0001', ttMay: 1, tenMay: 'Máy trộn bê tông', donVi: 'ca', khoiLuong: 5, donGia: 500000 }
        ]
      }

      const wb = XLSX.utils.book_new()
      Object.keys(templateData).forEach(sheetName => {
        const columns = getColumns(sheetName) || []
        const headers = columns.map(c => c.title)
        const dataRows = templateData[sheetName].map(row => {
          return headers.map(h => {
            const field = getFieldNameFromColumn(h)
            return row[field] !== undefined ? row[field] : ''
          })
        })
        const wsData = [headers, ...dataRows]
        const ws = XLSX.utils.aoa_to_sheet(wsData)
        XLSX.utils.book_append_sheet(wb, ws, sheetName)
      })

      XLSX.writeFile(wb, 'template_du_toan.xlsx')
    }

    const formatDate = (dateString) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleDateString('vi-VN')
    }

    // Watch for sheet changes to update spreadsheet
    watch(currentSheet, () => {
      nextTick(() => {
        if (spreadsheetRef.value) {
          // Spreadsheet will auto-update via computed property
        }
      })
    })

    onMounted(() => {
      loadProjects()
    })

    return {
      projects,
      selectedProject,
      showCreateModal,
      newProjectName,
      showAddSheetModal,
      newSheetName,
      spreadsheetRef,
      worksheetRef,
      currentSheet,
      sheetNames,
      spreadsheetData,
      spreadsheetColumns,
      spreadsheetMinDimensions,
      toolbarConfig,
      // Exposed spreadsheet option refs
      allowInsertRow,
      allowInsertColumn,
      allowDeleteRow,
      allowDeleteColumn,
      columnSorting,
      columnResize,
      rowDrag,
      selectionCopy,
      filters,
      contextMenu,
      editing,
      defaultColAlign,
      defaultColFormat,
      mergeCells,
      nestedHeaders,
      pagination,
      getTotalItems,
      selectProject,
      selectSheet,
      saveProject,
      createProject,
      addSheet,
      deleteProject,
      addRow,
      deleteSelectedRows,
      backToList,
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
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
  background: rgba(0, 0, 0, 0.1);
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

.tab-add {
  font-size: 1.2rem;
  font-weight: bold;
  color: #667eea;
  margin-left: 0.5rem;
}

.tab-add:hover {
  background: rgba(102, 126, 234, 0.15);
  color: #764ba2;
}

.spreadsheet-wrapper {
  border: 1px solid #dee2e6;
  border-radius: 5px;
  overflow: hidden;
  background: white;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
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
