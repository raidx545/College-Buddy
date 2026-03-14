import { useRef, useEffect, useState } from "react";
import { Send, Plus, Smile, Menu } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { ChatMessage } from "@/components/ChatMessage";
import { TypingIndicator } from "@/components/TypingIndicator";
import { motion, AnimatePresence } from "framer-motion";

const suggestions = [
  { text: "How do I solve quadratic equations?" },
  { text: "Check my thesis statement" },
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
    <div className="flex flex-col h-full" style={{ background: '#FAFAF7' }}>
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin py-4">
        <AnimatePresence mode="wait">
          {isEmpty ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full px-4"
            >
              {/* 3D Mascot with border ring */}
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                className="relative mb-4"
              >
                <div className="h-36 w-36 rounded-full border-4 border-indigo-200 bg-gradient-to-b from-indigo-100 to-white p-3 shadow-lg">
                  <img
                    src="/mascot.png"
                    alt="CampusAI Mascot"
                    className="h-full w-full object-contain animate-mascot-bounce"
                  />
                </div>
              </motion.div>

              <h1 className="text-2xl font-black text-gray-900 mb-1">
                CampusAI Mascot
              </h1>
              <p className="text-gray-500 text-sm mb-8 text-center max-w-sm">
                Ask me anything about your courses!
              </p>

              {/* Suggestion chips */}
              <div className="flex flex-wrap justify-center gap-2 max-w-md">
                {suggestions.map((s, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    onClick={() => { setInput(s.text); sendMessage(s.text); }}
                    className="px-4 py-2.5 rounded-full border-2 border-gray-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 transition-all text-sm text-gray-600 hover:text-indigo-600 shadow-sm font-semibold"
                  >
                    {s.text}
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
      <div className="p-3 sm:p-4" style={{ background: '#FAFAF7' }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 bg-white border-2 border-gray-200 rounded-full px-3 py-2 shadow-sm focus-within:border-indigo-400 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 bg-transparent border-0 outline-none resize-none text-sm py-2 placeholder:text-gray-400 max-h-40"
            />
            <button className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 shrink-0">
              <Smile className="h-5 w-5" />
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-2.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 shadow-md"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
