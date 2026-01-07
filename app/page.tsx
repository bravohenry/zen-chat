"use client";

import { useState, useRef, KeyboardEvent, ChangeEvent } from "react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const INITIAL_SUGGESTIONS = [
  "你是谁",
  "What do you do?",
  "Show me your projects",
];

const FOLLOW_UP_SUGGESTIONS: Record<string, string[]> = {
  identity: ["你的背景是什么", "What's your design philosophy?", "看看你的作品"],
  projects: ["Tell me about Samsung project", "What is OliG Agency?", "你的博客写什么"],
  blog: ["AI DLC是什么", "Vibecoding是什么", "你怎么定义自己"],
  default: ["联系方式", "你最近在做什么", "推荐我看什么"],
};

function getSuggestions(lastAnswer: string, questionCount: number): string[] {
  if (questionCount === 0) return INITIAL_SUGGESTIONS;
  
  const lower = lastAnswer.toLowerCase();
  if (lower.includes("samsung") || lower.includes("olig") || lower.includes("project") || lower.includes("作品")) {
    return FOLLOW_UP_SUGGESTIONS.projects;
  }
  if (lower.includes("blog") || lower.includes("wrote") || lower.includes("博客") || lower.includes("文章")) {
    return FOLLOW_UP_SUGGESTIONS.blog;
  }
  if (lower.includes("zihan") || lower.includes("design") || lower.includes("设计") || lower.includes("我是")) {
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
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (customInput?: string) => {
    const messageToSend = customInput || input.trim();
    if (!messageToSend || isLoading) return;

    setInput("");
    setLastAnswer("");
    setIsLoading(true);

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
          setLastAnswer(fullResponse);
        }
      }

      setHistory([...newHistory, { role: "assistant", content: fullResponse }]);
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
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div
          className={cn(
            "overflow-hidden transition-all duration-500 ease-out",
            lastAnswer ? "max-h-[60vh] opacity-100 mb-4" : "max-h-0 opacity-0"
          )}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
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
            "transition-opacity duration-300",
            "border-b border-foreground/10 focus:border-foreground/20"
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
