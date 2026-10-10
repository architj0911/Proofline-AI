import {
  HealthCheckResponse,
  ExtractClaimsResponse,
  StartDefenseResponse,
  AnswerDefenseResponse,
  FinishDefenseResponse,
  ResumeClaim,
  DefenseSession,
} from '../types';
import { getCurrentSession } from '../lib/supabase';

const BASE_URL = '/api';

/**
 * Retrieves authorization header containing active Supabase user JWT if logged in.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const session = await getCurrentSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch {
    // Graceful fallback if auth session is unavailable or unconfigured
  }
  return {};
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson.error) {
        errorMessage = errorJson.error;
      }
    } catch {
      // Ignore json parse error
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  async getHealth(): Promise<HealthCheckResponse> {
    return request<HealthCheckResponse>('/health');
  },

  async getDefaultClaims(): Promise<ExtractClaimsResponse> {
    return request<ExtractClaimsResponse>('/claims/default');
  },

  async extractClaims(resumeText: string): Promise<ExtractClaimsResponse> {
    return request<ExtractClaimsResponse>('/claims/extract', {
      method: 'POST',
      body: JSON.stringify({ resumeText }),
    });
  },

  async uploadResume(file: File): Promise<ExtractClaimsResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const authHeaders = await getAuthHeaders();

    const response = await fetch(`${BASE_URL}/claims/upload`, {
      method: 'POST',
      headers: {
        ...authHeaders,
      },
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      try {
        const errorJson = await response.json();
        if (errorJson.error) {
          errorMessage = errorJson.error;
        }
      } catch {
        // Ignore json parse error
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  async startDefense(claimIds: string[], claims?: ResumeClaim[]): Promise<StartDefenseResponse> {
    return request<StartDefenseResponse>('/defense/start', {
      method: 'POST',
      body: JSON.stringify({ claimIds, claims }),
    });
  },

  async submitAnswer(
    sessionId: string,
    claimId: string,
    questionId: string,
    answerText: string
  ): Promise<AnswerDefenseResponse> {
    return request<AnswerDefenseResponse>('/defense/answer', {
      method: 'POST',
      body: JSON.stringify({ sessionId, claimId, questionId, answerText }),
    });
  },

  async finishDefense(sessionId: string): Promise<FinishDefenseResponse> {
    return request<FinishDefenseResponse>('/defense/finish', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  },

  async getSession(sessionId: string): Promise<{ session: DefenseSession }> {
    return request<{ session: DefenseSession }>(`/defense/session/${sessionId}`);
  },
};
