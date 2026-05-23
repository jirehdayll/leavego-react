import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { resolveControlNumber } from './applicationNumber';

// Colors (ARGB for ExcelJS)
const COLORS = {
  OB_FILL: 'FFFFEE00',
  OB_TEXT: 'FF000000',
  SL_FILL: 'FFFF0000',
  SL_TEXT: '000000',
  MAT_FILL: 'FF92D050',
  MAT_TEXT: 'FF000000',
  VL_FILL: 'FF006FA6',
  VL_TEXT: '000000',
  WEEKEND_FILL: 'A033D6',
  WEEKEND_TEXT: '000000',
  GREY_FILL: 'FFC8C8C8',
  BORDER: 'FF000000',
};

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

function getDaysInMonth(monthStr, year) {
  const mIdx = MONTH_NAMES.indexOf(monthStr.toLowerCase());
  return new Date(year, mIdx + 1, 0).getDate();
}

function isWeekend(day, monthStr, year) {
  const mIdx = MONTH_NAMES.indexOf(monthStr.toLowerCase());
  if (mIdx === -1) return false;
  const d = new Date(year, mIdx, day);
  const dayOfWeek = d.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

function getLeaveTypeAbbreviation(leaveType) {
  if (!leaveType) return 'OB';

  const typeMap = {
    'Sick Leave': 'SL',
    'Maternity Leave': 'Maternity',
    Maternity: 'Maternity',
    'Official Business': 'OB',
    'Forced Leave': 'FL',
    'Special Privilege Leave': 'SPL',
    'Vacation Leave': 'VL',
  };
  return typeMap[leaveType] || 'OB';
}

function getLeaveCellValue(type, controlNumber) {
  if (type === 'SL') return 'SICKLEAVE';
  if (type === 'Maternity') return 'Maternity';
  if (type === 'VL' || type === 'FL' || type === 'SPL') return type;
  if (type === 'OB') return controlNumber;
  return controlNumber;
}

function styleRange(worksheet, startRow, startCol, endRow, endCol, style) {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cell = worksheet.getCell(r, c);
      if (style.fill) cell.fill = style.fill;
      if (style.font) cell.font = style.font;
      if (style.alignment) cell.alignment = style.alignment;
      if (style.border) cell.border = style.border;
    }
  }
}

