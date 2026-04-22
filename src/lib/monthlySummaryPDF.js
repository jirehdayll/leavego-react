import jsPDF from 'jspdf';

// Color mappings for different leave types (same as attendance report)
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

export const generateMonthlySummaryPDF = async (data, month, year) => {
  const pdf = new jsPDF('l', 'mm', 'a4');
  
  // Get current month and year
  const currentDate = new Date();
  const reportMonth = month || currentDate.toLocaleString('default', { month: 'long' });
  const reportYear = year || currentDate.getFullYear();
  
  // Add header
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('MONTHLY SUMMARY REPORT', pdf.internal.pageSize.width / 2, 20, { align: 'center' });
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`FOR THE MONTH OF ${reportMonth.toUpperCase()} ${reportYear}`, pdf.internal.pageSize.width / 2, 30, { align: 'center' });
  
  pdf.setFontSize(10);
  pdf.text('CENRO-OLONGAPO CITY', pdf.internal.pageSize.width / 2, 38, { align: 'center' });
  
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
        department: request.details?.office_department || '',
        totalDays: 0
      };
    }
    
    // Process leave dates
    const startDate = new Date(request.details?.start_date);
    const endDate = new Date(request.details?.end_date);
    const leaveType = getLeaveTypeAbbreviation(request.details?.leave_type);
    const numDays = parseInt(request.details?.num_days || 1);
    
    // Add all dates in the range
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.getDate();
      employeeData[employeeName].leaves[dateStr] = leaveType;
      employeeData[employeeName].totalDays += 1;
    }
  });
  
  // Sort employees alphabetically
  const sortedEmployees = Object.keys(employeeData).sort();
  
  // Summary statistics
  const totalApplications = data.length;
  const totalEmployees = sortedEmployees.length;
  const totalLeaveDays = Object.values(employeeData).reduce((sum, emp) => sum + emp.totalDays, 0);
  
  // Add summary statistics section
  let currentY = 50;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SUMMARY STATISTICS', 15, currentY);
  
  currentY += 8;
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Total Applications: ${totalApplications}`, 20, currentY);
  currentY += 6;
  pdf.text(`Total Employees: ${totalEmployees}`, 20, currentY);
  currentY += 6;
  pdf.text(`Total Leave Days: ${totalLeaveDays}`, 20, currentY);
  
  currentY += 12;
  
  // Manual table drawing for employee summary
  const cellHeight = 8;
  
  // Table dimensions
  const colWidths = {
    0: 15,   // Index
    1: 50,   // Name
    2: 25,   // Position
    3: 35,   // Department
    4: 20,   // Total Days
    5: 30,   // Leave Types
    6: 40,   // Remarks
    7: 25    // Status
  };
  
  // Draw headers
  const headers = [
    '#',
    'NAME',
    'POSITION',
    'DEPARTMENT',
    'DAYS',
    'LEAVE TYPES',
    'REMARKS',
    'STATUS'
  ];
  
  // Header background
  pdf.setFillColor(240, 240, 240);
  pdf.rect(15, currentY, 277, cellHeight, 'F');
  
  // Header text
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  let currentX = 15;
  headers.forEach((header, i) => {
    pdf.text(header, currentX + colWidths[i] / 2, currentY + cellHeight / 2 + 1, { align: 'center' });
    currentX += colWidths[i];
  });
  
  currentY += cellHeight;
  
  // Draw rows for each employee
  sortedEmployees.forEach((employeeName, index) => {
    const employee = employeeData[employeeName];
    
    // Add new page if needed
    if (currentY > 170) {
      pdf.addPage();
      currentY = 20;
    }
    
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
    
    // Position column
    pdf.text(employee.position.substring(0, 15), cellX + 2, currentY + cellHeight / 2 + 1);
    pdf.line(cellX += colWidths[2], currentY, cellX, currentY + cellHeight);
    
    // Department column
    pdf.text(employee.department.substring(0, 12), cellX + 2, currentY + cellHeight / 2 + 1);
    pdf.line(cellX += colWidths[3], currentY, cellX, currentY + cellHeight);
    
    // Total Days column
    pdf.text(employee.totalDays.toString(), cellX + colWidths[4] / 2, currentY + cellHeight / 2 + 1, { align: 'center' });
    pdf.line(cellX += colWidths[4], currentY, cellX, currentY + cellHeight);
    
    // Leave Types column - show aggregated types
    const leaveTypes = Object.values(employee.leaves);
    const uniqueTypes = [...new Set(leaveTypes)];
    const typeString = uniqueTypes.join(', ');
    pdf.text(typeString.substring(0, 15), cellX + 2, currentY + cellHeight / 2 + 1);
    pdf.line(cellX += colWidths[5], currentY, cellX, currentY + cellHeight);
    
    // Remarks column
    pdf.text('Approved', cellX + 2, currentY + cellHeight / 2 + 1);
    pdf.line(cellX += colWidths[6], currentY, cellX, currentY + cellHeight);
    
    // Status column
    pdf.setFillColor(0, 128, 0); // Green for approved
    pdf.rect(cellX + 5, currentY + 2, colWidths[7] - 10, cellHeight - 4, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.text('APPROVED', cellX + colWidths[7] / 2, currentY + cellHeight / 2 + 1, { align: 'center' });
    pdf.setTextColor(0, 0, 0); // Reset text color
    
    currentY += cellHeight;
  });
  
  // Add legend
  currentY += 10;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Leave Type Legend:', 15, currentY);
  
  let legendX = 15;
  let legendYPos = currentY + 5;
  
  Object.entries(LEAVE_COLORS).forEach(([key, { color, label }]) => {
    if (key !== 'Present' && key !== 'Weekend') {
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
  
  // Add professional signatories
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
  pdf.save(`Monthly_Summary_${reportMonth}_${reportYear}.pdf`);
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
