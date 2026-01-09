import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// 新的数据格式：横向重量列
const data = [
  { 
    始发地: '新疆圆通仓', 
    目的地: '新疆维吾尔自治区', 
    '1kg': 1.63, 
    '2kg': 1.74, 
    '3kg': 1.85, 
    '4kg': 4.72, 
    '5kg': 5.08,
    '10kg': 6.88
  },
  { 
    始发地: '北京', 
    目的地: '上海', 
    '1kg': 12, 
    '2kg': 15, 
    '3kg': 18 
  }
];

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

const outputPath = path.resolve(process.cwd(), 'public/freight_data.xlsx');

// 确保存放目录存在
if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
}

XLSX.writeFile(wb, outputPath);
console.log(`Excel file created at: ${outputPath}`);
