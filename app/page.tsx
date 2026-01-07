"use client";

import { useState, useRef, KeyboardEvent, ChangeEvent } from "react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const INITIAL_SUGGESTIONS = [
  "who are you?",
  "what do you do?",
  "show me your projects",
];

const FOLLOW_UP_SUGGESTIONS: Record<string, string[]> = {
  identity: ["your background?", "design philosophy?", "see your works"],
  projects: ["tell me about samsung", "what is olig agency?", "your blogs?"],
  blog: ["what is ai dlc?", "vibecoding?", "how do you define yourself?"],
  default: ["contact info", "what are you working on?", "recommend something"],
};

function getSuggestions(lastAnswer: string, questionCount: number): string[] {
  if (questionCount === 0) return INITIAL_SUGGESTIONS;
  
  const lower = lastAnswer.toLowerCase();
  if (lower.includes("samsung") || lower.includes("olig") || lower.includes("project") || lower.includes("works")) {
    return FOLLOW_UP_SUGGESTIONS.projects;
  }
  if (lower.includes("blog") || lower.includes("wrote") || lower.includes("article")) {
    return FOLLOW_UP_SUGGESTIONS.blog;
  }
  if (lower.includes("zihan") || lower.includes("design") || lower.includes("i'm") || lower.includes("i am")) {
    return FOLLOW_UP_SUGGESTIONS.identity;
  }
  return FOLLOW_UP_SUGGESTIONS.default;
}

export default function ZenChat() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastAnswer, setLastAnswer] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [isIntense, setIsIntense] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processResponse = (text: string): string => {
    if (text.startsWith("!!!!")) {
      setIsIntense(true);
      return text.slice(4).trimStart();
    }
    setIsIntense(false);
    return text;
  };

  const handleSubmit = async (customInput?: string) => {
    const messageToSend = customInput || input.trim();
    if (!messageToSend || isLoading) return;

    setInput("");
    setLastAnswer("");
    setIsLoading(true);
    setIsIntense(false);

    const newHistory: Message[] = [...history, { role: "user", content: messageToSend }];

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newHistory }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          fullResponse += chunk;
          setLastAnswer(processResponse(fullResponse));
        }
      }

      const cleanedResponse = fullResponse.startsWith("!!!!") 
        ? fullResponse.slice(4).trimStart() 
        : fullResponse;
      
      setHistory([...newHistory, { role: "assistant", content: cleanedResponse }]);
      setQuestionCount((c) => c + 1);
    } catch {
      setLastAnswer("...");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSubmit(suggestion);
  };

  const suggestions = getSuggestions(lastAnswer, questionCount);

  return (
    <div 
      className={cn(
        "flex min-h-screen items-center justify-center p-4 transition-colors duration-500",
        isIntense && "bg-red-500/10"
      )}
    >
      <div className="w-full max-w-md space-y-4">
        <div
          className={cn(
            "overflow-hidden transition-all duration-500 ease-out",
            lastAnswer ? "max-h-[60vh] opacity-100 mb-4" : "max-h-0 opacity-0"
          )}
        >
          <p 
            className={cn(
              "text-sm leading-relaxed whitespace-pre-wrap transition-colors duration-300",
              isIntense && "text-red-600"
            )}
          >
            {lastAnswer}
          </p>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder=""
          disabled={isLoading}
          autoFocus
          className={cn(
            "w-full border-0 bg-transparent px-0 py-2 text-sm",
            "placeholder:text-muted-foreground/30",
            "focus:outline-none",
            "disabled:opacity-30",
            "transition-all duration-300",
            "border-b border-foreground/10 focus:border-foreground/20",
            isIntense && "border-red-500/30"
          )}
        />

        {isLoading ? (
          <div className="flex gap-1 pt-2">
            <span className="h-1 w-1 rounded-full bg-foreground/30 animate-pulse" />
            <span className="h-1 w-1 rounded-full bg-foreground/30 animate-pulse [animation-delay:0.2s]" />
            <span className="h-1 w-1 rounded-full bg-foreground/30 animate-pulse [animation-delay:0.4s]" />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestionClick(s)}
                className="text-xs text-foreground/40 hover:text-foreground/70 transition-colors cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
