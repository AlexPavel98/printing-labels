import { jsPDF } from 'jspdf'
import JsBarcode from 'jsbarcode'

const PROCESS_LABELS = {
  R:  'Reception',
  S1: 'Sorting 1',
  S2: 'Sorting 2',
  P:  'Packing',
  L:  'Lot / Batch',
}

function generateBarcodeDataURL(code, widthMm, heightMm, dpi = 300) {
  const pxPerMm = dpi / 25.4
  const canvas  = document.createElement('canvas')
  try {
    JsBarcode(canvas, code, {
      format:       'CODE128',
      displayValue: false,
      margin:       0,
      width:        Math.max(2, Math.round(pxPerMm * 0.55)),
      height:       Math.round(heightMm * pxPerMm * 0.35),
      background:   '#ffffff',
      lineColor:    '#000000',
    })
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

/**
 * Draw one label on jsPDF at (x, y) in mm.
 * label: { code, supplier, processType, counter }
 */
function drawLabel(pdf, { code, supplier, processType, counter, x, y, widthMm, heightMm }) {
  const processLabel = PROCESS_LABELS[processType] || processType

  // ── Border ──────────────────────────────────────────────────────────
  pdf.setDrawColor(156, 163, 175)   // #9ca3af
  pdf.setLineWidth(0.2)
  pdf.roundedRect(x, y, widthMm, heightMm, 0.8, 0.8, 'S')

  // ── Header bar (light gray, black text) ─────────────────────────────
  const headerH = heightMm * 0.13
  pdf.setFillColor(229, 231, 235)   // #e5e7eb
  pdf.rect(x, y, widthMm, headerH, 'F')
  pdf.setDrawColor(156, 163, 175)
  pdf.setLineWidth(0.15)
  pdf.line(x, y + headerH, x + widthMm, y + headerH)

  // Small filled square
  const sqSize = headerH * 0.28
  const sqX    = x + widthMm * 0.04
  const sqY    = y + (headerH - sqSize) / 2
  pdf.setFillColor(17, 24, 39)      // #111827
  pdf.rect(sqX, sqY, sqSize, sqSize, 'F')

  // Process type text
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(headerH * 2.6)    // roughly 0.5 * headerH converted to pt
  pdf.setTextColor(17, 24, 39)
  pdf.text(
    processLabel.toUpperCase(),
    sqX + sqSize + 1.2,
    y + headerH / 2,
    { baseline: 'middle' }
  )

  // ── Content ─────────────────────────────────────────────────────────
  const padX = widthMm * 0.04
  const padY = heightMm * 0.04
  let curY   = y + headerH + padY

  // Supplier name
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(heightMm * 0.80)
  pdf.setTextColor(17, 24, 39)
  const maxW      = widthMm - padX * 2
  const fullText  = supplier || 'Supplier'
  const truncated = pdf.getTextWidth(fullText) > maxW
    ? fullText.substring(0, Math.floor(fullText.length * maxW / pdf.getTextWidth(fullText))) + '…'
    : fullText
  pdf.text(truncated, x + padX, curY, { baseline: 'top' })
  curY += heightMm * 0.11 + heightMm * 0.02

  // Barcode
  const barcodeH   = heightMm * 0.36
  const barcodeW   = widthMm  - padX * 2
  const barcodeUrl = generateBarcodeDataURL(code, barcodeW, barcodeH)
  if (barcodeUrl) {
    pdf.addImage(barcodeUrl, 'PNG', x + padX, curY, barcodeW, barcodeH)
  }
  curY += barcodeH + heightMm * 0.02

  // Code text (left) + counter (right, if present)
  pdf.setFont('courier', 'bold')
  pdf.setFontSize(heightMm * 0.62)
  pdf.setTextColor(17, 24, 39)
  pdf.text(code, x + padX, curY, { baseline: 'top' })

  if (counter !== null && counter !== undefined) {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(heightMm * 0.88)
    pdf.setTextColor(17, 24, 39)
    pdf.text(String(counter), x + widthMm - padX, curY, { align: 'right', baseline: 'top' })
  }

  // Bottom strip
  pdf.setFillColor(229, 231, 235)
  pdf.rect(x, y + heightMm - heightMm * 0.015, widthMm, heightMm * 0.015, 'F')
}

/**
 * Export labels to PDF.
 * @param {Array} labels - { code, supplier, processType, counter }
 */
export function exportLabelsToPDF(labels, options = {}) {
  const {
    widthMm  = 100,
    heightMm = 75,
    cols     = 2,
    marginMm = 10,
    gapMm    = 4,
  } = options

  const pageWidth        = cols * widthMm + (cols - 1) * gapMm + marginMm * 2
  const rowHeightWithGap = heightMm + gapMm
  const rows = Math.max(1, Math.floor((297 - marginMm * 2) / rowHeightWithGap))

  const pdf = new jsPDF({
    orientation: pageWidth > 297 ? 'landscape' : 'portrait',
    unit:        'mm',
    format:      [pageWidth, rows * rowHeightWithGap + marginMm * 2 - gapMm],
  })

  let col = 0, row = 0

  labels.forEach((label, i) => {
    if (i > 0 && col === 0 && row === 0) pdf.addPage()

    const x = marginMm + col * (widthMm + gapMm)
    const y = marginMm + row * (heightMm + gapMm)

    drawLabel(pdf, { ...label, x, y, widthMm, heightMm })

    col++
    if (col >= cols) {
      col = 0
      row++
      if (row >= rows) row = 0
    }
  })

  return pdf.output('arraybuffer')
}

/**
 * Build HTML for Electron print.
 * @param {Array} labels - { code, supplier, processType, counter }
 */
export function buildPrintHTML(labels, options = {}) {
  const {
    widthMm  = 100,
    heightMm = 75,
  } = options

  const PROCESS_LABEL_MAP = {
    R: 'Reception', S1: 'Sorting 1', S2: 'Sorting 2', P: 'Packing', L: 'Lot / Batch',
  }

  const labelHTMLs = labels.map(({ code, supplier, processType, counter }) => {
    const procLabel = PROCESS_LABEL_MAP[processType] || processType

    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    try {
      JsBarcode(svgEl, code, {
        format:       'CODE128',
        displayValue: false,
        margin:       0,
        width:        2,
        height:       50,
        background:   'transparent',
        lineColor:    '#000000',
      })
    } catch {/* ignore */}
    const svgStr = svgEl.outerHTML

    const headerH    = heightMm * 0.13
    const headerPt   = (headerH * 0.50 * 2.835).toFixed(1)  // mm → pt
    const sqSizeMm   = headerH * 0.28

    return `
      <div style="
        width:${widthMm}mm; height:${heightMm}mm;
        background:white; border:0.4pt solid #9ca3af; border-radius:0.8mm;
        display:flex; flex-direction:column; overflow:hidden;
        font-family:Arial,sans-serif;
        page-break-inside:avoid; break-inside:avoid; box-sizing:border-box;
      ">
        <!-- Header -->
        <div style="
          height:${headerH}mm; background:#e5e7eb;
          border-bottom:0.3pt solid #9ca3af;
          display:flex; align-items:center;
          padding:0 ${widthMm * 0.04}mm; gap:${headerH * 0.30}mm; flex-shrink:0;
        ">
          <div style="
            width:${sqSizeMm}mm; height:${sqSizeMm}mm;
            background:#111827; flex-shrink:0;
          "></div>
          <div style="
            font-size:${headerPt}pt; font-weight:700; color:#111827;
            text-transform:uppercase; letter-spacing:0.07em;
            white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
          ">${procLabel}</div>
        </div>

        <!-- Content -->
        <div style="flex:1; padding:${heightMm*0.04}mm ${widthMm*0.04}mm; display:flex; flex-direction:column; gap:${heightMm*0.02}mm; min-height:0;">
          <!-- Supplier -->
          <div style="font-size:${heightMm*0.80}pt; font-weight:800; color:#111827; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.2;">
            ${supplier}
          </div>
          <!-- Barcode -->
          <div style="flex:1; display:flex; align-items:center; justify-content:center; min-height:0; overflow:hidden;">
            ${svgStr.replace('<svg', `<svg style="max-width:100%; max-height:${heightMm*0.36}mm;"`)}
          </div>
          <!-- Code + counter -->
          <div style="display:flex; align-items:center; justify-content:space-between; flex-shrink:0;">
            <div style="font-size:${heightMm*0.62}pt; font-weight:700; font-family:'Courier New',monospace; letter-spacing:0.05em; color:#111827;">
              ${code}
            </div>
            ${counter !== null && counter !== undefined ? `
            <div style="font-size:${heightMm*0.88}pt; font-weight:800; color:#111827; line-height:1; flex-shrink:0; margin-left:${widthMm*0.02}mm;">
              ${counter}
            </div>` : ''}
          </div>
        </div>

        <!-- Bottom strip -->
        <div style="height:${heightMm*0.015}mm; background:#e5e7eb; flex-shrink:0;"></div>
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
    .grid { display: flex; flex-wrap: wrap; gap: 4mm; }
  </style>
</head>
<body>
  <div class="grid">${labelHTMLs}</div>
</body>
</html>`
}
