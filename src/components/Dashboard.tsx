import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Circle, Trophy, ArrowRight, Zap, Loader2, Clock, ChevronRight, Sparkles, Youtube, Scissors } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, collection, addDoc, serverTimestamp, query, where, orderBy, limit } from 'firebase/firestore';
import { UserProfile, VideoProject } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { generateFullPackage } from '../services/gemini';
import { cn } from '../lib/utils';

const DAILY_TASKS = [
  { id: 'idea', title: 'Generate 10 Viral Ideas', description: 'Use the AI to find your next hit.' },
  { id: 'script', title: 'Write Retention Script', description: 'Optimize for watch time.' },
  { id: 'voiceover', title: 'Record Voiceover', description: 'Clear, engaging audio.' },
  { id: 'edit', title: 'Edit Video', description: 'Add pattern interrupts.' },
  { id: 'post', title: 'Post & Analyze', description: 'Check CTR and retention.' },
];

export default function Dashboard({ user, onStartVideo }: { user: UserProfile, onStartVideo: () => void }) {
  const [loading, setLoading] = useState(false);
  const [recentProjects, setRecentProjects] = useState<VideoProject[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'videos'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(3)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecentProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoProject)));
    }, (error) => {
      console.error('Firestore Error in Dashboard:', error);
      if (error.code === 'resource-exhausted') {
        // Silently fail or alert? Let's alert if it's the main dashboard.
        alert('Firestore Quota Exceeded. Recent projects could not be loaded.');
      }
    });
    return () => unsubscribe();
  }, []);

  const toggleTask = async (taskId: string) => {
    const isCompleted = user.completedTasks?.includes(taskId);
    const userRef = doc(db, 'users', user.uid);
    
    try {
      await updateDoc(userRef, {
        completedTasks: isCompleted ? arrayRemove(taskId) : arrayUnion(taskId)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users/' + user.uid);
    }
  };

  const handleLaunchPackage = async () => {
    const topic = window.prompt('Enter a specific topic for your video package:', user.niche);
    if (!topic) return;

    setLoading(true);
    try {
      const pkg = await generateFullPackage(topic, user.niche);
      await addDoc(collection(db, 'videos'), {
        userId: user.uid,
        topic: topic,
        type: 'short',
        status: 'script',
        idea: pkg.idea,
        script: pkg.script,
        thumbnailConcept: pkg.thumbnailConcept,
        createdAt: serverTimestamp(),
      });
      onStartVideo();
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.CREATE, 'videos');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteDay = async () => {
    if (user.completedTasks?.length !== DAILY_TASKS.length) return;
    setUpdatingNiche(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        currentDay: user.currentDay + 1,
        completedTasks: []
      });
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.UPDATE, 'users/' + user.uid);
    } finally {
      setUpdatingNiche(false);
    }
  };

  const [isEditingNiche, setIsEditingNiche] = useState(false);
  const [newNiche, setNewNiche] = useState(user.niche || '');
  const [updatingNiche, setUpdatingNiche] = useState(false);

  const handleUpdateNiche = async () => {
    if (!newNiche || newNiche === user.niche) {
      setIsEditingNiche(false);
      return;
    }
    setUpdatingNiche(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { niche: newNiche });
      setIsEditingNiche(false);
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.UPDATE, 'users/' + user.uid);
    } finally {
      setUpdatingNiche(false);
    }
  };

  const progress = (user.currentDay / 90) * 100;

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-bold tracking-tight mb-2">Day {user.currentDay}</h2>
          <p className="text-white/50 text-lg">Keep pushing. You're {Math.round(progress)}% through the challenge.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider font-bold">Streak</p>
              <p className="text-xl font-bold">{user.currentDay} Days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white/5 h-4 rounded-full overflow-hidden border border-white/10">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_20px_rgba(220,38,38,0.5)]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Daily Tasks */}
        <div className="lg:col-span-2 space-y-12">
          <div className="space-y-6">
            <h3 className="text-2xl font-bold flex items-center gap-3">
              Today's Mission
              <span className="text-sm font-normal text-white/40 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                {user.completedTasks?.length || 0} / {DAILY_TASKS.length}
              </span>
              {user.completedTasks?.length === DAILY_TASKS.length && (
                <button
                  onClick={handleCompleteDay}
                  disabled={updatingNiche}
                  className="ml-auto text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2"
                >
                  {updatingNiche ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Complete Day
                </button>
              )}
            </h3>
            <div className="space-y-4">
              {DAILY_TASKS.map((task) => {
                const isCompleted = user.completedTasks?.includes(task.id);
                return (
                  <button
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={cn(
                      "w-full flex items-center gap-6 p-6 rounded-3xl border transition-all duration-300 text-left group",
                      isCompleted 
                        ? "bg-green-500/5 border-green-500/20" 
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                      isCompleted ? "bg-green-500 text-black" : "border-2 border-white/20 text-transparent group-hover:border-white/40"
                    )}>
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className={cn("text-lg font-bold mb-1", isCompleted && "text-white/50 line-through")}>{task.title}</h4>
                      <p className="text-sm text-white/40">{task.description}</p>
                    </div>
                    <ArrowRight className={cn("w-5 h-5 text-white/20 transition-transform group-hover:translate-x-1", isCompleted && "hidden")} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent Library */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold">Recent Library</h3>
              <button 
                onClick={onStartVideo}
                className="text-red-500 font-bold flex items-center gap-2 hover:gap-3 transition-all"
              >
                View All <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentProjects.map((project) => (
                <div key={project.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4 hover:border-white/20 transition-all group">
                  <div className="flex justify-between items-start">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      project.type === 'short' ? "bg-red-600/20 text-red-600" : 
                      project.type === 'long' ? "bg-blue-600/20 text-blue-600" : 
                      project.type === 'ideation' ? "bg-purple-600/20 text-purple-600" : 
                      project.type === 'bending' ? "bg-purple-600/20 text-purple-600" : "bg-green-600/20 text-green-600"
                    )}>
                      {project.type === 'short' ? <Zap className="w-5 h-5" /> : 
                       project.type === 'long' ? <Youtube className="w-5 h-5" /> : 
                       project.type === 'ideation' ? <Sparkles className="w-5 h-5" /> : 
                       project.type === 'bending' ? <Scissors className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">{project.createdAt?.toDate().toLocaleDateString()}</span>
                  </div>
                  <div>
                    <h4 className="font-bold line-clamp-1">{project.idea?.title || project.topic}</h4>
                    <p className="text-xs text-white/40 uppercase tracking-widest font-bold mt-1">{project.type}</p>
                  </div>
                  <button 
                    onClick={onStartVideo}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                  >
                    Open in Library <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {recentProjects.length === 0 && (
                <div className="col-span-2 p-12 border-2 border-dashed border-white/5 rounded-3xl text-center text-white/20">
                  No recent activity yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <h3 className="text-2xl font-bold">Quick Start</h3>
          <div className="bg-gradient-to-br from-red-600 to-red-900 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
            <Zap className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12 transition-transform group-hover:scale-110" />
            <h4 className="text-2xl font-bold mb-4 relative z-10">Speed Mode</h4>
            <p className="text-white/80 mb-8 relative z-10">Generate a full video package (Idea, Script, Title) in one click.</p>
            <button 
              onClick={handleLaunchPackage}
              disabled={loading}
              className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-white/90 transition-colors relative z-10 shadow-xl flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Launch Package'}
            </button>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xl font-bold">Your Niche</h4>
              <button 
                onClick={() => setIsEditingNiche(!isEditingNiche)}
                className="text-xs font-bold text-red-500 uppercase tracking-widest hover:text-red-400 transition-colors"
              >
                {isEditingNiche ? 'Cancel' : 'Change'}
              </button>
            </div>
            
            {isEditingNiche ? (
              <div className="space-y-3">
                <input 
                  type="text"
                  value={newNiche}
                  onChange={(e) => setNewNiche(e.target.value)}
                  placeholder="Enter new niche..."
                  className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl outline-none focus:border-red-600/50 transition-colors text-sm"
                  autoFocus
                />
                <button 
                  onClick={handleUpdateNiche}
                  disabled={updatingNiche || !newNiche}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                >
                  {updatingNiche ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Niche'}
                </button>
              </div>
            ) : (
              <>
                <div className="inline-block px-4 py-2 bg-white/10 rounded-full border border-white/10 text-sm font-medium">
                  {user.niche || 'Not set'}
                </div>
                <p className="text-sm text-white/40 leading-relaxed">Your AI is currently optimized for this niche. You can change this anytime.</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
