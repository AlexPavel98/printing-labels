import { useEffect, useRef } from 'react'
import { renderBarcode } from '../utils/barcode'

const PROCESS_LABELS = {
  R: 'Reception',
  S1: 'Sorting 1',
  S2: 'Sorting 2',
  P: 'Packing',
  L: 'Lot / Batch',
}

const PROCESS_COLORS = {
  R: '#16a34a',
  S1: '#2563eb',
  S2: '#7c3aed',
  P: '#ea580c',
  L: '#dc2626',
}

/**
 * A single label rendered at exact mm dimensions.
 * widthMm and heightMm are the label physical dimensions.
 * scale: pixels per mm for screen preview (default 3.78 = 96dpi -> mm conversion)
 */
export default function LabelPreview({
  code,
  supplier,
  processType,
  widthMm = 60,
  heightMm = 40,
  scalePx = 3.78,  // 96 dpi / 25.4 mm per inch
  forPrint = false  // when true, use pt units for PDF accuracy
}) {
  const barcodeRef = useRef(null)

  const widthPx = Math.round(widthMm * scalePx)
  const heightPx = Math.round(heightMm * scalePx)
  const accentColor = PROCESS_COLORS[processType] || '#16a34a'
  const processLabel = PROCESS_LABELS[processType] || processType

  // Font sizes scaled proportionally to label
  const supplierFontSize = Math.round(heightPx * 0.115)
  const processLabelFontSize = Math.round(heightPx * 0.085)
  const codeFontSize = Math.round(heightPx * 0.09)
  const barHeight = Math.round(heightPx * 0.32)
  const barcodeWidth = Math.max(1, Math.round(widthPx / 100))

  useEffect(() => {
    if (barcodeRef.current && code) {
      renderBarcode(barcodeRef.current, code, {
        width: barcodeWidth,
        height: barHeight,
        background: 'transparent',
        lineColor: '#000000',
      })
    }
  }, [code, barHeight, barcodeWidth])

  return (
    <div
      style={{
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        backgroundColor: '#ffffff',
        border: '1px solid #d1d5db',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'Segoe UI', Arial, sans-serif",
        flexShrink: 0,
        boxShadow: forPrint ? 'none' : '0 1px 3px rgba(0,0,0,0.12)',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
      }}
      className="label-item"
    >
      {/* Top accent bar */}
      <div
        style={{
          height: `${Math.round(heightPx * 0.045)}px`,
          backgroundColor: accentColor,
          flexShrink: 0,
        }}
      />

      {/* Content */}
      <div
        style={{
          flex: 1,
          padding: `${Math.round(heightPx * 0.05)}px ${Math.round(widthPx * 0.04)}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: `${Math.round(heightPx * 0.02)}px`,
          minHeight: 0,
        }}
      >
        {/* Supplier name */}
        <div
          style={{
            fontSize: `${supplierFontSize}px`,
            fontWeight: '700',
            color: '#111827',
            lineHeight: '1.15',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.01em',
          }}
        >
          {supplier || 'Supplier Name'}
        </div>

        {/* Process badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div
            style={{
              width: `${Math.round(heightPx * 0.04)}px`,
              height: `${Math.round(heightPx * 0.04)}px`,
              borderRadius: '50%',
              backgroundColor: accentColor,
              flexShrink: 0,
            }}
          />
          <div
            style={{
              fontSize: `${processLabelFontSize}px`,
              fontWeight: '500',
              color: accentColor,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {processLabel}
          </div>
        </div>

        {/* Barcode */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <svg
            ref={barcodeRef}
            style={{ maxWidth: '100%', maxHeight: `${barHeight + 4}px` }}
          />
        </div>

        {/* Code text */}
        <div
          style={{
            fontSize: `${codeFontSize}px`,
            fontWeight: '600',
            color: '#1f2937',
            textAlign: 'center',
            fontFamily: "'Consolas', 'Courier New', monospace",
            letterSpacing: '0.08em',
            flexShrink: 0,
          }}
        >
          {code}
        </div>
      </div>

      {/* Bottom border */}
      <div
        style={{
          height: `${Math.round(heightPx * 0.02)}px`,
          backgroundColor: '#f3f4f6',
          flexShrink: 0,
        }}
      />
    </div>
  )
}
