import React, { useState, useEffect } from 'react';
import { generateMonthlySummaryPDF } from '../lib/monthlySummaryPDF';

const PDFViewer = () => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [testData, setTestData] = useState([]);

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Sample test data for demonstration
  const createTestData = () => {
    return [
      {
        user_name: 'John Doe',
        details: {
          leave_type: 'Sick Leave',
          start_date: `${year}-${String(month + 1).padStart(2, '0')}-05`,
          end_date: `${year}-${String(month + 1).padStart(2, '0')}-07`,
          num_days: 3
        },
        id: '12345',
        request_type: 'leave'
      },
      {
        user_name: 'Jane Smith',
        details: {
          leave_type: 'Official Business',
          start_date: `${year}-${String(month + 1).padStart(2, '0')}-10`,
          end_date: `${year}-${String(month + 1).padStart(2, '0')}-12`,
          num_days: 3
        },
        id: '67890',
        request_type: 'travel'
      },
      {
        user_name: 'Robert Johnson',
        details: {
          leave_type: 'Vacation Leave',
          start_date: `${year}-${String(month + 1).padStart(2, '0')}-15`,
          end_date: `${year}-${String(month + 1).padStart(2, '0')}-20`,
          num_days: 6
        },
        id: '54321',
        request_type: 'leave'
      }
    ];
  };

  const generatePDF = async () => {
    setLoading(true);
    try {
      // Use test data for demonstration
      const data = testData.length > 0 ? testData : createTestData();
      
      // Generate PDF as blob
      const pdfBlob = await generatePDFAsBlob(data, MONTHS[month], year);
      
      // Create URL for blob
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      
      // Clean up previous URL if exists
      return () => {
        if (url) URL.revokeObjectURL(url);
      };
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Modified function to return blob instead of saving
  const generatePDFAsBlob = async (data, month, year) => {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    
    const pdf = new jsPDF('landscape', 'pt', 'legal');
    
    // === LINE 18-31: HEADER SETUP ===
    // These lines set up the main title and month/year display
    const currentDate = new Date();
    const reportMonth = month || currentDate.toLocaleString('default', { month: 'long' });
    const reportYear = year || currentDate.getFullYear();
    
    pdf.setFontSize(11);
    pdf.setFont('times', 'bold');
    pdf.text('REPORT OF ATTENDANCE OF CENRO-OLONGAPO CITY', pdf.internal.pageSize.width / 2, 40, { align: 'center' });
    pdf.text(`FOR THE MONTH OF ${reportMonth.toUpperCase()} ${reportYear}`, pdf.internal.pageSize.width / 2, 55, { align: 'center' });

    // === LINE 33-56: DATA PROCESSING ===
    // This section processes the leave data and groups by employee
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

    // === LINE 58-76: TABLE ROWS PREPARATION ===
    // This creates the table rows with employee data
    const sortedNames = Object.keys(employeeMap).sort((a, b) => a.localeCompare(b));
    const tableRows = [];
    
    sortedNames.forEach((name, idx) => {
      const row = [ (idx + 1).toString(), name ];
      for (let day = 1; day <= 31; day++) {
        const cellData = employeeMap[name].leaves[day];
        if (cellData) {
          row.push(cellData.type === 'Weekend' ? '' : cellData.controlNumber || cellData.type);
        } else {
          row.push('');
        }
      }
      row.push('');
      row.push('');
      tableRows.push(row);
    });

    // === LINE 78-87: TABLE HEADERS ===
    // This sets up the column headers (#, Name, 1-31, Undertime, Remarks)
    const tableHeaders = [
      [
        { content: '#', styles: { halign: 'center' } },
        { content: 'NAME OF PERSONNEL', styles: { halign: 'left' } },
        ...Array.from({ length: 31 }, (_, i) => ({ content: (i + 1).toString(), styles: { halign: 'center', cellWidth: 22 } })),
        { content: 'Undertime', styles: { halign: 'center' } },
        { content: 'REMARKS', styles: { halign: 'center' } }
      ]
    ];

    // === LINE 95-199: TABLE GENERATION ===
    // This is the main table generation with styling and merged cells
    const getDaysInMonth = (monthStr, yr) => {
      return new Date(yr, new Date(`${monthStr} 1, ${yr}`).getMonth() + 1, 0).getDate();
    };
    const maxDays = getDaysInMonth(reportMonth, reportYear);

    autoTable(pdf, {
      startY: 80,
      head: tableHeaders,
      body: tableRows,
      theme: 'grid',
      styles: {
        fontSize: 8,           // === LINE 106: FONT SIZE ===
        cellPadding: 2,         // === LINE 107: CELL PADDING ===
        font: 'times',          // === LINE 108: FONT FAMILY ===
        lineColor: [0, 0, 0],  // === LINE 109: BORDER COLOR ===
        lineWidth: 0.5,         // === LINE 110: BORDER WIDTH ===
        textColor: [0, 0, 0],   // === LINE 111: TEXT COLOR ===
      },
      headStyles: {
        fillColor: [255, 255, 255],  // === LINE 113: HEADER BACKGROUND ===
        textColor: [0, 0, 0],        // === LINE 114: HEADER TEXT COLOR ===
        fontStyle: 'bold',            // === LINE 115: HEADER FONT STYLE ===
        halign: 'center',             // === LINE 116: HEADER ALIGNMENT ===
        cellPadding: 1                // === LINE 117: HEADER PADDING ===
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center', fontStyle: 'bold' }, // Index column
        1: { cellWidth: 150, fontStyle: 'bold' },                   // Name column
        33: { cellWidth: 60 },                                     // Undertime column
        34: { cellWidth: 120 }                                     // === LINE 124: REMARKS WIDTH ===
      },
      margin: { left: 20, right: 20 },  // === LINE 126: MARGINS ===
      didParseCell: function (data) {
        // === LINES 127-153: CELL STYLING LOGIC ===
        if (data.section === 'body' && data.column.index >= 2 && data.column.index <= 32) {
          const day = data.column.index - 1;
          
          if (day > maxDays) {
            data.cell.styles.fillColor = [200, 200, 200];
            return;
          }

          const employeeName = data.row.raw[1];
          const leaveInfo = employeeMap[employeeName]?.leaves[day];
          const isWkend = isWeekendOrHoliday(day, reportMonth, reportYear);
          
          if (isWkend) {
             data.cell.styles.fillColor = [112, 48, 160];  // Weekend color
             data.cell.styles.textColor = [0, 0, 0];       // Weekend text color
             data.cell.text = [];
          } else if (leaveInfo) {
             // === LINES 141-146: LEAVE CELL STYLING ===
             const leaveColors = getLeaveColors(leaveInfo.type);
             data.cell.styles.fillColor = leaveColors.color;
             data.cell.styles.textColor = leaveColors.text;
             data.cell.styles.halign = 'center';
             data.cell.styles.fontSize = 6; 
             data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      willDrawCell: function(data) {
        // === LINES 155-198: MERGED CELLS LOGIC ===
        if (data.section === 'body' && data.column.index >= 2 && data.column.index <= 32) {
          const day = data.column.index - 1;
          const employeeName = data.row.raw[1];
          
          const leaveInfo = employeeMap[employeeName]?.leaves[day];
          if (leaveInfo && leaveInfo.type !== 'Weekend') {
            let duration = 1;
            let currentDay = day + 1;
            
            while (employeeMap[employeeName]?.leaves[currentDay]?.type === leaveInfo.type) {
              duration++;
              currentDay++;
            }
            
            if (duration > 1) {
              const pdf = data.doc;
              const cellWidth = data.cell.width * duration;
              const cellX = data.cell.x;
              const cellY = data.cell.y;
              const cellHeight = data.cell.height;
              
              const leaveColors = getLeaveColors(leaveInfo.type);
              pdf.setFillColor(...leaveColors.color);
              pdf.rect(cellX, cellY, cellWidth, cellHeight, 'F');
              
              pdf.setFont('times', 'bold');
              pdf.setFontSize(6);
              pdf.setTextColor(...leaveColors.text);
              pdf.text(leaveInfo.controlNumber || leaveInfo.type, cellX + cellWidth/2, cellY + cellHeight/2 + 2, { align: 'center' });
              
              data.cell.text = [];
              data.cell.styles.fillColor = false;
            }
          }
        }
      }
    });

    // === LINES 201-229: LEGEND ===
    const finalY = pdf.lastAutoTable.finalY + 15;
    let currentX = 20;
    
    const legendGroups = [
      { key: 'Weekend' },
      { key: 'SL' },
      { key: 'Maternity' },
      { key: 'OB' },
      { key: 'VL' }
    ];

    legendGroups.forEach(item => {
      const colorInfo = getLeaveColors(item.key);
      if (colorInfo) {
        pdf.setFillColor(...colorInfo.color);
        pdf.rect(currentX, finalY, 150, 15, 'F');
        
        pdf.setFontSize(8);
        pdf.setFont('times', 'bold');
        pdf.setTextColor(0,0,0);
        pdf.text(colorInfo.label, currentX + 75, finalY + 10, { align: 'center' });
        
        currentX += 160;
      }
    });

    // === LINES 231-248: SIGNATORIES ===
    const footerY = pdf.internal.pageSize.height - 100;
    
    pdf.setFontSize(10);
    pdf.setFont('times', 'normal');
    pdf.setTextColor(0,0,0);
    pdf.text('Prepared/Reviewed by:', 130, footerY);
    pdf.text('Approved By:', 580, footerY);
    
    pdf.setFontSize(11);
    pdf.setFont('times', 'bold');
    pdf.text('MARICA PIA R. DIMALANTA-LICO', 130, footerY + 40);
    pdf.text('EDWARD V. SERNADILLA, RPF, DPA', 580, footerY + 40);

    pdf.setFontSize(9);
    pdf.setFont('times', 'normal');
    pdf.text('FIII/Chief, CDS and in concurrent capacity as Chief, PSU', 130, footerY + 55);
    pdf.text('CENRO', 580, footerY + 55);

    // Return as blob instead of saving
    return pdf.output('blob');
  };

  // Helper functions
  const getLeaveColors = (type) => {
    const colors = {
      'SL': { color: [255, 0, 0], label: 'SICK LEAVE', text: [0, 0, 0] },
      'Maternity': { color: [144, 238, 144], label: 'MATERNITY', text: [0, 0, 0] },
      'OB': { color: [255, 255, 0], label: 'OFFICIAL BUSINESS', text: [0, 0, 0] },
      'FL': { color: [51, 153, 255], label: 'FL/SPL/VL', text: [0, 0, 0] },
      'SPL': { color: [51, 153, 255], label: 'FL/SPL/VL', text: [0, 0, 0] },
      'VL': { color: [51, 153, 255], label: 'FL/SPL/VL', text: [0, 0, 0] },
      'Weekend': { color: [112, 48, 160], label: 'SATURDAY/SUNDAY/HOLIDAY', text: [0, 0, 0] }
    };
    return colors[type] || colors['OB'];
  };

  const getLeaveTypeAbbreviation = (leaveType) => {
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
  };

  const isWeekendOrHoliday = (day, month, year) => {
    const dateStr = `${month} 1, ${year}`;
    const dt = new Date(dateStr);
    if (isNaN(dt.getTime())) return false;
    
    const testDate = new Date(year, dt.getMonth(), day);
    const dayOfWeek = testDate.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  useEffect(() => {
    setTestData(createTestData());
  }, [month, year]);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Monthly Summary PDF Viewer</h1>
      
      {/* Controls */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Month: 
            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} style={{ marginLeft: '10px', padding: '5px' }}>
              {MONTHS.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
          </label>
          <label style={{ marginLeft: '20px' }}>
            Year: 
            <input 
              type="number" 
              value={year} 
              onChange={(e) => setYear(parseInt(e.target.value))} 
              style={{ marginLeft: '10px', padding: '5px', width: '80px' }}
            />
          </label>
        </div>
        <button 
          onClick={generatePDF} 
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Generating...' : 'Generate PDF'}
        </button>
      </div>

      {/* PDF Display */}
      {pdfUrl && (
        <div style={{ border: '1px solid #ccc', borderRadius: '5px' }}>
          <iframe
            src={pdfUrl}
            style={{
              width: '100%',
              height: '800px',
              border: 'none'
            }}
            title="Monthly Summary PDF"
          />
        </div>
      )}

      {/* Code Guide */}
      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '5px' }}>
        <h2>📝 How to Modify the PDF Code</h2>
        
        <div style={{ marginBottom: '15px' }}>
          <h3>🎨 Colors & Styling</h3>
          <p><strong>Line 6-12:</strong> Change leave type colors</p>
          <code style={{ display: 'block', backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '3px', fontSize: '12px' }}>
{`'SL': { color: [255, 0, 0], label: 'SICK LEAVE', text: [0, 0, 0] }`}
          </code>
          <p>Format: [Red, Green, Blue] values from 0-255</p>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <h3>📏 Layout & Sizing</h3>
          <p><strong>Line 106:</strong> Font size (change 8 to larger/smaller)</p>
          <p><strong>Line 107:</strong> Cell padding (change 2 for spacing)</p>
          <p><strong>Line 108:</strong> Font family ('times', 'helvetica', 'courier')</p>
          <p><strong>Line 124:</strong> Remarks column width (change 120)</p>
          <p><strong>Line 126:</strong> Page margins (change left: 20, right: 20)</p>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <h3>📄 Headers & Text</h3>
          <p><strong>Line 25-26:</strong> Main title text</p>
          <p><strong>Line 113:</strong> Header background color [255, 255, 255] = white</p>
          <p><strong>Line 114:</strong> Header text color [0, 0, 0] = black</p>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <h3>👥 Signatories</h3>
          <p><strong>Lines 237-244:</strong> Names and titles</p>
          <code style={{ display: 'block', backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '3px', fontSize: '12px' }}>
{`pdf.text('MARICA PIA R. DIMALANTA-LICO', 130, footerY + 40);
pdf.text('EDWARD V. SERNADILLA, RPF, DPA', 580, footerY + 40);`}
          </code>
          <p>Format: pdf.text('Name', x-position, y-position);</p>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <h3>🎯 Weekend Color</h3>
          <p><strong>Line 141:</strong> Weekend background [112, 48, 160] = purple</p>
          <p><strong>Line 142:</strong> Weekend text color [0, 0, 0] = black</p>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <h3>📊 Column Widths</h3>
          <p><strong>Line 120:</strong> Index column width (25)</p>
          <p><strong>Line 121:</strong> Name column width (150)</p>
          <p><strong>Line 123:</strong> Undertime column width (60)</p>
          <p><strong>Line 124:</strong> Remarks column width (120)</p>
        </div>

        <p><strong>💡 Tip:</strong> The numbers in brackets are RGB colors. [0,0,0] = black, [255,255,255] = white</p>
      </div>
    </div>
  );
};

export default PDFViewer;
