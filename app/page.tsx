"use client";

import { useState, useRef, KeyboardEvent, ChangeEvent } from "react";
import { cn } from "@/lib/utils";
import { StreamingText } from "@/components/streaming-text";

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

const PRESET_RESPONSES: Record<string, string> = {
  "who are you?": "yo, i'm zihan. design engineer and ai builder based in the US. working on [biuty.ai](https://biuty.ai) and other things ✌️",
  "what do you do?": "design + strategy + ai systems. currently building [biuty.ai](https://biuty.ai) as coo. before that samsung, avatr, grabarz.",
  "show me your projects": "check [z1han.com/works](https://z1han.com/works) – samsung design research, olig agency, skya are some highlights. also built [zios](https://os.bravohenry.com), a playful web os.",
  "your background?": "wenzhou china → germany → US. masters in design management. worked at samsung, avatr, grabarz & partner before going all-in on ai.",
  "design philosophy?": "less but better. every detail matters. design should feel inevitable, not decorated.",
  "see your works": "[z1han.com/works](https://z1han.com/works) has everything. samsung design principles, olig agency, skya, '01 ipod tribute, the kyeol.",
  "tell me about samsung": "led design research there. worked on design principles and system thinking. still one of my proudest projects.",
  "what is olig agency?": "ai-native branding agency i helped build. we use ai for the entire brand creation process – strategy to execution.",
  "your blogs?": "i write about ai, design, and building things. ai dlc, vibecoding playbook, ux in ai era. all on [z1han.com/blog](https://z1han.com/blog)",
  "what is ai dlc?": "my framework for thinking about ai as downloadable content for your brain. augmentation, not replacement.",
  "vibecoding?": "coding by vibes. you describe what you want, ai writes the code. i wrote a whole playbook about it.",
  "how do you define yourself?": "ai-native builder. i think in systems and ship in weeks. design background but code is my new medium.",
  "contact info": "[x @bravohenry](https://x.com/bravohenry) or email [hi@z1han.com](mailto:hi@z1han.com). always down to chat about interesting projects.",
  "what are you working on?": "[biuty.ai](https://biuty.ai) mainly. also experimenting with [zios](https://os.bravohenry.com) and some ai tools. always building something.",
  "recommend something": "go read my vibecoding playbook on [z1han.com/blog](https://z1han.com/blog) if you want to ship faster. or just vibe on [zios](https://os.bravohenry.com) for fun.",
};

const RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 2 * 60 * 1000,
};

const RATE_LIMIT_MESSAGE = "yo, you got a lot of questions! email me at [hi@z1han.com](mailto:hi@z1han.com) or dm on [x @bravohenry](https://x.com/bravohenry) ✌️";

function stripMarkdownLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

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

const PLACEHOLDERS = [
  "yo, what's on your mind?",
  "ask me anything...",
  "what's on your mind?",
  "tell me what you're thinking",
];

