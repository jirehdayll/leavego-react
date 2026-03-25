import jsPDF from 'jspdf';

/**
 * Converts an image URL/path to a base64 data URL
 */
async function loadImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Generates a Travel Order PDF matching the government format.
 */
export async function generateTravelOrderPDF(data) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;

  // ── Header ──────────────────────────────────────────────────────────────────
  try {
    const denrLogo = await loadImageAsBase64('/denr-logo.png');
    doc.addImage(denrLogo, 'PNG', 15, 8, 22, 22);
  } catch (_) {}

  try {
    const bagongLogo = await loadImageAsBase64('/bagong-pilipinas.png');
    doc.addImage(bagongLogo, 'PNG', W - 37, 8, 22, 22);
  } catch (_) {}

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Department of Environment and Natural Resources', W / 2, 12, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Community Environment and Natural Resources Office, Olongapo City', W / 2, 17, { align: 'center' });

  // Red line separator
  doc.setDrawColor(180, 0, 0);
  doc.setLineWidth(1.2);
  doc.line(15, 33, W - 15, 33);
  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 0, 0);

  // ── Title ───────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('TRAVEL ORDER', W / 2, 43, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`NO. ${data.travel_no || '___________'}`, W / 2, 50, { align: 'center' });
  doc.line(W / 2 - 10, 51, W / 2 + 30, 51);

  // ── Fields ──────────────────────────────────────────────────────────────────
  const left = 15;
  const mid = W / 2 + 5;
  let y = 62;
  const lineH = 8;

  const field = (label, value, x, width, row_y) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`${label}:`, x, row_y);
    doc.setFont('helvetica', 'normal');
    doc.text(value || '', x + doc.getTextWidth(label + ': ') + 2, row_y);
    doc.setDrawColor(180, 180, 180);
    doc.line(x + doc.getTextWidth(label + ': ') + 1, row_y + 0.5, x + width, row_y + 0.5);
    doc.setDrawColor(0, 0, 0);
  };

  field('Name', data.full_name || '', left, 85, y);
  field('Salary', data.salary || '', mid, 85, y);
  y += lineH;

  field('Position/Designation', data.position || '', left, 85, y);
  field('Office', data.office || 'CENRO', mid, 85, y);
  y += lineH;

  field('Departure Date', data.departure_date || data.start_date || '', left, 85, y);
  field('Arrival Date', data.arrival_date || data.end_date || '', mid, 85, y);
  y += lineH;

  field('Destination', data.destination || '', left, 85, y);
  field('Official Station', data.official_station || 'Olongapo City', mid, 85, y);
  y += lineH + 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('PURPOSE :', left, y);
  doc.setFont('helvetica', 'normal');
  const purposeText = data.purpose || '';
  const wrapped = doc.splitTextToSize(purposeText, W - left - 20);
  doc.text(wrapped, left + 22, y);
  y += Math.max(wrapped.length * 5, 8) + 8;

  // ── Per Diems ───────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Per Diems/Expenses Allowed : ${data.per_diems !== false ? 'YES' : 'NO'}`, left, y);
  y += 6;
  doc.text(`Assistants or Laborers Allowed : ${data.assistants_allowed ? 'YES' : 'NO'}`, left, y);
  y += 6;
  doc.text(`Appropriations to which travel should be charged : ${data.appropriations || 'CDS'}`, left, y);
  y += 6;
  doc.text(`Remarks or special instructions : ${data.remarks || 'Gather documentation and prepare the necessary report.'}`, left, y);
  y += 12;

  // ── Certification ───────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CERTIFICATION / UNDERTAKING:', left, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const certText = 'I certify that the above travel is necessary and is related to the official function of the said office. I further certify that the travel is true and correct to the best of my knowledge and that I bind myself to be accountable for any misrepresentation or inappropriate claims in relation to this travel order.\n\nHence, I am recommending for its approval.';
  const certWrapped = doc.splitTextToSize(certText, W - left * 2);
  doc.text(certWrapped, left, y);
  y += certWrapped.length * 4.5 + 10;

  // ── Signatures ──────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Approved:', left, y);
  doc.setFont('helvetica', 'normal');
  doc.text('Recommended by:', mid + 10, y);
  y += 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('EDWARD V. SERNADILLA, RPF, DPA', left, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('OIC, CENRO', left, y);
  y += 15;

  // ── Authorization ───────────────────────────────────────────────────────────
  doc.setLineWidth(0.5);
  doc.line(left, y, W - left, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const authText = 'I hereby authorize the Accountant to deduct the corresponding amount of the unliquidated cash advance from any succeeding salary for my failure to liquidate this travel within the prescribed thirty-day period upon return to my permanent official station pursuant to item 5.1.3 COA Circular 97-002 dated February 10, 1997 and Sec. 16 EO No. 248 dated May 29, 1995.';
  const authWrapped = doc.splitTextToSize(authText, W - left * 2);
  doc.text(authWrapped, left, y);
  y += authWrapped.length * 4.2 + 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text((data.full_name || 'Employee Name').toUpperCase(), W - left, y, { align: 'right' });
  y += 12;

  // ── Footer ──────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text('"Malinis na Kapaligiran at Mayamang Kalikasan para sa Buong Sambayanan."', W / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Fiscal L.D. Baduria St. Upper Kalaklan, Olongapo City, 2200', W / 2, y, { align: 'center' });
  y += 4;
  doc.text('Landline: 047 224 2669 | Email: cenroolongapo@denr.gov.ph | www.r3.denr.gov.ph', W / 2, y, { align: 'center' });

  doc.save(`Travel_Order_${(data.full_name || 'Employee').replace(/\s+/g, '_')}.pdf`);
}

/**
 * Generates an Application for Leave PDF matching CSF No. 6 format.
 */
export async function generateLeaveApplicationPDF(data) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;

  // ── Header ──────────────────────────────────────────────────────────────────
  try {
    const denrLogo = await loadImageAsBase64('/denr-logo.png');
    doc.addImage(denrLogo, 'PNG', 15, 6, 20, 20);
  } catch (_) {}

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Civil Service Form No. 6', 15, 5);
  doc.text('Revised 2020', 15, 8.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Republic of the Philippines', W / 2, 10, { align: 'center' });
  doc.text('Department of Environment and Natural Resources', W / 2, 14.5, { align: 'center' });
  doc.text('PROVINCIAL ENVIRONMENT AND NATURAL RESOURCES OFFICE', W / 2, 19, { align: 'center' });
  doc.text('REGION III, Iba, Zambales', W / 2, 23.5, { align: 'center' });

  // Stamp box
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.rect(W - 45, 8, 30, 10);
  doc.text('Stamp of Date of Receipt', W - 30, 14, { align: 'center' });

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('APPLICATION FOR LEAVE', W / 2, 33, { align: 'center' });

  // ── Table ───────────────────────────────────────────────────────────────────
  const left = 15;
  const right = W - 15;
  const tableW = right - left;
  let y = 38;

  const drawRect = (x, yy, w, h) => doc.rect(x, yy, w, h);
  const cellText = (text, x, yy, opts = {}) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(opts.size || 8);
    doc.text(text, x, yy, opts);
  };

  // Row 1: Office/Dept | Name
  const row1H = 10;
  drawRect(left, y, tableW * 0.3, row1H);
  drawRect(left + tableW * 0.3, y, tableW * 0.7, row1H);
  cellText('1. OFFICE/DEPARTMENT', left + 1, y + 4, { size: 7 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(data.department || '', left + 3, y + 8);
  cellText('2. NAME :', left + tableW * 0.3 + 2, y + 4, { size: 7 });
  cellText('(Last)', left + tableW * 0.3 + 25, y + 4, { size: 6.5 });
  cellText('(First)', left + tableW * 0.55, y + 4, { size: 6.5 });
  cellText('(Middle)', left + tableW * 0.75, y + 4, { size: 6.5 });
  // Parse name
  const nameParts = (data.full_name || '').split(' ');
  const lastName = nameParts[nameParts.length - 1] || '';
  const firstName = nameParts[0] || '';
  const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
  doc.setFontSize(8);
  doc.text(lastName, left + tableW * 0.3 + 25, y + 8);
  doc.text(firstName, left + tableW * 0.55, y + 8);
  doc.text(middleName, left + tableW * 0.75, y + 8);
  y += row1H;

  // Row 2: Date of Filing | Position | Salary
  const row2H = 10;
  drawRect(left, y, tableW * 0.25, row2H);
  drawRect(left + tableW * 0.25, y, tableW * 0.35, row2H);
  drawRect(left + tableW * 0.6, y, tableW * 0.4, row2H);
  cellText('3. DATE OF FILING', left + 1, y + 4, { size: 7 });
  doc.setFontSize(8);
  doc.text(data.date_of_filing || new Date().toLocaleDateString(), left + 3, y + 8);
  cellText('4. POSITION', left + tableW * 0.25 + 2, y + 4, { size: 7 });
  doc.setFontSize(8);
  doc.text(data.position || '', left + tableW * 0.25 + 3, y + 8);
  cellText('5. SALARY', left + tableW * 0.6 + 2, y + 4, { size: 7 });
  doc.setFontSize(8);
  doc.text(data.salary || '', left + tableW * 0.6 + 20, y + 8);
  y += row2H;

  // Section 6 header
  const secH = 7;
  drawRect(left, y, tableW, secH);
  doc.setFillColor(220, 220, 220);
  doc.rect(left, y, tableW, secH, 'F');
  doc.setDrawColor(0);
  doc.rect(left, y, tableW, secH);
  cellText('6. DETAILS OF APPLICATION', W / 2, y + 5, { align: 'center', bold: true, size: 8.5 });
  y += secH;

  // 6A Type of Leave | 6B Details
  const col1 = tableW * 0.5;
  const col2 = tableW * 0.5;
  const detailsH = 90;
  drawRect(left, y, col1, detailsH);
  drawRect(left + col1, y, col2, detailsH);

  let ly = y + 5;
  cellText('6A TYPE OF LEAVE TO BE AVAILED OF', left + 2, ly, { size: 7, bold: true });
  ly += 5;

  const leaveTypes = [
    'Vacation Leave', 'Mandatory/Forced Leave', 'Sick Leave', 'Maternity Leave',
    'Paternity Leave', 'Special Privilege Leave', 'Solo Parent Leave', 'Study Leave',
    '10-Day VAWC Leave', 'Rehabilitation Privilege', 'Special Leave Benefits for Women',
    'Special Emergency (Calamity) Leave', 'Adoption Leave'
  ];
  const selectedType = data.leave_type || '';
  leaveTypes.forEach((lt) => {
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    const isSelected = selectedType.toLowerCase().includes(lt.toLowerCase().split(' ')[0].toLowerCase());
    doc.rect(left + 3, ly - 3, 3, 3);
    if (isSelected) {
      doc.setFillColor(0, 0, 0);
      doc.rect(left + 3.5, ly - 2.5, 2, 2, 'F');
      doc.setFillColor(255, 255, 255);
    }
    doc.text(lt, left + 8, ly);
    ly += 5;
  });

  // 6B
  let ry = y + 5;
  const rx = left + col1 + 2;
  cellText('6B DETAILS OF LEAVE', rx, ry, { size: 7, bold: true });
  ry += 6;
  cellText('In case of Vacation/Special Privilege Leave:', rx, ry, { size: 6.5, bold: false });
  ry += 5;
  doc.rect(rx, ry - 3, 3, 3);
  doc.setFontSize(6.5);
  doc.text('Within the Philippines ________________', rx + 5, ry);
  ry += 5;
  doc.rect(rx, ry - 3, 3, 3);
  doc.text('Abroad (Specify) __________________', rx + 5, ry);
  ry += 7;
  cellText('In case of Sick Leave:', rx, ry, { size: 6.5, bold: false });
  ry += 5;
  doc.rect(rx, ry - 3, 3, 3);
  doc.text('In Hospital (Specify Illness) _________', rx + 5, ry);
  ry += 5;
  doc.rect(rx, ry - 3, 3, 3);
  doc.text('Out Patient (Specify Illness) _________', rx + 5, ry);
  ry += 7;
  cellText('In case of Special Leave Benefits for Women:', rx, ry, { size: 6.5, bold: false });
  ry += 5;
  doc.text('(Specify Illness) ____________________', rx + 3, ry);
  ry += 7;
  cellText('In case of Study Leave:', rx, ry, { size: 6.5, bold: false });
  ry += 5;
  doc.rect(rx, ry - 3, 3, 3);
  doc.text("Completion of Master's Degree", rx + 5, ry);
  ry += 5;
  doc.rect(rx, ry - 3, 3, 3);
  doc.text('BAR/Board Examination Review', rx + 5, ry);
  ry += 6;
  cellText('Other purpose:', rx, ry, { size: 6.5, bold: false });
  ry += 5;
  doc.rect(rx, ry - 3, 3, 3);
  doc.text('Monetization of Leave Credits', rx + 5, ry);
  ry += 5;
  doc.rect(rx, ry - 3, 3, 3);
  doc.text('Terminal Leave', rx + 5, ry);
  y += detailsH;

  // 6C & 6D
  const row6cdH = 18;
  drawRect(left, y, col1, row6cdH);
  drawRect(left + col1, y, col2, row6cdH);
  cellText('6C NUMBER OF WORKING DAYS APPLIED FOR', left + 2, y + 5, { size: 7, bold: true });
  doc.setFontSize(9);
  doc.text(data.num_days || '___', left + 5, y + 11);
  cellText('INCLUSIVE DATES', left + 2, y + 15, { size: 7 });

  cellText('6D COMPUTATION', left + col1 + 2, y + 5, { size: 7, bold: true });
  doc.setFontSize(7);
  doc.rect(left + col1 + 2, y + 7, 3, 3);
  doc.text('Not Requested', left + col1 + 7, y + 10);
  doc.setFillColor(0, 0, 0);
  doc.rect(left + col1 + 2.5, y + 12.5, 2, 2, 'F');
  doc.setFillColor(255, 255, 255);
  doc.rect(left + col1 + 2, y + 12, 3, 3);
  doc.text('Requested', left + col1 + 7, y + 14.5);
  doc.setFontSize(7);
  const dates = `${data.start_date || ''} to ${data.end_date || ''}`;
  doc.text(dates, left + 5, y + 8);
  y += row6cdH;

  // Signature line
  drawRect(left, y, tableW, 8);
  doc.setFontSize(7);
  doc.text('(Signature of Applicant)', W - left - 2, y + 5.5, { align: 'right' });
  y += 8;

  // Section 7 header
  drawRect(left, y, tableW, secH);
  doc.setFillColor(220, 220, 220);
  doc.rect(left, y, tableW, secH, 'F');
  doc.setDrawColor(0);
  doc.rect(left, y, tableW, secH);
  cellText('7. DETAILS OF ACTION ON APPLICATION', W / 2, y + 5, { align: 'center', bold: true, size: 8.5 });
  y += secH;

  // 7A & 7B
  const row7H = 38;
  drawRect(left, y, col1, row7H);
  drawRect(left + col1, y, col2, row7H);
  cellText('7A CERTIFICATION OF LEAVE CREDITS', left + 2, y + 5, { size: 7, bold: true });
  doc.setFontSize(7);
  doc.text('As of _______________', left + 2, y + 10);

  // Small table for leave credits
  const tblX = left + 5;
  const tblY = y + 13;
  doc.rect(tblX, tblY, 35, 5); // header row
  doc.rect(tblX + 35, tblY, 15, 5);
  doc.rect(tblX + 50, tblY, 15, 5);
  doc.setFontSize(6);
  doc.text('', tblX + 2, tblY + 3.5);
  doc.text('Vacation Leave', tblX + 36, tblY + 3.5);
  doc.text('Sick Leave', tblX + 51, tblY + 3.5);
  ['Total Earned', 'Less this application', 'Balance'].forEach((label, i) => {
    const rowY = tblY + 5 + i * 5;
    doc.rect(tblX, rowY, 35, 5);
    doc.rect(tblX + 35, rowY, 15, 5);
    doc.rect(tblX + 50, rowY, 15, 5);
    doc.text(label, tblX + 2, rowY + 3.5);
  });

  const sigY = y + row7H - 12;
  cellText('DAISY A. FABILEÑA', left + col1 / 2, sigY, { align: 'center', size: 7, bold: true });
  cellText('− AO IV/HRMO', left + col1 / 2, sigY + 4, { align: 'center', size: 7 });

  cellText('7B RECOMMENDATION', left + col1 + 2, y + 5, { size: 7, bold: true });
  doc.setFontSize(7);
  doc.rect(left + col1 + 2, y + 9, 3, 3);
  doc.text('For approval', left + col1 + 7, y + 11.5);
  doc.setFillColor(0, 0, 0);
  doc.rect(left + col1 + 2.5, y + 14.5, 2, 2, 'F');
  doc.setFillColor(255, 255, 255);
  doc.rect(left + col1 + 2, y + 14, 3, 3);
  doc.text('For disapproval due to ___________', left + col1 + 7, y + 16.5);
  y += row7H;

  // 7C & 7D
  const row7cdH = 32;
  drawRect(left, y, col1, row7cdH);
  drawRect(left + col1, y, col2, row7cdH);
  cellText('7.C APPROVED FOR:', left + 2, y + 5, { size: 7, bold: true });
  doc.setFontSize(7);
  doc.text('_______ days with pay', left + 4, y + 10);
  doc.text('_______ days without pay', left + 4, y + 15);
  doc.text('_______ others (Specify)', left + 4, y + 20);

  cellText('7.D DISAPPROVED DUE TO:', left + col1 + 2, y + 5, { size: 7, bold: true });
  for (let i = 0; i < 3; i++) {
    doc.line(left + col1 + 4, y + 12 + i * 5, right - 2, y + 12 + i * 5);
  }

  const apprY = y + row7cdH - 10;
  cellText('EDWARD V. SERNADILLA, RPF, DPA /', W / 2, apprY, { align: 'center', size: 8, bold: true });
  cellText('OIC, CENR Officer', W / 2, apprY + 4.5, { align: 'center', size: 7.5 });
  y += row7cdH;

  doc.save(`Leave_Application_${(data.full_name || 'Employee').replace(/\s+/g, '_')}.pdf`);
}
