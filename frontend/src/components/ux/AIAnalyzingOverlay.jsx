import { AnimatePresence, motion } from 'framer-motion'

function AIAnalyzingOverlay({ loading }) {
  return (
    <AnimatePresence>
      {loading ? (
        <motion.div
          className="ai-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24 }}
        >
          <motion.div
            className="ai-overlay-panel"
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.span
              className="ai-overlay-spinner"
              animate={{ rotate: 360 }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1, ease: 'linear' }}
            />
            <p>AI is analyzing...</p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default AIAnalyzingOverlay
