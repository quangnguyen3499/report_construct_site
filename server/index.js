const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - cho phép tất cả origins khi deploy
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Data storage path
const DATA_DIR = path.join(__dirname, 'data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    // Initialize projects file if it doesn't exist
    try {
      await fs.access(PROJECTS_FILE);
    } catch {
      await fs.writeFile(PROJECTS_FILE, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error('Error creating data directory:', error);
  }
}

// Read projects data
async function readProjects() {
  try {
    const data = await fs.readFile(PROJECTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Write projects data
async function writeProjects(projects) {
  await fs.writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2));
}

// API Routes

// Get all projects
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await readProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single project
app.get('/api/projects/:id', async (req, res) => {
  try {
    const projects = await readProjects();
    const project = projects.find(p => p.id === req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create project
app.post('/api/projects', async (req, res) => {
  try {
    const projects = await readProjects();
    const newProject = {
      id: Date.now().toString(),
      name: req.body.name || 'New Project',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sheets: req.body.sheets || {
        'Vật liệu': { headers: [], data: [] },
        'Nhân công': { headers: [], data: [] },
        'Máy thi công': { headers: [], data: [] },
        'Tổng hợp': { headers: [], data: [] }
      },
      // Keep backward compatibility
      data: req.body.data || []
    };
    projects.push(newProject);
    await writeProjects(projects);
    res.json(newProject);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update project
app.put('/api/projects/:id', async (req, res) => {
  try {
    const projects = await readProjects();
    const index = projects.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }
    projects[index] = {
      ...projects[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    await writeProjects(projects);
    res.json(projects[index]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete project
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const projects = await readProjects();
    const filtered = projects.filter(p => p.id !== req.params.id);
    await writeProjects(filtered);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get statistics
app.get('/api/statistics', async (req, res) => {
  try {
    const projects = await readProjects();
    const stats = {
      totalProjects: projects.length,
      projects: projects.map(project => {
        const materials = {};
        let totalCost = 0;
        let itemCount = 0;
        
        // Process new sheets structure
        if (project.sheets && project.sheets['Vật liệu'] && project.sheets['Vật liệu'].data) {
          project.sheets['Vật liệu'].data.forEach(row => {
            if (row.tenVatTu) {
              const materialName = row.tenVatTu;
              const quantity = parseFloat(row.khoiLuong) || 0;
              const cost = parseFloat(row.thanhTienGiaTB || row.thanhTienGiaGoc || 0);
              
              if (!materials[materialName]) {
                materials[materialName] = {
                  name: materialName,
                  totalQuantity: 0,
                  totalCost: 0
                };
              }
              materials[materialName].totalQuantity += quantity;
              materials[materialName].totalCost += cost;
              totalCost += cost;
              itemCount++;
            }
          });
        }
        
        // Backward compatibility: process old data structure
        if (project.data && project.data.length > 0) {
          project.data.forEach(row => {
            if (row.material && row.quantity && row.unitPrice) {
              const materialName = row.material;
              const quantity = parseFloat(row.quantity) || 0;
              const unitPrice = parseFloat(row.unitPrice) || 0;
              const cost = quantity * unitPrice;
              
              if (!materials[materialName]) {
                materials[materialName] = {
                  name: materialName,
                  totalQuantity: 0,
                  totalCost: 0
                };
              }
              materials[materialName].totalQuantity += quantity;
              materials[materialName].totalCost += cost;
              totalCost += cost;
              itemCount++;
            }
          });
        }
        
        // Count all items from all sheets
        if (project.sheets) {
          itemCount = Object.values(project.sheets).reduce((sum, sheet) => {
            return sum + (sheet.data?.length || 0);
          }, 0);
        } else if (project.data) {
          itemCount = project.data.length;
        }
        
        return {
          id: project.id,
          name: project.name,
          materials: Object.values(materials),
          totalCost: totalCost,
          itemCount: itemCount
        };
      })
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export to Excel
app.post('/api/export', async (req, res) => {
  try {
    const { projectId, format } = req.body;
    const projects = await readProjects();
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Define column mappings for each sheet type
    const getSheetHeaders = (sheetName) => {
      switch (sheetName) {
        case 'Vật liệu':
          return ['STT', 'Mã hiệu', 'TT Vật tư', 'Vật liệu phụ', 'Tên vật tư', 
                  'Đơn vị', 'Hệ số công tác', 'Nguồn mua', 'Khối lượng', 
                  'Giá gốc', 'Thành tiền giá gốc', 'Giá thông báo', 'Thành tiền giá TB'];
        case 'Nhân công':
          return ['STT', 'Mã hiệu', 'TT Nhân công', 'Tên nhân công', 
                  'Đơn vị', 'Hệ số công tác', 'Khối lượng', 'Đơn giá', 'Thành tiền'];
        case 'Máy thi công':
          return ['STT', 'Mã hiệu', 'TT Máy', 'Tên máy', 
                  'Đơn vị', 'Hệ số công tác', 'Khối lượng', 'Đơn giá', 'Thành tiền'];
        case 'Tổng hợp':
          return ['STT', 'NỘI DUNG CHI PHÍ', 'CÁCH TÍNH', 'GIÁ TRỊ', 'KÝ HIỆU'];
        default:
          return [];
      }
    };
    
    const getFieldMapping = (sheetName) => {
      switch (sheetName) {
        case 'Vật liệu':
          return {
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
          };
        case 'Nhân công':
          return {
            'STT': 'stt',
            'Mã hiệu': 'maHieu',
            'TT Nhân công': 'ttNhanCong',
            'Tên nhân công': 'tenNhanCong',
            'Đơn vị': 'donVi',
            'Hệ số công tác': 'heSoCongTac',
            'Khối lượng': 'khoiLuong',
            'Đơn giá': 'donGia',
            'Thành tiền': 'thanhTien'
          };
        case 'Máy thi công':
          return {
            'STT': 'stt',
            'Mã hiệu': 'maHieu',
            'TT Máy': 'ttMay',
            'Tên máy': 'tenMay',
            'Đơn vị': 'donVi',
            'Hệ số công tác': 'heSoCongTac',
            'Khối lượng': 'khoiLuong',
            'Đơn giá': 'donGia',
            'Thành tiền': 'thanhTien'
          };
        case 'Tổng hợp':
          return {
            'STT': 'stt',
            'NỘI DUNG CHI PHÍ': 'noiDungChiPhi',
            'CÁCH TÍNH': 'cachTinh',
            'GIÁ TRỊ': 'giaTri',
            'KÝ HIỆU': 'kyHieu'
          };
        default:
          return {};
      }
    };
    
    // Export sheets if available
    if (project.sheets) {
      Object.keys(project.sheets).forEach(sheetName => {
        const sheet = project.sheets[sheetName];
        const headers = getSheetHeaders(sheetName);
        const mapping = getFieldMapping(sheetName);
        
        if (sheet.data && sheet.data.length > 0) {
          const sheetData = [headers];
          
          sheet.data.forEach((row, index) => {
            const rowData = headers.map(header => {
              const fieldName = mapping[header];
              let value = fieldName ? row[fieldName] : row[header];
              
              // Calculate computed fields if needed
              if (sheetName === 'Vật liệu') {
                if (header === 'Thành tiền giá gốc' && (!value || value === '')) {
                  const kl = parseFloat(row.khoiLuong) || 0;
                  const gia = parseFloat(row.giaGoc) || 0;
                  value = kl * gia;
                }
                if (header === 'Thành tiền giá TB' && (!value || value === '')) {
                  const kl = parseFloat(row.khoiLuong) || 0;
                  const gia = parseFloat(row.giaThongBao) || 0;
                  value = kl * gia;
                }
              } else if (sheetName === 'Nhân công' || sheetName === 'Máy thi công') {
                if (header === 'Thành tiền' && (!value || value === '')) {
                  const kl = parseFloat(row.khoiLuong) || 0;
                  const gia = parseFloat(row.donGia) || 0;
                  value = kl * gia;
                }
              }
              
              return value !== null && value !== undefined ? value : '';
            });
            sheetData.push(rowData);
          });
          
          const ws = XLSX.utils.aoa_to_sheet(sheetData);
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        } else if (headers.length > 0) {
          // Create empty sheet with headers
          const ws = XLSX.utils.aoa_to_sheet([headers]);
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
      });
    }
    
    // Backward compatibility: export old data structure
    if (project.data && project.data.length > 0 && (!project.sheets || Object.keys(project.sheets).length === 0)) {
      const dataSheet = [
        ['STT', 'Vật liệu', 'Đơn vị', 'Số lượng', 'Đơn giá', 'Thành tiền', 'Ghi chú']
      ];
      
      project.data.forEach((row, index) => {
        const quantity = parseFloat(row.quantity) || 0;
        const unitPrice = parseFloat(row.unitPrice) || 0;
        const total = quantity * unitPrice;
        
        dataSheet.push([
          index + 1,
          row.material || '',
          row.unit || '',
          quantity,
          unitPrice,
          total,
          row.note || ''
        ]);
      });
      
      // Add total row
      const totalCost = project.data.reduce((sum, row) => {
        const quantity = parseFloat(row.quantity) || 0;
        const unitPrice = parseFloat(row.unitPrice) || 0;
        return sum + (quantity * unitPrice);
      }, 0);
      
      dataSheet.push(['', '', '', '', 'TỔNG CỘNG:', totalCost, '']);
      
      const ws = XLSX.utils.aoa_to_sheet(dataSheet);
      XLSX.utils.book_append_sheet(wb, ws, 'Dữ liệu');
    }
    
    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${project.name}_${Date.now()}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
if (require.main === module) {
  ensureDataDir().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}

// Export for Vercel serverless
module.exports = app;

