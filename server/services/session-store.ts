import { DefenseSession } from '../../src/types';

/**
 * Data Access Layer for Defense Sessions.
 * In-memory adapter for rapid local hackathon development.
 * Designed with a clean interface so Supabase or PostgreSQL can be plugged in without changing business logic.
 */
export interface SessionRepository {
  get(id: string): Promise<DefenseSession | null>;
  save(session: DefenseSession): Promise<void>;
  delete(id: string): Promise<boolean>;
  list(): Promise<DefenseSession[]>;
}

class InMemorySessionRepository implements SessionRepository {
  private sessions = new Map<string, DefenseSession>();

  async get(id: string): Promise<DefenseSession | null> {
    return this.sessions.get(id) || null;
  }

  async save(session: DefenseSession): Promise<void> {
    this.sessions.set(session.id, {
      ...session,
      updatedAt: new Date().toISOString(),
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.sessions.delete(id);
  }

  async list(): Promise<DefenseSession[]> {
    return Array.from(this.sessions.values());
  }
}

export const sessionStore: SessionRepository = new InMemorySessionRepository();
