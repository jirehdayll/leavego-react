import * as XLSX from 'xlsx-js-style';

// Color mappings matching the image (RGB hex format for Excel)
const LEAVE_COLORS = {
  'SL': { fill: 'FFFF0000', label: 'SICK LEAVE' }, // Red
  'SICKLEAVE': { fill: 'FFFF0000', label: 'SICK LEAVE' }, // Red
  'Maternity': { fill: 'FF90EE90', label: 'MATERNITY' }, // Light Green
  'OB': { fill: 'FFFFFF00', label: 'OFFICIAL BUSINESS' }, // Yellow
  'FL': { fill: 'FF3399FF', label: 'FL/SPL/VL' }, // Blue
  'SPL': { fill: 'FF3399FF', label: 'SPECIAL PRIVILEGE LEAVE' }, // Blue
  'VL': { fill: 'FFADD8E6', label: 'VACATION LEAVE' }, // Light Blue
  'WELLNESS': { fill: 'FFADD8E6', label: 'WELLNESS LEAVE SPL.' }, // Light Blue
  'Weekend': { fill: 'FF7030A0', label: 'SATURDAY/SUNDAY/HOLIDAY' }, // Purple
  'Regular': { fill: 'FFFFFF00', label: 'REGULAR' }, // Yellow for regular days
  'RegularPurple': { fill: 'FF7030A0', label: 'REGULAR' } // Purple for regular days
};

function getLeaveTypeAbbreviation(typeStr) {
  if (!typeStr) return '';
  const t = typeStr.toLowerCase();
  if (t.includes('sick')) return 'SL';
  if (t.includes('maternity')) return 'Maternity';
  if (t.includes('official business') || t.includes('ob')) return 'OB';
  if (t.includes('vacation') || t.includes('vl')) return 'VL';
  if (t.includes('special') || t.includes('spl')) return 'SPL';
  if (t.includes('force') || t.includes('fl')) return 'FL';
  if (t.includes('wellness')) return 'WELLNESS';
  return t.substring(0, 2).toUpperCase();
}

function isWeekendOrHoliday(day, month, year) {
  const monthNum = new Date(`${month} 1, ${year}`).getMonth();
  const date = new Date(year, monthNum, day);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
}

