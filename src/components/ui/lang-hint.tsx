'use client'

import { useState } from 'react'

export type LangHintItem = { lang: string; text: string }

interface LangHintProps {
  items: LangHintItem[]
  label?: string
}

// Languages that require right-to-left text direction.
const RTL_LANG_CODES = new Set(['AR', 'FA', 'HE', 'UR'])

function getTextDir(lang: string): 'rtl' | 'ltr' {
  return RTL_LANG_CODES.has(lang.toUpperCase()) ? 'rtl' : 'ltr'
}

export function LangHint({ items, label = '도움말 보기' }: LangHintProps) {
  const [open, setOpen] = useState(false)

  if (items.length === 0) return null

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
        aria-expanded={open}
      >
        <span aria-hidden="true">{open ? '▲' : '▼'}</span>
        <span>{open ? '도움말 닫기' : label}</span>
      </button>
      {open && (
        <div className="mt-2 rounded-md bg-slate-50 border border-slate-100 px-3 py-2.5 space-y-1.5">
          {items.map((item) => {
            const dir = getTextDir(item.lang)
            return (
              <p
                key={item.lang}
                className="text-xs leading-relaxed text-text-secondary"
                dir={dir}
                style={dir === 'rtl' ? { unicodeBidi: 'plaintext', textAlign: 'start' } : undefined}
              >
                <span className="font-semibold text-text-muted mr-1.5" dir="ltr">
                  [{item.lang}]
                </span>
                {item.text}
              </p>
            )
          })}
        </div>
      )}
    </div>
  )
}
