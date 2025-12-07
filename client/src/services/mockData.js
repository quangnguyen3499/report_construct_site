// Mock data service for test environment
// This allows testing without backend connection
import * as XLSX from 'xlsx'

const sheetNames = ['Vật liệu', 'Nhân công', 'Máy thi công', 'Tổng hợp']

const mockProjects = [
  {
    id: '1',
    name: 'Dự án mẫu - Nhà phố',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sheets: {
      'Vật liệu': {
        headers: [
          'STT', 'Mã hiệu', 'TT Vật tư', 'Vật liệu phụ', 'Tên vật tư', 
          'Đơn vị', 'Hệ số công tác', 'Nguồn mua', 'Khối lượng', 
          'Giá gốc', 'Thành tiền giá gốc', 'Giá thông báo', 'Thành tiền giá TB'
        ],
        data: [
          {
            stt: 1,
            maHieu: 'V00066',
            ttVatTu: 388,
            vatLieuPhu: 0,
            tenVatTu: 'Băng dính',
            donVi: 'cuộn',
            heSoCongTac: '',
            nguonMua: 'Giá vật liệu thông báo',
            khoiLuong: 4.5,
            giaGoc: 10000,
            thanhTienGiaGoc: 45000,
            giaThongBao: 10389,
            thanhTienGiaTB: 46750
          },
          {
            stt: 2,
            maHieu: 'V26286',
            ttVatTu: 1907,
            vatLieuPhu: 0,
            tenVatTu: 'Bể chứa nước Inox',
            donVi: 'bể',
            heSoCongTac: '',
            nguonMua: '',
            khoiLuong: 1,
            giaGoc: 2050000,
            thanhTienGiaGoc: 2050000,
            giaThongBao: '',
            thanhTienGiaTB: ''
          },
          {
            stt: 3,
            maHieu: 'V94565',
            ttVatTu: 2186,
            vatLieuPhu: 0,
            tenVatTu: 'Bê tông thương phẩm',
            donVi: 'm3',
            heSoCongTac: '',
            nguonMua: '',
            khoiLuong: 53.5819,
            giaGoc: 973000,
            thanhTienGiaGoc: 52135189,
            giaThongBao: 1210000,
            thanhTienGiaTB: 64834099
          }
        ]
      },
      'Nhân công': {
        headers: [
          'STT', 'Mã hiệu', 'TT Nhân công', 'Tên nhân công', 
          'Đơn vị', 'Hệ số công tác', 'Khối lượng', 
          'Đơn giá', 'Thành tiền'
        ],
        data: [
          {
            stt: 1,
            maHieu: 'N0006',
            ttNhanCong: 1,
            tenNhanCong: 'Nhân công bậc 3.5/7',
            donVi: 'công',
            heSoCongTac: 1,
            khoiLuong: 100,
            donGia: 250000,
            thanhTien: 25000000
          }
        ]
      },
      'Máy thi công': {
        headers: [
          'STT', 'Mã hiệu', 'TT Máy', 'Tên máy', 
          'Đơn vị', 'Hệ số công tác', 'Khối lượng', 
          'Đơn giá', 'Thành tiền'
        ],
        data: [
          {
            stt: 1,
            maHieu: 'M0001',
            ttMay: 1,
            tenMay: 'Máy trộn bê tông',
            donVi: 'ca',
            heSoCongTac: 1,
            khoiLuong: 5,
            donGia: 500000,
            thanhTien: 2500000
          }
        ]
      },
      'Tổng hợp': {
        headers: [
          'STT', 'NỘI DUNG CHI PHÍ', 'CÁCH TÍNH', 'GIÁ TRỊ', 'KÝ HIỆU'
        ],
        data: [
          {
            stt: 'I',
            noiDungChiPhi: 'CHI PHÍ TRỰC TIẾP',
            cachTinh: '',
            giaTri: '',
            kyHieu: ''
          },
          {
            stt: 1,
            noiDungChiPhi: 'Chi phí vật liệu',
            cachTinh: 'VLHT',
            giaTri: 932804415,
            kyHieu: 'VL'
          },
          {
            stt: 2,
            noiDungChiPhi: 'Chi phí nhân công',
            cachTinh: 'NCHT',
            giaTri: 577633227,
            kyHieu: 'NC'
          },
          {
            stt: 3,
            noiDungChiPhi: 'Chi phí máy thi công',
            cachTinh: 'MHT',
            giaTri: 34446098,
            kyHieu: 'M'
          },
          {
            stt: '',
            noiDungChiPhi: 'Chi phí trực tiếp',
            cachTinh: 'VL + NC + M',
            giaTri: 1544883740,
            kyHieu: 'T'
          }
        ]
      }
    }
  }
]

