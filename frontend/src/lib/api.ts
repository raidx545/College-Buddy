/**
 * API helper module for communicating with the FastAPI backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || "";

export interface Resource {
    id: number;
    title: string;
    subject: string;
    category: string;
    date: string;
    filename: string;
    downloadPath: string;
}

export async function sendChatMessage(
    message: string,
    subject: string = "All"
): Promise<string> {
    const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, subject }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Server error" }));
        throw new Error(err.detail || "Failed to get response");
    }

    const data = await res.json();
    return data.answer;
}

export async function streamChatMessage(
    message: string,
    subject: string = "All",
    chatId: string,
    onChunk: (chunk: string) => void
): Promise<void> {
    const res = await fetch(`${API_BASE}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, subject, chat_id: chatId }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Server error" }));
        throw new Error(err.detail || "Failed to connect to stream");
    }

    if (!res.body) {
        throw new Error("No readable stream in response");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const dataStr = line.slice(6).trim();
                    if (dataStr === "[DONE]") return;

                    try {
                        const parsed = JSON.parse(dataStr);
                        if (parsed.chunk) {
                            onChunk(parsed.chunk);
                        }
                    } catch (e) {
                        console.warn("Failed to parse SSE chunk", dataStr);
                    }
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}

export async function clearSession(chatId: string): Promise<void> {
    await fetch(`${API_BASE}/api/chat/session/${chatId}`, { method: "DELETE" });
}

export async function getSubjects(): Promise<string[]> {
    const res = await fetch(`${API_BASE}/api/subjects`);
    if (!res.ok) throw new Error("Failed to fetch subjects");
    const data = await res.json();
    return data.subjects;
}

export async function getResources(): Promise<Resource[]> {
    const res = await fetch(`${API_BASE}/api/resources`);
    if (!res.ok) throw new Error("Failed to fetch resources");
    const data = await res.json();
    return data.resources;
}

export function getResourceDownloadUrl(downloadPath: string): string {
    return `${API_BASE}/api/resources/download/${encodeURIComponent(downloadPath)}`;
}
