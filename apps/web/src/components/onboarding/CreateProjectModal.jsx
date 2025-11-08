import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api/client';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';

export default function CreateProjectModal({ open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function create() {
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    
    setCreating(true);
    setError('');
    
    try {
      // API call to create project
      const { data } = await api.post('/projects', { 
        name: name.trim(), 
        description: description.trim() 
      });
      
      // Reset form
      setName('');
      setDescription('');
      
      // Notify parent and close
      if (onCreated) {
        onCreated(data);
      }
      onClose();
    } catch (err) {
      console.error('Failed to create project:', err);
      setError(err.response?.data?.message || 'Failed to create project. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && e.ctrlKey) {
      create();
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative bg-white rounded-xl p-6 shadow-2xl w-[min(90%,520px)] z-10"
          onKeyDown={handleKeyDown}
        >
          <h3 className="text-xl font-bold mb-4 text-gray-900">Create your first project</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="project-name">Project name *</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Website Redesign"
                className="mt-1"
                autoFocus
                disabled={creating}
              />
            </div>
            
            <div>
              <Label htmlFor="project-description">Description (optional)</Label>
              <textarea
                id="project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of your project..."
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                rows={3}
                disabled={creating}
              />
            </div>
            
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3"
              >
                {error}
              </motion.div>
            )}
            
            <div className="flex justify-end gap-3 pt-2">
              <Button
                onClick={onClose}
                variant="outline"
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                onClick={create}
                disabled={creating || !name.trim()}
              >
                {creating ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
            
            <div className="text-xs text-gray-500 text-center pt-2">
              Press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Ctrl+Enter</kbd> to create
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
