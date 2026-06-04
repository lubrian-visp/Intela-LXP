import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Reaction {
  id: string;
  reaction_type: string;
  user_id: string;
  created_at: string;
}

const reactionEmojis: Record<string, string> = {
  like: "👍",
  love: "❤️",
  laugh: "😂",
  surprise: "😮",
  clap: "👏",
  celebrate: "🎉",
};

interface MeetingReactionOverlayProps {
  reactions: Reaction[];
}

export default function MeetingReactionOverlay({ reactions }: MeetingReactionOverlayProps) {
  const [visibleReactions, setVisibleReactions] = useState<
    Array<Reaction & { x: number; key: string }>
  >([]);

  useEffect(() => {
    if (!reactions.length) return;
    const latest = reactions[0];
    if (!latest) return;

    const key = `${latest.id}-${Date.now()}`;
    const x = 10 + Math.random() * 80;

    setVisibleReactions((prev) => [...prev.slice(-8), { ...latest, x, key }]);

    const timer = setTimeout(() => {
      setVisibleReactions((prev) => prev.filter((r) => r.key !== key));
    }, 3000);

    return () => clearTimeout(timer);
  }, [reactions]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      <AnimatePresence>
        {visibleReactions.map((r) => (
          <motion.div
            key={r.key}
            initial={{ opacity: 1, y: 0, x: `${r.x}%`, scale: 0.5 }}
            animate={{ opacity: 0, y: -200, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: "easeOut" }}
            className="absolute bottom-12 text-3xl"
          >
            {reactionEmojis[r.reaction_type] || "👍"}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
