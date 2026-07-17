"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { 
  CheckCircle2, 
  Clock, 
  Calendar, 
  MapPin, 
  User, 
  Car, 
  Plus, 
  Filter, 
  AlertCircle,
  MoreVertical,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/lib/contexts/ToastContext';

export default function TaskBoard() {
  const { showToast } = useToast();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Pre-Rental Inspection', car: 'Dacia Logan (12345-A-1)', assignee: 'Khalid', time: '14:30', status: 'TODO', priority: 'URGENT' },
    { id: 2, title: 'Clean Vehicle', car: 'Renault Clio (98765-B-4)', assignee: 'Sarah', time: '15:00', status: 'IN_PROGRESS', priority: 'MEDIUM' },
    { id: 3, title: 'Document Audit', car: 'Range Rover (55555-D-7)', assignee: 'Admin', time: '16:45', status: 'DONE', priority: 'LOW' },
  ]);

  const moveTask = (id: number, newStatus: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
    showToast('success', 'Task Updated', `Task moved to ${newStatus.replace('_', ' ')}`);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newTask = {
      id: Date.now(),
      title: formData.get('title') as string,
      car: formData.get('car') as string,
      assignee: formData.get('assignee') as string,
      time: 'Just now',
      status: 'TODO',
      priority: formData.get('priority') as string,
    };
    setTasks([newTask, ...tasks]);
    setIsTaskModalOpen(false);
    showToast('success', 'Task Assigned', `${newTask.title} has been delegated.`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase">Task Board</h1>
          <p className="text-white/40 font-bold uppercase tracking-widest text-xs mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Personnel Workflow & Delegation
          </p>
        </div>
        <div className="flex gap-3">
           <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
           </Button>
           <Button onClick={() => setIsTaskModalOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Assign Task
           </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['TODO', 'IN_PROGRESS', 'DONE'].map((column) => (
          <div key={column} className="space-y-4">
            <div className="flex items-center justify-between px-2">
               <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">{column.replace('_', ' ')}</h2>
               <span className="text-[10px] font-black text-white/20 bg-white/5 px-2 py-0.5 rounded-full">
                 {tasks.filter(t => t.status === column).length}
               </span>
            </div>
            
            <div className="space-y-4 min-h-[500px] p-2 bg-white/[0.02] rounded-3xl border border-white/[0.03]">
              {tasks.filter(t => t.status === column).map((task) => (
                <Card key={task.id} variant="outline" className="hover:border-primary/50 transition-all cursor-pointer group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-3">
                    <span className={cn(
                      "text-[8px] font-black px-1.5 py-0.5 rounded-sm tracking-widest uppercase",
                      task.priority === 'URGENT' ? 'bg-danger/20 text-danger border border-danger/20' : 
                      task.priority === 'MEDIUM' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/10' :
                      'bg-white/5 text-white/40 border border-white/10'
                    )}>
                      {task.priority}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       {column !== 'TODO' && (
                         <button onClick={() => moveTask(task.id, 'TODO')} className="p-1 hover:bg-white/5 rounded text-white/40"><Clock className="w-3 h-3" /></button>
                       )}
                       {column !== 'IN_PROGRESS' && (
                         <button onClick={() => moveTask(task.id, 'IN_PROGRESS')} className="p-1 hover:bg-white/5 rounded text-white/40"><ActivityIcon className="w-3 h-3" /></button>
                       )}
                       {column !== 'DONE' && (
                         <button onClick={() => moveTask(task.id, 'DONE')} className="p-1 hover:bg-white/5 rounded text-success"><Check className="w-3 h-3" /></button>
                       )}
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1 group-hover:text-primary transition-colors uppercase tracking-tight">{task.title}</h4>
                  <p className="text-[10px] font-medium text-white/40 mb-4">{task.car}</p>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="flex items-center gap-2">
                       <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center text-[8px] font-black text-primary">
                         {task.assignee?.[0] || 'A'}
                       </div>
                       <span className="text-[10px] font-bold text-white/60">{task.assignee}</span>
                    </div>
                    <span className="text-[9px] font-black text-white/20 uppercase">{task.time}</span>
                  </div>
                </Card>
              ))}
              
              {tasks.filter(t => t.status === column).length === 0 && (
                <div className="border-2 border-dashed border-white/5 rounded-3xl h-32 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white/10 uppercase tracking-widest">No Active Tasks</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* New Task Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Delegate New Task"
        description="Assign a mission to your staff"
      >
        <form onSubmit={handleCreateTask} className="space-y-6">
           <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Task Title</p>
              <input name="title" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-primary transition-colors" placeholder="e.g. Wash Car #15" />
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                 <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Vehicle Asset</p>
                 <select name="car" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none appearance-none">
                    <option>Select Vehicle...</option>
                    <option>Dacia Logan (12345-A-1)</option>
                    <option>Renault Clio (98765-B-4)</option>
                 </select>
              </div>
              <div className="space-y-1.5">
                 <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Assignee</p>
                 <select name="assignee" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none appearance-none">
                    <option>Khalid</option>
                    <option>Sarah</option>
                    <option>Admin</option>
                 </select>
              </div>
           </div>
           <div className="space-y-1.5">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Priority Level</p>
              <div className="grid grid-cols-3 gap-3">
                 {['LOW', 'MEDIUM', 'URGENT'].map((p) => (
                    <label key={p} className="cursor-pointer">
                       <input type="radio" name="priority" value={p} defaultChecked={p === 'MEDIUM'} className="sr-only peer" />
                       <div className="p-3 rounded-xl border border-white/10 bg-white/5 text-center peer-checked:border-primary peer-checked:bg-primary/10 transition-all">
                          <p className="text-[9px] font-black text-white uppercase tracking-widest">{p}</p>
                       </div>
                    </label>
                 ))}
              </div>
           </div>
           <Button type="submit" className="w-full mt-4">Broadcast Task</Button>
        </form>
      </Modal>
    </div>
  );
}

function ActivityIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
