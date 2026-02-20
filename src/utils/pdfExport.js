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
 * Draw a single label on jsPDF at position (x, y) in mm.
 * label: { code, supplier, processType, counter }
 */
function drawLabel(pdf, { code, supplier, processType, counter, x, y, widthMm, heightMm }) {
  const color        = PROCESS_COLORS[processType] || [22, 163, 74]
  const processLabel = PROCESS_LABELS[processType] || processType

  // ── Border ───────────────────────────────────────────────────────────
  pdf.setDrawColor(209, 213, 219)
  pdf.setLineWidth(0.2)
  pdf.roundedRect(x, y, widthMm, heightMm, 1, 1, 'S')

  // ── Header bar (process type) ─────────────────────────────────────────
  const headerH = heightMm * 0.14
  pdf.setFillColor(...color)
  pdf.rect(x, y, widthMm, headerH, 'F')

  // White dot
  const dotR = headerH * 0.16
  pdf.setFillColor(255, 255, 255)
  pdf.circle(x + widthMm * 0.05 + dotR, y + headerH / 2, dotR, 'F')

  // Process label text (white)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(heightMm * 0.65)
  pdf.setTextColor(255, 255, 255)
  pdf.text(
    processLabel.toUpperCase(),
    x + widthMm * 0.05 + dotR * 2 + 1.5,
    y + headerH / 2,
    { baseline: 'middle' }
  )

  // ── Content ───────────────────────────────────────────────────────────
  const padX = widthMm * 0.04
  const padY = heightMm * 0.04
  let curY = y + headerH + padY

  // Supplier name
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(heightMm * 0.9)
  pdf.setTextColor(17, 24, 39)
  const supplierText = supplier || 'Supplier'
  const maxWidth = widthMm - padX * 2
  const truncated = pdf.getTextWidth(supplierText) > maxWidth
    ? supplier.substring(0, Math.floor(supplier.length * maxWidth / pdf.getTextWidth(supplierText))) + '…'
    : supplierText
  pdf.text(truncated, x + padX, curY, { baseline: 'top' })
  curY += heightMm * 0.115 + heightMm * 0.02

  // Barcode
  const barcodeH = heightMm * 0.34
  const barcodeW = widthMm - padX * 2
  const barcodeDataUrl = generateBarcodeDataURL(code, barcodeW, barcodeH)
  if (barcodeDataUrl) {
    pdf.addImage(barcodeDataUrl, 'PNG', x + padX, curY, barcodeW, barcodeH)
  }
  curY += barcodeH + heightMm * 0.02

  // Code text (left) + counter (right)
  pdf.setFont('courier', 'bold')
  pdf.setFontSize(heightMm * 0.65)
  pdf.setTextColor(31, 41, 55)
  pdf.text(code, x + padX, curY, { baseline: 'top' })

  if (counter !== null && counter !== undefined) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(heightMm * 0.95)
    pdf.setTextColor(...color)
    pdf.text(String(counter), x + widthMm - padX, curY, { align: 'right', baseline: 'top' })
  }

  // Bottom strip
  pdf.setDrawColor(243, 244, 246)
  pdf.setLineWidth(0.3)
  pdf.line(x, y + heightMm - 0.8, x + widthMm, y + heightMm - 0.8)
}

/**
 * Export labels to PDF.
 * @param {Array} labels - Array of { code, supplier, processType, counter }
 */
export function exportLabelsToPDF(labels, options = {}) {
  const {
    widthMm  = 60,
    heightMm = 40,
    cols     = 3,
    marginMm = 10,
    gapMm    = 3,
  } = options

  const pageWidth        = cols * widthMm + (cols - 1) * gapMm + marginMm * 2
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
    if (i > 0 && col === 0 && row === 0) pdf.addPage()

    const x = marginMm + col * (widthMm + gapMm)
    const y = marginMm + row * (heightMm + gapMm)

    drawLabel(pdf, { ...label, x, y, widthMm, heightMm })

    col++
    if (col >= cols) {
      col = 0
      row++
      if (row >= rows) { row = 0; page++ }
    }
  })

  return pdf.output('arraybuffer')
}

/**
 * Build HTML for printing (Electron print).
 * @param {Array} labels - Array of { code, supplier, processType, counter }
 */
export function buildPrintHTML(labels, options = {}) {
  const {
    widthMm  = 60,
    heightMm = 40,
    cols     = 3,
  } = options

  const PROCESS_LABEL_MAP = {
    R: 'Reception', S1: 'Sorting 1', S2: 'Sorting 2', P: 'Packing', L: 'Lot / Batch',
  }
  const COLORS = {
    R: '#16a34a', S1: '#2563eb', S2: '#7c3aed', P: '#ea580c', L: '#dc2626',
  }

  const labelHTMLs = labels.map(({ code, supplier, processType, counter }) => {
    const color     = COLORS[processType] || '#16a34a'
    const procLabel = PROCESS_LABEL_MAP[processType] || processType

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

    const headerH     = heightMm * 0.14
    const headerFontPt = headerH * 0.52 * 2.835  // mm → pt (approx)

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
        <!-- Header bar: process type -->
        <div style="
          height: ${headerH}mm;
          background: ${color};
          display: flex;
          align-items: center;
          padding: 0 ${widthMm * 0.04}mm;
          gap: ${headerH * 0.3}mm;
          flex-shrink: 0;
        ">
          <div style="
            width: ${headerH * 0.32}mm;
            height: ${headerH * 0.32}mm;
            border-radius: 50%;
            background: rgba(255,255,255,0.75);
            flex-shrink: 0;
          "></div>
          <div style="
            font-size: ${headerFontPt.toFixed(1)}pt;
            font-weight: 700;
            color: #ffffff;
            text-transform: uppercase;
            letter-spacing: 0.07em;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          ">${procLabel}</div>
        </div>

        <!-- Content -->
        <div style="flex:1; padding: ${heightMm * 0.045}mm ${widthMm * 0.04}mm; display:flex; flex-direction:column; gap: ${heightMm * 0.02}mm; min-height:0;">
          <!-- Supplier -->
          <div style="font-size: ${heightMm * 0.9}pt; font-weight:800; color:#111827; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.15;">
            ${supplier}
          </div>
          <!-- Barcode -->
          <div style="flex:1; display:flex; align-items:center; justify-content:center; min-height:0; overflow:hidden;">
            ${svgStr.replace('<svg', `<svg style="max-width:100%; max-height: ${heightMm * 0.33}mm;"`)}
          </div>
          <!-- Code + counter -->
          <div style="display:flex; align-items:center; justify-content:space-between; flex-shrink:0;">
            <div style="font-size: ${heightMm * 0.65}pt; font-weight:700; font-family: 'Courier New', monospace; letter-spacing: 0.06em; color:#1f2937;">
              ${code}
            </div>
            ${counter !== null && counter !== undefined ? `
            <div style="font-size: ${heightMm * 0.95}pt; font-weight:800; color: ${color}; line-height:1; flex-shrink:0; margin-left: ${widthMm * 0.02}mm;">
              ${counter}
            </div>` : ''}
          </div>
        </div>

        <!-- Bottom strip -->
        <div style="height: ${heightMm * 0.02}mm; background: ${color}50; flex-shrink:0;"></div>
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
    .grid { display: flex; flex-wrap: wrap; gap: 3mm; }
  </style>
</head>
<body>
  <div class="grid">
    ${labelHTMLs}
  </div>
</body>
</html>`
}
