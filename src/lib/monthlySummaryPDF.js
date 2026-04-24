import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Color mappings based on requested Legend - all text set to black
const LEAVE_COLORS = {
  'SL': { color: [255, 0, 0], label: 'SICK LEAVE', text: [0, 0, 0] },
  'Maternity': { color: [144, 238, 144], label: 'MATERNITY', text: [0, 0, 0] },
  'OB': { color: [255, 255, 0], label: 'OFFICIAL BUSINESS', text: [0, 0, 0] },
  'FL': { color: [51, 153, 255], label: 'FL/SPL/VL', text: [0, 0, 0] },
  'SPL': { color: [51, 153, 255], label: 'FL/SPL/VL', text: [0, 0, 0] },
  'VL': { color: [51, 153, 255], label: 'FL/SPL/VL', text: [0, 0, 0] },
  'Weekend': { color: [112, 48, 160], label: 'SATURDAY/SUNDAY/HOLIDAY', text: [0, 0, 0] }
};

export const generateMonthlySummaryPDF = async (data, month, year) => {
  const pdf = new jsPDF('landscape', 'pt', 'legal');
  
  // Header Info
  const currentDate = new Date();
  const reportMonth = month || currentDate.toLocaleString('default', { month: 'long' });
  const reportYear = year || currentDate.getFullYear();
  
  // Top Title
  pdf.setFontSize(11);
  pdf.setFont('times', 'bold');
  pdf.text('REPORT OF ATTENDANCE OF CENRO-OLONGAPO CITY', pdf.internal.pageSize.width / 2, 40, { align: 'center' });
  pdf.text(`FOR THE MONTH OF ${reportMonth.toUpperCase()} ${reportYear}`, pdf.internal.pageSize.width / 2, 55, { align: 'center' });

  // Data processing: Group by unique employee name
  const employeeMap = {};
  
  data.forEach(req => {
    const name = req.user_name || 'Unknown';
    if (!employeeMap[name]) {
      employeeMap[name] = { name, leaves: {} };
    }
    
    if (req.details?.start_date && req.details?.end_date) {
      const typeStr = req.details.leave_type || (req.request_type === 'travel' ? 'Official Business' : '');
      const type = getLeaveTypeAbbreviation(typeStr);
      let controlNumber = req.id ? String(req.id).slice(-4) : Math.floor(Math.random() * 10000).toString();
      // Format as "26-[XXXX]" like in the image
      controlNumber = `26-${controlNumber.padStart(4, '0')}`;
      
      const start = new Date(req.details.start_date);
      const end = new Date(req.details.end_date);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        employeeMap[name].leaves[d.getDate()] = {
          type,
          controlNumber,
          label: type
        };
      }
    }
  });

  // Alphabetical sort of employees
  const sortedNames = Object.keys(employeeMap).sort((a, b) => a.localeCompare(b));
  
  // Prepare Table Rows
  const tableRows = [];
  sortedNames.forEach((name, idx) => {
    const row = [ (idx + 1).toString(), name ]; // Col 1: index, Col 2: Name
    for (let day = 1; day <= 31; day++) {
      const cellData = employeeMap[name].leaves[day];
      if (cellData) {
        row.push(cellData.type === 'Weekend' ? '' : cellData.controlNumber || cellData.type);
      } else {
        row.push('');
      }
    }
    row.push(''); // Undertime
    row.push(''); // Remarks
    tableRows.push(row);
  });

  // Prepare Headers
  const tableHeaders = [
    [
      { content: '#', styles: { halign: 'center' } },
      { content: 'NAME OF PERSONNEL', styles: { halign: 'left' } },
      ...Array.from({ length: 31 }, (_, i) => ({ content: (i + 1).toString(), styles: { halign: 'center', cellWidth: 22 } })),
      { content: 'Undertime', styles: { halign: 'center' } },
      { content: 'REMARKS', styles: { halign: 'center' } }
    ]
  ];

  const getDaysInMonth = (monthStr, yr) => {
    return new Date(yr, new Date(`${monthStr} 1, ${yr}`).getMonth() + 1, 0).getDate();
  };
  const maxDays = getDaysInMonth(reportMonth, reportYear);

  // Generate Table
  autoTable(pdf, {
    startY: 80,
    head: tableHeaders,
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'times',
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 1
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center', fontStyle: 'bold' }, // Index
      1: { cellWidth: 150, fontStyle: 'bold' }, // Name
      // 31 days are dynamically auto-sized or fixed at 22 above
      33: { cellWidth: 60 }, // Undertime
      34: { cellWidth: 80 } // Remarks - reduced width
    },
    margin: { left: 15, right: 20 }, // Further decreased left margin
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index >= 2 && data.column.index <= 32) {
        const day = data.column.index - 1;
        
        // Hide days that do not exist in the month
        if (day > maxDays) {
          data.cell.styles.fillColor = [200, 200, 200]; // Grey out non-existent days
          return;
        }

        const employeeName = data.row.raw[1];
        const leaveInfo = employeeMap[employeeName]?.leaves[day];
        
        const isWkend = isWeekendOrHoliday(day, reportMonth, reportYear);
        
        if (isWkend) {
           data.cell.styles.fillColor = LEAVE_COLORS['Weekend'].color;
           data.cell.styles.textColor = LEAVE_COLORS['Weekend'].text;
           data.cell.text = []; // Clear text on weekends as per image
        } else if (leaveInfo && LEAVE_COLORS[leaveInfo.type]) {
           data.cell.styles.fillColor = LEAVE_COLORS[leaveInfo.type].color;
           data.cell.styles.textColor = LEAVE_COLORS[leaveInfo.type].text;
           data.cell.styles.halign = 'center';
           data.cell.styles.fontSize = 6; 
           data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    // Custom cell drawing for merged leave periods
    willDrawCell: function(data) {
      if (data.section === 'body' && data.column.index >= 2 && data.column.index <= 32) {
        const day = data.column.index - 1;
        const employeeName = data.row.raw[1];
        
        // Check if this is the start of a leave period
        const leaveInfo = employeeMap[employeeName]?.leaves[day];
        if (leaveInfo && leaveInfo.type !== 'Weekend') {
          const start = new Date(data.row.raw[1]);
          // Find the duration of this leave period
          let duration = 1;
          let currentDay = day + 1;
          
          while (employeeMap[employeeName]?.leaves[currentDay]?.type === leaveInfo.type) {
            duration++;
            currentDay++;
          }
          
          // Only draw text on the first day of the period
          if (duration > 1) {
            const pdf = data.doc;
            const cellWidth = data.cell.width * duration;
            const cellX = data.cell.x;
            const cellY = data.cell.y;
            const cellHeight = data.cell.height;
            
            // Draw merged cell background
            pdf.setFillColor(...LEAVE_COLORS[leaveInfo.type].color);
            pdf.rect(cellX, cellY, cellWidth, cellHeight, 'F');
            
            // Draw text centered in merged cell
            pdf.setFont('times', 'bold');
            pdf.setFontSize(6);
            pdf.setTextColor(...LEAVE_COLORS[leaveInfo.type].text);
            pdf.text(leaveInfo.controlNumber || leaveInfo.type, cellX + cellWidth/2, cellY + cellHeight/2 + 2, { align: 'center' });
            
            // Skip drawing individual cells for the rest of the period
            data.cell.text = [];
            data.cell.styles.fillColor = false;
          }
        }
      }
    }
  });

  // Add Dynamic Legend Below Table
  const finalY = pdf.lastAutoTable.finalY + 15;
  let currentX = 15; // Further decreased margin left
  
  // Custom grouping for legend based on image
  const legendGroups = [
    { key: 'Weekend' },
    { key: 'SL' },
    { key: 'Maternity' },
    { key: 'OB' },
    { key: 'VL' } // Represents FL/SPL/VL
  ];

  legendGroups.forEach(item => {
    const colorInfo = LEAVE_COLORS[item.key];
    if (colorInfo) {
      pdf.setFillColor(...colorInfo.color);
      pdf.rect(currentX, finalY, 150, 15, 'F'); // Background box for legend text
      
      pdf.setFontSize(8);
      pdf.setFont('times', 'bold');
      
      // All text set to black
      pdf.setTextColor(0,0,0);
      pdf.text(colorInfo.label, currentX + 75, finalY + 10, { align: 'center' });
      
      currentX += 160;
    }
  });

  // Signatories
  const footerY = pdf.internal.pageSize.height - 100;
  
  pdf.setFontSize(10);
  pdf.setFont('times', 'normal');
  pdf.setTextColor(0,0,0);
  pdf.text('Prepared/Reviewed by:', 125, footerY);
  pdf.text('Approved By:', 580, footerY);
  
  pdf.setFontSize(11);
  pdf.setFont('times', 'bold');
  pdf.text('MARICA PIA R. DIMALANTA-LICO', 125, footerY + 40);
  pdf.text('EDWARD V. SERNADILLA, RPF, DPA', 580, footerY + 40);

  pdf.setFontSize(9);
  pdf.setFont('times', 'normal');
  pdf.text('FIII/Chief, CDS and in concurrent capacity as Chief, PSU', 125, footerY + 55);
  pdf.text('CENRO', 580, footerY + 55);

  // Save Name
  pdf.save(`Monthly_Summary_${reportMonth}_${reportYear}.pdf`);
};

// Helpers
function getLeaveTypeAbbreviation(leaveType) {
  if (!leaveType) return 'OB';
  
  const typeMap = {
    'Sick Leave': 'SL',
    'Maternity Leave': 'Maternity',
    'Official Business': 'OB',
    'Forced Leave': 'FL',
    'Special Privilege Leave': 'SPL',
    'Vacation Leave': 'VL'
  };
  return typeMap[leaveType] || 'OB';
}

function isWeekendOrHoliday(day, month, year) {
  const dateStr = `${month} 1, ${year}`;
  const dt = new Date(dateStr);
  if (isNaN(dt.getTime())) return false; // fallback if month name is weird
  
  const testDate = new Date(year, dt.getMonth(), day);
  const dayOfWeek = testDate.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}
