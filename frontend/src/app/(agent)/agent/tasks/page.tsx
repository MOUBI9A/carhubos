"use client";

import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Check, Clock, Filter, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';
import api from '@/lib/api';
import { useFormat } from '@/lib/useFormat';

type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  createdAt: string;
  assignee?: { name: string } | null;
};

const columns: Array<{ status: TaskStatus; key: 'pending' | 'inProgress' | 'completed' }> = [
  { status: 'PENDING', key: 'pending' },
  { status: 'IN_PROGRESS', key: 'inProgress' },
  { status: 'COMPLETED', key: 'completed' },
];

// Column-level semantic tone: pending stays neutral, in-progress reads as
// active/info, completed reads as success — distinct from per-card priority.
const statusTone: Record<TaskStatus, string> = {
  PENDING: 'bg-surface-raised text-text-muted border-hairline',
  IN_PROGRESS: 'bg-info/10 text-info border-info/20',
  COMPLETED: 'bg-success/10 text-success border-success/20',
};

export default function TaskBoard() {
  const t = useTranslations('agentTasks');
  const { showToast } = useToast();
  const { dateTime } = useFormat();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<Task[]>('/tasks');
      setTasks(response.data);
    } catch {
      showToast('danger', 'Load Failed', t('loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  const moveTask = async (id: string, status: TaskStatus) => {
    const previous = tasks;
    setTasks((current) => current.map((task) => task.id === id ? { ...task, status } : task));
    try {
      await api.patch(`/tasks/${id}/status`, { status });
      showToast('success', 'Task Updated', t('taskMoved'));
    } catch {
      setTasks(previous);
      showToast('danger', 'Action Failed', t('updateFailed'));
    }
  };

  const handleCreateTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIsSaving(true);
    try {
      const response = await api.post<Task>('/tasks', {
        title: String(formData.get('title') || '').trim(),
        description: String(formData.get('description') || '').trim() || undefined,
        priority: String(formData.get('priority') || 'MEDIUM'),
      });
      setTasks((current) => [response.data, ...current]);
      setIsTaskModalOpen(false);
      event.currentTarget.reset();
      showToast('success', 'Task Assigned', t('created'));
    } catch {
      showToast('danger', 'Action Failed', t('createFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('title')}</h1>
          <p className="text-sm text-text-muted mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={() => void loadTasks()}>
            <Filter className="w-4 h-4 me-2" />
            {t('filter')}
          </Button>
          <Button onClick={() => setIsTaskModalOpen(true)} size="sm">
            <Plus className="w-4 h-4 me-2" />
            {t('assign')}
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="min-h-64 flex items-center justify-center text-text-muted">{t('loading')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map((column) => {
            const columnTasks = tasks.filter((task) => task.status === column.status);
            return (
              <div key={column.status} className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h2 className="eyebrow">{t(column.key)}</h2>
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] font-semibold tabular-nums', statusTone[column.status])}
                  >
                    {columnTasks.length}
                  </Badge>
                </div>
                <div className="space-y-4 min-h-[360px] p-3 bg-surface rounded-3xl border border-hairline">
                  {columnTasks.map((task) => (
                    <Card key={task.id} className="hover:border-primary/50 transition-all group relative overflow-hidden">
                      <div className="flex justify-between items-start mb-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            task.priority === 'URGENT' ? 'bg-danger/10 text-danger border-danger/20' :
                              task.priority === 'HIGH' ? 'bg-warning/10 text-warning border-warning/20' :
                                'bg-surface-raised text-text-muted border-hairline',
                          )}
                        >
                          {t(task.priority.toLowerCase() as 'low' | 'medium' | 'high' | 'urgent')}
                        </Badge>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {column.status !== 'PENDING' && (
                            <button aria-label={t('pending')} onClick={() => void moveTask(task.id, 'PENDING')} className="p-1 hover:bg-surface-raised rounded text-text-muted">
                              <Clock className="w-3 h-3" />
                            </button>
                          )}
                          {column.status !== 'IN_PROGRESS' && (
                            <button aria-label={t('inProgress')} onClick={() => void moveTask(task.id, 'IN_PROGRESS')} className="p-1 hover:bg-surface-raised rounded text-text-muted">
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          )}
                          {column.status !== 'COMPLETED' && (
                            <button aria-label={t('completed')} onClick={() => void moveTask(task.id, 'COMPLETED')} className="p-1 hover:bg-surface-raised rounded text-success">
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">{task.title}</h4>
                      {task.description && <p className="text-[11px] font-medium text-text-muted mb-4">{task.description}</p>}
                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-hairline">
                        {task.assignee?.name ? (
                          <span className="flex items-center gap-1.5 min-w-0">
                            <Avatar name={task.assignee.name} size={20} />
                            <span className="text-[10px] font-medium text-text-muted truncate">{task.assignee.name}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-text-faint">—</span>
                        )}
                        <span className="text-[9px] font-medium text-text-faint shrink-0">
                          {dateTime(task.dueDate || task.createdAt)}
                        </span>
                      </div>
                    </Card>
                  ))}
                  {!columnTasks.length && (
                    <div className="border border-dashed border-hairline rounded-3xl h-32 flex flex-col items-center justify-center gap-2 bg-surface-raised/40">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-raised text-text-faint">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                      <span className="eyebrow text-text-faint">{t('noTasks')}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title={t('newTask')}
        description={t('newTaskDescription')}
      >
        <form onSubmit={handleCreateTask} className="space-y-6">
          <label className="space-y-1.5 block">
            <span className="eyebrow px-1">{t('taskTitle')}</span>
            <input name="title" required className="w-full bg-surface-raised border border-hairline rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary transition-colors" placeholder={t('taskTitlePlaceholder')} />
          </label>
          <label className="space-y-1.5 block">
            <span className="eyebrow px-1">{t('details')}</span>
            <textarea name="description" className="w-full bg-surface-raised border border-hairline rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary transition-colors min-h-24" placeholder={t('detailsPlaceholder')} />
          </label>
          <fieldset className="space-y-1.5">
            <legend className="eyebrow px-1">{t('priority')}</legend>
            <div className="grid grid-cols-4 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as TaskPriority[]).map((priority) => (
                <label key={priority} className="cursor-pointer">
                  <input type="radio" name="priority" value={priority} defaultChecked={priority === 'MEDIUM'} className="sr-only peer" />
                  <span className="block p-3 rounded-xl border border-hairline bg-surface-raised text-center peer-checked:border-primary peer-checked:bg-violet-soft transition-all text-[11px] font-semibold text-text-muted peer-checked:text-foreground">
                    {t(priority.toLowerCase() as 'low' | 'medium' | 'high' | 'urgent')}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <Button type="submit" disabled={isSaving} className="w-full mt-4">
            {isSaving ? t('loading') : t('create')}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
