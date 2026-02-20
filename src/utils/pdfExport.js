import JsBarcode from 'jsbarcode'

const COMPANY_NAME    = 'Palm Karofler'
const COMPANY_ADDRESS = 'Bøllemosegyden 58 | 5491 Blommenslyst'

/**
 * Build an HTML document for direct printing to the label printer.
 * Each label is its own CSS page so the SATO advances one stock per label.
 *
 * @param {Array}  labels  – [{ code, supplier, counter, total, date }]
 * @param {object} options – { widthMm, heightMm }
 * @returns {string} Complete HTML string
 */
export function buildPrintHTML(labels, options = {}) {
  const { widthMm = 100, heightMm = 75 } = options

  const labelHTMLs = labels.map(({ code, supplier, counter, total, date }, idx) => {
    const isLast      = idx === labels.length - 1
    const isIdentical = counter !== null && counter !== undefined

    // Generate barcode as inline SVG
    // width:2 = 2 dots per module, appropriate for SATO CL4NX at 203 DPI
    const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    try {
      JsBarcode(svgEl, code, {
        format:       'CODE128',
        displayValue: false,
        margin:       0,
        width:        2,
        height:       60,
        background:   'transparent',
        lineColor:    '#000000',
      })
    } catch { /* ignore invalid codes */ }
    const svgStr = svgEl.outerHTML

    const maxBarcodeH = `${(heightMm * 0.36).toFixed(1)}mm`

    const bodyHTML = isIdentical
      ? `<div class="body-identical">
          <div class="barcode-col">
            ${svgStr.replace('<svg', `<svg style="max-width:100%;max-height:${maxBarcodeH};"`)}
          </div>
          <div class="counter-col">
            <div class="counter-num">${counter}</div>
            ${total !== null && total !== undefined
              ? `<div class="counter-sub">/ ${total}</div>`
              : ''}
          </div>
        </div>`
      : `<div class="body-consecutive">
          ${svgStr.replace('<svg', `<svg style="max-width:80%;max-height:${maxBarcodeH};"`)}
        </div>`

    return `<div class="label${isLast ? ' last' : ''}">
  <div class="header">
    <div class="company-name">${COMPANY_NAME}</div>
    <div class="company-address">${COMPANY_ADDRESS}</div>
    <div class="supplier-row">${supplier || '—'}</div>
  </div>
  ${bodyHTML}
  <div class="footer">
    <span class="date">${date || ''}</span>
    <span class="code-text">${code}</span>
  </div>
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
    font-family: 'Segoe UI', Arial, sans-serif;
    background: white;
  }

  /* ── Label container ── */
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

  /* ── Header ── */
  .header {
    padding: ${(heightMm * 0.035).toFixed(2)}mm ${(widthMm * 0.04).toFixed(2)}mm ${(heightMm * 0.021).toFixed(2)}mm;
    text-align: center;
    border-bottom: 0.3pt solid #d1d5db;
    flex-shrink: 0;
  }
  .company-name {
    font-size: ${(heightMm * 0.115 / 0.353).toFixed(1)}pt;
    font-weight: 800;
    color: #111827;
    line-height: 1.15;
  }
  .company-address {
    font-size: ${(heightMm * 0.055 / 0.353).toFixed(1)}pt;
    font-weight: 400;
    color: #6b7280;
    line-height: 1.3;
    margin-top: ${(heightMm * 0.008).toFixed(2)}mm;
  }
  .supplier-row {
    font-size: ${(heightMm * 0.088 / 0.353).toFixed(1)}pt;
    font-weight: 600;
    color: #374151;
    line-height: 1.3;
    margin-top: ${(heightMm * 0.014).toFixed(2)}mm;
    padding-top: ${(heightMm * 0.014).toFixed(2)}mm;
    border-top: 0.3pt solid #e5e7eb;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── Consecutive body ── */
  .body-consecutive {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${(heightMm * 0.025).toFixed(2)}mm ${(widthMm * 0.04).toFixed(2)}mm;
    min-height: 0;
    overflow: hidden;
  }

  /* ── Identical body ── */
  .body-identical {
    flex: 1;
    display: flex;
    min-height: 0;
    overflow: hidden;
  }
  .barcode-col {
    flex: 0 0 65%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${(heightMm * 0.022).toFixed(2)}mm ${(widthMm * 0.02).toFixed(2)}mm;
    border-right: 0.3pt solid #e5e7eb;
    overflow: hidden;
  }
  .counter-col {
    flex: 0 0 35%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${(heightMm * 0.01).toFixed(2)}mm;
  }
  .counter-num {
    font-size: ${(heightMm * 0.230 / 0.353).toFixed(1)}pt;
    font-weight: 800;
    color: #111827;
    line-height: 1;
  }
  .counter-sub {
    font-size: ${(heightMm * 0.095 / 0.353).toFixed(1)}pt;
    font-weight: 400;
    color: #6b7280;
    line-height: 1;
  }

  /* ── Footer ── */
  .footer {
    border-top: 0.3pt solid #d1d5db;
    padding: ${(heightMm * 0.025).toFixed(2)}mm ${(widthMm * 0.04).toFixed(2)}mm;
    display: flex;
    align-items: center;
    position: relative;
    flex-shrink: 0;
  }
  .date {
    font-size: ${(heightMm * 0.065 / 0.353).toFixed(1)}pt;
    font-weight: 400;
    color: #9ca3af;
    flex-shrink: 0;
  }
  .code-text {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    font-size: ${(heightMm * 0.078 / 0.353).toFixed(1)}pt;
    font-weight: 700;
    color: #111827;
    font-family: 'Courier New', 'Consolas', monospace;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }
</style>
</head>
<body>
${labelHTMLs}
</body>
</html>`
}
