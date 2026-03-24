import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, Loader2, ChevronRight, FileText, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { generateViralIdeation } from '../services/gemini';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { VideoIdea } from '../types';
import { cn } from '../lib/utils';

export default function Ideation({ niche, onGenerateScript }: { niche: string, onGenerateScript: (idea: VideoIdea) => void }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<VideoIdea[]>([]);

  const handleGenerate = async () => {
    if (!input) return;
    setLoading(true);
    try {
      const result = await generateViralIdeation(input, niche);
      setIdeas(result);
      
      // Auto-save all generated ideas to history
      for (const idea of result) {
        await addDoc(collection(db, 'videos'), {
          userId: auth.currentUser?.uid,
          topic: idea.title,
          type: 'ideation',
          status: 'idea',
          idea: idea,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-5xl font-bold tracking-tight">Viral Ideation</h2>
        <p className="text-white/40 text-xl max-w-2xl mx-auto">
          Input a topic, script, or rough idea. We'll find the unique angle to escape the conflict radius.
        </p>
      </div>

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
        <div className="relative bg-[#111] border border-white/10 rounded-[2rem] p-8 flex gap-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste a topic, script, or video idea..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-xl placeholder:text-white/10 min-h-[120px] resize-none"
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !input}
            className="self-end bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white p-6 rounded-2xl transition-all shadow-xl"
          >
            {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Send className="w-8 h-8" />}
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
                      <div className="px-4 py-1.5 bg-red-600/20 text-red-500 rounded-full text-sm font-bold tracking-widest uppercase">
                        Viral Score: {idea.viralScore}%
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden flex-1 max-w-[200px]">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${idea.viralScore}%` }}
                          className="h-full bg-red-600"
                        />
                      </div>
                    </div>
                    <h3 className="text-3xl font-bold leading-tight">{idea.title}</h3>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="p-4 rounded-2xl border bg-green-600/20 border-green-600/50 text-green-500 flex items-center gap-2 font-bold">
                      <CheckCircle2 className="w-6 h-6" />
                      Saved to Library
                    </div>
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
                      <div className="flex items-center gap-2 text-red-500 font-bold uppercase tracking-widest text-xs">
                        <Zap className="w-4 h-4" />
                        Semantic ID Analysis
                      </div>
                      <div className="p-6 bg-white/5 rounded-3xl text-white/60 leading-relaxed whitespace-pre-wrap italic">
                        {idea.semanticAnalysis}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-red-500 font-bold uppercase tracking-widest text-xs">
                        <AlertCircle className="w-4 h-4" />
                        Conflict Radius Check
                      </div>
                      <div className="p-6 bg-white/5 rounded-3xl text-white/60 leading-relaxed whitespace-pre-wrap italic">
                        {idea.conflictRadiusCheck}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="text-white/40 font-bold uppercase tracking-widest text-xs">The Hook</div>
                      <p className="text-xl font-medium text-white/90 leading-relaxed">"{idea.hook}"</p>
                    </div>
                    <div className="space-y-4">
                      <div className="text-white/40 font-bold uppercase tracking-widest text-xs">Why it works</div>
                      <p className="text-white/60 leading-relaxed">{idea.whyItWorks}</p>
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
