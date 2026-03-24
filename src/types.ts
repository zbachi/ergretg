export type VideoStatus = 'idea' | 'script' | 'voiceover' | 'editing' | 'thumbnail' | 'posted';
export type VideoType = 'long' | 'short' | 'extractor' | 'ideation';

export interface VideoIdea {
  title: string;
  hook: string;
  whyItWorks: string;
  viralScore?: number;
  semanticAnalysis?: string;
  conflictRadiusCheck?: string;
}

export interface VideoStats {
  views: number;
  ctr: number;
  retention: number;
}

export interface VideoProject {
  id: string;
  userId: string;
  topic: string;
  type: VideoType;
  wordCount?: number;
  transcript?: string;
  status: VideoStatus;
  idea?: VideoIdea;
  script?: string;
  stats?: VideoStats;
  feedback?: string;
  createdAt: any;
  thumbnailConcept?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  currentDay: number;
  niche: string;
  createdAt: any;
  completedTasks: string[];
}

export interface DailyTask {
  id: string;
  title: string;
  description: string;
  day: number;
}
