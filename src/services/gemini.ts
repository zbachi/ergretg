import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const generateVideoIdeas = async (topic: string, niche: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate 5 viral video ideas for a YouTube channel in the ${niche} niche that are DIRECTLY BASED on the topic: "${topic}". 
    
    CRITICAL: Stay very close to the user's provided topic. Do not generate "weird" or unrelated ideas. Instead, find 5 different "Viral Angles" for the EXACT same topic. 
    
    For each idea, provide:
    - A catchy, high-CTR title
    - A strong hook (first 3 seconds)
    - A brief explanation of the "Unique Angle" (why this specific version of "${topic}" will work).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            hook: { type: Type.STRING },
            whyItWorks: { type: Type.STRING }
          },
          required: ["title", "hook", "whyItWorks"]
        }
      }
    }
  });
  
  return JSON.parse(response.text);
};

export const generateShortScript = async (topic: string, niche: string, wordCount: number = 150) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are an elite YouTube Shorts scriptwriter and algorithm strategist.
    Your job is to write a complete, viral-ready Shorts script based on the topic: "${topic}" in the ${niche} niche.
    Target word count: ${wordCount} words.
    
    BEFORE WRITING ANYTHING, DO THIS FIRST:
    🔍 SEMANTIC ID ANALYSIS
    Assign this video its 8 Algorithm Tokens (Category, Niche, Sub-niche, Subject, Format, Style, Idea, Signature).
    
    ⚠️ CONFLICT RADIUS CHECK:
    Identify 2-3 most viral/common versions of this topic on YouTube Shorts right now.
    Explain HOW this script will position itself OUTSIDE their Conflict Radius.
    
    NOW WRITE THE SCRIPT:
    - THE HOOK [0–3 seconds]: One powerful opening line (Open loop, no intro).
    - PATTERN INTERRUPT [3–7 seconds]: Follow-up that FLIPS expectation.
    - THE CORE VALUE BLOCK [7–45 seconds]: Delivered content with Net Information Gain.
    - THE RE-HOOK [midpoint]: Reset curiosity.
    - THE PAYOFF + CTA [45–58 seconds]: Close loop, deliver answer, end with natural CTA (Comment/Save/Follow/Share bait).
    
    CRITICAL: Write ONLY the spoken narration. DO NOT include any visual cues, scene descriptions, speaker names, or bracketed instructions like [SCENE START], [VISUAL], or [0-3 seconds]. The output must be a pure, continuous narrative script that can be read directly by a voiceover artist or AI.
    
    AFTER THE SCRIPT, PROVIDE:
    - NET INFORMATION GAIN SCORE (1–10)
    - CREATOR PERSONALITY NOTE (Tone, Eye contact, Gesture, Imperfection)
    - THUMBNAIL CONCEPT (Facial expression, Text overlay, Background, Color psychology)
    - ALGORITHM PLACEMENT PREDICTION (Who will see it first, which channel's audience, watch time % needed)`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          semanticAnalysis: { type: Type.STRING },
          conflictRadiusCheck: { type: Type.STRING },
          script: { type: Type.STRING, description: "The full script in markdown format" },
          netInformationGainScore: { type: Type.NUMBER },
          creatorPersonalityNote: { type: Type.STRING },
          thumbnailConcept: { type: Type.STRING },
          algorithmPlacementPrediction: { type: Type.STRING }
        },
        required: ["semanticAnalysis", "conflictRadiusCheck", "script", "netInformationGainScore", "creatorPersonalityNote", "thumbnailConcept", "algorithmPlacementPrediction"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const extractViralShort = async (transcript: string, niche: string, wordCount: number = 150) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Role: 2026 YouTube Algorithm "Viral Extractor" & Scriptwriter
    Objective: Analyze a long-form video transcript, identify the single segment with the highest viral potential (Highest Net Information Gain), and rewrite it into a ${wordCount}-word narration script for a FACELESS Short/Reel.
    
    My Niche: ${niche}
    The Transcript: ${transcript}
    
    PHASE 1: THE EXTRACTION (The Search)
    Scan the transcript and find the "Viral Node" (Counter-Intuitive Fact, "Gap" Reveal, or High Emotion/Drama).
    
    PHASE 2: THE RE-FRAMING (The 2026 Algorithm Rules)
    - Rule #1: The Niche Bend (Frame using vocabulary/metaphors of ${niche}).
    - Rule #2: Net Information Gain (Add layer of Context or Verification).
    - Rule #3: The Faceless Signature (Fast-paced, authoritative, human tone. Banned words: Delve, In this video, Let's explore, Game changer).
    
    OUTPUT FORMAT:
    - Step 1: The Selected Insight (Briefly state why it offers highest Net Information Gain).
    - Step 2: The Viral Short Script (Hook 0-5s, Meat 5-40s, Payoff 40-60s).
    
    CRITICAL: Write ONLY the spoken narration for the script. DO NOT include any visual cues, scene descriptions, speaker names, or bracketed instructions like [SCENE START], [VISUAL], or [0-5s]. The output must be a pure, continuous narrative script that can be read directly by a voiceover artist or AI.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          selectedInsight: { type: Type.STRING },
          script: { type: Type.STRING, description: "The full script in markdown format" }
        },
        required: ["selectedInsight", "script"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateLongScript = async (topic: string, niche: string, wordCount: number = 1500) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are an elite YouTube long-form scriptwriter.
    Generate a full YouTube script optimized for retention for a video titled "${topic}" in the ${niche} niche.
    Target word count: ${wordCount} words.
    
    Include:
    - Hook (first 30-60 seconds)
    - Open loop
    - Main content with pattern interrupts every 2-3 minutes
    - Re-hooks
    - Ending with a call to action.
    Use a conversational, engaging tone. Avoid generic fluff.
    
    CRITICAL: Write ONLY the spoken narration. DO NOT include any visual cues, scene descriptions, speaker names, or bracketed instructions like [SCENE START], [VISUAL], or [HOOK]. The output must be a pure, continuous narrative script that can be read directly by a voiceover artist or AI.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          script: { type: Type.STRING, description: "The full script in markdown format" }
        },
        required: ["script"]
      }
    }
  });

  return JSON.parse(response.text).script;
};

