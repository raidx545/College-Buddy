import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/contexts/ChatContext";
import { format } from "date-fns";

interface ChatMessageProps {
  message: ChatMessageType;
}

const bubbleShadow = "0 1px 0.5px rgba(11,20,26,.13)";

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";

  // Basic markdown: bold and list items
  const renderContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      const isListItem = line.trim().match(/^(\d+\.|-)\s/);
      if (isListItem) {
        return (
          <li key={i} className="ml-4 list-disc" dangerouslySetInnerHTML={{ __html: formatted.replace(/^(\d+\.|-)\s/, '') }} />
        );
      }
      return <p key={i} className={line === "" ? "h-2" : ""} dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  if (isUser) {
    return (
      <div className="px-4 flex justify-end">
        <div className="flex flex-col items-end" style={{ maxWidth: "65%" }}>
          <div
            className="px-4 py-3 text-sm leading-relaxed text-white font-medium"
            style={{
              background: 'linear-gradient(135deg, #c49abb, #9b6fa8)',
              borderRadius: "16px 2px 16px 16px",
              boxShadow: bubbleShadow,
            }}
          >
            {renderContent(message.content)}
          </div>
          <span className="text-[10px] text-gray-400 mt-1 mr-1">
            {format(message.timestamp, "h:mm a")}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 flex justify-start">
      <div className="flex justify-start gap-3" style={{ maxWidth: "65%" }}>
        <img src="/mascot.png" alt="CampusAI" className="h-9 w-9 object-contain shrink-0 mt-1 rounded-full" />
        <div className="flex flex-col items-start" style={{ maxWidth: "75%" }}>
          <div
            className="px-4 py-3 text-sm leading-relaxed text-white font-medium"
            style={{
              background: 'linear-gradient(135deg, #1e3a5f, #4a3f8a)',
              borderRadius: "2px 16px 16px 16px",
              boxShadow: bubbleShadow,
            }}
          >
            {renderContent(message.content)}
          </div>
          <span className="text-[10px] text-gray-400 mt-1 ml-1">
            {format(message.timestamp, "h:mm a")}
          </span>
        </div>
      </div>
    </div>
  );
};
