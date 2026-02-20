import { useEffect, useRef } from 'react'
import { renderBarcode } from '../utils/barcode'

const PROCESS_LABELS = {
  R:  'Reception',
  S1: 'Sorting 1',
  S2: 'Sorting 2',
  P:  'Packing',
  L:  'Lot / Batch',
}

export default function LabelPreview({
  code,
  supplier,
  processType,
  widthMm  = 100,
  heightMm = 75,
  scalePx  = 3.78,
  forPrint = false,
  counter  = null,
}) {
  const barcodeRef = useRef(null)

  const widthPx  = Math.round(widthMm  * scalePx)
  const heightPx = Math.round(heightMm * scalePx)
  const processLabel = PROCESS_LABELS[processType] || processType

  const headerH          = Math.round(heightPx * 0.13)
  const headerFontSize   = Math.round(headerH   * 0.50)
  const supplierFontSize = Math.round(heightPx  * 0.10)
  const codeFontSize     = Math.round(heightPx  * 0.08)
  const counterFontSize  = Math.round(heightPx  * 0.13)
  const barHeight        = Math.round(heightPx  * 0.35)
  const barcodeWidth     = Math.max(1, Math.round(widthPx / 120))

  useEffect(() => {
    if (barcodeRef.current && code) {
      renderBarcode(barcodeRef.current, code, {
        width:      barcodeWidth,
        height:     barHeight,
        background: 'transparent',
        lineColor:  '#000000',
      })
    }
  }, [code, barHeight, barcodeWidth])

  return (
    <div
      style={{
        width:           `${widthPx}px`,
        height:          `${heightPx}px`,
        backgroundColor: '#ffffff',
        border:          '1px solid #9ca3af',
        borderRadius:    '3px',
        display:         'flex',
        flexDirection:   'column',
        overflow:        'hidden',
        fontFamily:      "'Segoe UI', Arial, sans-serif",
        flexShrink:      0,
        boxShadow:       forPrint ? 'none' : '0 1px 4px rgba(0,0,0,0.15)',
        pageBreakInside: 'avoid',
        breakInside:     'avoid',
      }}
      className="label-item"
    >
      {/* ── Header: process type (light gray bg, black text) ── */}
      <div
        style={{
          height:          `${headerH}px`,
          backgroundColor: '#e5e7eb',
          borderBottom:    '1px solid #9ca3af',
          display:         'flex',
          alignItems:      'center',
          padding:         `0 ${Math.round(widthPx * 0.04)}px`,
          gap:             `${Math.round(headerH * 0.30)}px`,
          flexShrink:      0,
        }}
      >
        {/* small filled square */}
        <div
          style={{
            width:           `${Math.round(headerH * 0.28)}px`,
            height:          `${Math.round(headerH * 0.28)}px`,
            backgroundColor: '#111827',
            flexShrink:      0,
          }}
        />
        <div
          style={{
            fontSize:       `${headerFontSize}px`,
            fontWeight:     '700',
            color:          '#111827',
            textTransform:  'uppercase',
            letterSpacing:  '0.07em',
            overflow:       'hidden',
            textOverflow:   'ellipsis',
            whiteSpace:     'nowrap',
          }}
        >
          {processLabel}
        </div>
      </div>

      {/* ── Content ── */}
      <div
        style={{
          flex:          1,
          padding:       `${Math.round(heightPx * 0.04)}px ${Math.round(widthPx * 0.04)}px`,
          display:       'flex',
          flexDirection: 'column',
          gap:           `${Math.round(heightPx * 0.02)}px`,
          minHeight:     0,
        }}
      >
        {/* Supplier name */}
        <div
          style={{
            fontSize:      `${supplierFontSize}px`,
            fontWeight:    '700',
            color:         '#111827',
            lineHeight:    '1.2',
            overflow:      'hidden',
            textOverflow:  'ellipsis',
            whiteSpace:    'nowrap',
            letterSpacing: '-0.01em',
          }}
        >
          {supplier || 'Supplier Name'}
        </div>

        {/* Barcode */}
        <div
          style={{
            flex:            1,
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            minHeight:       0,
            overflow:        'hidden',
          }}
        >
          <svg
            ref={barcodeRef}
            style={{ maxWidth: '100%', maxHeight: `${barHeight + 4}px` }}
          />
        </div>

        {/* Code text + counter */}
        <div
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            flexShrink:     0,
          }}
        >
          <div
            style={{
              fontSize:    `${codeFontSize}px`,
              fontWeight:  '600',
              color:       '#111827',
              fontFamily:  "'Consolas', 'Courier New', monospace",
              letterSpacing: '0.05em',
            }}
          >
            {code}
          </div>

          {counter !== null && counter !== undefined && (
            <div
              style={{
                fontSize:    `${counterFontSize}px`,
                fontWeight:  '800',
                color:       '#111827',
                lineHeight:  1,
                flexShrink:  0,
                marginLeft:  `${Math.round(widthPx * 0.02)}px`,
              }}
            >
              {counter}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom strip ── */}
      <div
        style={{
          height:          `${Math.round(heightPx * 0.015)}px`,
          backgroundColor: '#e5e7eb',
          flexShrink:      0,
        }}
      />
    </div>
  )
}
