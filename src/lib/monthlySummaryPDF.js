import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { resolveControlNumber } from './applicationNumber';

const LEAVE_COLORS = {
  SL: { color: [255, 0, 0], label: 'SICKLEAVE', text: [255, 255, 255] },
  Maternity: { color: [146, 208, 80], label: 'Maternity', text: [0, 0, 0] },
  OB: { color: [255, 238, 0], label: 'Official Business', text: [0, 0, 0] },
  FL: { color: [0, 111, 166], label: 'FL/SPL/VL', text: [255, 255, 255] },
  SPL: { color: [0, 111, 166], label: 'FL/SPL/VL', text: [255, 255, 255] },
  VL: { color: [0, 111, 166], label: 'FL/SPL/VL', text: [255, 255, 255] },
  WL: { color: [0, 111, 166], label: 'FL/SPL/VL/WL', text: [255, 255, 255] },
  Weekend: { color: [94, 0, 166], label: 'Saturday/Sunday/Holiday', text: [255, 255, 255] },
};

function getLeaveCellValue(type, controlNumber) {
  if (type === 'SL') return 'SICKLEAVE';
  if (type === 'Maternity') return 'Maternity';
  if (type === 'VL' || type === 'FL' || type === 'SPL' || type === 'WL') return type;
  if (type === 'OB') return controlNumber;
  return controlNumber;
}

