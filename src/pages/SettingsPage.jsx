import { useState, useEffect, useCallback } from 'react'
import {
  Settings, Save, RotateCcw, Database, AlertCircle,
  CheckCircle2, ShieldAlert, Trash2, ChevronDown, Info
} from 'lucide-react'

const PROCESS_TYPES = [
  { value: 'R', label: 'Reception' },
  { value: 'S1', label: 'Sorting 1' },
  { value: 'S2', label: 'Sorting 2' },
  { value: 'P', label: 'Packing' },
  { value: 'L', label: 'Lot / Batch' },
]

const LABEL_PRESETS = [
  { label: '100 × 75 mm', width: 100, height: 75 },
  { label: '100 × 50 mm', width: 100, height: 50 },
  { label: '70 × 40 mm',  width: 70,  height: 40 },
  { label: '60 × 40 mm',  width: 60,  height: 40 },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    label_width:  '100',
    label_height: '75',
  })
  const [sequences, setSequences] = useState([])
  const [version, setVersion] = useState('')
  const [dataPath, setDataPath] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Confirm dialogs
  const [resetConfirm, setResetConfirm] = useState(null) // processType or 'ALL'
  const [resetPin, setResetPin] = useState('')
  const [clearHistoryConfirm, setClearHistoryConfirm] = useState(false)

  const ADMIN_PIN = '1234' // Simple admin PIN for sequence reset

  const load = useCallback(async () => {
    try {
      const [sets, seqs, ver, dp] = await Promise.all([
        window.electronAPI.getSettings(),
        window.electronAPI.getSequences(),
        window.electronAPI.getVersion(),
        window.electronAPI.getDataPath(),
      ])
      setSettings(sets)
      setSequences(seqs)
      setVersion(ver)
      setDataPath(dp)
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await window.electronAPI.saveSettings(settings)
      setSuccess('Settings saved successfully.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleBackup = async () => {
    setError(null)
    setSuccess(null)
    try {
      const result = await window.electronAPI.saveBackup()
      if (result.success) {
        setSuccess(`Database backed up to: ${result.path}`)
      } else if (!result.canceled) {
        setError('Backup failed.')
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleResetSequence = async () => {
    if (resetPin !== ADMIN_PIN) {
      setError('Incorrect PIN. Reset cancelled.')
      setResetConfirm(null)
      setResetPin('')
      return
    }
    try {
      if (resetConfirm === 'ALL') {
        await window.electronAPI.resetAllSequences()
        setSuccess('All sequences reset to 0.')
      } else {
        await window.electronAPI.resetSequence(resetConfirm)
        setSuccess(`Sequence ${resetConfirm} reset to 0.`)
      }
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setResetConfirm(null)
      setResetPin('')
    }
  }

  const handleClearHistory = async () => {
    try {
      await window.electronAPI.clearHistory()
      setSuccess('History cleared.')
      setClearHistoryConfirm(false)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-brand-600" />
          Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Configure label dimensions, sequences, and data management
        </p>
      </div>

      <div className="flex-1 p-6 space-y-6 max-w-2xl">
        {/* Alerts */}
        {(error || success) && (
          <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
            error
              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
          }`}>
            {error
              ? <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              : <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            }
            <span className="flex-1">{error || success}</span>
            <button onClick={() => { setError(null); setSuccess(null) }} className="opacity-70 hover:opacity-100">×</button>
          </div>
        )}

        {/* Label Size */}
        <section className="card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Label Dimensions</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Physical label size in millimeters. Changes apply to new exports and prints.
          </p>

          {/* Presets */}
          <div className="mb-4">
            <label className="label">Quick Presets</label>
            <div className="flex flex-wrap gap-2">
              {LABEL_PRESETS.map(preset => {
                const isActive = settings.label_width === String(preset.width) && settings.label_height === String(preset.height)
                return (
                  <button
                    key={preset.label}
                    onClick={() => setSettings(s => ({ ...s, label_width: String(preset.width), label_height: String(preset.height) }))}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                      isActive
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-brand-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="labelWidth">Width (mm)</label>
              <input
                id="labelWidth"
                type="number"
                className="input"
                min={30}
                max={200}
                value={settings.label_width}
                onChange={e => setSettings(s => ({ ...s, label_width: e.target.value }))}
              />
            </div>
            <div>
              <label className="label" htmlFor="labelHeight">Height (mm)</label>
              <input
                id="labelHeight"
                type="number"
                className="input"
                min={20}
                max={150}
                value={settings.label_height}
                onChange={e => setSettings(s => ({ ...s, label_height: e.target.value }))}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </section>

        {/* Sequences */}
        <section className="card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Code Sequences</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Current auto-increment counters. Resetting requires admin PIN: <code className="font-mono">1234</code>
          </p>

          <div className="space-y-2 mb-4">
            {sequences.map(seq => (
              <div
                key={seq.process_type}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
              >
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                    PALM-{seq.process_type}-#
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                    Last: #{seq.last_number} · Next: #{seq.last_number + 1}
                  </span>
                </div>
                <button
                  onClick={() => { setResetConfirm(seq.process_type); setResetPin('') }}
                  className="btn-ghost py-1 px-2 text-red-600 dark:text-red-400 text-xs"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => { setResetConfirm('ALL'); setResetPin('') }}
              className="btn-danger"
            >
              <ShieldAlert className="w-4 h-4" />
              Reset ALL Sequences
            </button>
          </div>
        </section>

        {/* Data Management */}
        <section className="card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Data Management</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Backup and manage your local database.
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Backup Database</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Save a copy of your SQLite database file</div>
              </div>
              <button onClick={handleBackup} className="btn-secondary">
                <Database className="w-4 h-4" />
                Backup
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Clear History</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Delete all batch history records (sequences unchanged)</div>
              </div>
              <button onClick={() => setClearHistoryConfirm(true)} className="btn-danger">
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>
        </section>

        {/* App Info */}
        <section className="card p-5">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-brand-600" />
            About
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex gap-4">
              <dt className="text-slate-500 dark:text-slate-400 w-32">Application</dt>
              <dd className="text-slate-800 dark:text-slate-200 font-medium">Palm Karofler Labels</dd>
            </div>
            <div className="flex gap-4">
              <dt className="text-slate-500 dark:text-slate-400 w-32">Version</dt>
              <dd className="text-slate-800 dark:text-slate-200 font-mono">{version}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="text-slate-500 dark:text-slate-400 w-32">Data Location</dt>
              <dd className="text-slate-800 dark:text-slate-200 font-mono text-xs break-all">{dataPath}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="text-slate-500 dark:text-slate-400 w-32">Storage</dt>
              <dd className="text-slate-800 dark:text-slate-200">Local SQLite · Fully Offline</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Reset Confirm Modal */}
      {resetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card p-6 w-96 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                Reset {resetConfirm === 'ALL' ? 'All Sequences' : `Sequence ${resetConfirm}`}
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              This will reset the counter to 0. New codes will start from 1. This cannot be undone.
              Enter admin PIN to confirm.
            </p>
            <div className="mb-4">
              <label className="label">Admin PIN</label>
              <input
                type="password"
                className="input"
                placeholder="Enter PIN"
                value={resetPin}
                onChange={e => setResetPin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleResetSequence()}
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setResetConfirm(null); setResetPin('') }} className="btn-secondary">Cancel</button>
              <button onClick={handleResetSequence} className="btn-danger">
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear History Confirm Modal */}
      {clearHistoryConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card p-6 w-96 shadow-xl">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">Clear All History?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
              This will delete all batch history records. Code sequences are not affected.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setClearHistoryConfirm(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleClearHistory} className="btn-danger">
                <Trash2 className="w-4 h-4" />
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
