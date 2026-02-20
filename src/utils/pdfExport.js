import JsBarcode from 'jsbarcode'

const PROCESS_LABELS = {
  R:  'Reception',
  S1: 'Sorting 1',
  S2: 'Sorting 2',
  P:  'Packing',
  L:  'Lot / Batch',
}

/**
 * Build an HTML document for direct printing to the label printer.
 * Each label is its own CSS page so the SATO advances one stock per label.
 *
 * @param {Array}  labels  – [{ code, supplier, processType, counter }]
 * @param {object} options – { widthMm, heightMm }
 * @returns {string} Complete HTML string
 */
export function buildPrintHTML(labels, options = {}) {
  const { widthMm = 100, heightMm = 75 } = options

  const labelHTMLs = labels.map(({ code, supplier, processType, counter }, idx) => {
    const procLabel = PROCESS_LABELS[processType] || processType
    const isLast    = idx === labels.length - 1

    // Generate barcode as inline SVG
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    try {
      JsBarcode(svgEl, code, {
        format:       'CODE128',
        displayValue: false,
        margin:       0,
        width:        3,
        height:       60,
        background:   'transparent',
        lineColor:    '#000000',
      })
    } catch { /* ignore invalid codes */ }
    const svgStr = svgEl.outerHTML

    const headerH   = heightMm * 0.13
    const headerPt  = (headerH * 0.50 * 2.835).toFixed(1)
    const sqSizeMm  = (headerH * 0.28).toFixed(2)

    return `<div class="label${isLast ? ' last' : ''}">
  <!-- Header: process type -->
  <div class="header">
    <div class="sq" style="width:${sqSizeMm}mm;height:${sqSizeMm}mm;"></div>
    <span class="proc" style="font-size:${headerPt}pt;">${procLabel.toUpperCase()}</span>
  </div>
  <!-- Content -->
  <div class="body">
    <div class="supplier">${supplier}</div>
    <div class="barcode">
      ${svgStr.replace('<svg', `<svg style="max-width:100%;max-height:${(heightMm * 0.36).toFixed(1)}mm;"`)}
    </div>
    <div class="bottom-row">
      <span class="code">${code}</span>
      ${counter !== null && counter !== undefined
        ? `<span class="counter">${counter}</span>` : ''}
    </div>
  </div>
  <!-- Footer strip -->
  <div class="footer"></div>
</div>`
  }).join('\n')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  @page {
    size: ${widthMm}mm ${heightMm}mm;
    margin: 0;
  }

  html, body {
    width: ${widthMm}mm;
    margin: 0;
    padding: 0;
    font-family: Arial, sans-serif;
    background: white;
  }

  .label {
    width: ${widthMm}mm;
    height: ${heightMm}mm;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 0.3pt solid #9ca3af;
    background: white;
    page-break-after: always;
  }
  .label.last {
    page-break-after: avoid;
  }

  .header {
    height: ${(heightMm * 0.13).toFixed(2)}mm;
    background: #e5e7eb;
    border-bottom: 0.3pt solid #9ca3af;
    display: flex;
    align-items: center;
    padding: 0 ${(widthMm * 0.04).toFixed(2)}mm;
    gap: ${(heightMm * 0.04).toFixed(2)}mm;
    flex-shrink: 0;
  }
  .sq {
    background: #111827;
    flex-shrink: 0;
  }
  .proc {
    font-weight: 700;
    color: #111827;
    letter-spacing: 0.07em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .body {
    flex: 1;
    padding: ${(heightMm * 0.04).toFixed(2)}mm ${(widthMm * 0.04).toFixed(2)}mm;
    display: flex;
    flex-direction: column;
    gap: ${(heightMm * 0.02).toFixed(2)}mm;
    min-height: 0;
  }

  .supplier {
    font-size: ${(heightMm * 0.80).toFixed(1)}pt;
    font-weight: 800;
    color: #111827;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
  }

  .barcode {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    overflow: hidden;
  }

  .bottom-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }
  .code {
    font-size: ${(heightMm * 0.62).toFixed(1)}pt;
    font-weight: 700;
    font-family: 'Courier New', monospace;
    letter-spacing: 0.05em;
    color: #111827;
  }
  .counter {
    font-size: ${(heightMm * 0.88).toFixed(1)}pt;
    font-weight: 800;
    color: #111827;
    line-height: 1;
    flex-shrink: 0;
    margin-left: ${(widthMm * 0.02).toFixed(2)}mm;
  }

  .footer {
    height: ${(heightMm * 0.015).toFixed(2)}mm;
    background: #e5e7eb;
    flex-shrink: 0;
  }
</style>
</head>
<body>
${labelHTMLs}
</body>
</html>`
}
