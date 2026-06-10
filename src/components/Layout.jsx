import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Logo } from './UI'
import { motion } from 'framer-motion'
import { Home, PenTool, Swords, BarChart2 } from 'lucide-react'

const navLinks = [
  { to: '/', label: 'Home', icon: <Home size={18} /> },
  { to: '/quiz', label: 'Solo Quiz', icon: <PenTool size={18} /> },
  { to: '/arena', label: 'Arena', icon: <Swords size={18} /> },
  { to: '/history', label: 'History', icon: <BarChart2 size={18} /> },
]

export default function Layout({ children }) {
  useEffect(() => {
    // Disable right click context menu
    const handleContextMenu = (e) => e.preventDefault()
    document.addEventListener('contextmenu', handleContextMenu)

    // Disable keyboard shortcuts for copy, paste, page source, and inspect elements
    const handleKeyDown = (e) => {
      // Disable F12
      if (e.key === 'F12') {
        e.preventDefault()
        return false
      }

      // Disable Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C (Inspect/Console)
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
        e.preventDefault()
        return false
      }

      // Disable Cmd+Opt+I / Cmd+Opt+J / Cmd+Opt+C for MacOS
      if (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
        e.preventDefault()
        return false
      }

      // Disable Ctrl+U / Cmd+U (View Page Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault()
        return false
      }

      const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable

      // Disable Ctrl+C / Cmd+C (Copy)
      if (!isInput && (e.ctrlKey || e.metaKey) && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault()
        return false
      }

      // Disable Ctrl+V / Cmd+V (Paste)
      if (!isInput && (e.ctrlKey || e.metaKey) && (e.key === 'V' || e.key === 'v')) {
        e.preventDefault()
        return false
      }

      // Disable Ctrl+X / Cmd+X (Cut)
      if (!isInput && (e.ctrlKey || e.metaKey) && (e.key === 'X' || e.key === 'x')) {
        e.preventDefault()
        return false
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    // Disable copy, cut, and paste events globally
    const handleCopy = (e) => {
      const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable
      if (!isInput) e.preventDefault()
    }
    const handleCut = (e) => {
      const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable
      if (!isInput) e.preventDefault()
    }
    const handlePaste = (e) => {
      const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable
      if (!isInput) e.preventDefault()
    }

    document.addEventListener('copy', handleCopy)
    document.addEventListener('cut', handleCut)
    document.addEventListener('paste', handlePaste)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('cut', handleCut)
      document.removeEventListener('paste', handlePaste)
    }
  }, [])

  const { pathname } = useLocation()

  return (
    <div className="min-h-screen flex flex-col noise">
      {/* Premium Dark Dynamic Video Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-gray-950">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover opacity-[0.12] select-none pointer-events-none scale-105"
        >
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260520_111942_8fc50f9e-4dfd-45c1-81bb-d93342a23d87.mp4" type="video/mp4" />
        </video>
        {/* Dark radial overlay for maximum text contrast and readability */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.1)_0%,rgba(3,7,18,0.95)_100%)]" />
        {/* Soft moving ambient color blobs to merge with the video depth */}
        <motion.div 
          animate={{ x: [0, 40, 0], y: [0, 20, 0] }} 
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" 
        />
        <motion.div 
          animate={{ x: [0, -30, 0], y: [0, -40, 0] }} 
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl" 
        />
      </div>


      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-gray-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/"><Logo /></Link>
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2
                  ${pathname === link.to
                    ? 'bg-brand-600/30 text-brand-300'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </nav>
          {/* Mobile nav */}
          <div className="md:hidden flex gap-1">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`p-2 rounded-lg text-lg transition-all
                  ${pathname === link.to ? 'bg-brand-600/30' : 'text-white/50 hover:text-white'}`}
                title={link.label}
              >
                {link.icon}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Page content */}
      <motion.main
        key={pathname}
        className="flex-1 max-w-6xl mx-auto w-full px-4 py-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.main>

      <footer className="border-t border-white/10 py-4 text-center text-white/30 text-xs">
        QuizMaster Pro — AI-powered learning
      </footer>
    </div>
  )
}