export const generateMonthlySummaryExcel = (monthForms, month, year) => {
  const wb = XLSX.utils.book_new();

  // Data processing: Group by unique employee name
  const employeeMap = {};
  
  monthForms.forEach(req => {
    const name = req.user_name || 'Unknown';
    if (!employeeMap[name]) {
      employeeMap[name] = { name, leaves: {} };
    }
    
    if (req.details?.start_date && req.details?.end_date) {
      const typeStr = req.details.leave_type || (req.request_type === 'travel' ? 'Official Business' : '');
      const type = getLeaveTypeAbbreviation(typeStr);
      let controlNumber = req.id ? String(req.id).slice(-4) : Math.floor(Math.random() * 10000).toString();
      controlNumber = `${year.toString().slice(-2)}-${controlNumber.padStart(4, '0')}`;
      
      const start = new Date(req.details.start_date);
      const end = new Date(req.details.end_date);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        employeeMap[name].leaves[d.getDate()] = {
          type,
          controlNumber,
          label: LEAVE_COLORS[type]?.label || type
        };
      }
    }
  });

  const sortedNames = Object.keys(employeeMap).sort((a, b) => a.localeCompare(b));

  const getDaysInMonth = (monthStr, yr) => {
    return new Date(yr, new Date(`${monthStr} 1, ${yr}`).getMonth() + 1, 0).getDate();
  };
  const maxDays = getDaysInMonth(month, year);

  // Prepare Table Rows
  const tableRows = [];
  sortedNames.forEach((name, idx) => {
    const row = [idx + 1, name];
    for (let day = 1; day <= 31; day++) {
      const cellData = employeeMap[name].leaves[day];
      if (cellData) {
        // For leave types, show the label instead of control number
        if (cellData.type === 'SL' || cellData.type === 'SICKLEAVE' || 
            cellData.type === 'Maternity' || cellData.type === 'OB' ||
            cellData.type === 'SPL' || cellData.type === 'VL' ||
            cellData.type === 'WELLNESS' || cellData.type === 'FL') {
          row.push(cellData.label);
        } else {
          row.push(cellData.controlNumber || cellData.type);
        }
      } else {
        row.push('');
      }
    }
    row.push('');
    row.push('');
    tableRows.push(row);
  });

  // Prepare Headers
  const tableHeaders = [
    '#',
    'NAME OF PERSONNEL',
    ...Array.from({ length: 31 }, (_, i) => (i + 1).toString()),
    'Undertime',
    'REMARKS'
  ];

  const emptyRow = Array(35).fill('');

  const legendRow = Array(35).fill('');
  legendRow[0] = 'SATURDAY/SUNDAY/HOLIDAY';
  legendRow[5] = 'SICK LEAVE';
  legendRow[11] = 'MATERNITY';
  legendRow[17] = 'OFFICIAL BUSINESS';
  legendRow[23] = 'SPECIAL PRIVILEGE LEAVE';
  legendRow[27] = 'VACATION LEAVE / WELLNESS LEAVE';
  legendRow[31] = 'FL/SPL/VL';

  const sigRow1 = Array(35).fill('');
  sigRow1[2] = 'Prepared/Reviewed by:';
  sigRow1[18] = 'Approved By:';

  const sigRow2 = Array(35).fill('');
  sigRow2[2] = 'MARICA PIA R. DIMALANTA-LICO';
  sigRow2[18] = 'EDWARD V. SERNADILLA, RPF, DPA';

  const sigRow3 = Array(35).fill('');
  sigRow3[2] = 'FIII/Chief, CDS and in concurrent capacity as Chief, PSU';
  sigRow3[18] = 'CENRO';

  const sigRow4 = Array(35).fill('');
  const sigRow5 = Array(35).fill('');
  sigRow5[2] = 'Noted by:';
  
  const sigRow6 = Array(35).fill('');
  const sigRow7 = Array(35).fill('');
  sigRow7[2] = '(Appropriate Officer)';

  // Create single sheet with all data
  const titleData = [
    [`REPORT OF ATTENDANCE OF CENRO-OLONGAPO CITY`],
    [`FOR THE MONTH OF ${month.toUpperCase()} ${year}`],
    [],
    tableHeaders,
    ...tableRows,
    legendRow,
    emptyRow,
    emptyRow,
    emptyRow,
    sigRow1,
    emptyRow,
    emptyRow,
    sigRow2,
    sigRow3,
    emptyRow,
    sigRow5,
    emptyRow,
    sigRow7
  ];

  const ws = XLSX.utils.aoa_to_sheet(titleData);

  const legendR = 4 + tableRows.length;

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 34 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 34 } },
    // Legend merges
    { s: { r: legendR, c: 0 }, e: { r: legendR, c: 4 } },
    { s: { r: legendR, c: 5 }, e: { r: legendR, c: 10 } },
    { s: { r: legendR, c: 11 }, e: { r: legendR, c: 16 } },
    { s: { r: legendR, c: 17 }, e: { r: legendR, c: 22 } },
    { s: { r: legendR, c: 23 }, e: { r: legendR, c: 26 } },
    { s: { r: legendR, c: 27 }, e: { r: legendR, c: 30 } },
    { s: { r: legendR, c: 31 }, e: { r: legendR, c: 34 } },
    // Signatories merges
    { s: { r: legendR + 4, c: 2 }, e: { r: legendR + 4, c: 10 } },
    { s: { r: legendR + 4, c: 18 }, e: { r: legendR + 4, c: 26 } },
    { s: { r: legendR + 7, c: 2 }, e: { r: legendR + 7, c: 10 } },
    { s: { r: legendR + 7, c: 18 }, e: { r: legendR + 7, c: 26 } },
    { s: { r: legendR + 8, c: 2 }, e: { r: legendR + 8, c: 15 } },
    { s: { r: legendR + 8, c: 18 }, e: { r: legendR + 8, c: 26 } },
    { s: { r: legendR + 10, c: 2 }, e: { r: legendR + 10, c: 10 } },
    { s: { r: legendR + 12, c: 2 }, e: { r: legendR + 12, c: 10 } }
  ];

  ws['!cols'] = [
    { wch: 4 }, // #
    { wch: 30 }, // NAME
    ...Array.from({ length: 31 }, () => ({ wch: 4 })), // days 1-31
    { wch: 10 }, // Undertime
    { wch: 15 } // REMARKS
  ];

  // Apply styling to cells
  const range = XLSX.utils.decode_range(ws['!ref']);
  
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellAddress];
      
      if (!cell) continue;

      // Title rows
      if (R === 0) {
        cell.s = { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } };
      }
      if (R === 1) {
        cell.s = { font: { bold: true, sz: 12 }, alignment: { horizontal: 'center' } };
      }
      
      // Grid headers and cells
      if (R >= 3 && R < legendR) {
        cell.s = cell.s || {};
        cell.s.border = {
          top: { style: 'thin', color: { rgb: 'FF000000' } }, 
          bottom: { style: 'thin', color: { rgb: 'FF000000' } },
          left: { style: 'thin', color: { rgb: 'FF000000' } }, 
          right: { style: 'thin', color: { rgb: 'FF000000' } }
        };

        if (R === 3) {
          // Headers
          cell.s.font = { bold: true };
          cell.s.alignment = { horizontal: 'center', vertical: 'center' };
          cell.s.fill = { fgColor: { rgb: 'FFFFFFFF' } };
          
          if (C >= 2 && C <= 32) {
            const day = C - 1;
            const isWkend = isWeekendOrHoliday(day, month, year);
            if (isWkend) {
              cell.s.fill = { fgColor: { rgb: LEAVE_COLORS.Weekend.fill } };
            }
          }
        } else {
          // Data rows
          if (C === 0) {
            cell.s.font = { bold: true };
            cell.s.alignment = { horizontal: 'center', vertical: 'center' };
          } else if (C === 1) {
            cell.s.font = { bold: true };
            cell.s.alignment = { vertical: 'center' };
          } else if (C >= 2 && C <= 32) {
            const day = C - 1;
            const employeeName = tableRows[R - 4][1];
            const leaveInfo = employeeMap[employeeName]?.leaves[day];
            
            if (day > maxDays) {
              cell.s.fill = { fgColor: { rgb: 'FFC8C8C8' } };
              cell.v = '';
            }
            
            const isWkend = isWeekendOrHoliday(day, month, year);
            if (isWkend) {
              cell.s.fill = { fgColor: { rgb: LEAVE_COLORS.Weekend.fill } };
              cell.v = ''; // clear weekend text
            } else if (leaveInfo && LEAVE_COLORS[leaveInfo.type]) {
              cell.s.fill = { fgColor: { rgb: LEAVE_COLORS[leaveInfo.type].fill } };
              cell.s.font = { bold: true, sz: 8 };
              cell.s.alignment = { horizontal: 'center', vertical: 'center' };
            }
          }
        }
      }

      // Legend styling
      if (R === legendR) {
        const legendMap = {
          0: LEAVE_COLORS.Weekend,
          5: LEAVE_COLORS.SL,
          11: LEAVE_COLORS.Maternity,
          17: LEAVE_COLORS.OB,
          23: LEAVE_COLORS.SPL,
          27: LEAVE_COLORS.VL,
          31: LEAVE_COLORS.FL
        };
        
        if (legendMap[C]) {
          cell.s = {
            fill: { fgColor: { rgb: legendMap[C].fill } },
            font: { bold: true, sz: 10, color: { rgb: 'FF000000' } },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
      }

      // Signatories bolding
      if (R === legendR + 7 || R === legendR + 12) {
        if (C === 2 || C === 18) {
          cell.s = { font: { bold: true, sz: 11 } };
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');

  // Save the file
  XLSX.writeFile(wb, `Attendance_Report_${month}_${year}.xlsx`);
};
