'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const [theme, setTheme] = useState<string | null>(null)

  useEffect(() => {
    const savedTheme = localStorage.getItem('buget-theme') || 'dark'
    setTheme(savedTheme)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('buget-theme', newTheme)
    
    if (newTheme === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
  }

  if (theme === null) {
    return null
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Treceți la mod luminos' : 'Treceți la mod întunecat'}
      className="relative w-10 h-10 rounded-full hover:bg-accent transition-colors"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-yellow-400 transition-all" />
      ) : (
        <Moon className="w-5 h-5 text-slate-600 transition-all" />
      )}
      <span className="sr-only">Comutare temă</span>
    </Button>
  )
}
