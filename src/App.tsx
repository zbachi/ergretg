/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile, VideoIdea } from './types';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import VideoFlow from './components/VideoFlow';
import Ideation from './components/Ideation';
import PerformanceTracker from './components/PerformanceTracker';
import { Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [initialTopic, setInitialTopic] = useState('');
  const [initialIdea, setInitialIdea] = useState<VideoIdea | null>(null);
  const [onboarding, setOnboarding] = useState(false);
  const [niche, setNiche] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const unsubUser = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUser({ id: docSnap.id, ...docSnap.data() } as any);
            setOnboarding(false);
          } else {
            setOnboarding(true);
          }
          setLoading(false);
        });
        return () => unsubUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleOnboarding = async () => {
    if (!auth.currentUser || !niche) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await setDoc(userRef, {
      uid: auth.currentUser.uid,
      displayName: auth.currentUser.displayName,
      email: auth.currentUser.email,
      currentDay: 1,
      niche,
      createdAt: serverTimestamp(),
      completedTasks: []
    });
    setOnboarding(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-red-600" />
      </div>
    );
  }

  if (!user && !onboarding) {
    return <Login />;
  }

  if (onboarding) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full space-y-8 text-center"
        >
          <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-4xl font-bold tracking-tight">Welcome to the 90 Day OS</h2>
          <p className="text-white/50 text-lg">To optimize your AI, tell us your YouTube niche.</p>
          
          <div className="space-y-4">
            <input 
              type="text" 
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g. AI News, Travel Vlogs, Cooking..."
              className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl outline-none focus:border-red-600/50 transition-colors text-lg"
            />
            <button 
              onClick={handleOnboarding}
              disabled={!niche}
              className="w-full bg-red-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-700 transition-all"
            >
              Start Your 90 Days
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && user && <Dashboard user={user} onStartVideo={() => setActiveTab('videos')} />}
      {activeTab === 'ideation' && user && (
        <Ideation 
          niche={user.niche} 
          onGenerateScript={(idea) => {
            setInitialIdea(idea);
            setActiveTab('videos');
          }} 
        />
      )}
      {activeTab === 'videos' && user && (
        <VideoFlow 
          niche={user.niche} 
          initialTopic={initialTopic} 
          initialIdea={initialIdea}
          onResetTopic={() => {
            setInitialTopic('');
            setInitialIdea(null);
          }} 
        />
      )}
      {activeTab === 'stats' && <PerformanceTracker />}
    </Layout>
  );
}

