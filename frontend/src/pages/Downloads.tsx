import { useState, useMemo } from "react";
import { Search, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getResources, getResourceDownloadUrl, type Resource } from "@/lib/api";

const GRADIENT_CLASSES = [
  "gradient-teal",
  "gradient-coral",
  "gradient-purple",
  "gradient-amber",
  "gradient-blue",
  "gradient-rose",
  "gradient-orange",
];

const SUBJECT_ICONS: Record<string, string> = {
  Mathematics: "Σ",
  "Computer Science": "</>",
  Physics: "λ",
  Chemistry: "⚗",
  Biology: "∞",
  Design: "◈",
  English: "Aa",
  General: "#",
};

const SUBJECT_DESCRIPTIONS: Record<string, string> = {
  Mathematics: "Calculus, Linear Algebra, and Statistics resources.",
  "Computer Science": "Algorithms, Data Structures, and AI basics.",
  Physics: "Quantum mechanics and thermodynamics study modules.",
  Chemistry: "Organic, Inorganic, and Physical Chemistry notes.",
  Biology: "Cell biology, Genetics, and Ecology notes.",
  Design: "UI/UX, Typography, and Visual Identity.",
  English: "Literature, Grammar, and Writing resources.",
  General: "General academic resources and guides.",
};

const categories = ["All", "Notes", "PYQs", "Syllabus", "Assignments"];
const categoryColors: Record<string, string> = {
  All: "bg-indigo-600 text-white",
  Notes: "bg-orange-100 text-orange-600 border border-orange-200",
  PYQs: "bg-teal-100 text-teal-600 border border-teal-200",
  Syllabus: "bg-purple-100 text-purple-600 border border-purple-200",
  Assignments: "bg-pink-100 text-pink-600 border border-pink-200",
};

const Downloads = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const { data: resources = [], isLoading, error } = useQuery<Resource[]>({
    queryKey: ["resources"],
    queryFn: getResources,
  });

  // Group resources by subject
  const subjectGroups = useMemo(() => {
    const groups: Record<string, Resource[]> = {};
    const filtered = activeCategory === "All"
      ? resources
      : resources.filter(r => r.category === activeCategory);

    filtered.forEach((r) => {
      if (!groups[r.subject]) groups[r.subject] = [];
      groups[r.subject].push(r);
    });
    return groups;
  }, [resources, activeCategory]);

  const subjects = useMemo(() => Object.keys(subjectGroups), [subjectGroups]);

  const filteredSubjects = useMemo(() => {
    if (!search) return subjects;
    return subjects.filter(s =>
      s.toLowerCase().includes(search.toLowerCase()) ||
      subjectGroups[s]?.some(r => r.title.toLowerCase().includes(search.toLowerCase()))
    );
  }, [subjects, search, subjectGroups]);

  const totalFiles = resources.length;

  const handleDownloadPack = (subject: string) => {
    const subjectResources = subjectGroups[subject] || [];
    subjectResources.forEach((resource) => {
      const url = getResourceDownloadUrl(resource.downloadPath);
      window.open(url, "_blank");
    });
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin" style={{ background: '#FAFAF7' }}>
      <div className="max-w-lg mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <h1 className="text-3xl font-black text-gray-900 mb-1">Study Vault</h1>
          <p className="text-gray-500 text-sm mb-5">
            Access {totalFiles.toLocaleString()}+ curated resources for your major.
          </p>

          {/* Category filter pills */}
          <div className="flex gap-2 flex-wrap mb-6">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${activeCategory === cat
                  ? "bg-indigo-600 text-white shadow-md"
                  : categoryColors[cat] || "bg-gray-100 text-gray-500"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search resources..."
              className="w-full pl-11 pr-4 py-3 rounded-full border-2 border-gray-200 bg-white text-sm outline-none focus:border-indigo-400 transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="text-center py-16 text-gray-400">
              <div className="h-10 w-10 mx-auto mb-3 rounded-full border-3 border-indigo-300 border-t-transparent animate-spin" />
              <p className="text-sm font-semibold">Loading resources...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">Failed to load resources. Make sure the backend is running.</p>
            </div>
          )}

          {/* Subject cards */}
          {!isLoading && !error && (
            <div className="space-y-5">
              {filteredSubjects.map((subject, i) => {
                const count = subjectGroups[subject]?.length || 0;
                const gradientClass = GRADIENT_CLASSES[i % GRADIENT_CLASSES.length];

                return (
                  <motion.div
                    key={subject}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <div className={`${gradientClass} rounded-2xl p-5 text-white relative overflow-hidden min-h-[160px] flex flex-col justify-between`}>
                      {/* File count badge */}
                      <div className="flex items-start justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-white/25 text-[11px] font-bold uppercase tracking-wide">
                          {count} Files
                        </span>
                        <div className="text-4xl opacity-20 font-black">{SUBJECT_ICONS[subject] || "#"}</div>
                      </div>

                      {/* Subject name */}
                      <div>
                        <h3 className="text-2xl font-black mb-4 leading-tight">{subject}</h3>
                        <button
                          onClick={() => handleDownloadPack(subject)}
                          className="flex items-center gap-2 bg-white/90 hover:bg-white text-gray-800 font-bold rounded-full px-5 py-2.5 text-sm transition-all shadow-sm"
                        >
                          <Download className="h-4 w-4" />
                          Download Pack
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && filteredSubjects.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3 text-gray-300 font-black">?</div>
              <p className="text-sm font-semibold">No resources found. Try a different search or filter.</p>
            </div>
          )}

          {/* Contribute CTA */}
          {!isLoading && !error && filteredSubjects.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 mb-4"
            >
              <div className="rounded-2xl border-[2.5px] border-dashed border-indigo-300 bg-white p-6 text-center">
                <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
                  <Upload className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-1">Contribute to the vault!</h3>
                <p className="text-sm text-gray-500 mb-4">Upload your own notes and earn CampusCredits.</p>
                <Button className="rounded-full gradient-cta text-white font-bold border-0 px-6 shadow-md hover:opacity-90 transition-opacity">
                  Upload Resources
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Downloads;
