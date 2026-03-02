export const TypingIndicator = () => (
  <div className="flex gap-3 max-w-3xl mx-auto px-4">
    <div className="h-8 w-8 shrink-0" />
    <div className="bg-chat-bot px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: "0s" }} />
      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: "0.2s" }} />
      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: "0.4s" }} />
    </div>
  </div>
);
