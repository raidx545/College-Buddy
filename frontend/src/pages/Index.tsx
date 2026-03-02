import { useRef, useEffect, useState } from "react";
import { Send, Paperclip, Sparkles, BookOpen, Calendar, FileText } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { ChatMessage } from "@/components/ChatMessage";
import { TypingIndicator } from "@/components/TypingIndicator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";

const suggestions = [
  { icon: BookOpen, text: "Summarize the DBMS syllabus", color: "text-blue-500" },
  { icon: Calendar, text: "When is the next tech fest?", color: "text-emerald-500" },
  { icon: FileText, text: "Download previous OS question papers", color: "text-amber-500" },
  { icon: Sparkles, text: "Help me prepare for placements", color: "text-purple-500" },
];

const Index = () => {
  const { activeSession, sendMessage, isTyping } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEmpty = !activeSession || activeSession.messages.length === 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeSession?.messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin py-6">
        <AnimatePresence mode="wait">
          {isEmpty ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full px-4"
            >
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground mb-2">How can I help you today?</h1>
              <p className="text-muted-foreground text-sm mb-8 text-center max-w-md">
                Ask me about academics, notices, syllabus, exams, events, placements, or campus info.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full max-w-lg px-2 sm:px-0">
                {suggestions.map((s, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => { setInput(s.text); sendMessage(s.text); }}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-left text-sm group"
                  >
                    <s.icon className={`h-5 w-5 ${s.color} shrink-0`} />
                    <span className="text-foreground group-hover:text-foreground">{s.text}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-4"
            >
              {activeSession?.messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isTyping && <TypingIndicator />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-card/50 backdrop-blur-sm p-2 sm:p-4">
        <div className="max-w-3xl mx-auto relative px-1 sm:px-0">
          <div className="flex items-end gap-2 bg-card border border-border rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all">
            <button className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground shrink-0">
              <Paperclip className="h-5 w-5" />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your courses, exams, events..."
              rows={1}
              className="flex-1 bg-transparent border-0 outline-none resize-none text-sm py-2 placeholder:text-muted-foreground max-h-40"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            CampusAI can make mistakes. Verify important academic information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
