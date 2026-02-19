import JsBarcode from 'jsbarcode'

/**
 * Render a Code128 barcode to an SVG element
 * @param {SVGElement} svgElement
 * @param {string} value
 * @param {object} options
 */
export function renderBarcode(svgElement, value, options = {}) {
  try {
    JsBarcode(svgElement, value, {
      format: 'CODE128',
      displayValue: false,
      margin: 0,
      width: options.width || 2,
      height: options.height || 40,
      background: options.background || 'transparent',
      lineColor: options.lineColor || '#000000',
      ...options
    })
    return true
  } catch (err) {
    console.error('Barcode render error:', err)
    return false
  }
}

/**
 * Render a Code128 barcode to a canvas element and return data URL
 */
export function barcodeToDataURL(value, options = {}) {
  const canvas = document.createElement('canvas')
  try {
    JsBarcode(canvas, value, {
      format: 'CODE128',
      displayValue: false,
      margin: 0,
      width: options.width || 2,
      height: options.height || 60,
      background: '#ffffff',
      lineColor: '#000000',
      ...options
    })
    return canvas.toDataURL('image/png')
  } catch (err) {
    console.error('Barcode dataURL error:', err)
    return null
  }
}
