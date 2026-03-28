import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BarChart2, TrendingUp, Eye, MousePointer2, Clock, MessageSquare, Plus, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, orderBy, limit } from 'firebase/firestore';
import { VideoProject, VideoStats } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { getPerformanceFeedback } from '../services/gemini';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

export default function PerformanceTracker() {
  const [videos, setVideos] = useState<VideoProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoProject | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'videos'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoProject)));
      setLoading(false);
    }, (error) => {
      console.error('Firestore Error in PerformanceTracker:', error);
      if (error.code === 'resource-exhausted') {
        alert('Firestore Quota Exceeded. Performance data could not be loaded.');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGetFeedback = async (video: VideoProject) => {
    if (!video.stats) return;
    setFeedbackLoading(true);
    try {
      const feedback = await getPerformanceFeedback(video.stats, video.topic);
      await updateDoc(doc(db, 'videos', video.id), { feedback });
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.UPDATE, 'videos/' + video.id);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const [isLogging, setIsLogging] = useState(false);
  const [newVideoData, setNewVideoData] = useState({
    topic: '',
    views: '',
    ctr: '',
    retention: ''
  });
  const [loggingLoading, setLoggingLoading] = useState(false);

  const handleLogVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoggingLoading(true);
    try {
      await addDoc(collection(db, 'videos'), {
        userId: auth.currentUser.uid,
        topic: newVideoData.topic,
        type: 'short', // Default for manual logging
        status: 'posted',
        stats: {
          views: Number(newVideoData.views),
          ctr: Number(newVideoData.ctr),
          retention: Number(newVideoData.retention)
        },
        createdAt: serverTimestamp()
      });
      setIsLogging(false);
      setNewVideoData({ topic: '', views: '', ctr: '', retention: '' });
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.CREATE, 'videos');
    } finally {
      setLoggingLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center p-24"><Loader2 className="w-12 h-12 animate-spin text-red-600" /></div>;

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold tracking-tight">Performance Tracker</h2>
        <button 
          onClick={() => setIsLogging(true)}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-xl"
        >
          <Plus className="w-5 h-5" />
          Log New Video
        </button>
      </div>

      {isLogging && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111] border border-white/10 rounded-[2.5rem] p-8 md:p-12 max-w-xl w-full space-y-8"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold">Log Video Stats</h3>
              <button onClick={() => setIsLogging(false)} className="text-white/40 hover:text-white">✕</button>
            </div>
            
            <form onSubmit={handleLogVideo} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-2">Video Topic / Title</label>
                <input 
                  required
                  type="text"
                  value={newVideoData.topic}
                  onChange={(e) => setNewVideoData({...newVideoData, topic: e.target.value})}
                  placeholder="e.g. 10 AI Tools for Designers"
                  className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl outline-none focus:border-red-600/50 transition-colors"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-2">Views</label>
                  <input 
                    required
                    type="number"
                    value={newVideoData.views}
                    onChange={(e) => setNewVideoData({...newVideoData, views: e.target.value})}
                    placeholder="0"
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl outline-none focus:border-red-600/50 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-2">CTR %</label>
                  <input 
                    required
                    type="number"
                    step="0.1"
                    value={newVideoData.ctr}
                    onChange={(e) => setNewVideoData({...newVideoData, ctr: e.target.value})}
                    placeholder="0.0"
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl outline-none focus:border-red-600/50 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-2">Retention %</label>
                  <input 
                    required
                    type="number"
                    step="0.1"
                    value={newVideoData.retention}
                    onChange={(e) => setNewVideoData({...newVideoData, retention: e.target.value})}
                    placeholder="0.0"
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl outline-none focus:border-red-600/50 transition-colors"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loggingLoading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2"
              >
                {loggingLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Log Performance
              </button>
            </form>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Video List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xl font-bold text-white/40 uppercase tracking-widest">Recent Videos</h3>
          {videos.length === 0 ? (
            <div className="p-12 bg-white/5 border border-dashed border-white/10 rounded-[2rem] text-center">
              <p className="text-white/40">No videos logged yet.</p>
            </div>
          ) : (
            videos.map((video) => (
              <button
                key={video.id}
                onClick={() => setSelectedVideo(video)}
                className={cn(
                  "w-full text-left p-6 rounded-3xl border transition-all duration-300",
                  selectedVideo?.id === video.id 
                    ? "bg-white/10 border-red-600/50 shadow-xl" 
                    : "bg-white/5 border-white/10 hover:border-white/20"
                )}
              >
                <h4 className="font-bold mb-2 truncate">{video.idea?.title || video.topic}</h4>
                <div className="flex items-center gap-4 text-xs text-white/40">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {video.stats?.views || 0}</span>
                  <span className="flex items-center gap-1"><MousePointer2 className="w-3 h-3" /> {video.stats?.ctr || 0}%</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Details & AI Feedback */}
        <div className="lg:col-span-2">
          {selectedVideo ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl text-center">
                  <Eye className="w-6 h-6 text-red-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{selectedVideo.stats?.views || 0}</p>
                  <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Views</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl text-center">
                  <MousePointer2 className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{selectedVideo.stats?.ctr || 0}%</p>
                  <p className="text-xs text-white/40 uppercase tracking-widest font-bold">CTR</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl text-center">
                  <Clock className="w-6 h-6 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{selectedVideo.stats?.retention || 0}%</p>
                  <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Retention</p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-[2rem] p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8">
                  <BarChart2 className="w-32 h-32 text-white/5 -rotate-12" />
                </div>
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-yellow-500" />
                  Smart Feedback AI
                </h3>
                
                {selectedVideo.feedback ? (
                  <div className="prose prose-invert max-w-none relative z-10">
                    <ReactMarkdown>{selectedVideo.feedback}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-center py-12 relative z-10">
                    <p className="text-white/40 mb-8">No feedback generated for this video yet.</p>
                    <button 
                      onClick={() => handleGetFeedback(selectedVideo)}
                      disabled={feedbackLoading || !selectedVideo.stats}
                      className="bg-white text-black font-bold px-8 py-4 rounded-2xl hover:bg-white/90 transition-all flex items-center gap-2 mx-auto"
                    >
                      {feedbackLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
                      Analyze Performance
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-24 bg-white/5 border border-dashed border-white/10 rounded-[2rem] text-center">
              <BarChart2 className="w-16 h-16 text-white/10 mb-4" />
              <p className="text-white/40">Select a video to see detailed stats and AI feedback.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