export default function ZenChat() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [lastAnswer, setLastAnswer] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [isIntense, setIsIntense] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const aiRequestTimestamps = useRef<number[]>([]);

  const checkRateLimit = (): boolean => {
    const now = Date.now();
    aiRequestTimestamps.current = aiRequestTimestamps.current.filter(
      ts => now - ts < RATE_LIMIT.windowMs
    );
    return aiRequestTimestamps.current.length >= RATE_LIMIT.maxRequests;
  };

  const recordAiRequest = () => {
    aiRequestTimestamps.current.push(Date.now());
  };

  const processResponse = (text: string): string => {
    const trimmed = text.trimStart();
    if (trimmed.startsWith("!!!!")) {
      setIsIntense(true);
      return trimmed.slice(4).trimStart();
    }
    return text;
  };

  const simulateTyping = async (text: string) => {
    const words = text.split(" ");
    let accumulated = "";
    for (const word of words) {
      accumulated += (accumulated ? " " : "") + word;
      setLastAnswer(accumulated);
      await new Promise(r => setTimeout(r, 30 + Math.random() * 40));
    }
    return text;
  };

  const handleSubmit = async (customInput?: string) => {
    const messageToSend = customInput || input.trim();
    if (!messageToSend || isLoading) return;

    setInput("");
    setCurrentQuestion(messageToSend);
    setLastAnswer("");
    setIsLoading(true);
    setIsIntense(false);

    const newHistory: Message[] = [...history, { role: "user", content: messageToSend }];
    
    console.log("Current history length:", history.length);
    console.log("New history:", newHistory.map(m => ({ role: m.role, content: m.content.slice(0, 30) })));

    const presetKey = messageToSend.toLowerCase();
    const presetResponse = PRESET_RESPONSES[presetKey];
    
    if (presetResponse) {
      await simulateTyping(presetResponse);
      setHistory([...newHistory, { role: "assistant", content: presetResponse }]);
      setQuestionCount((c) => c + 1);
      setIsLoading(false);
      setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDERS.length);
      inputRef.current?.focus();
      return;
    }

    if (checkRateLimit()) {
      await simulateTyping(RATE_LIMIT_MESSAGE);
      setHistory([...newHistory, { role: "assistant", content: RATE_LIMIT_MESSAGE }]);
      setQuestionCount((c) => c + 1);
      setIsLoading(false);
      setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDERS.length);
      inputRef.current?.focus();
      return;
    }

    recordAiRequest();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: messageToSend }] }),
      });

      console.log("Response status:", response.status, response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      let chunkCount = 0;

      if (!reader) {
        console.error("No reader available");
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log("Stream done. Total chunks:", chunkCount);
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        chunkCount++;
        console.log("Chunk", chunkCount, "size:", value.byteLength, "chars:", chunk.length);
        fullResponse += chunk;
        setLastAnswer(processResponse(fullResponse));
      }

      console.log("Full response received:", fullResponse.length, "chars");
      console.log("Response content:", JSON.stringify(fullResponse.slice(0, 100)));
      
      if (!fullResponse.trim()) {
        console.warn("Empty response - likely model timeout or API issue");
        setLastAnswer("hmm, nothing came back. try again?");
        return;
      }

      const cleanedResponse = fullResponse.startsWith("!!!!") 
        ? fullResponse.slice(4).trimStart() 
        : fullResponse;
      
      setHistory([...newHistory, { role: "assistant", content: cleanedResponse }]);
      setQuestionCount((c) => c + 1);
      setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDERS.length);
    } catch (error) {
      console.error("Chat error:", error);
      setLastAnswer("hmm, something went wrong. try again?");
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
  const showQuestion = currentQuestion && (isLoading || lastAnswer);

  return (
    <div 
      className={cn(
        "flex min-h-screen items-center justify-center p-4 transition-colors duration-500",
        isIntense && "bg-destructive text-white"
      )}
    >
      <div className="w-full max-w-md space-y-4">
        <div
          className={cn(
            "overflow-hidden transition-all duration-500 ease-out",
            showQuestion ? "max-h-[70vh] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <p className={cn(
            "text-xs mb-3 transition-all duration-300 text-white"
          )}>
            {currentQuestion}
          </p>
          
          {isLoading && !lastAnswer ? (
            <div className="flex gap-1.5">
              <span className={cn(
                "h-2 w-2 rounded-full animate-bounce [animation-delay:-0.3s]",
                isIntense ? "bg-white/60" : "bg-primary/60"
              )} />
              <span className={cn(
                "h-2 w-2 rounded-full animate-bounce [animation-delay:-0.15s]",
                isIntense ? "bg-white/60" : "bg-primary/60"
              )} />
              <span className={cn(
                "h-2 w-2 rounded-full animate-bounce",
                isIntense ? "bg-white/60" : "bg-primary/60"
              )} />
            </div>
          ) : (
            <StreamingText
              text={lastAnswer}
              isIntense={isIntense}
            />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDERS[placeholderIndex]}
          disabled={isLoading}
          autoFocus
          className={cn(
            "w-full border-0 bg-transparent px-0 py-2 text-sm",
            "focus:outline-none",
            "disabled:opacity-30",
            "transition-all duration-300",
            isIntense 
              ? "text-white placeholder:text-white border-b border-white/30 focus:border-white/50"
              : questionCount === 0
                ? "text-white placeholder:text-white border-b border-border/50 focus:border-primary/60"
                : "text-white placeholder:text-white/60 border-b border-border/50 focus:border-primary/60"
          )}
        />

        {!isLoading && (
          <div className="flex flex-wrap gap-2 pt-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestionClick(s)}
                className={cn(
                  "text-xs transition-colors cursor-pointer",
                  isIntense 
                    ? "text-white/60 hover:text-white" 
                    : "text-muted-foreground hover:text-foreground"
                )}
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
