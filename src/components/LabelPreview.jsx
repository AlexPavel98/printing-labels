import { useEffect, useRef } from 'react'
import { renderBarcode } from '../utils/barcode'

const COMPANY_NAME    = 'Palm Kartofler'
const COMPANY_ADDRESS = 'Bøllemosegyden 58 | 5491 Blommenslyst'

const PROCESS_LABELS = {
  R: 'Reception', S1: 'Sorting 1', S2: 'Sorting 2', P: 'Packing', L: 'Lot / Batch',
}

export default function LabelPreview({
  code,
  supplier,
  processType,   // kept for future use / API compat
  date     = '',
  counter  = null,
  total    = null,
  widthMm  = 100,
  heightMm = 75,
  scalePx  = 3.78,
  forPrint = false,
}) {
  const barcodeRef = useRef(null)

  const isIdentical = counter !== null

  const W = Math.round(widthMm  * scalePx)
  const H = Math.round(heightMm * scalePx)

  const pH = Math.round(W * 0.04)   // horizontal padding px
  const pV = Math.round(H * 0.035)  // vertical padding px

  // Font sizes (screen px)
  const fCompany      = Math.round(H * 0.115)
  const fAddress      = Math.round(H * 0.055)
  const fSupplier     = Math.round(H * 0.088)
  const fCode         = Math.round(H * 0.078)
  const fDate         = Math.round(H * 0.065)
  const fCounter      = Math.round(H * 0.230)
  const fCounterSub   = Math.round(H * 0.095)

  const barH = Math.round(H * 0.36)
  const barW = Math.max(1, Math.round(W / 140))

  useEffect(() => {
    if (barcodeRef.current && code) {
      renderBarcode(barcodeRef.current, code, {
        width:      barW,
        height:     barH,
        background: 'transparent',
        lineColor:  '#000000',
      })
    }
  }, [code, barH, barW])

  return (
    <div
      style={{
        width:           `${W}px`,
        height:          `${H}px`,
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
      {/* ── Header: company / address / supplier ── */}
      <div
        style={{
          padding:      `${pV}px ${pH}px ${Math.round(pV * 0.6)}px`,
          textAlign:    'center',
          borderBottom: '1px solid #d1d5db',
          flexShrink:   0,
        }}
      >
        <div style={{ fontSize: `${fCompany}px`, fontWeight: '800', color: '#111827', lineHeight: 1.15 }}>
          {COMPANY_NAME}
        </div>
        <div style={{ fontSize: `${fAddress}px`, fontWeight: '400', color: '#6b7280', lineHeight: 1.3, marginTop: `${Math.round(H * 0.010)}px` }}>
          {COMPANY_ADDRESS}
        </div>
        <div style={{
          fontSize:    `${fSupplier}px`,
          fontWeight:  '600',
          color:       '#374151',
          lineHeight:  1.3,
          marginTop:   `${Math.round(H * 0.014)}px`,
          paddingTop:  `${Math.round(H * 0.014)}px`,
          borderTop:   '1px solid #e5e7eb',
        }}>
          {supplier || '—'}
        </div>
      </div>

      {isIdentical ? (
        /* ── Identical: barcode left │ counter right ── */
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <div style={{
            flex:            '0 0 65%',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            padding:         `${Math.round(pV * 0.6)}px ${Math.round(pH * 0.5)}px`,
            borderRight:     '1px solid #e5e7eb',
          }}>
            <svg ref={barcodeRef} style={{ maxWidth: '100%', maxHeight: `${barH}px` }} />
          </div>
          <div style={{
            flex:           '0 0 35%',
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            `${Math.round(H * 0.01)}px`,
          }}>
            <div style={{ fontSize: `${fCounter}px`, fontWeight: '800', color: '#111827', lineHeight: 1 }}>
              {counter}
            </div>
            {total !== null && (
              <div style={{ fontSize: `${fCounterSub}px`, fontWeight: '400', color: '#6b7280', lineHeight: 1 }}>
                / {total}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Consecutive: barcode centered, 80% wide ── */
        <div style={{
          flex:           1,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          padding:        `${Math.round(pV * 0.5)}px ${pH}px`,
          minHeight:      0,
        }}>
          <svg ref={barcodeRef} style={{ maxWidth: '80%', maxHeight: `${barH}px` }} />
        </div>
      )}

      {/* ── Footer: date row / process-type + code row ── */}
      <div
        style={{
          borderTop:     '1px solid #d1d5db',
          padding:       `${Math.round(pV * 0.4)}px ${pH}px`,
          display:       'flex',
          flexDirection: 'column',
          gap:           `${Math.round(H * 0.006)}px`,
          flexShrink:    0,
        }}
      >
        {/* row 1: date */}
        <div style={{ fontSize: `${fDate}px`, color: '#9ca3af', fontWeight: '400', lineHeight: 1 }}>
          {date}
        </div>
        {/* row 2: process type · code */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: `${Math.round(pH * 0.5)}px` }}>
          <span style={{ fontSize: `${fDate}px`, fontWeight: '600', color: '#6b7280', lineHeight: 1 }}>
            {PROCESS_LABELS[processType] || processType}
          </span>
          <span style={{
            fontSize:      `${fCode}px`,
            fontWeight:    '700',
            color:         '#111827',
            fontFamily:    "'Consolas', 'Courier New', monospace",
            letterSpacing: '0.05em',
            lineHeight:    1,
          }}>
            {code}
          </span>
        </div>
      </div>
    </div>
  )
}
