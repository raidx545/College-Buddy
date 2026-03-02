import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/contexts/ChatContext";
import { format } from "date-fns";

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";

  // Basic markdown: bold and list items
  const renderContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      const isListItem = line.trim().match(/^(\d+\.|-)(\s)/);
      if (isListItem) {
        return (
          <li key={i} className="ml-4 list-disc" dangerouslySetInnerHTML={{ __html: formatted.replace(/^(\d+\.|-)\s/, '') }} />
        );
      }
      return <p key={i} className={line === "" ? "h-2" : ""} dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  return (
    <div className={cn("flex gap-3 max-w-3xl mx-auto px-4", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
      <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-lg",
            isUser
              ? "bg-chat-user text-chat-user-foreground rounded-br-md"
              : "bg-chat-bot text-chat-bot-foreground rounded-bl-md"
          )}
        >
          {renderContent(message.content)}
        </div>
        <span className="text-[10px] text-muted-foreground px-1">
          {format(message.timestamp, "h:mm a")}
        </span>
      </div>
    </div>
  );
};
