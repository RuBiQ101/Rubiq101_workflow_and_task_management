import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Calendar, User, GripVertical, Paperclip } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { cn } from '../../lib/utils';

const statusColors = {
  todo: 'bg-gray-100 text-gray-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
};

const priorityColors = {
  1: 'text-gray-500',
  2: 'text-yellow-600',
  3: 'text-red-600',
};

export function TaskCard({ task, onClick, isDragging }) {
  const isDone = task.status === 'done';
  const attachmentCount = task.attachments?.length || 0;
  const subtaskCount = task.subtasks?.length || 0;
  const completedSubtasks = task.subtasks?.filter(s => s.isDone).length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!isDragging ? { scale: 1.02, y: -2 } : {}}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className={cn(
        "hover:shadow-md transition-shadow",
        isDragging && "shadow-2xl ring-2 ring-blue-500"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Drag Handle */}
            <div className="flex-shrink-0 mt-0.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing">
              <GripVertical className="w-4 h-4" />
            </div>

            {/* Status Icon */}
            <motion.div
              whileHover={{ scale: 1.1, rotate: 360 }}
              transition={{ duration: 0.3 }}
              className="flex-shrink-0 mt-0.5"
            >
              {isDone ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <Circle className="w-5 h-5 text-gray-400" />
              )}
            </motion.div>

            <div className="flex-1 min-w-0">
              <h3
                className={cn(
                  'font-medium text-gray-900 mb-1',
                  isDone && 'line-through text-gray-500'
                )}
              >
                {task.title}
              </h3>

              {task.description && (
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {task.description}
                </p>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                {task.priority && (
                  <span
                    className={cn(
                      'font-medium',
                      priorityColors[task.priority]
                    )}
                  >
                    P{task.priority}
                  </span>
                )}

                {task.dueDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(task.dueDate).toLocaleDateString()}
                  </div>
                )}

                {task.assignee && (
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {task.assignee.name}
                  </div>
                )}

                {attachmentCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Paperclip className="w-3 h-3" />
                    {attachmentCount}
                  </div>
                )}

                {subtaskCount > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">
                      {completedSubtasks}/{subtaskCount}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
