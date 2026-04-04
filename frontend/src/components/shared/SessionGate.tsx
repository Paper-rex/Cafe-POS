import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Wifi, WifiOff } from 'lucide-react';
import { useState } from 'react';
import { useSSE } from '../../hooks/useSSE';
import { useToastStore } from '../../store/useToastStore';

interface SessionGateProps {
  hasSession: boolean;
  onSessionOpened?: () => void;
}

export default function SessionGate({ hasSession, onSessionOpened }: SessionGateProps) {
  const [connected, setConnected] = useState(true);
  const [sessionClosing, setSessionClosing] = useState(false);
  const [closingMessage, setClosingMessage] = useState('');
  const addToast = useToastStore((s) => s.addToast);

  useSSE({
    onSessionOpened: () => {
      addToast('success', 'Session opened! You can now take orders.');
      onSessionOpened?.();
    },
    onSessionClosing: (data) => {
      setSessionClosing(true);
      setClosingMessage(data.message || 'Session is closing...');
      addToast('warning', data.message || 'Session is closing...');
    },
    onSessionClosed: () => {
      setSessionClosing(false);
      addToast('info', 'Session has been closed.');
    },
    onConnected: () => setConnected(true),
    onDisconnected: () => setConnected(false),
  });

  return (
    <>
      {/* SSE Connection Indicator */}
      <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-500 ${
        connected ? 'bg-success-pale text-brand-dark' : 'bg-danger-pale text-danger'
      }`}>
        {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        {connected ? 'Live' : 'Reconnecting...'}
      </div>

      {/* Session Closing Banner */}
      <AnimatePresence>
        {sessionClosing && (
          <motion.div
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -60 }}
            className="fixed top-0 left-0 right-0 z-50 bg-warning-pale border-b-2 border-amber-300 px-6 py-3 flex items-center gap-3"
          >
            <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
            <p className="text-sm font-medium text-amber-800">{closingMessage} Please complete current orders.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No Active Session Overlay */}
      <AnimatePresence>
        {!hasSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-10 text-center max-w-sm mx-4 shadow-modal"
            >
              <div className="w-20 h-20 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-text-muted animate-pulse-soft" />
              </div>
              <h2 className="font-display text-2xl font-bold text-text-primary mb-3">No Active Session</h2>
              <p className="text-text-secondary">
                Waiting for an admin to open a session. This screen will update automatically.
              </p>
              <div className="mt-6 flex gap-1 justify-center">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-brand-main"
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
