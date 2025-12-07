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
    
    // Export sheets if available
    if (project.sheets) {
      Object.keys(project.sheets).forEach(sheetName => {
        const sheet = project.sheets[sheetName];
        if (sheet.data && sheet.data.length > 0) {
          // Get headers from first row or use default
          const headers = sheet.headers && sheet.headers.length > 0 
            ? sheet.headers 
            : Object.keys(sheet.data[0]);
          
          const sheetData = [headers];
          
          sheet.data.forEach(row => {
            const rowData = headers.map(header => {
              // Handle nested field access (e.g., 'thanhTienGiaGoc')
              return row[header] !== undefined ? row[header] : '';
            });
            sheetData.push(rowData);
          });
          
          const ws = XLSX.utils.aoa_to_sheet(sheetData);
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

