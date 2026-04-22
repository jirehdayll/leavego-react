import jsPDF from 'jspdf';
import jsPDFAutoTable from 'jspdf-autotable';

// Color mappings for different leave types
const LEAVE_COLORS = {
  'SL': { color: [255, 0, 0], label: 'Sick Leave (SL)' }, // Red
  'Maternity': { color: [0, 128, 0], label: 'Maternity' }, // Green
  'OB': { color: [255, 255, 0], label: 'Official Business (OB)' }, // Yellow
  'FL': { color: [0, 0, 255], label: 'Forced Leave (FL)' }, // Blue
  'SPL': { color: [0, 0, 255], label: 'Special Privilege Leave (SPL)' }, // Blue
  'VL': { color: [0, 0, 255], label: 'Vacation Leave (VL)' }, // Blue
  'Weekend': { color: [128, 0, 128], label: 'Saturday/Sunday/Holiday' }, // Purple
  'Present': { color: [255, 255, 255], label: 'Present' } // White
};

export const generateAttendanceReportPDF = async (data, month, year) => {
  const pdf = new jsPDF('l', 'mm', 'a4');
  jsPDFAutoTable(pdf);
  
  // Get current month and year
  const currentDate = new Date();
  const reportMonth = month || currentDate.toLocaleString('default', { month: 'long' });
  const reportYear = year || currentDate.getFullYear();
  
  // Add header
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('REPORT OF ATTENDANCE OF CENRO-OLONGAPO CITY', pdf.internal.pageSize.width / 2, 20, { align: 'center' });
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`FOR THE MONTH OF ${reportMonth.toUpperCase()} ${reportYear}`, pdf.internal.pageSize.width / 2, 30, { align: 'center' });
  
  // Process data - group by employee name
  const employeeData = {};
  const allDates = new Set();
  
  // Collect all unique dates and group by employee
  data.forEach(request => {
    const employeeName = request.user_name || 'Unknown';
    if (!employeeData[employeeName]) {
      employeeData[employeeName] = {
        name: employeeName,
        leaves: {},
        position: request.details?.position || '',
        department: request.details?.office_department || ''
      };
    }
    
    // Process leave dates
    const startDate = new Date(request.details?.start_date);
    const endDate = new Date(request.details?.end_date);
    const leaveType = getLeaveTypeAbbreviation(request.details?.leave_type);
    
    // Add all dates in the range
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.getDate();
      allDates.add(dateStr);
      employeeData[employeeName].leaves[dateStr] = leaveType;
    }
  });
  
  // Sort employees alphabetically
  const sortedEmployees = Object.keys(employeeData).sort();
  
  // Create table data
  const tableData = [];
  sortedEmployees.forEach((employeeName, index) => {
    const employee = employeeData[employeeName];
    const row = [
      index + 1, // Index number
      employeeName, // Name
      ...Array.from({ length: 31 }, (_, i) => {
        const day = i + 1;
        return employee.leaves[day] || '';
      }),
      '', // Undertime
      '' // Remarks
    ];
    tableData.push(row);
  });
  
  // Create table headers
  const headers = [
    '#',
    'NAME OF PERSONNEL',
    ...Array.from({ length: 31 }, (_, i) => (i + 1).toString()),
    'Undertime',
    'REMARKS'
  ];
  
  // Generate the table
  pdf.autoTable({
    head: [headers],
    body: tableData,
    startY: 40,
    theme: 'grid',
    styles: {
      fontSize: 6,
      cellPadding: 1,
      valign: 'middle',
      halign: 'center',
      lineWidth: 0.1,
      lineColor: [0, 0, 0]
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 6
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' }, // Index
      1: { cellWidth: 40, halign: 'left' }, // Name
      ...Object.fromEntries(Array.from({ length: 31 }, (_, i) => [i + 2, { cellWidth: 6, halign: 'center' }])), // Days 1-31
      33: { cellWidth: 15, halign: 'center' }, // Undertime
      34: { cellWidth: 20, halign: 'left' } // Remarks
    },
    didDrawCell: (data) => {
      // Apply color coding to cells
      if (data.row.index > 0 && data.column.index >= 2 && data.column.index <= 32) {
        const cellValue = data.cell.raw;
        if (cellValue && LEAVE_COLORS[cellValue]) {
          const color = LEAVE_COLORS[cellValue].color;
          pdf.setFillColor(...color);
          pdf.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          
          // Add text back
          pdf.setTextColor(cellValue === 'OB' ? [0, 0, 0] : [255, 255, 255]);
          pdf.setFontSize(5);
          pdf.text(cellValue, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
        }
        
        // Weekends and holidays
        const dayNum = data.column.index - 1;
        if (isWeekendOrHoliday(dayNum, reportMonth, reportYear)) {
          pdf.setFillColor(...LEAVE_COLORS.Weekend.color);
          pdf.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
        }
      }
    }
  });
  
  // Add legend
  const legendY = pdf.lastAutoTable.finalY + 10;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Legend:', 15, legendY);
  
  let legendX = 15;
  let legendYPos = legendY + 5;
  
  Object.entries(LEAVE_COLORS).forEach(([key, { color, label }]) => {
    if (key !== 'Present') {
      // Draw color box
      pdf.setFillColor(...color);
      pdf.rect(legendX, legendYPos, 4, 4, 'F');
      
      // Add label
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(7);
      pdf.text(label, legendX + 6, legendYPos + 3);
      
      legendX += label.length * 2 + 15;
      if (legendX > 180) {
        legendX = 15;
        legendYPos += 6;
      }
    }
  });
  
  // Add signatories
  const signatoryY = pdf.internal.pageSize.height - 30;
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Prepared/Reviewed by:', 30, signatoryY);
  pdf.text('Approved By:', 150, signatoryY);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('MARICA PIA R. DIMALANTA-LICO', 30, signatoryY + 8);
  pdf.text('EDWARD V. SERNADILLA, RPF, DPA', 150, signatoryY + 8);
  
  // Save the PDF
  pdf.save(`Attendance_Report_${reportMonth}_${reportYear}.pdf`);
};

// Helper function to get leave type abbreviation
function getLeaveTypeAbbreviation(leaveType) {
  const typeMap = {
    'Sick Leave': 'SL',
    'Maternity Leave': 'Maternity',
    'Official Business': 'OB',
    'Forced Leave': 'FL',
    'Special Privilege Leave': 'SPL',
    'Vacation Leave': 'VL'
  };
  return typeMap[leaveType] || leaveType;
}

// Helper function to check if a date is weekend or holiday
function isWeekendOrHoliday(day, month, year) {
  const date = new Date(year, new Date(month + ' 1, 2024').getMonth(), day);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
}
