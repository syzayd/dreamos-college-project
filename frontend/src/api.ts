const BASE_URL = "http://localhost:8420";

export interface SearchHit {
  path: string;
  name: string;
  category: string | null;
  summary: string | null;
  snippet: string;
  similarity: number;
  abs_path: string;
}

export interface OrganizeSuggestion {
  path: string;
  name: string;
  summary: string;
  tags: string[];
  category: string;
  reasoning: string;
}

export interface ChatResponse {
  intent: "search" | "open" | "organize" | "other";
  message: string;
  search_results: SearchHit[];
  organize_suggestions: OrganizeSuggestion[];
  open_path: string | null;
}

export interface IndexResult {
  indexed: string[];
  skipped_unchanged: string[];
  errors: Record<string, string>;
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const resp = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) {
    const detail = await resp.json().catch(() => ({}));
    throw new Error(detail.detail || `Request to ${path} failed (${resp.status})`);
  }
  return resp.json() as Promise<T>;
}

export function sendChatMessage(message: string): Promise<ChatResponse> {
  return postJson<ChatResponse>("/chat", { message });
}

export function runIndex(): Promise<IndexResult> {
  return postJson<IndexResult>("/index");
}

export function applyOrganization(path: string): Promise<{ new_path: string }> {
  return postJson("/organize/apply", { path });
}

export function revertOrganization(path: string): Promise<{ original_path: string }> {
  return postJson("/organize/revert", { path });
}

export async function checkHealth(): Promise<boolean> {
  try {
    const resp = await fetch(`${BASE_URL}/health`);
    return resp.ok;
  } catch {
    return false;
  }
}
