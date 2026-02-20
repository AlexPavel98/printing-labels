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

export default function LabelPreview({
  code,
  supplier,
  processType,
  widthMm = 60,
  heightMm = 40,
  scalePx = 3.78,
  forPrint = false,
  counter = null,  // countdown number for identical-mode labels
}) {
  const barcodeRef = useRef(null)

  const widthPx  = Math.round(widthMm  * scalePx)
  const heightPx = Math.round(heightMm * scalePx)
  const accentColor  = PROCESS_COLORS[processType] || '#16a34a'
  const processLabel = PROCESS_LABELS[processType] || processType

  const headerH          = Math.round(heightPx * 0.14)
  const headerFontSize   = Math.round(headerH   * 0.52)
  const supplierFontSize = Math.round(heightPx  * 0.115)
  const codeFontSize     = Math.round(heightPx  * 0.085)
  const counterFontSize  = Math.round(heightPx  * 0.14)
  const barHeight        = Math.round(heightPx  * 0.33)
  const barcodeWidth     = Math.max(1, Math.round(widthPx / 100))

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
      {/* ── Header bar: process type ─────────────────────── */}
      <div
        style={{
          height: `${headerH}px`,
          backgroundColor: accentColor,
          display: 'flex',
          alignItems: 'center',
          padding: `0 ${Math.round(widthPx * 0.04)}px`,
          gap: `${Math.round(headerH * 0.28)}px`,
          flexShrink: 0,
        }}
      >
        {/* small white dot */}
        <div
          style={{
            width:  `${Math.round(headerH * 0.32)}px`,
            height: `${Math.round(headerH * 0.32)}px`,
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.75)',
            flexShrink: 0,
          }}
        />
        <div
          style={{
            fontSize: `${headerFontSize}px`,
            fontWeight: '700',
            color: '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {processLabel}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          padding: `${Math.round(heightPx * 0.045)}px ${Math.round(widthPx * 0.04)}px`,
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

        {/* Code text + counter */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: `${codeFontSize}px`,
              fontWeight: '600',
              color: '#1f2937',
              fontFamily: "'Consolas', 'Courier New', monospace",
              letterSpacing: '0.06em',
            }}
          >
            {code}
          </div>

          {counter !== null && counter !== undefined && (
            <div
              style={{
                fontSize: `${counterFontSize}px`,
                fontWeight: '800',
                color: accentColor,
                lineHeight: 1,
                flexShrink: 0,
                marginLeft: `${Math.round(widthPx * 0.02)}px`,
              }}
            >
              {counter}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom accent strip ──────────────────────────── */}
      <div
        style={{
          height: `${Math.round(heightPx * 0.02)}px`,
          backgroundColor: accentColor + '50',
          flexShrink: 0,
        }}
      />
    </div>
  )
}
