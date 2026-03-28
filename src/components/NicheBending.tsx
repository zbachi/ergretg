import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, Loader2, FileText, Zap, Scissors, CheckCircle2 } from 'lucide-react';
import { generateNicheBendingIdeas } from '../services/gemini';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { VideoIdea } from '../types';
import { cn } from '../lib/utils';

export default function NicheBending({ niche: initialNiche, onGenerateScript }: { niche: string, onGenerateScript: (idea: VideoIdea) => void }) {
  const [topic, setTopic] = useState('');
  const [format, setFormat] = useState('');
  const [currentNiche, setCurrentNiche] = useState(initialNiche);
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<(VideoIdea & { saved?: boolean })[]>([]);

  const handleGenerate = async () => {
    if (!topic || !format || !currentNiche) return;
    setLoading(true);
    try {
      const result = await generateNicheBendingIdeas(topic, format, currentNiche);
      setIdeas(result.map(idea => ({ ...idea, saved: false })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (idea: VideoIdea, index: number) => {
    try {
      await addDoc(collection(db, 'videos'), {
        userId: auth.currentUser?.uid,
        topic: idea.title,
        type: 'bending',
        status: 'idea',
        idea: idea,
        niche: currentNiche,
        createdAt: serverTimestamp(),
      });
      
      setIdeas(prev => prev.map((item, i) => i === index ? { ...item, saved: true } : item));
    } catch (error) {
      console.error('Error saving idea:', error);
      handleFirestoreError(error, OperationType.CREATE, 'videos');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-5xl font-bold tracking-tight">Niche Bending</h2>
        <p className="text-white/40 text-xl max-w-2xl mx-auto">
          Take a popular topic or format and "bend" it perfectly into your target niche.
        </p>
      </div>

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
        <div className="relative bg-[#111] border border-white/10 rounded-[2rem] p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-4">Original Topic / Idea</label>
              <input 
                type="text" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. The 10 Richest People"
                className="w-full bg-white/5 border border-white/10 px-8 py-6 rounded-[2rem] outline-none focus:border-purple-600/50 transition-colors text-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-4">Target Format</label>
              <input 
                type="text" 
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                placeholder="e.g. Documentary, Skit, Vlog"
                className="w-full bg-white/5 border border-white/10 px-8 py-6 rounded-[2rem] outline-none focus:border-purple-600/50 transition-colors text-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-4">Target Niche</label>
              <input 
                type="text" 
                value={currentNiche}
                onChange={(e) => setCurrentNiche(e.target.value)}
                placeholder="e.g. Cooking"
                className="w-full bg-white/5 border border-white/10 px-8 py-6 rounded-[2rem] outline-none focus:border-purple-600/50 transition-colors text-xl"
              />
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading || !topic || !format || !currentNiche}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-6 rounded-[2rem] font-bold flex items-center justify-center gap-3 transition-all shadow-xl text-xl"
          >
            {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Scissors className="w-8 h-8" />}
            {loading ? 'Bending Topic...' : 'Bend Topic to My Niche'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <AnimatePresence mode="popLayout">
          {ideas.map((idea, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden group hover:border-white/20 transition-all"
            >
              <div className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-4">
                      <div className="px-4 py-1.5 bg-purple-600/20 text-purple-500 rounded-full text-sm font-bold tracking-widest uppercase">
                        Viral Score: {idea.viralScore}%
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden flex-1 max-w-[200px]">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${idea.viralScore}%` }}
                          className="h-full bg-purple-600"
                        />
                      </div>
                    </div>
                    <h3 className="text-3xl font-bold leading-tight">{idea.title}</h3>
                  </div>
                  
                  <div className="flex gap-3">
                    {idea.saved ? (
                      <div className="p-4 rounded-2xl border bg-green-600/20 border-green-600/50 text-green-500 flex items-center gap-2 font-bold">
                        <CheckCircle2 className="w-6 h-6" />
                        Saved to Library
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleSave(idea, idx)}
                        className="p-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all flex items-center gap-2 font-bold"
                      >
                        <Sparkles className="w-6 h-6" />
                        Save to Library
                      </button>
                    )}
                    <button 
                      onClick={() => onGenerateScript(idea)}
                      className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl transition-all flex items-center gap-2 font-bold shadow-lg"
                    >
                      <FileText className="w-6 h-6" />
                      Generate Script
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="text-white/40 font-bold uppercase tracking-widest text-xs">The Hook</div>
                      <p className="text-xl font-medium text-white/90 leading-relaxed">"{idea.hook}"</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-purple-500 font-bold uppercase tracking-widest text-xs">
                        <Zap className="w-4 h-4" />
                        How the "Bend" Works
                      </div>
                      <div className="p-6 bg-white/5 rounded-3xl text-white/60 leading-relaxed whitespace-pre-wrap italic">
                        {idea.whyItWorks}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