export const generateMonthlySummaryPDF = async (data, month, year, allApprovedForms = data) => {
  const pdf = new jsPDF('landscape', 'pt', 'legal');

  const currentDate = new Date();
  const reportMonth = month || currentDate.toLocaleString('default', { month: 'long' });
  const reportYear = year || currentDate.getFullYear();

  pdf.setFontSize(11);
  pdf.setFont('times', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('REPORT OF ATTENDANCE OF CENRO-OLONGAPO CITY', pdf.internal.pageSize.width / 2, 40, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
  pdf.text(`FOR THE MONTH OF ${reportMonth.toUpperCase()} ${reportYear}`, pdf.internal.pageSize.width / 2, 55, { align: 'center' });

  const employeeMap = {};
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const monthIdx = monthNames.indexOf(reportMonth.toLowerCase());
  const targetYear = parseInt(reportYear, 10);

  data.forEach((req) => {
    const name = req.user_name || 'Unknown';
    if (!employeeMap[name]) {
      employeeMap[name] = { name, leaves: {} };
    }

    const startDateVal = req.details?.start_date || req.details?.departure_date || req.submitted_at || req.created_at;
    const endDateVal = req.details?.end_date || req.details?.arrival_date || req.submitted_at || req.created_at;

    if (startDateVal && endDateVal) {
      const typeStr = req.details?.leave_type || (req.request_type === 'travel' ? 'Official Business' : 'Leave');
      const type = getLeaveTypeAbbreviation(typeStr);
      const controlNumber = resolveControlNumber(req, allApprovedForms);

      const start = new Date(startDateVal);
      const end = new Date(endDateVal);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getMonth() === monthIdx && d.getFullYear() === targetYear) {
          employeeMap[name].leaves[d.getDate()] = {
            type,
            controlNumber,
            display: getLeaveCellValue(type, controlNumber),
          };
        }
      }
    }
  });

  const sortedNames = Object.keys(employeeMap).sort((a, b) => a.localeCompare(b));
  const tableRows = [];

  sortedNames.forEach((name, idx) => {
    const row = [(idx + 1).toString(), name];
    for (let day = 1; day <= 31; day++) {
      const cellData = employeeMap[name].leaves[day];
      if (cellData) {
        row.push(isWeekendOrHoliday(day, reportMonth, reportYear) ? '' : cellData.display);
      } else {
        row.push('');
      }
    }
    row.push('');
    row.push('');
    tableRows.push(row);
  });

  const tableHeaders = [
    [
      { content: '#', styles: { halign: 'center' } },
      { content: 'NAME OF PERSONNEL', styles: { halign: 'left' } },
      ...Array.from({ length: 31 }, (_, i) => ({ content: (i + 1).toString(), styles: { halign: 'center', cellWidth: 22 } })),
      { content: 'Undertime', styles: { halign: 'center' } },
      { content: 'REMARKS', styles: { halign: 'center' } },
    ],
  ];

  const getDaysInMonth = (monthStr, yr) => {
    const mIdx = monthNames.indexOf(monthStr.toLowerCase());
    return new Date(yr, mIdx + 1, 0).getDate();
  };
  const maxDays = getDaysInMonth(reportMonth, reportYear);

  autoTable(pdf, {
    startY: 95,
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
      cellPadding: 1,
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 90, fontStyle: 'bold' },
      33: { cellWidth: 60 },
      34: { cellWidth: 90 },
    },
    margin: { left: 15, right: 20 },
    didParseCell(data) {
      if (data.column.index >= 2 && data.column.index <= 32) {
        const day = data.column.index - 1;
        if (day > maxDays) {
          data.cell.styles.fillColor = [200, 200, 200];
          return;
        }
        if (data.section === 'head') return;

        const employeeName = data.row.raw[1];
        const leaveInfo = employeeMap[employeeName]?.leaves[day];
        const isWkend = isWeekendOrHoliday(day, reportMonth, reportYear);

        // Form colors override weekend colors when overlapping
        if (leaveInfo && LEAVE_COLORS[leaveInfo.type]) {
          data.cell.styles.fillColor = LEAVE_COLORS[leaveInfo.type].color;
          data.cell.styles.textColor = LEAVE_COLORS[leaveInfo.type].text;
          data.cell.styles.halign = 'center';
          data.cell.styles.fontSize = 6;
          data.cell.styles.fontStyle = 'bold';
        } else if (isWkend) {
          data.cell.styles.fillColor = LEAVE_COLORS.Weekend.color;
          data.cell.styles.textColor = LEAVE_COLORS.Weekend.text;
          data.cell.text = [];
        }
      }
    },
    willDrawCell(data) {
      if (data.section === 'body' && data.column.index >= 2 && data.column.index <= 32) {
        const day = data.column.index - 1;
        const employeeName = data.row.raw[1];
        const leaveInfo = employeeMap[employeeName]?.leaves[day];

        if (leaveInfo && !isWeekendOrHoliday(day, reportMonth, reportYear)) {
          const prevLeave = employeeMap[employeeName]?.leaves[day - 1];
          const isStartOfPeriod = !prevLeave || prevLeave.type !== leaveInfo.type;

          if (!isStartOfPeriod) {
            data.cell.text = [];
            data.cell.styles.fillColor = false;
            return;
          }

          let duration = 1;
          let currentDay = day + 1;
          while (employeeMap[employeeName]?.leaves[currentDay]?.type === leaveInfo.type) {
            duration++;
            currentDay++;
          }

          if (duration > 1) {
            const doc = data.doc;
            const cellWidth = data.cell.width * duration;
            const cellX = data.cell.x;
            const cellY = data.cell.y;
            const cellHeight = data.cell.height;

            doc.setFillColor(...LEAVE_COLORS[leaveInfo.type].color);
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.5);
            doc.rect(cellX, cellY, cellWidth, cellHeight, 'FD');

            doc.setFont('times', 'bold');
            doc.setFontSize(6);
            doc.setTextColor(0, 0, 0);
            doc.text(leaveInfo.display, cellX + cellWidth / 2, cellY + cellHeight / 2 + 2, { align: 'center' });

            data.cell.text = [];
            data.cell.styles.fillColor = false;
          }
        }
      }
    },
  });

  const finalY = pdf.lastAutoTable.finalY + 12;
  let currentX = 15;

  const legendGroups = [
    { key: 'SL' },
    { key: 'Maternity' },
    { key: 'OB' },
    { key: 'VL' },
    { key: 'Weekend' },
  ];

  legendGroups.forEach((item) => {
    const colorInfo = LEAVE_COLORS[item.key];
    if (colorInfo) {
      const labelWidth = item.key === 'Weekend' ? 200 : 110;
      pdf.setFillColor(...colorInfo.color);
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.rect(currentX, finalY, labelWidth, 15, 'FD');

      pdf.setFontSize(7);
      pdf.setFont('times', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(colorInfo.label, currentX + labelWidth / 2, finalY + 10, { align: 'center' });

      currentX += labelWidth + 10;
    }
  });

  const footerY = pdf.internal.pageSize.height - 130;

  pdf.setFontSize(10);
  pdf.setFont('times', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Prepared/Reviewed by:', 125, footerY);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Approved by:', 580, footerY);

  pdf.setFontSize(11);
  pdf.setFont('times', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('MARICA PIA R. DIMALANTA-LICO', 125, footerY + 50);
  pdf.setTextColor(0, 0, 0);
  pdf.text('EDWARD V. SERNADILLA, RPF, DPA', 580, footerY + 50);

  pdf.setFontSize(9);
  pdf.setFont('times', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text('FIII/Chief, CDS and in concurrent capacity as Chief, PSU', 125, footerY + 65);
  pdf.setTextColor(0, 0, 0);
  pdf.text('CENRO', 580, footerY + 65);

  pdf.save(`Monthly_Summary_${reportMonth}_${reportYear}.pdf`);
};

function getLeaveTypeAbbreviation(leaveType) {
  if (!leaveType) return 'OB';

  const typeMap = {
    'Sick Leave': 'SL',
    'Maternity Leave': 'Maternity',
    Maternity: 'Maternity',
    'Official Business': 'OB',
    'Forced Leave': 'FL',
    'Mandatory/Forced Leave': 'FL',
    'Special Privilege Leave': 'SPL',
    'Vacation Leave': 'VL',
    'Wellness Leave': 'WL',
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