// Simulate API delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export default {
  async getProjects() {
    await delay(300)
    return { data: mockProjects }
  },

  async getProject(id) {
    await delay(200)
    const project = mockProjects.find(p => p.id === id)
    if (!project) {
      throw new Error('Project not found')
    }
    return { data: project }
  },

  async createProject(data) {
    await delay(300)
    const newProject = {
      id: Date.now().toString(),
      name: data.name || 'Dự án mới',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sheets: data.sheets || {
        'Vật liệu': { headers: [], data: [] },
        'Nhân công': { headers: [], data: [] },
        'Máy thi công': { headers: [], data: [] },
        'Tổng hợp': { headers: [], data: [] }
      }
    }
    mockProjects.push(newProject)
    return { data: newProject }
  },

  async updateProject(id, data) {
    await delay(300)
    const index = mockProjects.findIndex(p => p.id === id)
    if (index === -1) {
      throw new Error('Project not found')
    }
    mockProjects[index] = {
      ...mockProjects[index],
      ...data,
      updatedAt: new Date().toISOString()
    }
    return { data: mockProjects[index] }
  },

  async deleteProject(id) {
    await delay(200)
    const index = mockProjects.findIndex(p => p.id === id)
    if (index === -1) {
      throw new Error('Project not found')
    }
    mockProjects.splice(index, 1)
    return { data: { success: true } }
  },

  async getStatistics() {
    await delay(300)
    const stats = {
      totalProjects: mockProjects.length,
      projects: mockProjects.map(project => {
        let totalCost = 0
        const materials = {}
        
        // Calculate from Vật liệu sheet
        if (project.sheets?.['Vật liệu']?.data) {
          project.sheets['Vật liệu'].data.forEach(row => {
            const cost = parseFloat(row.thanhTienGiaTB || row.thanhTienGiaGoc || 0)
            totalCost += cost
            
            if (row.tenVatTu) {
              if (!materials[row.tenVatTu]) {
                materials[row.tenVatTu] = {
                  name: row.tenVatTu,
                  totalQuantity: 0,
                  totalCost: 0
                }
              }
              materials[row.tenVatTu].totalQuantity += parseFloat(row.khoiLuong || 0)
              materials[row.tenVatTu].totalCost += cost
            }
          })
        }
        
        return {
          id: project.id,
          name: project.name,
          materials: Object.values(materials),
          totalCost: totalCost,
          itemCount: Object.values(project.sheets || {}).reduce((sum, sheet) => sum + (sheet.data?.length || 0), 0)
        }
      })
    }
    return { data: stats }
  },

  async exportToExcel(projectId) {
    await delay(500)
    const project = mockProjects.find(p => p.id === projectId)
    if (!project) {
      throw new Error('Project not found')
    }
    
    console.log('Exporting project:', project.name)
    console.log('Project sheets:', Object.keys(project.sheets || {}))
    
    // Generate Excel file using XLSX library
    const wb = XLSX.utils.book_new()
    
    // Define column mappings for each sheet type
    const getSheetHeaders = (sheetName, firstRow) => {
      if (!firstRow) return []
      
      switch (sheetName) {
        case 'Vật liệu':
          return ['STT', 'Mã hiệu', 'TT Vật tư', 'Vật liệu phụ', 'Tên vật tư', 
                  'Đơn vị', 'Hệ số công tác', 'Nguồn mua', 'Khối lượng', 
                  'Giá gốc', 'Thành tiền giá gốc', 'Giá thông báo', 'Thành tiền giá TB']
        case 'Nhân công':
          return ['STT', 'Mã hiệu', 'TT Nhân công', 'Tên nhân công', 
                  'Đơn vị', 'Hệ số công tác', 'Khối lượng', 'Đơn giá', 'Thành tiền']
        case 'Máy thi công':
          return ['STT', 'Mã hiệu', 'TT Máy', 'Tên máy', 
                  'Đơn vị', 'Hệ số công tác', 'Khối lượng', 'Đơn giá', 'Thành tiền']
        case 'Tổng hợp':
          return ['STT', 'NỘI DUNG CHI PHÍ', 'CÁCH TÍNH', 'GIÁ TRỊ', 'KÝ HIỆU']
        default:
          return Object.keys(firstRow)
      }
    }
    
    // Export all sheets
    if (project.sheets) {
      Object.keys(project.sheets).forEach(sheetName => {
        const sheet = project.sheets[sheetName]
        if (sheet.data && sheet.data.length > 0) {
          // Get headers based on sheet type
          const headers = getSheetHeaders(sheetName, sheet.data[0])
          
          // Map field names to headers
          const fieldMap = {
            'Vật liệu': {
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
              'Thành tiền giá TB': 'thanhTienGiaTB'
            },
            'Nhân công': {
              'STT': 'stt',
              'Mã hiệu': 'maHieu',
              'TT Nhân công': 'ttNhanCong',
              'Tên nhân công': 'tenNhanCong',
              'Đơn vị': 'donVi',
              'Hệ số công tác': 'heSoCongTac',
              'Khối lượng': 'khoiLuong',
              'Đơn giá': 'donGia',
              'Thành tiền': 'thanhTien'
            },
            'Máy thi công': {
              'STT': 'stt',
              'Mã hiệu': 'maHieu',
              'TT Máy': 'ttMay',
              'Tên máy': 'tenMay',
              'Đơn vị': 'donVi',
              'Hệ số công tác': 'heSoCongTac',
              'Khối lượng': 'khoiLuong',
              'Đơn giá': 'donGia',
              'Thành tiền': 'thanhTien'
            },
            'Tổng hợp': {
              'STT': 'stt',
              'NỘI DUNG CHI PHÍ': 'noiDungChiPhi',
              'CÁCH TÍNH': 'cachTinh',
              'GIÁ TRỊ': 'giaTri',
              'KÝ HIỆU': 'kyHieu'
            }
          }
          
          const mapping = fieldMap[sheetName] || {}
          
          // Build sheet data with headers
          const sheetData = [headers]
          
          sheet.data.forEach((row, index) => {
            const rowData = headers.map(header => {
              const fieldName = mapping[header] || header.toLowerCase()
              let value = row[fieldName]
              
              // Calculate computed fields if needed
              if (sheetName === 'Vật liệu') {
                if (header === 'Thành tiền giá gốc' && (value === '' || value === null || value === undefined)) {
                  const kl = parseFloat(row.khoiLuong) || 0
                  const gia = parseFloat(row.giaGoc) || 0
                  value = kl * gia
                }
                if (header === 'Thành tiền giá TB' && (value === '' || value === null || value === undefined)) {
                  const kl = parseFloat(row.khoiLuong) || 0
                  const gia = parseFloat(row.giaThongBao) || 0
                  value = kl * gia
                }
              } else if (sheetName === 'Nhân công' || sheetName === 'Máy thi công') {
                if (header === 'Thành tiền' && (value === '' || value === null || value === undefined)) {
                  const kl = parseFloat(row.khoiLuong) || 0
                  const gia = parseFloat(row.donGia) || 0
                  value = kl * gia
                }
              }
              
              // Format numbers
              if (typeof value === 'number') {
                return value
              }
              
              return value !== null && value !== undefined ? value : ''
            })
            sheetData.push(rowData)
          })
          
          const ws = XLSX.utils.aoa_to_sheet(sheetData)
          XLSX.utils.book_append_sheet(wb, ws, sheetName)
        } else {
          // Create empty sheet with headers
          const headers = getSheetHeaders(sheetName, {})
          if (headers.length > 0) {
            const ws = XLSX.utils.aoa_to_sheet([headers])
            XLSX.utils.book_append_sheet(wb, ws, sheetName)
          }
        }
      })
    }
    
    // Check if workbook has any sheets
    if (wb.SheetNames.length === 0) {
      console.warn('No sheets to export, creating empty workbook with default sheets')
      // Create empty sheets with headers for all sheet types
      const allSheetNames = ['Vật liệu', 'Nhân công', 'Máy thi công', 'Tổng hợp']
      allSheetNames.forEach(sheetName => {
        const headers = getSheetHeaders(sheetName, {})
        if (headers.length > 0) {
          const ws = XLSX.utils.aoa_to_sheet([headers])
          XLSX.utils.book_append_sheet(wb, ws, sheetName)
        }
      })
    }
    
    console.log('Workbook sheets:', wb.SheetNames)
    
    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    console.log('Excel buffer size:', buffer.length, 'bytes')
    
    return { 
      data: new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    }
  }
}

