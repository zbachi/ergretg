import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, FileText, Mic, Scissors, Image as ImageIcon, Send, Loader2, ChevronRight, CheckCircle2, Youtube, Video, Zap, FileSearch, Plus, Clock, Trash2, Volume2, Play, Download, Upload, X } from 'lucide-react';
import { generateVideoIdeas, generateShortScript, generateLongScript, extractViralShort, generateImagePrompts, generateVideoPackage, refineImagePrompts, generateSpeech } from '../services/gemini';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, deleteDoc, doc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { VideoIdea, VideoProject, VideoType } from '../types';
import ReactMarkdown from 'react-markdown';
import { cn, createWavBlob } from '../lib/utils';

const STEPS = [
  { id: 'type', label: 'Type', icon: Video },
  { id: 'input', label: 'Input', icon: Zap },
  { id: 'idea', label: 'Idea', icon: Sparkles },
  { id: 'script', label: 'Script', icon: FileText },
];

export default function VideoFlow({ niche: initialNiche, initialTopic, initialIdea, onResetTopic }: { niche: string, initialTopic?: string, initialIdea?: VideoIdea | null, onResetTopic?: () => void }) {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [videoType, setVideoType] = useState<VideoType | null>(null);
  const [topic, setTopic] = useState('');
  const [currentNiche, setCurrentNiche] = useState(initialNiche);
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
  const [ideas, setIdeas] = useState<(VideoIdea & { saved?: boolean })[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<VideoIdea | null>(null);
  const [scriptData, setScriptData] = useState<any>(null);
  const [imagePrompts, setImagePrompts] = useState<string>('');
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [promptCount, setPromptCount] = useState(50);
  const [promptInstructions, setPromptInstructions] = useState('');
  const [styleImage, setStyleImage] = useState<string | null>(null);
  const [videoPackage, setVideoPackage] = useState<any>(null);
  const [loadingPackage, setLoadingPackage] = useState(false);
  const [refiningPrompts, setRefiningPrompts] = useState(false);
  const [refinementInput, setRefinementInput] = useState('');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [libraryTab, setLibraryTab] = useState<'scripts' | 'ideas' | 'prompts'>('scripts');
  const [promptScriptInput, setPromptScriptInput] = useState('');
  const [promptStyleInput, setPromptStyleInput] = useState('');
  const [promptCountInput, setPromptCountInput] = useState(10);
  const [libraryStyleImage, setLibraryStyleImage] = useState<string | null>(null);
  const [generatedPromptsLibrary, setGeneratedPromptsLibrary] = useState('');
  const [loadingLibraryPrompts, setLoadingLibraryPrompts] = useState(false);
  const [loadingSpeech, setLoadingSpeech] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr'>('Kore');
  const audioSourceRef = React.useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'videos'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoProject)));
    }, (error) => {
      console.error('Firestore Error in VideoFlow:', error);
      if (error.code === 'resource-exhausted') {
        alert('Firestore Quota Exceeded. The free tier limit has been reached. Quota will reset tomorrow at midnight. See https://firebase.google.com/pricing for details.');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGenerateIdeas = async () => {
    if (!topic || !currentNiche) return;
    setLoading(true);
    try {
      const result = await generateVideoIdeas(topic, currentNiche);
      setIdeas(result.map(idea => ({ ...idea, saved: false })));
      setCurrentStep(2);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIdea = async (idea: VideoIdea, index: number) => {
    try {
      await addDoc(collection(db, 'videos'), {
        userId: auth.currentUser?.uid,
        topic: idea.title,
        type: 'ideation',
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

  const handleGenerateScript = async (idea?: VideoIdea) => {
    if (!currentNiche) return;
    setLoading(true);
    try {
      let result;
      if (videoType === 'short') {
        result = await generateShortScript(idea?.title || topic, currentNiche, wordCount);
      } else if (videoType === 'long') {
        const script = await generateLongScript(idea?.title || topic, currentNiche, wordCount);
        result = { script };
      } else if (videoType === 'extractor') {
        result = await extractViralShort(transcript, currentNiche, wordCount);
      }
      setScriptData(result);
      setSelectedIdea(idea || null);
      setCurrentStep(3);

      // Auto-save to history
      const docRef = await addDoc(collection(db, 'videos'), {
        userId: auth.currentUser?.uid,
        topic: idea?.title || topic || 'Extracted Short',
        type: videoType,
        status: 'script',
        idea: idea || null,
        script: result.script,
        wordCount,
        niche: currentNiche,
        transcript: videoType === 'extractor' ? transcript : null,
        createdAt: serverTimestamp(),
      });
      setCurrentProjectId(docRef.id);
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
            result = await generateShortScript(preSelectedIdea.title, currentNiche, targetWordCount);
          } else if (type === 'long') {
            const script = await generateLongScript(preSelectedIdea.title, currentNiche, targetWordCount);
            result = { script };
          }
          
          if (result) {
            setScriptData(result);
            setSelectedIdea(preSelectedIdea);
            setCurrentStep(3);

            // Save to history
            const docRef = await addDoc(collection(db, 'videos'), {
              userId: auth.currentUser?.uid,
              topic: preSelectedIdea.title,
              type: type,
              status: 'script',
              idea: preSelectedIdea,
              script: result.script,
              wordCount: targetWordCount,
              niche: currentNiche,
              createdAt: serverTimestamp(),
            });
            setCurrentProjectId(docRef.id);
          }
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

  const handleGeneratePrompts = async () => {
    if (!scriptData?.script) return;
    setLoadingPrompts(true);
    try {
      const prompts = await generateImagePrompts(scriptData.script, currentNiche, promptCount, promptInstructions, styleImage);
      setImagePrompts(prompts);
      
      // Update the project in Firestore
      if (currentProjectId) {
        await updateDoc(doc(db, 'videos', currentProjectId), {
          imagePrompts: prompts
        });
      }
    } catch (error) {
      console.error(error);
      if (currentProjectId) {
        handleFirestoreError(error, OperationType.UPDATE, 'videos/' + currentProjectId);
      } else {
        handleFirestoreError(error, OperationType.WRITE, 'videos');
      }
    } finally {
      setLoadingPrompts(false);
    }
  };

  const handleRefinePrompts = async () => {
    if (!imagePrompts || !refinementInput) return;
    setRefiningPrompts(true);
    try {
      const refined = await refineImagePrompts(imagePrompts, refinementInput);
      setImagePrompts(refined);
      setRefinementInput('');
      
      // Update the project in Firestore
      if (currentProjectId) {
        await updateDoc(doc(db, 'videos', currentProjectId), {
          imagePrompts: refined
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setRefiningPrompts(false);
    }
  };

  const handleGeneratePackage = async () => {
    if (!scriptData?.script) return;
    setLoadingPackage(true);
    try {
      const pkg = await generateVideoPackage(scriptData.script, selectedIdea?.title || topic, currentNiche);
      setVideoPackage(pkg);
      
      // Update the project in Firestore
      if (currentProjectId) {
        await updateDoc(doc(db, 'videos', currentProjectId), {
          videoPackage: pkg
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingPackage(false);
    }
  };

  const handleFinish = async () => {
    if (currentProjectId) {
      try {
        await updateDoc(doc(db, 'videos', currentProjectId), {
          status: 'completed'
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'videos/' + currentProjectId);
      }
    }
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
    setImagePrompts('');
    setVideoPackage(null);
    setPromptCount(50);
    setPromptInstructions('');
    setCurrentProjectId(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await deleteDoc(doc(db, 'videos', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'videos/' + id);
    }
  };

  const handleGenerateLibraryPrompts = async () => {
    if (!promptScriptInput || !currentNiche) return;
    setLoadingLibraryPrompts(true);
    try {
      const prompts = await generateImagePrompts(promptScriptInput, currentNiche, promptCountInput, promptStyleInput, libraryStyleImage);
      setGeneratedPromptsLibrary(prompts);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingLibraryPrompts(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateSpeech = async () => {
    if (!scriptData?.script) return;
    
    if (isPlaying) {
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        audioSourceRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    setLoadingSpeech(true);
    try {
      const base64 = await generateSpeech(scriptData.script, selectedVoice);
      
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      const pcmData = new Int16Array(len / 2);
      const view = new DataView(bytes.buffer);
      for (let i = 0; i < len / 2; i++) {
        pcmData[i] = view.getInt16(i * 2, true);
      }

      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const blob = createWavBlob(pcmData, 24000);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const audioContext = audioContextRef.current;
      const buffer = audioContext.createBuffer(1, pcmData.length, 24000);
      const channelData = buffer.getChannelData(0);
      
      for (let i = 0; i < pcmData.length; i++) {
        channelData[i] = pcmData[i] / 32768;
      }
      
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      
      audioSourceRef.current = source;
      setIsPlaying(true);
      
      source.onended = () => {
        setIsPlaying(false);
        audioSourceRef.current = null;
      };
      
      source.start();
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingSpeech(false);
    }
  };

  if (!isCreating) {
    const filteredProjects = projects.filter(p => 
      libraryTab === 'scripts' ? (p.type !== 'ideation' && p.type !== 'bending') : (p.type === 'ideation' || p.type === 'bending')
    ).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    return (
      <div className="space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <h2 className="text-4xl font-bold tracking-tight">Library</h2>
            <p className="text-white/40 text-lg">Your history of viral ideas and generated scripts.</p>
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl"
          >
            <Plus className="w-6 h-6" />
            Create New Video
          </button>
        </div>

        <div className="flex gap-4 border-b border-white/10 pb-4">
          <button
            onClick={() => setLibraryTab('scripts')}
            className={cn(
              "px-6 py-2 rounded-xl font-bold transition-all",
              libraryTab === 'scripts' ? "bg-red-600 text-white" : "text-white/40 hover:text-white"
            )}
          >
            Scripts History
          </button>
          <button
            onClick={() => setLibraryTab('ideas')}
            className={cn(
              "px-6 py-2 rounded-xl font-bold transition-all",
              libraryTab === 'ideas' ? "bg-red-600 text-white" : "text-white/40 hover:text-white"
            )}
          >
            Saved Ideas
          </button>
          <button
            onClick={() => setLibraryTab('prompts')}
            className={cn(
              "px-6 py-2 rounded-xl font-bold transition-all",
              libraryTab === 'prompts' ? "bg-red-600 text-white" : "text-white/40 hover:text-white"
            )}
          >
            Image Prompts
          </button>
        </div>

        {libraryTab === 'prompts' ? (
          <div className="space-y-8">
            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2 block">Video Script</label>
                  <textarea 
                    placeholder="Paste your video script here..."
                    value={promptScriptInput}
                    onChange={(e) => setPromptScriptInput(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-red-500 min-h-[200px] resize-none text-white/80"
                  />
                </div>
                
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                          Style & Character Guidance
                        </label>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-red-500/60 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Powered by Gemini
                        </span>
                      </div>
                      <textarea 
                        placeholder="Describe the image style, characters, and visual vibe..."
                        value={promptStyleInput}
                        onChange={(e) => setPromptStyleInput(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 min-h-[100px] resize-none text-sm"
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/40">Number of Prompts</label>
                        <input 
                          type="number" 
                          value={promptCountInput}
                          onChange={(e) => setPromptCountInput(parseInt(e.target.value) || 10)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500"
                          min="1"
                          max="100"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/40">Style Reference Image (Optional)</label>
                        <div className="flex items-center gap-4">
                          {libraryStyleImage ? (
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/20">
                              <img src={libraryStyleImage} alt="Style reference" className="w-full h-full object-cover" />
                              <button 
                                onClick={() => setLibraryStyleImage(null)}
                                className="absolute top-0 right-0 bg-red-600 p-1 rounded-bl-lg"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="w-16 h-16 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-red-500/50 transition-all">
                              <Upload className="w-5 h-5 text-white/20" />
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handleImageUpload(e, setLibraryStyleImage)}
                              />
                            </label>
                          )}
                          <p className="text-[10px] text-white/40 leading-tight">Upload an image to guide the visual style, colors, and mood.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                <button
                  onClick={handleGenerateLibraryPrompts}
                  disabled={loadingLibraryPrompts || !promptScriptInput}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
                >
                  {loadingLibraryPrompts ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                  Generate Image Prompts
                </button>
              </div>
            </div>

            {generatedPromptsLibrary && (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                <div className="relative bg-[#111] border border-white/10 rounded-[2rem] p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Generated Visual Prompts</h3>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handleGenerateLibraryPrompts}
                        disabled={loadingLibraryPrompts}
                        className="text-white/60 hover:text-white font-bold text-sm flex items-center gap-2 transition-all"
                      >
                        {loadingLibraryPrompts ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        Regenerate
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedPromptsLibrary);
                        }}
                        className="text-red-500 hover:text-red-400 font-bold text-sm flex items-center gap-2"
                      >
                        <Scissors className="w-4 h-4" />
                        Copy All
                      </button>
                    </div>
                  </div>
                  <div className="bg-black/40 rounded-2xl p-6 font-mono text-sm text-white/70 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto custom-scrollbar">
                    {generatedPromptsLibrary}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
            <div key={project.id} className="bg-white/5 border border-white/10 rounded-[2rem] p-8 space-y-6 group hover:border-white/20 transition-all relative overflow-hidden">
              {project.idea?.viralScore && (
                <div className="absolute top-0 right-0 bg-red-600 text-white px-4 py-1 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest">
                  {project.idea.viralScore}/100 VIRAL
                </div>
              )}
              <div className="flex justify-between items-start">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  project.type === 'short' ? "bg-red-600/20 text-red-600" : 
                  project.type === 'long' ? "bg-blue-600/20 text-blue-600" : 
                  project.type === 'ideation' ? "bg-purple-600/20 text-purple-600" : 
                  project.type === 'bending' ? "bg-purple-600/20 text-purple-600" : "bg-green-600/20 text-green-600"
                )}>
                  {project.type === 'short' ? <Zap className="w-6 h-6" /> : 
                   project.type === 'long' ? <Youtube className="w-6 h-6" /> : 
                   project.type === 'ideation' ? <Sparkles className="w-6 h-6" /> : 
                   project.type === 'bending' ? <Scissors className="w-6 h-6" /> : <FileSearch className="w-6 h-6" />}
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
                    if (project.type === 'ideation' || project.type === 'bending') {
                      setTopic(project.topic);
                      setPreSelectedIdea(project.idea || null);
                      setIsCreating(true);
                      setCurrentStep(0);
                    } else {
                      setVideoType(project.type);
                      setTopic(project.topic);
                      setScriptData({ script: project.script, semanticAnalysis: project.thumbnailConcept });
                      setSelectedIdea(project.idea || null);
                      setImagePrompts(project.imagePrompts || '');
                      setVideoPackage(project.videoPackage || null);
                      setCurrentProjectId(project.id);
                      setIsCreating(true);
                      setCurrentStep(3);
                    }
                  }}
                  className="text-red-500 font-bold flex items-center gap-1 hover:gap-2 transition-all"
                >
                  {(project.type === 'ideation' || project.type === 'bending') ? 'Generate Script' : 'View Script'} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {filteredProjects.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white/5 border border-dashed border-white/10 rounded-[3rem]">
              <p className="text-white/20 text-lg">No {libraryTab} found yet.</p>
            </div>
          )}
          </div>
        )}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-4">
                      {videoType === 'extractor' ? 'Transcript' : 'Topic'}
                    </label>
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
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-4">Target Niche</label>
                      <input 
                        type="text" 
                        value={currentNiche}
                        onChange={(e) => setCurrentNiche(e.target.value)}
                        placeholder="e.g. Finance, Tech, Cooking"
                        className="w-full bg-white/5 border border-white/10 px-8 py-6 rounded-[2rem] outline-none focus:border-red-600/50 transition-colors text-xl"
                      />
                    </div>

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
                  </div>
                </div>

                <button 
                  onClick={videoType === 'extractor' ? () => handleGenerateScript() : handleGenerateIdeas}
                  disabled={loading || (videoType === 'extractor' ? !transcript : !topic) || !currentNiche}
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
                  <div
                    key={idx}
                    className="w-full text-left p-8 bg-white/5 border border-white/10 rounded-[2rem] hover:border-red-600/50 hover:bg-white/10 transition-all group relative"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-bold group-hover:text-red-500 transition-colors">{idea.title}</h3>
                          {idea.viralScore && (
                            <span className="bg-red-600/20 text-red-500 px-3 py-1 rounded-full text-xs font-black">
                              {idea.viralScore}/100 VIRAL
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {idea.saved ? (
                          <div className="p-3 bg-green-600/20 text-green-500 rounded-xl flex items-center gap-2 font-bold text-xs">
                            <CheckCircle2 className="w-4 h-4" />
                            Saved
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveIdea(idea, idx);
                            }}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all"
                            title="Save Idea to Library"
                          >
                            <Sparkles className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleGenerateScript(idea)}
                          disabled={loading}
                          className="p-3 bg-red-600 hover:bg-red-700 rounded-xl text-white transition-all"
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                        </button>
                      </div>
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
                  </div>
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
                <div className="flex items-center gap-4">
                  <h2 className="text-3xl font-bold">Your {videoType} Script</h2>
                </div>
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

                  {/* Image Prompts Section */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold flex items-center gap-3">
                        <ImageIcon className="w-6 h-6 text-red-500" />
                        Visual Scene Prompts
                      </h3>
                    </div>

                    {!imagePrompts && (
                      <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-white/40">Number of Prompts</label>
                            <input 
                              type="number" 
                              value={promptCount}
                              onChange={(e) => setPromptCount(parseInt(e.target.value) || 50)}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500"
                              min="1"
                              max="100"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-white/40">Style Reference Image (Optional)</label>
                            <div className="flex items-center gap-4">
                              {styleImage ? (
                                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/20">
                                  <img src={styleImage} alt="Style reference" className="w-full h-full object-cover" />
                                  <button 
                                    onClick={() => setStyleImage(null)}
                                    className="absolute top-0 right-0 bg-red-600 p-1 rounded-bl-lg"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <label className="w-16 h-16 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-red-500/50 transition-all">
                                  <Upload className="w-5 h-5 text-white/20" />
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => handleImageUpload(e, setStyleImage)}
                                  />
                                </label>
                              )}
                              <p className="text-[10px] text-white/40 leading-tight">Upload an image to guide the visual style, colors, and mood.</p>
                            </div>
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-white/40">AI Guidance / Character Instructions</label>
                            <textarea 
                              placeholder="Describe your character, specific style, or any other details to guide the AI..."
                              value={promptInstructions}
                              onChange={(e) => setPromptInstructions(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 min-h-[100px] resize-none"
                            />
                          </div>
                        </div>
                        <button
                          onClick={handleGeneratePrompts}
                          disabled={loadingPrompts}
                          className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
                        >
                          {loadingPrompts ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                          Generate {promptCount} Visual Prompts
                        </button>
                      </div>
                    )}

                    {imagePrompts && (
                      <div className="space-y-6">
                        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 space-y-6">
                          <div className="flex items-center gap-3 mb-2">
                            <Sparkles className="w-5 h-5 text-yellow-500" />
                            <h4 className="text-lg font-bold">Refine with Gemini Intelligence</h4>
                          </div>
                          <div className="flex gap-4">
                            <input 
                              type="text"
                              placeholder="e.g. Make all prompts more cinematic, or change character to a robot..."
                              value={refinementInput}
                              onChange={(e) => setRefinementInput(e.target.value)}
                              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500"
                            />
                            <button
                              onClick={handleRefinePrompts}
                              disabled={refiningPrompts || !refinementInput}
                              className="bg-white text-black font-bold px-6 py-3 rounded-xl hover:bg-white/90 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                              {refiningPrompts ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                              Refine
                            </button>
                          </div>
                        </div>

                        <div className="relative group">
                          <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                          <div className="relative bg-[#111] border border-white/10 rounded-[2rem] p-8">
                            <div className="flex justify-between items-center mb-6">
                              <p className="text-sm text-white/40 italic">Copy these prompts into your favorite AI image generator.</p>
                              <div className="flex items-center gap-4">
                                <button
                                  onClick={handleGeneratePrompts}
                                  disabled={loadingPrompts}
                                  className="text-white/60 hover:text-white font-bold text-sm flex items-center gap-2 transition-all"
                                >
                                  {loadingPrompts ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                  Regenerate
                                </button>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(imagePrompts);
                                    // Optional: add a toast or success state
                                  }}
                                  className="text-red-500 hover:text-red-400 font-bold text-sm flex items-center gap-2"
                                >
                                  <Scissors className="w-4 h-4" />
                                  Copy All Prompts
                                </button>
                              </div>
                            </div>
                            <div className="bg-black/40 rounded-2xl p-6 font-mono text-sm text-white/70 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto custom-scrollbar">
                              {imagePrompts}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI Voiceover Section */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold flex items-center gap-3">
                        <Mic className="w-6 h-6 text-blue-500" />
                        AI Voiceover Production
                      </h3>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <label className="text-xs font-bold uppercase tracking-widest text-white/40 block">Select Voice Character</label>
                          <div className="grid grid-cols-2 gap-3">
                            {(['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'] as const).map((voice) => (
                              <button
                                key={voice}
                                onClick={() => setSelectedVoice(voice)}
                                className={cn(
                                  "px-4 py-3 rounded-xl text-sm font-bold transition-all border",
                                  selectedVoice === voice 
                                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20" 
                                    : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white"
                                )}
                              >
                                {voice}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col justify-end gap-4">
                          <button
                            onClick={handleGenerateSpeech}
                            disabled={loadingSpeech}
                            className={cn(
                              "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl",
                              isPlaying 
                                ? "bg-red-600 hover:bg-red-700 text-white animate-pulse" 
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                            )}
                          >
                            {loadingSpeech ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : isPlaying ? (
                              <Volume2 className="w-5 h-5" />
                            ) : (
                              <Play className="w-5 h-5" />
                            )}
                            {loadingSpeech ? 'Generating Voiceover...' : isPlaying ? 'Stop Playback' : 'Generate & Play Voiceover'}
                          </button>

                          {audioUrl && (
                            <a
                              href={audioUrl}
                              download={`${videoType.toLowerCase()}_voiceover.wav`}
                              className="w-full bg-white/10 hover:bg-white/20 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all border border-white/10"
                            >
                              <Download className="w-5 h-5" />
                              Download Voiceover (.wav)
                            </a>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-[10px] text-white/30 italic text-center">
                        Powered by Gemini 2.5 Flash Native Audio. High-fidelity 24kHz mono output.
                      </p>
                    </div>
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

                  {/* Video Package Section */}
                  <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold uppercase tracking-widest text-green-500">Video Package</h4>
                      {!videoPackage && (
                        <button
                          onClick={handleGeneratePackage}
                          disabled={loadingPackage}
                          className="text-xs bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all"
                        >
                          {loadingPackage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                          Generate
                        </button>
                      )}
                    </div>

                    {videoPackage ? (
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Clickable Titles</p>
                          {videoPackage.titles.map((t: string, i: number) => (
                            <div key={i} className="bg-white/5 p-3 rounded-xl text-sm font-medium border border-white/5">
                              {t}
                            </div>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">SEO Description</p>
                          <div className="bg-white/5 p-4 rounded-xl text-xs text-white/60 leading-relaxed max-h-40 overflow-y-auto custom-scrollbar">
                            {videoPackage.description}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Tags</p>
                          <div className="flex flex-wrap gap-2">
                            {videoPackage.tags.map((tag: string, i: number) => (
                              <span key={i} className="bg-white/5 px-2 py-1 rounded text-[10px] text-white/40 border border-white/5">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Thumbnail Prompt</p>
                          <div className="bg-white/5 p-4 rounded-xl text-xs text-white/60 italic border border-dashed border-white/10">
                            {videoPackage.thumbnailPrompt}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-white/20 text-center py-4 italic">Generate titles, description, and tags for this video.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
