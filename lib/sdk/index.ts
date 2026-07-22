// lib/sdk/index.ts — Nimi Platform SDK public surface
export { NimiClient }           from './NimiClient';
export { NimiApiError }         from './types';
export type {
  NimiClientOptions,
  LearnerProfile, LearnerMemory, StoryRecommendation, RecentActivity,
  ChatRequest, ChatResponse,
  StoryListOptions, StoryListResponse, Story,
  EventRequest, EventResponse, EventType,
  ApiKeyInfo, CreateKeyRequest, CreateKeyResponse,
} from './types';
