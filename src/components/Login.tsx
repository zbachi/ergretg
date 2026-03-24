import React from 'react';
import { Video, Youtube, ArrowRight } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';
import { motion } from 'motion/react';

export default function Login() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6 font-sans overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full animate-pulse delay-1000" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full text-center space-y-12 relative z-10"
      >
        <div className="flex flex-col items-center gap-6">
          <div className="w-24 h-24 bg-red-600 rounded-[2rem] flex items-center justify-center shadow-[0_0_50px_rgba(220,38,38,0.5)] rotate-12">
            <Video className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-6xl font-black tracking-tighter">
            90 DAYS <br />
            <span className="text-red-600">YOUTUBE OS</span>
          </h1>
          <p className="text-white/50 text-xl font-medium max-w-md">
            The guided execution system for faceless creators. Stop thinking, start posting.
          </p>
        </div>

        <div className="space-y-6">
          <button 
            onClick={signInWithGoogle}
            className="w-full bg-white text-black font-bold py-6 rounded-3xl flex items-center justify-center gap-4 hover:bg-white/90 transition-all group shadow-2xl"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
            <span className="text-lg">Get Started with Google</span>
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </button>
          
          <div className="flex items-center justify-center gap-8 text-white/30 text-sm font-bold uppercase tracking-widest">
            <span className="flex items-center gap-2"><Youtube className="w-4 h-4" /> 50M+ Views Framework</span>
            <span className="flex items-center gap-2">⚡ AI Powered</span>
          </div>
        </div>

        <div className="pt-12 grid grid-cols-3 gap-4">
          {[
            { label: 'Ideas', desc: 'Viral Hooks' },
            { label: 'Scripts', desc: 'Retention' },
            { label: 'Daily', desc: '90 Day OS' }
          ].map((item, idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 p-6 rounded-3xl">
              <p className="text-lg font-bold">{item.label}</p>
              <p className="text-xs text-white/40 uppercase tracking-widest">{item.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
