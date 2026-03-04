import { useState } from "react";
import { Menu, Search, Star, Share2 } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useChat } from "@/contexts/ChatContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const { activeSession } = useChat();

  const chatTitle = activeSession?.title || "New Chat";

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen">
        <header className="h-12 flex items-center px-4 border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <Menu className="h-5 w-5 text-gray-600" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[260px]">
              <AppSidebar onClose={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="ml-3 flex items-center gap-1.5 flex-1">
            <span className="font-semibold text-sm text-gray-800 truncate">{chatTitle}</span>
          </div>
        </header>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-12 flex items-center justify-between px-4 border-b border-gray-100 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-gray-800">{chatTitle}</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
              <Search className="h-4 w-4" />
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
              <Star className="h-4 w-4" />
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
};
