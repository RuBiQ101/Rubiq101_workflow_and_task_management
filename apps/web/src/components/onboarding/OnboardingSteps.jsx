import React from 'react';
import { motion } from 'framer-motion';

const steps = [
  { title: 'Boards that work like you', body: 'Flexible columns, drag & drop, and quick actions.' },
  { title: 'Real-time collaboration', body: 'Changes sync instantly with teammates.' },
  { title: 'Attach files & comments', body: 'Share context with attachments and threaded comments.' },
];

export default function OnboardingSteps() {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Quick tour</h3>
      <div className="space-y-4">
        {steps.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-white p-4 rounded-lg shadow-sm"
          >
            <div className="text-sm font-medium">{s.title}</div>
            <div className="text-xs text-gray-500 mt-1">{s.body}</div>
          </motion.div>
        ))}
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-semibold">Tip</h4>
        <div className="text-xs text-gray-500 mt-1">
          Use shortcuts <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">n</code> to create tasks and{' '}
          <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">?</code> for help.
        </div>
      </div>
    </div>
  );
}
