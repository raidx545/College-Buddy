import { useState } from "react";
import { Plus, MessageSquare, Pencil, Trash2, Sun, Moon, LogOut, GraduationCap, BookOpen, Settings, Filter } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { useTheme } from "@/contexts/ThemeContext";
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
  const { theme, toggleTheme } = useTheme();
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

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const weekAgo = new Date(todayStart.getTime() - 7 * 86400000);

  const todayChats = sessions.filter((s) => s.createdAt >= todayStart);
  const weekChats = sessions.filter((s) => s.createdAt < todayStart && s.createdAt >= weekAgo);
  const olderChats = sessions.filter((s) => s.createdAt < weekAgo);

  const renderGroup = (label: string, chats: typeof sessions) => {
    if (chats.length === 0) return null;
    return (
      <div className="mb-4">
        <p className="px-3 mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        {chats.map((session) => (
          <div
            key={session.id}
            className={cn(
              "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm",
              activeSessionId === session.id && location.pathname === "/"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-hover"
            )}
            onClick={() => handleSelectChat(session.id)}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            {editingId === session.id ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={confirmRename}
                onKeyDown={(e) => e.key === "Enter" && confirmRename()}
                className="flex-1 bg-transparent border-b border-primary outline-none text-sm"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 truncate">{session.title}</span>
            )}
            <div className="hidden group-hover:flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); startRename(session.id, session.title); }}
                className="p-1 rounded hover:bg-accent"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                className="p-1 rounded hover:bg-destructive/20 text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-sidebar w-[260px] border-r border-sidebar-border">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sidebar-accent-foreground">CampusAI</span>
        </div>
        <Button
          onClick={handleNewChat}
          className="w-full justify-start gap-2"
          variant="outline"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Nav links */}
      <div className="px-2 py-2 border-b border-sidebar-border space-y-1">
        <button
          onClick={() => { navigate("/downloads"); onClose?.(); }}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors",
            location.pathname === "/downloads"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-hover"
          )}
        >
          <BookOpen className="h-4 w-4" />
          Study Resources
        </button>

        {/* Subject Filter */}
        <div className="flex items-center gap-2 px-3 py-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="flex-1 bg-transparent border border-border rounded-lg px-2 py-1 text-sm text-sidebar-foreground outline-none focus:ring-2 focus:ring-ring transition-all cursor-pointer"
          >
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Chat history */}
      <ScrollArea className="flex-1 px-2 py-2 scrollbar-thin">
        {renderGroup("Today", todayChats)}
        {renderGroup("Previous 7 Days", weekChats)}
        {renderGroup("Older", olderChats)}
      </ScrollArea>

      {/* User section */}
      <div className="p-3 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-sidebar-hover transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
                  {user?.displayName || "Student"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || "No email"}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={toggleTheme}>
              {theme === "light" ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
              {theme === "light" ? "Dark Mode" : "Light Mode"}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await logout();
                navigate("/auth");
              }}
              className="text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

