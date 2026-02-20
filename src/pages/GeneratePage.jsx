import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Tag, Printer, RefreshCw,
  AlertCircle, CheckCircle2, LayoutGrid, List
} from 'lucide-react'
import LabelPreview from '../components/LabelPreview'
import { buildPrintHTML } from '../utils/pdfExport'

const PROCESS_TYPES = [
  { value: 'R',  label: 'Reception'   },
  { value: 'S1', label: 'Sorting 1'   },
  { value: 'S2', label: 'Sorting 2'   },
  { value: 'P',  label: 'Packing'     },
  { value: 'L',  label: 'Lot / Batch' },
]

function ProcessSelector({ value, onChange, sequences }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {PROCESS_TYPES.map(pt => {
        const seq    = sequences.find(s => s.process_type === pt.value)
        const nextNum = seq ? seq.last_number + 1 : 1
        const isActive = value === pt.value
        return (
          <button
            key={pt.value}
            onClick={() => onChange(pt.value)}
            className={`
              p-3 rounded-lg border-2 text-left transition-all duration-150
              ${isActive
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-300 dark:hover:border-brand-700'
              }
            `}
          >
            <div className={`text-xs font-bold uppercase tracking-wide mb-0.5 ${isActive ? 'text-brand-700 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'}`}>
              {pt.value}
            </div>
            <div className={`text-sm font-semibold leading-tight ${isActive ? 'text-brand-900 dark:text-brand-200' : 'text-slate-700 dark:text-slate-300'}`}>
              {pt.label}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Next: #{nextNum}
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default function GeneratePage() {
  const [sequences, setSequences] = useState([])
  const [settings, setSettings]   = useState({ label_width: '100', label_height: '75' })

  const [processType, setProcessType] = useState('R')
  const [supplier,    setSupplier]    = useState('')
  const [quantity,    setQuantity]    = useState(1)
  const [mode,        setMode]        = useState('consecutive')

  const [generatedLabels, setGeneratedLabels] = useState([])
  const [lastBatch,       setLastBatch]       = useState(null)
  const [viewMode,        setViewMode]        = useState('grid')

  const [loading,   setLoading]   = useState(false)
  const [printing,  setPrinting]  = useState(false)
  const [error,     setError]     = useState(null)
  const [success,   setSuccess]   = useState(null)

  const printAreaRef = useRef(null)

  const loadData = useCallback(async () => {
    try {
      const [seqs, sets] = await Promise.all([
        window.electronAPI.getSequences(),
        window.electronAPI.getSettings(),
      ])
      setSequences(seqs)
      setSettings(sets)
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleGenerate = async () => {
    if (!supplier.trim()) { setError('Please enter a supplier name.'); return }
    if (quantity < 1 || quantity > 1000) { setError('Quantity must be between 1 and 1000.'); return }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await window.electronAPI.generateLabels({
        processType,
        supplier: supplier.trim(),
        quantity: Number(quantity),
        mode,
      })

      const total  = result.codes.length
      const labels = result.codes.map((code, idx) => ({
        code,
        supplier: supplier.trim(),
        processType,
        counter: mode === 'identical' ? total - idx : null,
      }))

      setGeneratedLabels(labels)
      setLastBatch(result)
      setSuccess(`${total} label${total > 1 ? 's' : ''} generated — ready to print.`)
      await loadData()
    } catch (err) {
      setError(err.message || 'Failed to generate labels.')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = async () => {
    if (!generatedLabels.length) return
    setPrinting(true)
    try {
      const html = buildPrintHTML(generatedLabels, {
        widthMm:  Number(settings.label_width)  || 100,
        heightMm: Number(settings.label_height) || 75,
      })
      const result = await window.electronAPI.printLabels({ html })
      if (result.success) {
        setSuccess(`Sent ${generatedLabels.length} label${generatedLabels.length > 1 ? 's' : ''} to printer.`)
      } else {
        setError(result.error || 'Print failed.')
      }
    } catch (err) {
      setError(err.message || 'Failed to print.')
    } finally {
      setPrinting(false)
    }
  }

  const widthMm  = Number(settings.label_width)  || 100
  const heightMm = Number(settings.label_height) || 75

  return (
    <div className="flex h-full min-h-0">
      {/* ── Left panel: form ─────────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 flex flex-col overflow-auto">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700">
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Tag className="w-5 h-5 text-brand-600" />
            Generate Labels
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure and print barcode labels
          </p>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-5">
          {/* Process Type */}
          <div>
            <label className="label">Process Type</label>
            <ProcessSelector
              value={processType}
              onChange={setProcessType}
              sequences={sequences}
            />
          </div>

          {/* Supplier */}
          <div>
            <label className="label" htmlFor="supplier">Supplier Name</label>
            <input
              id="supplier"
              type="text"
              className="input"
              placeholder="e.g. Agromas Fresh Foods"
              value={supplier}
              onChange={e => setSupplier(e.target.value)}
              maxLength={50}
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="label" htmlFor="quantity">
              Number of Labels
              <span className="text-slate-400 font-normal ml-1">(1 – 1000)</span>
            </label>
            <input
              id="quantity"
              type="number"
              className="input"
              min={1}
              max={1000}
              value={quantity}
              onChange={e => setQuantity(Math.max(1, Math.min(1000, Number(e.target.value))))}
            />
          </div>

          {/* Mode */}
          <div>
            <label className="label">Label Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'consecutive', label: 'Consecutive', desc: 'Unique code per label' },
                { value: 'identical',   label: 'Identical',   desc: 'Same code + countdown' },
              ].map(m => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={`
                    p-3 rounded-lg border-2 text-left transition-all
                    ${mode === m.value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-300'
                    }
                  `}
                >
                  <div className={`text-sm font-semibold ${mode === m.value ? 'text-brand-800 dark:text-brand-300' : 'text-slate-700 dark:text-slate-300'}`}>
                    {m.label}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {m.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {supplier && (
            <div>
              <label className="label">Preview</label>
              <div className="flex justify-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                <LabelPreview
                  code={`PALM-${processType}-1`}
                  supplier={supplier}
                  processType={processType}
                  widthMm={widthMm}
                  heightMm={heightMm}
                  scalePx={1.6}
                />
              </div>
            </div>
          )}

          {/* Alerts */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && !error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {success}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-700 space-y-2">
          <button
            onClick={handleGenerate}
            disabled={loading || !supplier.trim()}
            className="btn-primary w-full justify-center"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
            {loading ? 'Generating…' : `Generate ${quantity} Label${quantity > 1 ? 's' : ''}`}
          </button>

          <button
            onClick={handlePrint}
            disabled={printing || !generatedLabels.length}
            className="btn-secondary w-full justify-center"
          >
            {printing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            {printing ? 'Sending to printer…' : `Print ${generatedLabels.length || ''} Label${generatedLabels.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      {/* ── Right panel: label grid ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {generatedLabels.length > 0
                ? `${generatedLabels.length} label${generatedLabels.length > 1 ? 's' : ''} generated`
                : 'No labels yet'}
            </span>
            {lastBatch && (
              <span className="text-xs text-slate-400">
                · {lastBatch.startCode} → {lastBatch.endCode}
              </span>
            )}
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 ${viewMode === 'grid' ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 ${viewMode === 'list' ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Labels area */}
        <div className="flex-1 overflow-auto p-5" ref={printAreaRef}>
          {generatedLabels.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Tag className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">
                No labels generated yet
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                Configure the form on the left and click "Generate Labels", then "Print Labels".
              </p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'flex flex-wrap gap-3' : 'flex flex-col gap-2 items-start'}>
              {generatedLabels.map((label, idx) => (
                <LabelPreview
                  key={idx}
                  code={label.code}
                  supplier={label.supplier}
                  processType={label.processType}
                  counter={label.counter}
                  widthMm={widthMm}
                  heightMm={heightMm}
                  scalePx={viewMode === 'list' ? 1.8 : 2.0}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
