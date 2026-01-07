"use client";

import { motion } from "framer-motion";
import { useMemo, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StreamingTextProps {
  text: string;
  className?: string;
  isIntense?: boolean;
}

interface TextSegment {
  type: "text" | "link" | "space";
  content: string;
  href?: string;
  key: string;
}

const SPRING_GENTLE = {
  type: "spring" as const,
  stiffness: 300,
  damping: 35,
};

const wordVariants = {
  hidden: { 
    opacity: 0, 
    filter: "blur(6px)",
    y: 8
  },
  visible: { 
    opacity: 1, 
    filter: "blur(0px)",
    y: 0,
    transition: SPRING_GENTLE
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02
    }
  }
};

const LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;

function parseTextWithLinks(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let segmentIndex = 0;
  let match;

  while ((match = LINK_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index);
      segments.push(...splitIntoWords(beforeText, segmentIndex));
      segmentIndex += beforeText.split(/(\s+)/).filter(Boolean).length;
    }

    segments.push({
      type: "link",
      content: match[1],
      href: match[2],
      key: `link-${segmentIndex++}`,
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    segments.push(...splitIntoWords(remainingText, segmentIndex));
  }

  return segments;
}

function splitIntoWords(text: string, startIndex: number): TextSegment[] {
  const parts = text.split(/(\s+)/);
  return parts
    .filter(part => part !== "")
    .map((part, i): TextSegment => {
      const isSpace = /^\s+$/.test(part);
      return {
        type: isSpace ? "space" : "text",
        content: part,
        key: `${startIndex + i}-${isSpace ? "s" : part.slice(0, 8)}`,
      };
    });
}

export function StreamingText({ text, className, isIntense }: StreamingTextProps) {
  const segments = useMemo(() => {
    if (!text || text.trim() === "") return [];
    return parseTextWithLinks(text);
  }, [text]);

  if (segments.length === 0) {
    return null;
  }

  const renderSegment = (segment: TextSegment): ReactNode => {
    if (segment.type === "space") {
      return <span key={segment.key}>{segment.content}</span>;
    }

    if (segment.type === "link") {
      return (
        <motion.a
          key={segment.key}
          href={segment.href}
          target={segment.href?.startsWith("mailto:") || segment.href?.startsWith("/") ? undefined : "_blank"}
          rel={segment.href?.startsWith("/") ? undefined : "noopener noreferrer"}
          variants={wordVariants}
          className="inline-block underline underline-offset-2 hover:opacity-70 transition-opacity"
          style={{ whiteSpace: "pre" }}
        >
          {segment.content}
        </motion.a>
      );
    }

    return (
      <motion.span
        key={segment.key}
        variants={wordVariants}
        className="inline-block"
        style={{ whiteSpace: "pre" }}
      >
        {segment.content}
      </motion.span>
    );
  };

  return (
    <motion.p
      className={cn(
        "text-sm leading-relaxed",
        isIntense && "text-red-600",
        className
      )}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      key={text.length}
    >
      {segments.map(renderSegment)}
    </motion.p>
  );
}
