import jsPDF from 'jspdf';

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
      employeeData[employeeName].leaves[dateStr] = leaveType;
    }
  });
  
  // Sort employees alphabetically
  const sortedEmployees = Object.keys(employeeData).sort();
  
  // Manual table drawing
  let currentY = 40;
  const cellHeight = 8;
  const cellPadding = 1;
  
  // Table dimensions
  const colWidths = {
    0: 10,   // Index
    1: 40,   // Name
    ...Object.fromEntries(Array.from({ length: 31 }, (_, i) => [i + 2, 6])), // Days 1-31
    33: 15,  // Undertime
    34: 20   // Remarks
  };
  
  // Draw headers
  const headers = [
    '#',
    'NAME OF PERSONNEL',
    ...Array.from({ length: 31 }, (_, i) => (i + 1).toString()),
    'Undertime',
    'REMARKS'
  ];
  
  // Header background
  pdf.setFillColor(240, 240, 240);
  pdf.rect(15, currentY, 277, cellHeight, 'F');
  
  // Header text
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  let currentX = 15;
  headers.forEach((header, i) => {
    pdf.text(header, currentX + colWidths[i] / 2, currentY + cellHeight / 2 + 1, { align: 'center' });
    currentX += colWidths[i];
  });
  
  currentY += cellHeight;
  
  // Draw rows
  sortedEmployees.forEach((employeeName, index) => {
    const employee = employeeData[employeeName];
    
    // Draw row border
    pdf.rect(15, currentY, 277, cellHeight);
    
    // Draw cells
    let cellX = 15;
    
    // Index column
    pdf.text((index + 1).toString(), cellX + colWidths[0] / 2, currentY + cellHeight / 2 + 1, { align: 'center' });
    pdf.line(cellX += colWidths[0], currentY, cellX, currentY + cellHeight);
    
    // Name column
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.text(employeeName, cellX + 2, currentY + cellHeight / 2 + 1);
    pdf.line(cellX += colWidths[1], currentY, cellX, currentY + cellHeight);
    
    // Day columns (1-31)
    for (let day = 1; day <= 31; day++) {
      const leaveType = employee.leaves[day];
      
      // Check if weekend
      if (isWeekendOrHoliday(day, reportMonth, reportYear)) {
        pdf.setFillColor(...LEAVE_COLORS.Weekend.color);
        pdf.rect(cellX, currentY, colWidths[day + 1], cellHeight, 'F');
      }
      
      // Draw leave type if present
      if (leaveType && LEAVE_COLORS[leaveType]) {
        const color = LEAVE_COLORS[leaveType].color;
        pdf.setFillColor(...color);
        pdf.rect(cellX, currentY, colWidths[day + 1], cellHeight, 'F');
        
        // Add text
        pdf.setTextColor(leaveType === 'OB' ? [0, 0, 0] : [255, 255, 255]);
        pdf.setFontSize(5);
        pdf.text(leaveType, cellX + colWidths[day + 1] / 2, currentY + cellHeight / 2 + 1, { align: 'center' });
        pdf.setTextColor(0, 0, 0); // Reset text color
      }
      
      pdf.line(cellX += colWidths[day + 1], currentY, cellX, currentY + cellHeight);
    }
    
    // Undertime column
    pdf.line(cellX += colWidths[33], currentY, cellX, currentY + cellHeight);
    
    // Remarks column
    pdf.line(cellX += colWidths[34], currentY, cellX, currentY + cellHeight);
    
    currentY += cellHeight;
    
    // Add new page if needed
    if (currentY > 180) {
      pdf.addPage();
      currentY = 20;
    }
  });
  
  // Add legend
  const legendY = currentY + 10;
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
