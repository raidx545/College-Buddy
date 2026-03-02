import { useState } from "react";
import { Search, Download, FileText, BookOpen, ClipboardList, GraduationCap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getResources, getResourceDownloadUrl, type Resource } from "@/lib/api";

const categories = ["All", "Notes", "PYQs", "Syllabus", "Assignments"];

const categoryIcons: Record<string, typeof BookOpen> = {
  Notes: BookOpen,
  PYQs: FileText,
  Syllabus: ClipboardList,
  Assignments: ClipboardList,
};

const Downloads = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const { data: resources = [], isLoading, error } = useQuery<Resource[]>({
    queryKey: ["resources"],
    queryFn: getResources,
  });

  const filtered = resources.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.subject.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "All" || r.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getIcon = (category: string) => categoryIcons[category] || GraduationCap;

  const handleDownload = (resource: Resource) => {
    const url = getResourceDownloadUrl(resource.downloadPath);
    window.open(url, "_blank");
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-1">Study Resources & Downloads</h1>
          <p className="text-muted-foreground text-sm mb-6">Access notes, previous year papers, syllabi, and assignments.</p>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by subject or file name..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin" />
              <p className="text-sm">Loading resources...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Failed to load resources. Make sure the backend is running.</p>
            </div>
          )}

          {/* Grid */}
          {!isLoading && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((resource, i) => {
                const Icon = getIcon(resource.category);
                return (
                  <motion.div
                    key={resource.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="hover:shadow-md transition-shadow group">
                      <CardContent className="p-4">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="font-medium text-sm text-card-foreground mb-1 truncate">{resource.title}</h3>
                        <p className="text-xs text-muted-foreground mb-1">{resource.subject}</p>
                        <p className="text-[10px] text-muted-foreground mb-3">{resource.date}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full gap-2 text-xs"
                          onClick={() => handleDownload(resource)}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No resources found. Try a different search or filter.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Downloads;
