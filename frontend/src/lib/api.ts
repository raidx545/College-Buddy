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
