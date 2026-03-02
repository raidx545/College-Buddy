import { useState } from "react";
import { Menu, Sun, Moon } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/ThemeContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen">
        <header className="h-12 flex items-center px-4 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[260px]">
              <AppSidebar onClose={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="ml-3 font-semibold text-sm flex-1">CampusAI</span>
          <button onClick={toggleTheme} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
        </header>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-12 flex items-center justify-end px-4 border-b border-border">
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-accent transition-colors" title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}>
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </header>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
};
