import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Synchronized Color mappings matching UI calendar exactly - text is set to high contrast white for premium looks
const LEAVE_COLORS = {
  'SL': { color: [244, 63, 94], label: 'SICK LEAVE', text: [255, 255, 255] }, // Rose-500
  'Maternity': { color: [5, 150, 105], label: 'MATERNITY', text: [255, 255, 255] }, // Emerald-600
  'OB': { color: [255, 235, 59], label: 'OFFICIAL BUSINESS', text: [0, 0, 0] }, // Yellow, black text
  'FL': { color: [14, 165, 233], label: 'FL/SPL/VL', text: [255, 255, 255] }, // Sky-500
  'SPL': { color: [14, 165, 233], label: 'FL/SPL/VL', text: [255, 255, 255] },
  'VL': { color: [14, 165, 233], label: 'FL/SPL/VL', text: [255, 255, 255] },
  'Weekend': { color: [112, 48, 160], label: 'SATURDAY/SUNDAY/HOLIDAY', text: [255, 255, 255] }
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
  
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const monthIdx = monthNames.indexOf(reportMonth.toLowerCase());
  const targetYear = parseInt(reportYear);

  data.forEach(req => {
    const name = req.user_name || 'Unknown';
    if (!employeeMap[name]) {
      employeeMap[name] = { name, leaves: {}, rawRequests: [] };
    }
    
    // Parse inclusive start/end or departure/arrival dates cleanly
    const startDateVal = req.details?.start_date || req.details?.departure_date || req.submitted_at || req.created_at;
    const endDateVal = req.details?.end_date || req.details?.arrival_date || req.submitted_at || req.created_at;
    
    if (startDateVal && endDateVal) {
      const typeStr = req.details?.leave_type || (req.request_type === 'travel' ? 'Official Business' : 'Leave');
      const type = getLeaveTypeAbbreviation(typeStr);
      let controlNumber = req.id ? String(req.id).slice(-4) : Math.floor(Math.random() * 10000).toString();
      controlNumber = `26-${controlNumber.padStart(4, '0')}`;
      
      const start = new Date(startDateVal);
      const end = new Date(endDateVal);
      
      // Store raw request for Remarks detailing inclusive ranges
      employeeMap[name].rawRequests.push({
        typeStr,
        start: new Date(start),
        end: new Date(end)
      });
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        // Mark only cells matching current month and year
        if (d.getMonth() === monthIdx && d.getFullYear() === targetYear) {
          employeeMap[name].leaves[d.getDate()] = {
            type,
            controlNumber,
            label: type
          };
        }
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
    
    // Build dynamic Remarks listing leave type and its inclusive dates span
    const remarksList = [];
    employeeMap[name].rawRequests.forEach(req => {
      const formatDateStr = (date) => {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      };
      remarksList.push(`${req.typeStr}: ${formatDateStr(req.start)} to ${formatDateStr(req.end)}`);
    });
    
    row.push(remarksList.join('; ')); // Remarks
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
    const mIdx = monthNames.indexOf(monthStr.toLowerCase());
    return new Date(yr, mIdx + 1, 0).getDate();
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
      33: { cellWidth: 60 }, // Undertime
      34: { cellWidth: 90 } // Remarks
    },
    margin: { left: 15, right: 20 },
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
           data.cell.text = []; // Clear text on weekends
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
          const prevLeave = employeeMap[employeeName]?.leaves[day - 1];
          const isStartOfPeriod = !prevLeave || prevLeave.type !== leaveInfo.type;
          
          if (!isStartOfPeriod) {
            // Skip drawing entirely as it is already covered by the merged block drawn on the start day
            data.cell.text = [];
            data.cell.styles.fillColor = false;
            return;
          }
          
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
            
            // Draw merged cell background with stroke border
            pdf.setFillColor(...LEAVE_COLORS[leaveInfo.type].color);
            pdf.setDrawColor(0, 0, 0);
            pdf.setLineWidth(0.5);
            pdf.rect(cellX, cellY, cellWidth, cellHeight, 'FD'); // FD: Fill and Stroke
            
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
  let currentX = 15;
  
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
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.rect(currentX, finalY, 150, 15, 'FD');
      
      pdf.setFontSize(8);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(...colorInfo.text);
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

  // Noted by
  pdf.setFontSize(10);
  pdf.setFont('times', 'normal');
  pdf.text('Noted by:', 350, footerY + 80);
  
  pdf.setFontSize(11);
  pdf.setFont('times', 'bold');
  pdf.text('(Appropriate Officer)', 350, footerY + 120);

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
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const monthIdx = monthNames.indexOf(month.toLowerCase());
  if (monthIdx === -1) return false;
  
  const testDate = new Date(year, monthIdx, day);
  const dayOfWeek = testDate.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}