export const generateMonthlySummaryExcel = async (monthForms, month, year, allApprovedForms = monthForms) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance Report');

  worksheet.pageSetup.orientation = 'landscape';
  worksheet.pageSetup.fitToPage = true;
  worksheet.pageSetup.fitToWidth = 1;
  worksheet.pageSetup.fitToHeight = 0;

  const maxDays = getDaysInMonth(month, year);
  const employeeMap = {};
  const mIdx = MONTH_NAMES.indexOf(month.toLowerCase());
  const targetYear = parseInt(year, 10);

  monthForms.forEach((req) => {
    const name = req.user_name || 'Unknown';
    if (!employeeMap[name]) {
      employeeMap[name] = { name, leaves: [] };
    }

    const startDateVal = req.details?.start_date || req.details?.departure_date || req.submitted_at || req.created_at;
    const endDateVal = req.details?.end_date || req.details?.arrival_date || req.submitted_at || req.created_at;

    if (startDateVal && endDateVal) {
      const typeStr = req.details?.leave_type || (req.request_type === 'travel' ? 'Official Business' : 'Leave');
      const type = getLeaveTypeAbbreviation(typeStr);
      const controlNumber = resolveControlNumber(req, allApprovedForms);

      const start = new Date(startDateVal);
      const end = new Date(endDateVal);

      const startDay = start.getMonth() === mIdx && start.getFullYear() === targetYear ? start.getDate() : 1;
      const endDay = end.getMonth() === mIdx && end.getFullYear() === targetYear ? end.getDate() : maxDays;

      if (start.getFullYear() < targetYear || (start.getFullYear() === targetYear && start.getMonth() < mIdx)) {
        if (end.getFullYear() > targetYear || (end.getFullYear() === targetYear && end.getMonth() > mIdx)) {
          employeeMap[name].leaves.push({ start: 1, end: maxDays, type, controlNumber });
        } else if (end.getFullYear() === targetYear && end.getMonth() === mIdx) {
          employeeMap[name].leaves.push({ start: 1, end: end.getDate(), type, controlNumber });
        }
      } else if (start.getFullYear() === targetYear && start.getMonth() === mIdx) {
        if (end.getFullYear() === targetYear && end.getMonth() === mIdx) {
          employeeMap[name].leaves.push({ start: start.getDate(), end: end.getDate(), type, controlNumber });
        } else {
          employeeMap[name].leaves.push({ start: start.getDate(), end: maxDays, type, controlNumber });
        }
      }
    }
  });

  const sortedNames = Object.keys(employeeMap).sort((a, b) => a.localeCompare(b));

  const columns = [
    { key: 'idx', width: 6 },
    { key: 'name', width: 30 },
    ...Array.from({ length: 31 }, (_, i) => ({ key: `d${i + 1}`, width: 4.5 })),
    { key: 'undertime', width: 15 },
    { key: 'remarks', width: 25 },
    { key: 'extra', width: 5 },
  ];
  worksheet.columns = columns;

  worksheet.mergeCells('A1:AJ1');
  worksheet.mergeCells('A2:AJ2');

  const titleCell1 = worksheet.getCell('A1');
  titleCell1.value = 'REPORT OF ATTENDANCE OF CENRO-OLONGAPO CITY';
  titleCell1.font = { name: 'Times New Roman', size: 14, bold: true };
  titleCell1.alignment = { horizontal: 'center', vertical: 'middle' };

  const titleCell2 = worksheet.getCell('A2');
  titleCell2.value = `FOR THE MONTH OF ${month.toUpperCase()} ${year}`;
  titleCell2.font = { name: 'Times New Roman', size: 12, bold: true };
  titleCell2.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.getRow(1).height = 28;
  worksheet.getRow(2).height = 22;
  worksheet.getRow(3).height = 28;
  worksheet.getRow(4).height = 12;

  const headerRowNum = 5;
  const headerRow = worksheet.getRow(headerRowNum);
  headerRow.height = 26;
  headerRow.getCell(1).value = '#';
  headerRow.getCell(2).value = 'NAME OF PERSONNEL';
  for (let d = 1; d <= 31; d++) {
    headerRow.getCell(d + 2).value = d;
  }
  headerRow.getCell(34).value = 'Undertime';
  headerRow.getCell(35).value = 'REMARKS';

  const thinBorder = {
    top: { style: 'thin', color: { argb: COLORS.BORDER } },
    left: { style: 'thin', color: { argb: COLORS.BORDER } },
    bottom: { style: 'thin', color: { argb: COLORS.BORDER } },
    right: { style: 'thin', color: { argb: COLORS.BORDER } },
  };

  styleRange(worksheet, headerRowNum, 1, headerRowNum, 35, {
    font: { name: 'Times New Roman', size: 10, bold: true },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: thinBorder,
  });
  worksheet.getCell(headerRowNum, 2).alignment = { horizontal: 'left', vertical: 'middle' };

  for (let d = 1; d <= 31; d++) {
    if (d > maxDays) {
      worksheet.getCell(headerRowNum, d + 2).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.GREY_FILL },
      };
    }
  }

  let curRow = headerRowNum + 1;
  sortedNames.forEach((empName, index) => {
    const row = worksheet.getRow(curRow);
    row.height = 24;

    row.getCell(1).value = index + 1;
    row.getCell(2).value = empName;
    row.getCell(34).value = '';
    row.getCell(35).value = '';

    styleRange(worksheet, curRow, 1, curRow, 35, {
      font: { name: 'Times New Roman', size: 9 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: thinBorder,
    });

    row.getCell(1).font = { name: 'Times New Roman', size: 10, bold: true };
    row.getCell(2).font = { name: 'Times New Roman', size: 10, bold: true };
    row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
    row.getCell(35).alignment = { horizontal: 'left', vertical: 'middle' };

    for (let d = 1; d <= 31; d++) {
      const cell = row.getCell(d + 2);
      if (d > maxDays) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREY_FILL } };
      } else if (isWeekend(d, month, year)) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.WEEKEND_FILL } };
        cell.font = { name: 'Times New Roman', size: 9, color: { argb: COLORS.WEEKEND_TEXT } };
      }
    }

    employeeMap[empName].leaves.forEach((lv) => {
      const startCol = lv.start + 2;
      const endCol = lv.end + 2;

      if (startCol < endCol) {
        worksheet.mergeCells(curRow, startCol, curRow, endCol);
      }

      let fillColor = COLORS.OB_FILL;
      let textColor = COLORS.OB_TEXT;
      const val = getLeaveCellValue(lv.type, lv.controlNumber);

      if (lv.type === 'SL') {
        fillColor = COLORS.SL_FILL;
        textColor = COLORS.SL_TEXT;
      } else if (lv.type === 'Maternity') {
        fillColor = COLORS.MAT_FILL;
        textColor = COLORS.MAT_TEXT;
      } else if (lv.type === 'VL' || lv.type === 'FL' || lv.type === 'SPL') {
        fillColor = COLORS.VL_FILL;
        textColor = COLORS.VL_TEXT;
      }

      styleRange(worksheet, curRow, startCol, curRow, endCol, {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } },
        font: { name: 'Times New Roman', size: 8.5, bold: true, color: { argb: textColor } },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: thinBorder,
      });

      worksheet.getCell(curRow, startCol).value = val;
    });

    curRow++;
  });

  const legendRow = curRow + 1;
  worksheet.getRow(legendRow).height = 22;

  const legends = [
    { text: 'SICKLEAVE', fill: COLORS.SL_FILL, textColor: COLORS.SL_TEXT, col: 3, span: 4 },
    { text: 'Maternity', fill: COLORS.MAT_FILL, textColor: COLORS.MAT_TEXT, col: 8, span: 4 },
    { text: 'Official Business', fill: COLORS.OB_FILL, textColor: COLORS.OB_TEXT, col: 13, span: 5 },
    { text: 'FL/SPL/VL', fill: COLORS.VL_FILL, textColor: COLORS.VL_TEXT, col: 19, span: 4 },
    { text: 'Saturday/Sunday/Holiday', fill: COLORS.WEEKEND_FILL, textColor: COLORS.WEEKEND_TEXT, col: 24, span: 8 },
  ];

  legends.forEach((leg) => {
    worksheet.mergeCells(legendRow, leg.col, legendRow, leg.col + leg.span - 1);
    const cell = worksheet.getCell(legendRow, leg.col);
    cell.value = leg.text;
    cell.font = { name: 'Times New Roman', size: 8, bold: true, color: { argb: leg.textColor } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: leg.fill } };
    cell.border = thinBorder;
  });

  const sigRow = legendRow + 8;
  for (let i = 0; i < 12; i++) {
    worksheet.getRow(sigRow + i).height = 22;
  }

  worksheet.mergeCells(sigRow, 2, sigRow, 10);
  worksheet.getCell(sigRow, 2).value = 'Prepared/Reviewed by:';
  worksheet.getCell(sigRow, 2).font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell(sigRow, 2).alignment = { horizontal: 'left', vertical: 'middle' };

  worksheet.mergeCells(sigRow + 5, 2, sigRow + 5, 10);
  worksheet.getCell(sigRow + 5, 2).value = 'MARICA PIA R. DIMALANTA-LICO';
  worksheet.getCell(sigRow + 5, 2).font = { name: 'Times New Roman', size: 11, bold: true, underline: true };
  worksheet.getCell(sigRow + 5, 2).alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells(sigRow + 6, 2, sigRow + 6, 12);
  worksheet.getCell(sigRow + 6, 2).value = 'FIII/Chief, CDS and in concurrent capacity as Chief, PSU';
  worksheet.getCell(sigRow + 6, 2).font = { name: 'Times New Roman', size: 9 };
  worksheet.getCell(sigRow + 6, 2).alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells(sigRow, 29, sigRow, 35);
  worksheet.getCell(sigRow, 29).value = 'Approved by:';
  worksheet.getCell(sigRow, 29).font = { name: 'Times New Roman', size: 10 };
  worksheet.getCell(sigRow, 29).alignment = { horizontal: 'left', vertical: 'middle' };

  worksheet.mergeCells(sigRow + 5, 29, sigRow + 5, 35);
  worksheet.getCell(sigRow + 5, 29).value = 'EDWARD V. SERNADILLA, RPF, DPA';
  worksheet.getCell(sigRow + 5, 29).font = { name: 'Times New Roman', size: 11, bold: true, underline: true };
  worksheet.getCell(sigRow + 5, 29).alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells(sigRow + 6, 29, sigRow + 6, 35);
  worksheet.getCell(sigRow + 6, 29).value = 'CENRO';
  worksheet.getCell(sigRow + 6, 29).font = { name: 'Times New Roman', size: 9 };
  worksheet.getCell(sigRow + 6, 29).alignment = { horizontal: 'center', vertical: 'middle' };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Monthly_Attendance_Report_${month}_${year}.xlsx`);
};
