import { useEffect, useRef, useState } from 'react'

export default function Pilih({ value, onChange, options, placeholder = 'Pilih...' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)
  const selected = options.find((option) => String(option.value) === String(value))

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const needle = query.trim().toLowerCase()
  const list = needle
    ? options.filter((option) => `${option.label} ${option.hint || ''}`.toLowerCase().includes(needle))
    : options

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open)
          setQuery('')
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-sm transition-colors hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#14532D]/25 dark:border-gray-600 dark:bg-gray-700"
      >
        <span className={`truncate ${selected ? 'text-gray-800 dark:text-white' : 'text-gray-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-1 w-[min(430px,calc(100vw-3rem))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-600 dark:bg-gray-800">
          <div className="border-b border-gray-100 p-2 dark:border-gray-700">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari..."
              className="w-full rounded-lg bg-[#FAF6EC] px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400"
            />
          </div>
          <div role="listbox" className="max-h-64 overflow-y-auto p-1">
            {list.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-gray-400">Tidak ada hasil</p>
            )}
            {list.map((option) => {
              const active = String(option.value) === String(value)
              return (
                <button
                  key={option.key ?? option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? 'bg-[#E8EFE8] text-[#14532D] dark:bg-[#1F3A2A] dark:text-[#A7D3B4]'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {option.hint && (
                      <span className="block font-mono text-[11px] text-gray-400">{option.hint}</span>
                    )}
                  </span>
                  {option.badge && (
                    <span className="mt-0.5 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                      {option.badge}
                    </span>
                  )}
                  {active && (
                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
