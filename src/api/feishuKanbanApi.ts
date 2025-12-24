import type { KanbanBoard, KanbanCard, KanbanColumn } from '@/types/bd';

const API_BASE_URL = (import.meta as any).env?.VITE_FEISHU_API_BASE_URL || '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const feishuKanbanApi = {
  async listBoards(): Promise<KanbanBoard[]> {
    const data = await request<{ success: boolean; data: KanbanBoard[] }>(
      '/api/kanban/boards'
    );
    return data.data || [];
  },

  async getBoard(boardId: string): Promise<KanbanBoard | null> {
    const data = await request<{ success: boolean; data: KanbanBoard | null }>(
      `/api/kanban/boards/${encodeURIComponent(boardId)}`
    );
    return data.data || null;
  },

  async listColumns(boardId: string): Promise<KanbanColumn[]> {
    const data = await request<{ success: boolean; data: KanbanColumn[] }>(
      `/api/kanban/boards/${encodeURIComponent(boardId)}/columns`
    );
    return data.data || [];
  },

  async listCards(boardId: string): Promise<KanbanCard[]> {
    const data = await request<{ success: boolean; data: KanbanCard[] }>(
      `/api/kanban/boards/${encodeURIComponent(boardId)}/cards`
    );
    return data.data || [];
  },

  async createCard(boardId: string, payload: Partial<KanbanCard>) {
    return request<{ success: boolean; data: KanbanCard | null }>(
      `/api/kanban/boards/${encodeURIComponent(boardId)}/cards`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  async updateCard(boardId: string, cardId: string, payload: Partial<KanbanCard>) {
    return request<{ success: boolean; data: KanbanCard | null }>(
      `/api/kanban/boards/${encodeURIComponent(boardId)}/cards/${encodeURIComponent(cardId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );
  },

  async moveCard(
    boardId: string,
    cardId: string,
    payload: { toColumnId: string; position?: number }
  ) {
    return request<{ success: boolean; data: KanbanCard | null }>(
      `/api/kanban/boards/${encodeURIComponent(boardId)}/cards/${encodeURIComponent(cardId)}/move`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
  },

  async syncFromFeishu(boardId: string) {
    return request<{ success: boolean; data: { syncedAt: string } }>(
      `/api/kanban/boards/${encodeURIComponent(boardId)}/sync`,
      { method: 'POST' }
    );
  },

  async pushToFeishu(boardId: string) {
    return request<{ success: boolean; data: { pushedAt: string } }>(
      `/api/kanban/boards/${encodeURIComponent(boardId)}/push`,
      { method: 'POST' }
    );
  },
};

export default feishuKanbanApi;
