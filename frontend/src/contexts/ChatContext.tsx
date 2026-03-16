import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { sendChatMessage } from "@/lib/api";
import { useAuth } from "./AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";

export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
}

interface ChatContextType {
  sessions: ChatSession[];
  activeSessionId: string | null;
  activeSession: ChatSession | null;
  createNewChat: () => void;
  setActiveSession: (id: string) => void;
  sendMessage: (content: string) => void;
  deleteSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  isTyping: boolean;
  selectedSubject: string;
  setSelectedSubject: (subject: string) => void;
  streamingMessageId: string | null;
  onStreamingComplete: () => void;
}

const ChatContext = createContext<ChatContextType>({} as ChatContextType);

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const onStreamingComplete = () => setStreamingMessageId(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  // Load user sessions from Firestore
  useEffect(() => {
    if (!user) {
      setSessions([]);
      setActiveSessionId(null);
      return;
    }

    const userEmail = user.email || user.uid;
    const q = query(
      collection(db, "users", userEmail, "chats"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedSessions: ChatSession[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || "New Chat",
          messages: (data.messages || []).map((m: any) => ({
            ...m,
            timestamp: m.timestamp instanceof Timestamp ? m.timestamp.toDate() : new Date(),
          })),
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        };
      });

      setSessions(loadedSessions);
      if (loadedSessions.length > 0 && !activeSessionId) {
        setActiveSessionId(loadedSessions[0].id);
      }
    });

    return unsubscribe;
  }, [user]);

  const createNewChat = async () => {
    if (!user) return;
    const userEmail = user.email || user.uid;
    try {
      const docRef = await addDoc(collection(db, "users", userEmail, "chats"), {
        title: "New Chat",
        messages: [],
        createdAt: serverTimestamp(),
      });
      setActiveSessionId(docRef.id);
    } catch (error) {
      console.error("Error creating chat:", error);
    }
  };

  const sendMessage = async (content: string) => {
    if (!user) return;

    // Auto-create a session if none is active
    let currentSessionId = activeSessionId;
    const userEmail = user.email || user.uid;
    if (!currentSessionId) {
      try {
        const docRef = await addDoc(collection(db, "users", userEmail, "chats"), {
          title: content.slice(0, 40),
          messages: [],
          createdAt: serverTimestamp(),
        });
        currentSessionId = docRef.id;
        setActiveSessionId(currentSessionId);
      } catch (error) {
        console.error("Error creating chat:", error);
        return;
      }
    }

    const sessionRef = doc(db, "users", userEmail, "chats", currentSessionId);
    const session = sessions.find(s => s.id === currentSessionId);
    // For brand-new sessions, session may not be in state yet
    const existingMessages = session?.messages || [];

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    const newMessages = [...existingMessages, userMsg];
    let title = session?.title || content.slice(0, 40);
    if (existingMessages.length === 0) {
      title = content.slice(0, 40);
    }

    // Optimistic UI update
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: newMessages, title } : s));

    // Update Firestore
    try {
      await updateDoc(sessionRef, { messages: newMessages, title });
    } catch (error) {
      console.error("Error updating doc:", error);
    }

    setIsTyping(true);

    try {
      const answer = await sendChatMessage(content, selectedSubject);
      const botMsgId = (Date.now() + 1).toString();
      const botMsg: ChatMessage = {
        id: botMsgId,
        role: "bot",
        content: answer,
        timestamp: new Date(),
      };

      const finalMessages = [...newMessages, botMsg];

      // Start streaming animation for this message
      setStreamingMessageId(botMsgId);

      // Update UI
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: finalMessages } : s));

      // Update Firestore
      await updateDoc(sessionRef, { messages: finalMessages });

    } catch (error) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: `⚠️ Error: ${error instanceof Error ? error.message : "Could not reach server."} `,
        timestamp: new Date(),
      };
      const finalErrMessages = [...newMessages, errorMsg];

      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: finalErrMessages } : s));
      await updateDoc(sessionRef, { messages: finalErrMessages });
    } finally {
      setIsTyping(false);
    }
  };

  const deleteSession = async (id: string) => {
    try {
      const userEmail = user?.email || user?.uid || "";
      await deleteDoc(doc(db, "users", userEmail, "chats", id));
      if (activeSessionId === id && sessions.length > 0) {
        const remaining = sessions.filter(s => s.id !== id);
        setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  const renameSession = async (id: string, title: string) => {
    try {
      const userEmail = user?.email || user?.uid || "";
      await updateDoc(doc(db, "users", userEmail, "chats", id), { title });
    } catch (error) {
      console.error("Error renaming session:", error);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        sessions,
        activeSessionId,
        activeSession,
        createNewChat,
        setActiveSession: setActiveSessionId,
        sendMessage,
        deleteSession,
        renameSession,
        isTyping,
        selectedSubject,
        setSelectedSubject,
        streamingMessageId,
        onStreamingComplete,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
