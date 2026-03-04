export const TypingIndicator = () => (
  <div className="max-w-3xl mx-auto px-4">
    <div className="flex justify-start gap-3">
      <img src="/mascot.png" alt="CampusAI" className="h-9 w-9 object-contain shrink-0 mt-1 rounded-full" />
      <div
        className="px-4 py-3 flex items-center gap-1.5"
        style={{
          background: 'linear-gradient(135deg, #1e3a5f, #4a3f8a)',
          borderRadius: "2px 16px 16px 16px",
          boxShadow: "0 1px 0.5px rgba(11,20,26,.13)",
        }}
      >
        <span className="h-2 w-2 rounded-full bg-white/60 animate-pulse-dot" style={{ animationDelay: "0s" }} />
        <span className="h-2 w-2 rounded-full bg-white/60 animate-pulse-dot" style={{ animationDelay: "0.2s" }} />
        <span className="h-2 w-2 rounded-full bg-white/60 animate-pulse-dot" style={{ animationDelay: "0.4s" }} />
      </div>
    </div>
  </div>
);