export const getPerformanceFeedback = async (stats: { views: number, ctr: number, retention: number }, topic: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze these YouTube video stats for a video about "${topic}":
    Views: ${stats.views}
    CTR: ${stats.ctr}%
    Retention: ${stats.retention}%
    
    Provide specific feedback on what went wrong and what to improve for the next video.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          feedback: { type: Type.STRING, description: "Constructive feedback in markdown format" }
        },
        required: ["feedback"]
      }
    }
  });

  return JSON.parse(response.text).feedback;
};

export const generateViralIdeation = async (topic: string, niche: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are an elite YouTube topics researcher and algorithm strategist.
    Your job is to find 5 viral-ready video ideas that are DIRECTLY BASED on the user's provided topic/script/idea: "${topic}" in the ${niche} niche.
    
    CRITICAL INSTRUCTION: Do not generate "weird" or unrelated topics. Stay very close to the user's core subject matter, but find a "Unique Angle" or "Fresh Perspective" that differentiates it from generic content. Think of it as "The same topic, but with a viral twist."
    
    Each idea must be built to ESCAPE YouTube's G.I.S.T. Conflict Radius (meaning it shouldn't compete with the 1000s of identical videos) while scoring maximum Net Information Gain.

    FOR EACH IDEA, DO THIS FIRST:
    🔍 SEMANTIC ID ANALYSIS
    Assign this video its 8 Algorithm Tokens:
    Token 1 – Category: (e.g., Education, Entertainment, Finance...)
    Token 2 – Niche: (e.g., Self-improvement, AI, Health...)
    Token 3 – Sub-niche: (e.g., Productivity, Weight Loss, Investing...)
    Token 4 – Subject: (This MUST be the user's topic: "${topic}")
    Token 5 – Format: (e.g., Monologue, Skit, Tutorial, Storytime...)
    Token 6 – Style: (e.g., Raw/Authentic, High energy, Calm/Cinematic...)
    Token 7 – Idea: THE UNIQUE ANGLE (How is this specific version of "${topic}" different from what everyone else is doing? e.g. a counter-intuitive take, a specific case study, a "secret" method, or a "stop doing X" warning).
    Token 8 – Signature: Describe the creator's voice and personality.

    ⚠️ CONFLICT RADIUS CHECK:
    Identify the 2-3 most common/boring versions of "${topic}" on YouTube.
    Explain HOW this specific idea positions itself OUTSIDE their Conflict Radius by using a fresh Token 7 (Unique Angle).

    Finally, provide a Viral Score (1-100) based on the idea's potential.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            hook: { type: Type.STRING },
            whyItWorks: { type: Type.STRING },
            viralScore: { type: Type.NUMBER },
            semanticAnalysis: { type: Type.STRING },
            conflictRadiusCheck: { type: Type.STRING }
          },
          required: ["title", "hook", "whyItWorks", "viralScore", "semanticAnalysis", "conflictRadiusCheck"]
        }
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateFullPackage = async (topic: string, niche: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a full video package for a YouTube video DIRECTLY BASED on the topic: "${topic}" in the ${niche} niche.
    
    CRITICAL: Stay very close to the user's topic. Find a viral angle for this EXACT topic.
    
    Include:
    - A viral idea (high-CTR title, powerful hook, why it works)
    - A full, pure narrative script (spoken narration only, no visual cues)
    - A thumbnail concept.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          idea: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              hook: { type: Type.STRING },
              whyItWorks: { type: Type.STRING }
            },
            required: ["title", "hook", "whyItWorks"]
          },
          script: { type: Type.STRING },
          thumbnailConcept: { type: Type.STRING }
        },
        required: ["idea", "script", "thumbnailConcept"]
      }
    }
  });

  return JSON.parse(response.text);
};
