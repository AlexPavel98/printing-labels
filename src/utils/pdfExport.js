import { jsPDF } from 'jspdf'
import JsBarcode from 'jsbarcode'

const PROCESS_LABELS = {
  R: 'Reception',
  S1: 'Sorting 1',
  S2: 'Sorting 2',
  P: 'Packing',
  L: 'Lot / Batch',
}

const PROCESS_COLORS = {
  R: [22, 163, 74],
  S1: [37, 99, 235],
  S2: [124, 58, 237],
  P: [234, 88, 12],
  L: [220, 38, 38],
}

/**
 * Generate a Code128 barcode as PNG data URL via canvas
 */
function generateBarcodeDataURL(code, widthMm, heightMm, dpi = 150) {
  const pxPerMm = dpi / 25.4
  const canvas = document.createElement('canvas')

  try {
    JsBarcode(canvas, code, {
      format: 'CODE128',
      displayValue: false,
      margin: 0,
      width: Math.max(1, Math.round(pxPerMm * 0.6)),
      height: Math.round(heightMm * pxPerMm * 0.35),
      background: '#ffffff',
      lineColor: '#000000',
    })
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

/**
 * Draw a single label on jsPDF at position (x, y) in mm
 */
function drawLabel(pdf, { code, supplier, processType, x, y, widthMm, heightMm }) {
  const color = PROCESS_COLORS[processType] || [22, 163, 74]
  const processLabel = PROCESS_LABELS[processType] || processType

  // Border + shadow
  pdf.setDrawColor(209, 213, 219)
  pdf.setLineWidth(0.2)
  pdf.roundedRect(x, y, widthMm, heightMm, 1, 1, 'S')

  // Top accent bar
  const accentH = heightMm * 0.045
  pdf.setFillColor(...color)
  pdf.rect(x, y, widthMm, accentH, 'F')

  // Rounded top of accent bar using a rectangle clipped to top
  const padX = widthMm * 0.04
  const padY = heightMm * 0.05
  let curY = y + accentH + padY

  // Supplier name
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(heightMm * 0.9)
  pdf.setTextColor(17, 24, 39)
  const supplierText = supplier || 'Supplier'
  const maxWidth = widthMm - padX * 2
  const truncated = pdf.getTextWidth(supplierText) > maxWidth
    ? supplier.substring(0, Math.floor(supplier.length * maxWidth / pdf.getTextWidth(supplierText))) + '…'
    : supplierText
  pdf.text(truncated, x + padX, curY + heightMm * 0.085, { baseline: 'top' })
  curY += heightMm * 0.115 + heightMm * 0.025

  // Process label with dot
  const dotSize = heightMm * 0.035
  pdf.setFillColor(...color)
  pdf.circle(x + padX + dotSize / 2, curY + dotSize / 2 + 0.5, dotSize / 2, 'F')
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(heightMm * 0.65)
  pdf.setTextColor(...color)
  pdf.text(processLabel.toUpperCase(), x + padX + dotSize + 2, curY, { baseline: 'top' })
  curY += heightMm * 0.085 + heightMm * 0.03

  // Barcode
  const barcodeH = heightMm * 0.32
  const barcodeW = widthMm - padX * 2
  const barcodeDataUrl = generateBarcodeDataURL(code, barcodeW, barcodeH)
  if (barcodeDataUrl) {
    pdf.addImage(barcodeDataUrl, 'PNG', x + padX, curY, barcodeW, barcodeH)
  }
  curY += barcodeH + heightMm * 0.02

  // Code text
  pdf.setFont('courier', 'bold')
  pdf.setFontSize(heightMm * 0.68)
  pdf.setTextColor(31, 41, 55)
  pdf.text(code, x + widthMm / 2, curY, { align: 'center', baseline: 'top' })

  // Bottom border line
  pdf.setDrawColor(243, 244, 246)
  pdf.setLineWidth(0.3)
  pdf.line(x, y + heightMm - 0.8, x + widthMm, y + heightMm - 0.8)
}

/**
 * Export labels to PDF.
 * @param {Array} labels - Array of { code, supplier, processType }
 * @param {object} options - { widthMm, heightMm, cols, rows, marginMm, gapMm }
 * @returns {Uint8Array} PDF bytes
 */
export function exportLabelsToPDF(labels, options = {}) {
  const {
    widthMm = 60,
    heightMm = 40,
    cols = 3,
    marginMm = 10,
    gapMm = 3,
  } = options

  // Calculate page dimensions based on labels per page
  const pageWidth = cols * widthMm + (cols - 1) * gapMm + marginMm * 2
  const rowHeightWithGap = heightMm + gapMm
  const rows = Math.max(1, Math.floor((297 - marginMm * 2) / rowHeightWithGap))

  const pdf = new jsPDF({
    orientation: pageWidth > 297 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [pageWidth, rows * rowHeightWithGap + marginMm * 2 - gapMm],
  })

  let col = 0
  let row = 0
  let page = 0

  labels.forEach((label, i) => {
    if (i > 0 && col === 0 && row === 0) {
      pdf.addPage()
    }

    const x = marginMm + col * (widthMm + gapMm)
    const y = marginMm + row * (heightMm + gapMm)

    drawLabel(pdf, { ...label, x, y, widthMm, heightMm })

    col++
    if (col >= cols) {
      col = 0
      row++
      if (row >= rows) {
        row = 0
        page++
      }
    }
  })

  return pdf.output('arraybuffer')
}

/**
 * Build HTML for printing (window.print() or Electron print)
 */
export function buildPrintHTML(labels, options = {}) {
  const {
    widthMm = 60,
    heightMm = 40,
    cols = 3,
  } = options

  const PROCESS_LABEL_MAP = {
    R: 'Reception', S1: 'Sorting 1', S2: 'Sorting 2', P: 'Packing', L: 'Lot / Batch',
  }
  const COLORS = {
    R: '#16a34a', S1: '#2563eb', S2: '#7c3aed', P: '#ea580c', L: '#dc2626',
  }

  // We'll generate barcode SVGs inline
  const labelHTMLs = labels.map(({ code, supplier, processType }) => {
    const color = COLORS[processType] || '#16a34a'
    const procLabel = PROCESS_LABEL_MAP[processType] || processType

    // Generate barcode SVG
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    try {
      JsBarcode(svgEl, code, {
        format: 'CODE128',
        displayValue: false,
        margin: 0,
        width: 2,
        height: 40,
        background: 'transparent',
        lineColor: '#000000',
      })
    } catch {/* ignore */}
    const svgStr = svgEl.outerHTML

    return `
      <div style="
        width: ${widthMm}mm;
        height: ${heightMm}mm;
        background: white;
        border: 0.5pt solid #d1d5db;
        border-radius: 1mm;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        font-family: Arial, sans-serif;
        page-break-inside: avoid;
        break-inside: avoid;
        box-sizing: border-box;
      ">
        <div style="height: ${heightMm * 0.045}mm; background: ${color};"></div>
        <div style="flex:1; padding: ${heightMm * 0.05}mm ${widthMm * 0.04}mm; display:flex; flex-direction:column; gap: ${heightMm * 0.02}mm; min-height:0;">
          <div style="font-size: ${heightMm * 0.9}pt; font-weight:800; color:#111827; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.15;">
            ${supplier}
          </div>
          <div style="display:flex; align-items:center; gap: 1.5mm;">
            <div style="width: ${heightMm * 0.04}mm; height: ${heightMm * 0.04}mm; border-radius: 50%; background: ${color};"></div>
            <div style="font-size: ${heightMm * 0.65}pt; font-weight:500; color: ${color}; text-transform:uppercase; letter-spacing: 0.05em;">
              ${procLabel}
            </div>
          </div>
          <div style="flex:1; display:flex; align-items:center; justify-content:center; min-height:0; overflow:hidden;">
            ${svgStr.replace('<svg', `<svg style="max-width:100%; max-height: ${heightMm * 0.32}mm;"`)}
          </div>
          <div style="font-size: ${heightMm * 0.68}pt; font-weight:700; text-align:center; font-family: 'Courier New', monospace; letter-spacing: 0.08em; color:#1f2937;">
            ${code}
          </div>
        </div>
        <div style="height: ${heightMm * 0.02}mm; background: #f3f4f6;"></div>
      </div>
    `
  }).join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { margin: 8mm; }
    body { font-family: Arial, sans-serif; }
    .grid {
      display: flex;
      flex-wrap: wrap;
      gap: 3mm;
    }
  </style>
</head>
<body>
  <div class="grid">
    ${labelHTMLs}
  </div>
</body>
</html>`
}
