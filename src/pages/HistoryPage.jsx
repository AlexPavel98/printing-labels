import { useState, useEffect, useCallback } from 'react'
import {
  History, Search, Printer, FileDown, Trash2,
  ChevronLeft, ChevronRight, RefreshCw, AlertCircle,
  CheckCircle2, Calendar, Package, Hash
} from 'lucide-react'
import { exportLabelsToPDF, buildPrintHTML } from '../utils/pdfExport'

const PROCESS_LABELS = {
  R: 'Reception', S1: 'Sorting 1', S2: 'Sorting 2', P: 'Packing', L: 'Lot / Batch',
}

const BADGE_CLASS = {
  R: 'badge-green', S1: 'badge-blue', S2: 'badge-purple', P: 'badge-orange', L: 'badge-danger',
}

function badgeClass(type) {
  return BADGE_CLASS[type] || 'badge'
}

function formatDate(str) {
  if (!str) return '—'
  try {
    return new Date(str).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  } catch { return str }
}

export default function HistoryPage() {
  const [batches, setBatches] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [settings, setSettings] = useState({ label_width: '60', label_height: '40' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [exporting, setExporting] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const LIMIT = 20

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    setError(null)
    try {
      const [hist, sets] = await Promise.all([
        window.electronAPI.getHistory({ page: p, limit: LIMIT }),
        window.electronAPI.getSettings(),
      ])
      setBatches(hist.rows)
      setTotal(hist.total)
      setSettings(sets)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(page) }, [page, load])

  const filteredBatches = search
    ? batches.filter(b =>
        b.supplier.toLowerCase().includes(search.toLowerCase()) ||
        b.process_type.toLowerCase().includes(search.toLowerCase()) ||
        b.start_code.toLowerCase().includes(search.toLowerCase())
      )
    : batches

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const handleReprint = async (batch) => {
    setExporting(batch.id)
    try {
      const batchData = await window.electronAPI.getBatch(batch.id)
      const labels = batchData.codes.map(code => ({
        code,
        supplier: batch.supplier,
        processType: batch.process_type,
      }))
      const html = buildPrintHTML(labels, {
        widthMm: Number(settings.label_width) || 60,
        heightMm: Number(settings.label_height) || 40,
        cols: 3,
      })
      await window.electronAPI.printLabels({ html })
      setSuccess(`Reprinted batch #${batch.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setExporting(null)
    }
  }

  const handleExportBatch = async (batch) => {
    setExporting(batch.id + '_pdf')
    try {
      const batchData = await window.electronAPI.getBatch(batch.id)
      const labels = batchData.codes.map(code => ({
        code,
        supplier: batch.supplier,
        processType: batch.process_type,
      }))

      const result = await window.electronAPI.savePdf(
        `palm-karofler-${batch.process_type}-batch${batch.id}-${batch.created_at.split('T')[0]}.pdf`
      )
      if (!result.canceled && result.filePath) {
        const pdfBytes = exportLabelsToPDF(labels, {
          widthMm: Number(settings.label_width) || 60,
          heightMm: Number(settings.label_height) || 40,
          cols: 3,
        })
        await window.electronAPI.writeFile({
          filePath: result.filePath,
          buffer: Array.from(new Uint8Array(pdfBytes)),
        })
        setSuccess(`PDF saved: ${result.filePath}`)
        await window.electronAPI.openPath(result.filePath)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setExporting(null)
    }
  }

  const handleDelete = async (batchId) => {
    try {
      await window.electronAPI.deleteBatch(batchId)
      setDeleteConfirm(null)
      setSuccess('Batch deleted.')
      await load(page)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <History className="w-5 h-5 text-brand-600" />
              Label History
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {total} batch{total !== 1 ? 'es' : ''} recorded
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search supplier, process…"
                className="input pl-9 w-56"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <button onClick={() => load(page)} className="btn-ghost" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Alerts */}
        {(error || success) && (
          <div className={`mt-3 flex items-start gap-2 p-3 rounded-lg text-sm ${
            error
              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
          }`}>
            {error
              ? <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              : <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            }
            <span>{error || success}</span>
            <button
              onClick={() => { setError(null); setSuccess(null) }}
              className="ml-auto text-inherit opacity-70 hover:opacity-100"
            >×</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading && batches.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <History className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">No history yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Generated batches will appear here.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide">Supplier</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide">Process</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide">Start Code</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide">End Code</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide">Qty</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide">Mode</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide">Date</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBatches.map((batch, idx) => (
                <tr
                  key={batch.id}
                  className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-400 dark:text-slate-500 font-mono text-xs">{batch.id}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{batch.supplier}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${badgeClass(batch.process_type)}`}>
                      {batch.process_type} · {PROCESS_LABELS[batch.process_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{batch.start_code}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{batch.end_code}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">{batch.quantity}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${batch.mode === 'identical' ? 'badge-yellow' : 'badge-green'}`}>
                      {batch.mode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{formatDate(batch.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleReprint(batch)}
                        disabled={exporting === batch.id}
                        className="btn-ghost p-1.5"
                        title="Reprint"
                      >
                        {exporting === batch.id
                          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          : <Printer className="w-3.5 h-3.5" />
                        }
                      </button>
                      <button
                        onClick={() => handleExportBatch(batch)}
                        disabled={exporting === batch.id + '_pdf'}
                        className="btn-ghost p-1.5"
                        title="Export PDF"
                      >
                        {exporting === batch.id + '_pdf'
                          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          : <FileDown className="w-3.5 h-3.5" />
                        }
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(batch.id)}
                        className="btn-ghost p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Delete batch record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Page {page} of {totalPages} · {total} records
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary py-1 px-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary py-1 px-2"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card p-6 w-96 shadow-xl">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">Delete Batch Record</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
              Are you sure you want to delete batch #{deleteConfirm}? This only removes the history record — codes are not reclaimed.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger">
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
