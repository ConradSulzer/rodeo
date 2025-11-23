import { motion } from 'framer-motion'
import { FaMoon, FaSun } from 'react-icons/fa'

type DarkModeToggleProps = {
  isDark: boolean
  toggle: () => void
}

export function DarkModeToggle({ isDark, toggle }: DarkModeToggleProps) {
  return (
    <button
      type="button"
      onClick={toggle}
      className={`relative flex h-8 w-[70px] items-center rounded-full px-1 transition-colors duration-300 ${
        isDark ? 'bg-zinc-700' : 'bg-zinc-300'
      }`}
    >
      <motion.div
        className="pointer-events-none absolute flex w-full items-center justify-between px-2"
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <FaMoon
          size={14}
          className={`transition-opacity ${
            isDark ? 'opacity-90 text-white' : 'opacity-20 text-white'
          }`}
        />
        <FaSun
          size={18}
          className={`transition-opacity ${
            isDark ? 'opacity-20 text-amber-500' : 'opacity-90 text-amber-500 mr-1.5'
          }`}
        />
      </motion.div>

      <motion.div
        className="z-10 h-6 w-6 rounded-full bg-white shadow cursor-pointer"
        animate={{ x: isDark ? 38 : 0 }}
        transition={{ type: 'tween', ease: 'easeInOut', duration: 0.25 }}
      />
    </button>
  )
}
