import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, FileText, Mic, Scissors, Image as ImageIcon, Send, Loader2, ChevronRight, CheckCircle2, Youtube, Video, Zap, FileSearch, Plus, Clock, Trash2 } from 'lucide-react';
import { generateVideoIdeas, generateShortScript, generateLongScript, extractViralShort } from '../services/gemini';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { VideoIdea, VideoProject, VideoType } from '../types';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

const STEPS = [
  { id: 'type', label: 'Type', icon: Video },
  { id: 'input', label: 'Input', icon: Zap },
  { id: 'idea', label: 'Idea', icon: Sparkles },
  { id: 'script', label: 'Script', icon: FileText },
];

export default function VideoFlow({ niche, initialTopic, initialIdea, onResetTopic }: { niche: string, initialTopic?: string, initialIdea?: VideoIdea | null, onResetTopic?: () => void }) {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [videoType, setVideoType] = useState<VideoType | null>(null);
  const [topic, setTopic] = useState('');
  const [preSelectedIdea, setPreSelectedIdea] = useState<VideoIdea | null>(null);

  useEffect(() => {
    if (initialTopic || initialIdea) {
      if (initialIdea) {
        setTopic(initialIdea.title);
        setPreSelectedIdea(initialIdea);
      } else if (initialTopic) {
        setTopic(initialTopic);
      }
      setIsCreating(true);
      setCurrentStep(0); // Start at type selection to let user choose Short/Long
      if (onResetTopic) onResetTopic();
    }
  }, [initialTopic, initialIdea]);
  const [transcript, setTranscript] = useState('');
  const [wordCount, setWordCount] = useState(150);
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<VideoIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<VideoIdea | null>(null);
  const [scriptData, setScriptData] = useState<any>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'videos'), where('userId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoProject)));
    });
    return () => unsubscribe();
  }, []);

  const handleGenerateIdeas = async () => {
    if (!topic) return;
    setLoading(true);
    try {
      const result = await generateVideoIdeas(topic, niche);
      setIdeas(result);
      setCurrentStep(2);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateScript = async (idea?: VideoIdea) => {
    setLoading(true);
    try {
      let result;
      if (videoType === 'short') {
        result = await generateShortScript(idea?.title || topic, niche, wordCount);
      } else if (videoType === 'long') {
        const script = await generateLongScript(idea?.title || topic, niche, wordCount);
        result = { script };
      } else if (videoType === 'extractor') {
        result = await extractViralShort(transcript, niche, wordCount);
      }
      setScriptData(result);
      setSelectedIdea(idea || null);
      setCurrentStep(3);

      // Auto-save to history
      await addDoc(collection(db, 'videos'), {
        userId: auth.currentUser?.uid,
        topic: idea?.title || topic || 'Extracted Short',
        type: videoType,
        status: 'script',
        idea: idea || null,
        script: result.script,
        wordCount,
        transcript: videoType === 'extractor' ? transcript : null,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectType = (type: VideoType) => {
    setVideoType(type);
    const targetWordCount = type === 'long' ? 1500 : 150;
    setWordCount(targetWordCount);
    
    if (preSelectedIdea) {
      // We need to use the targetWordCount directly because state update is async
      (async () => {
        setLoading(true);
        try {
          let result;
          if (type === 'short') {
            result = await generateShortScript(preSelectedIdea.title, niche, targetWordCount);
          } else if (type === 'long') {
            const script = await generateLongScript(preSelectedIdea.title, niche, targetWordCount);
            result = { script };
          }
          setScriptData(result);
          setSelectedIdea(preSelectedIdea);
          setCurrentStep(3);
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      })();
    } else {
      setCurrentStep(1);
    }
  };

  const handleFinish = () => {
    setIsCreating(false);
    resetFlow();
  };

  const resetFlow = () => {
    setCurrentStep(0);
    setVideoType(null);
    setTopic('');
    setTranscript('');
    setIdeas([]);
    setSelectedIdea(null);
    setScriptData(null);
    setPreSelectedIdea(null);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'videos', id));
  };

  if (!isCreating) {
    return (
      <div className="space-y-12">
        <div className="flex justify-between items-center">
          <h2 className="text-4xl font-bold tracking-tight">Video Projects</h2>
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl"
          >
            <Plus className="w-6 h-6" />
            Create New Video
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-white/5 border border-white/10 rounded-[2rem] p-8 space-y-6 group hover:border-white/20 transition-all">
              <div className="flex justify-between items-start">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  project.type === 'short' ? "bg-red-600/20 text-red-600" : 
                  project.type === 'long' ? "bg-blue-600/20 text-blue-600" : 
                  project.type === 'ideation' ? "bg-purple-600/20 text-purple-600" : "bg-green-600/20 text-green-600"
                )}>
                  {project.type === 'short' ? <Zap className="w-6 h-6" /> : 
                   project.type === 'long' ? <Youtube className="w-6 h-6" /> : 
                   project.type === 'ideation' ? <Sparkles className="w-6 h-6" /> : <FileSearch className="w-6 h-6" />}
                </div>
                <button 
                  onClick={() => handleDelete(project.id)}
                  className="p-2 text-white/20 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              
              <div>
                <h3 className="text-xl font-bold mb-2 line-clamp-2">{project.idea?.title || project.topic}</h3>
                <p className="text-sm text-white/40 uppercase tracking-widest font-bold">{project.type}</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 text-white/40 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>{project.createdAt?.toDate().toLocaleDateString()}</span>
                </div>
                <button 
                  onClick={() => {
                    if (project.type === 'ideation') {
                      setTopic(project.topic);
                      setPreSelectedIdea(project.idea || null);
                      setIsCreating(true);
                      setCurrentStep(0);
                    } else {
                      setVideoType(project.type);
                      setTopic(project.topic);
                      setScriptData({ script: project.script, semanticAnalysis: project.thumbnailConcept });
                      setSelectedIdea(project.idea || null);
                      setIsCreating(true);
                      setCurrentStep(3);
                    }
                  }}
                  className="text-red-500 font-bold flex items-center gap-1 hover:gap-2 transition-all"
                >
                  {project.type === 'ideation' ? 'Generate Script' : 'View Script'} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <div className="col-span-full p-24 bg-white/5 border border-dashed border-white/10 rounded-[3rem] text-center">
              <Video className="w-16 h-16 text-white/10 mx-auto mb-4" />
              <p className="text-white/40 text-xl">No projects yet. Start your first one!</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Stepper */}
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <button 
          onClick={() => setIsCreating(false)}
          className="text-white/40 hover:text-white transition-colors font-bold"
        >
          Cancel
        </button>
        <div className="flex items-center gap-8">
          {STEPS.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                  idx <= currentStep ? "bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]" : "bg-white/5 text-white/20 border border-white/10"
                )}>
                  <step.icon className="w-6 h-6" />
                </div>
                <span className={cn("text-xs font-bold uppercase tracking-widest", idx <= currentStep ? "text-white" : "text-white/20")}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn("flex-1 w-8 h-px", idx < currentStep ? "bg-red-600" : "bg-white/10")} />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="w-12" /> {/* Spacer */}
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div 
              key="step-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="text-center space-y-4">
                <h2 className="text-5xl font-bold tracking-tight">Choose Your Format</h2>
                <p className="text-white/40 text-xl">Select the type of content you want to create today.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button 
                  onClick={() => handleSelectType('short')}
                  className="p-8 bg-white/5 border border-white/10 rounded-[2rem] hover:border-red-600/50 hover:bg-white/10 transition-all group text-center space-y-4"
                >
                  <div className="w-16 h-16 bg-red-600/20 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-red-600 transition-colors">
                    <Zap className="w-8 h-8 text-red-600 group-hover:text-white" />
                  </div>
                  <h3 className="text-2xl font-bold">YouTube Shorts</h3>
                  <p className="text-white/40 text-sm">Viral-ready scripts built to escape the algorithm conflict radius.</p>
                </button>

                <button 
                  onClick={() => handleSelectType('long')}
                  className="p-8 bg-white/5 border border-white/10 rounded-[2rem] hover:border-red-600/50 hover:bg-white/10 transition-all group text-center space-y-4"
                >
                  <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-blue-600 transition-colors">
                    <Youtube className="w-8 h-8 text-blue-600 group-hover:text-white" />
                  </div>
                  <h3 className="text-2xl font-bold">Long Video</h3>
                  <p className="text-white/40 text-sm">Retention-optimized long-form scripts for deep engagement.</p>
                </button>

                <button 
                  onClick={() => handleSelectType('extractor')}
                  className="p-8 bg-white/5 border border-white/10 rounded-[2rem] hover:border-red-600/50 hover:bg-white/10 transition-all group text-center space-y-4"
                >
                  <div className="w-16 h-16 bg-green-600/20 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-green-600 transition-colors">
                    <FileSearch className="w-8 h-8 text-green-600 group-hover:text-white" />
                  </div>
                  <h3 className="text-2xl font-bold">Viral Extractor</h3>
                  <p className="text-white/40 text-sm">Transform long-form transcripts into viral 60s Shorts.</p>
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div 
              key="step-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-bold tracking-tight">
                  {videoType === 'extractor' ? 'Paste Transcript' : 'Enter Topic'}
                </h2>
                <p className="text-white/40 text-lg">Provide the details for your {videoType} content.</p>
              </div>

              <div className="space-y-6">
                {videoType === 'extractor' ? (
                  <textarea 
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Paste your long video transcript here..."
                    className="w-full h-64 bg-white/5 border border-white/10 rounded-[2rem] p-8 outline-none focus:border-red-600/50 transition-colors text-lg"
                  />
                ) : (
                  <input 
                    type="text" 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. The Future of AI in 2026..."
                    className="w-full bg-white/5 border border-white/10 px-8 py-6 rounded-[2rem] outline-none focus:border-red-600/50 transition-colors text-xl"
                  />
                )}

                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold uppercase tracking-widest text-xs text-white/40">Target Word Count</h4>
                    <span className="text-red-500 font-bold">{wordCount} words</span>
                  </div>
                  <input 
                    type="range" 
                    min={videoType === 'long' ? 500 : 50}
                    max={videoType === 'long' ? 3000 : 300}
                    step={50}
                    value={wordCount}
                    onChange={(e) => setWordCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-600"
                  />
                </div>

                <button 
                  onClick={videoType === 'extractor' ? () => handleGenerateScript() : handleGenerateIdeas}
                  disabled={loading || (videoType === 'extractor' ? !transcript : !topic)}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-6 rounded-[2rem] font-bold flex items-center justify-center gap-3 transition-all shadow-xl text-xl"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                  {videoType === 'extractor' ? 'Extract Viral Short' : 'Generate Ideas'}
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div 
              key="step-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-bold tracking-tight">Select an Idea</h2>
                <p className="text-white/40 text-lg">Choose the angle that will perform best.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {ideas.map((idea, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleGenerateScript(idea)}
                    disabled={loading}
                    className="w-full text-left p-8 bg-white/5 border border-white/10 rounded-[2rem] hover:border-red-600/50 hover:bg-white/10 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-2xl font-bold group-hover:text-red-500 transition-colors">{idea.title}</h3>
                      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ChevronRight className="w-6 h-6 text-white/20 group-hover:text-red-500 transition-transform group-hover:translate-x-1" />}
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">The Hook</p>
                        <p className="text-white/70 italic">"{idea.hook}"</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Why it works</p>
                        <p className="text-white/50 text-sm">{idea.whyItWorks}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div 
              key="step-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Your {videoType} Script</h2>
                <button 
                  onClick={handleFinish}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Finish & Save
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white/5 border border-white/10 rounded-[2rem] p-12 prose prose-invert max-w-none">
                    <ReactMarkdown>{scriptData.script}</ReactMarkdown>
                  </div>
                </div>

                <div className="space-y-6">
                  {scriptData.semanticAnalysis && (
                    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8">
                      <h4 className="text-sm font-bold uppercase tracking-widest text-red-500 mb-4">Algorithm Tokens</h4>
                      <p className="text-xs text-white/60 whitespace-pre-wrap leading-relaxed">{scriptData.semanticAnalysis}</p>
                    </div>
                  )}
                  {scriptData.netInformationGainScore && (
                    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 text-center">
                      <p className="text-4xl font-black text-red-600 mb-1">{scriptData.netInformationGainScore}/10</p>
                      <p className="text-xs font-bold uppercase tracking-widest text-white/40">Net Info Gain</p>
                    </div>
                  )}
                  {scriptData.thumbnailConcept && (
                    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8">
                      <h4 className="text-sm font-bold uppercase tracking-widest text-blue-500 mb-4">Thumbnail Concept</h4>
                      <p className="text-sm text-white/70 leading-relaxed">{scriptData.thumbnailConcept}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
