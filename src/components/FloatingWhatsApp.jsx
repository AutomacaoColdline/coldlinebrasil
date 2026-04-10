import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

const WHATSAPP_URL =
  'https://wa.me/5567992933820?text=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20um%20or%C3%A7amento.'

function WhatsAppIcon({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

export default function FloatingWhatsApp() {
  const [visible, setVisible] = useState(false)
  const [tooltip, setTooltip] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1800)
    return () => clearTimeout(t)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-2"
          initial={{ opacity: 0, scale: 0.4, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.4 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        >
          {/* Tooltip — hidden on mobile via pointer-events  */}
          <AnimatePresence>
            {tooltip && (
              <motion.div
                className="hidden sm:block relative bg-brand-dark text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg whitespace-nowrap"
                initial={{ opacity: 0, y: 6, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.92 }}
                transition={{ duration: 0.18 }}
              >
                Solicitar Orçamento
                <span className="absolute -bottom-1.5 right-4 w-3 h-3 bg-brand-dark rotate-45 block" />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Solicitar orçamento via WhatsApp"
            className="w-14 h-14 rounded-2xl bg-brand-mid text-white flex items-center justify-center cursor-pointer select-none"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.94 }}
            onHoverStart={() => setTooltip(true)}
            onHoverEnd={() => setTooltip(false)}
            animate={{
              boxShadow: [
                '0 0 16px rgba(30,95,175,0.4)',
                '0 0 32px rgba(30,95,175,0.7)',
                '0 0 16px rgba(30,95,175,0.4)',
              ],
            }}
            transition={{
              boxShadow: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
              scale: { type: 'spring', stiffness: 380, damping: 20 },
            }}
          >
            <WhatsAppIcon size={25} />
          </motion.a>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
