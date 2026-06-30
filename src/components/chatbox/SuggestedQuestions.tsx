import { memo } from "react";
import { cn } from "@/lib/utils";

type SuggestedQuestionsProps = {
  questions: string[];
  onSelect: (question: string) => void;
};

export const SuggestedQuestions = memo(function SuggestedQuestions({
  questions,
  onSelect,
}: SuggestedQuestionsProps) {
  if (!questions || questions.length === 0) return null;

  return (

    <div className="flex gap-2 mt-2 overflow-x-auto">
      {questions.map((q, i) => (

        <button
          key={i}
          onClick={() => onSelect(q)}
          className={cn(
            "whitespace-nowrap rounded-full border px-3 py-1 text-xs transition-colors duration-200",
            // Light theme (default)
            "border-border text-foreground bg-background hover:bg-muted",
            // Dark theme
            ""
          )}
        >
          {q}
        </button>
      ))}

    </div>
  );
});
