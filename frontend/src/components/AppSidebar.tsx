import { useState } from "react";
import { Plus, MessageSquare, Pencil, Trash2, LogOut, BookOpen, Filter, MoreVertical } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getSubjects } from "@/lib/api";



interface AppSidebarProps {
  onClose?: () => void;
}

export const AppSidebar = ({ onClose }: AppSidebarProps) => {
  const { sessions, activeSessionId, createNewChat, setActiveSession, deleteSession, renameSession, selectedSubject, setSelectedSubject } = useChat();
  const { user, logout } = useAuth();
  const { data: subjects = ["All"] } = useQuery<string[]>({
    queryKey: ["subjects"],
    queryFn: getSubjects,
  });
  const navigate = useNavigate();
  const location = useLocation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const handleNewChat = () => {
    createNewChat();
    navigate("/");
    onClose?.();
  };

  const handleSelectChat = (id: string) => {
    setActiveSession(id);
    navigate("/");
    onClose?.();
  };

  const startRename = (id: string, title: string) => {
    setEditingId(id);
    setEditTitle(title);
  };

  const confirmRename = () => {
    if (editingId && editTitle.trim()) {
      renameSession(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full bg-white w-[260px] border-r border-gray-100">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-md shadow-purple-500/20">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-gray-800 text-sm block leading-tight">CampusAI</span>
            <span className="text-[11px] text-gray-400">Your AI Study Buddy</span>
          </div>
        </div>
        <Button
          onClick={handleNewChat}
          className="w-full justify-center gap-2 gradient-primary text-white border-0 rounded-xl font-bold shadow-md shadow-purple-500/20 hover:opacity-90 transition-opacity"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Nav links */}
      <div className="px-2 py-2 border-b border-gray-100 space-y-1">
        <button
          onClick={() => { navigate("/downloads"); onClose?.(); }}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-medium transition-all",
            location.pathname === "/downloads"
              ? "bg-purple-50 text-purple-600"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          )}
        >
          <BookOpen className="h-4 w-4" />
          Study Resources
        </button>

        {/* Subject Filter */}
        <div className="flex items-center gap-2 px-3 py-2">
          <Filter className="h-4 w-4 text-gray-400 shrink-0" />
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-600 outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-300 transition-all cursor-pointer"
          >
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Chat history */}
      <ScrollArea className="flex-1 px-2 py-2 scrollbar-thin">
        {sessions.map((session, index) => (
          <div
            key={session.id}
            className={cn(
              "group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-sm mb-0.5",
              activeSessionId === session.id && location.pathname === "/"
                ? "bg-purple-50 text-purple-700"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            )}
            onClick={() => handleSelectChat(session.id)}
          >
            <MessageSquare className="h-4 w-4 shrink-0 text-gray-400" />
            {editingId === session.id ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={confirmRename}
                onKeyDown={(e) => e.key === "Enter" && confirmRename()}
                className="flex-1 bg-transparent border-b-2 border-purple-400 outline-none text-sm font-medium"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 truncate font-medium">{session.title}</span>
            )}
            <div className="hidden group-hover:flex items-center gap-0.5">
              <button
                onClick={(e) => { e.stopPropagation(); startRename(session.id, session.title); }}
                className="p-1 rounded-md hover:bg-purple-100 text-gray-400 hover:text-purple-500 transition-colors"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </ScrollArea>

      {/* User section */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="gradient-primary text-white text-xs font-bold">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 truncate">
              {user?.displayName || "Student"}
            </p>
            <p className="text-[11px] text-gray-400 truncate">
              Premium Plan
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="text-sm">
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await logout();
                  navigate("/auth");
                }}
                className="text-red-500 text-sm"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
