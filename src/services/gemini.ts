import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const generateVideoIdeas = async (topic: string, niche: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate 5 viral video ideas for a YouTube channel in the ${niche} niche that are DIRECTLY RELATED to the topic: "${topic}". 
    
    CRITICAL: 
    1. Stay strictly within the ${niche} niche and the subject of "${topic}". 
    2. Do not generate "weird", abstract, or unrelated ideas. 
    3. Each idea must be a practical, high-interest angle that a real creator in this niche would actually film.
    4. Focus on "Viral Angles" like: "The Secret behind X", "Why X is failing", "How to master X in 30 days", "The truth about X".
    
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
            whyItWorks: { type: Type.STRING },
            viralScore: { type: Type.NUMBER, description: "A score from 1-100 based on virality potential" }
          },
          required: ["title", "hook", "whyItWorks", "viralScore"]
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
    
    CRITICAL: Write ONLY the spoken narration. DO NOT include any visual cues, scene descriptions, speaker names, or bracketed instructions like [SCENE START], [VISUAL], or timestamps like [0:00], [0-3 seconds], [0-5s]. The output must be a pure, continuous narrative script that can be read directly by a voiceover artist or AI without any editing.
    
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
    
    CRITICAL: Write ONLY the spoken narration for the script. DO NOT include any visual cues, scene descriptions, speaker names, or bracketed instructions like [SCENE START], [VISUAL], or timestamps like [0:00], [0-5s]. The output must be a pure, continuous narrative script that can be read directly by a voiceover artist or AI without any editing.`,
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
    
    CRITICAL: Write ONLY the spoken narration. DO NOT include any visual cues, scene descriptions, speaker names, or bracketed instructions like [SCENE START], [VISUAL], [HOOK], or timestamps like [0:00], [0-30s]. The output must be a pure, continuous narrative script that can be read directly by a voiceover artist or AI without any editing.`,
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
    
    CRITICAL INSTRUCTION: 
    1. Do not generate "weird", abstract, or unrelated topics. 
    2. Stay strictly within the ${niche} niche and the subject of "${topic}".
    3. Each idea must be a practical, high-interest angle that a real creator in this niche would actually film.
    4. Find a "Unique Angle" or "Fresh Perspective" that differentiates it from generic content. Think of it as "The same topic, but with a viral twist."
    
    Each idea must be built to ESCAPE YouTube's G.I.S.T. Conflict Radius (meaning it shouldn't compete with the 1000s of identical videos) while scoring maximum Net Information Gain.

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
            viralScore: { type: Type.NUMBER }
          },
          required: ["title", "hook", "whyItWorks", "viralScore"]
        }
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateNicheBendingIdeas = async (topic: string, format: string, niche: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are an expert YouTube strategist specializing in "Niche Bending". 
    Your task is to take a popular topic or format and "bend" it perfectly into the ${niche} niche.
    
    Original Topic/Idea: "${topic}"
    Target Format: "${format}"
    Target Niche: ${niche}
    
    Generate 5 viral video ideas that adapt the essence of the original idea/format into the ${niche} niche. 
    The goal is to keep the "Viral Hook" of the original but make it 100% relevant to ${niche} viewers.
    
    For each idea, provide:
    - A catchy, high-CTR title
    - A strong hook (first 3 seconds)
    - A brief explanation of how the "Bend" works (why this adaptation will go viral in ${niche}).
    - A Viral Score (1-100).`,
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
            viralScore: { type: Type.NUMBER }
          },
          required: ["title", "hook", "whyItWorks", "viralScore"]
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
    - A full, pure narrative script (spoken narration only, no visual cues, no timestamps like [0:00])
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

export const generateImagePrompts = async (script: string, niche: string, count: number = 50, instructions: string = '', styleImage?: string | null) => {
  const parts: any[] = [
    {
      text: `You are an elite AI image prompt engineer for high-end video production.
    Your task is to take the following video script and split it into exactly ${count} distinct visual scenes or segments that PERFECTLY ALIGN with the narrative flow.
    
    For each segment, write a highly detailed, cinematic image generation prompt (suitable for Midjourney, DALL-E 3, or Stable Diffusion).
    
    CRITICAL RULES:
    1. Output ONLY the prompts.
    2. Leave exactly one empty line between each prompt.
    3. DO NOT include any labels like "Prompt 1:", "Scene 1:", or any comments/intro/outro text.
    4. VISUAL STORYTELLING: Each prompt must visually represent the SPECIFIC part of the script it corresponds to. Do not use generic images.
    5. CHARACTER CONSISTENCY: If the script features a specific character, subject, or setting, describe them with consistent physical traits, clothing, and environment across all ${count} prompts.
    6. CINEMATIC QUALITY: Focus on cinematic lighting (e.g., volumetric lighting, golden hour, neon noir), specific camera angles (e.g., low angle, extreme close-up, wide shot), and high-quality textures relevant to the ${niche} niche.
    7. CHRONOLOGICAL ORDER: The prompts must follow the exact chronological order of the script.
    8. EXACT COUNT: You must generate EXACTLY ${count} prompts. No more, no less.
    9. SCRIPT ALIGNMENT: Each prompt must be a visual translation of the corresponding script segment. If the script says "The robot looked up at the stars", the prompt MUST describe a robot looking up at the stars.
    ${styleImage ? '10. STYLE REFERENCE: Use the attached image as a reference for the visual style, color palette, lighting, and overall aesthetic of ALL generated prompts.' : ''}
    ${instructions ? `${styleImage ? '11' : '10'}. ADDITIONAL USER INSTRUCTIONS (Character descriptions, style, etc.): ${instructions}` : ''}
    
    Script:
    ${script}`
    }
  ];

  if (styleImage) {
    parts.push({
      inlineData: {
        data: styleImage.split(',')[1],
        mimeType: styleImage.split(';')[0].split(':')[1]
      }
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
  });

  return response.text;
};

export const refineImagePrompts = async (prompts: string, instructions: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `You are an expert AI image prompt engineer. 
    Your task is to refine the following image prompts based on the user's instructions.
    
    ORIGINAL PROMPTS:
    ${prompts}
    
    USER REFINEMENT INSTRUCTIONS:
    ${instructions}
    
    CRITICAL RULES:
    1. Output ONLY the refined prompts.
    2. Leave exactly one empty line between each prompt.
    3. Ensure consistency across all prompts.
    4. Apply the user's instructions to EVERY prompt in the list.
    5. Do not include any intro/outro text.`,
  });

  return response.text;
};

export const generateSpeech = async (text: string, voice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' = 'Kore') => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    return base64Audio;
  }
  throw new Error("Failed to generate speech");
};

export const generateVideoPackage = async (script: string, topic: string, niche: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a high-performance video metadata package for the following script and topic.
    Topic: ${topic}
    Niche: ${niche}
    Script: ${script}
    
    Include:
    - 3 High-CTR, clickable titles.
    - An SEO-optimized description containing relevant keywords.
    - A list of optimized tags.
    - A detailed thumbnail generation prompt.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          titles: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          description: { type: Type.STRING },
          tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          thumbnailPrompt: { type: Type.STRING }
        },
        required: ["titles", "description", "tags", "thumbnailPrompt"]
      }
    }
  });

  return JSON.parse(response.text);
};
