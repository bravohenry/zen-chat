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
  type: "text" | "link" | "space" | "bold" | "italic" | "boldItalic";
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
const BOLD_ITALIC_REGEX = /\*\*\*([^*]+)\*\*\*/g;
const BOLD_REGEX = /\*\*([^*]+)\*\*/g;
// Match *text* but not **text** or ***text***
const ITALIC_REGEX = /(?:^|[^*])\*([^*]+)\*(?![*])/g;

function parseMarkdown(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let processedText = text;
  let segmentIndex = 0;

  // First, extract links and replace with placeholders
  const linkPlaceholders: { placeholder: string; segment: TextSegment }[] = [];
  let linkMatch;
  let linkPlaceholderIndex = 0;

  while ((linkMatch = LINK_REGEX.exec(text)) !== null) {
    const placeholder = `__LINK_PLACEHOLDER_${linkPlaceholderIndex}__`;
    linkPlaceholders.push({
      placeholder,
      segment: {
        type: "link",
        content: linkMatch[1],
        href: linkMatch[2],
        key: `link-${linkPlaceholderIndex}`,
      },
    });
    processedText = processedText.replace(linkMatch[0], placeholder);
    linkPlaceholderIndex++;
  }

  // Parse markdown in order: bold-italic, bold, italic
  let currentText = processedText;
  const markdownSegments: Array<{ start: number; end: number; type: "boldItalic" | "bold" | "italic"; content: string }> = [];

  // Find bold-italic (***text***)
  let match;
  while ((match = BOLD_ITALIC_REGEX.exec(currentText)) !== null) {
    markdownSegments.push({
      start: match.index,
      end: match.index + match[0].length,
      type: "boldItalic",
      content: match[1],
    });
  }

  // Find bold (**text**)
  while ((match = BOLD_REGEX.exec(currentText)) !== null) {
    // Check if it's not already part of bold-italic
    const isPartOfBoldItalic = markdownSegments.some(
      seg => match.index >= seg.start && match.index < seg.end
    );
    if (!isPartOfBoldItalic) {
      markdownSegments.push({
        start: match.index,
        end: match.index + match[0].length,
        type: "bold",
        content: match[1],
      });
    }
  }

  // Find italic (*text*)
  while ((match = ITALIC_REGEX.exec(currentText)) !== null) {
    // Adjust for the leading character in the regex
    const actualStart = match[0].startsWith('*') ? match.index : match.index + 1;
    const actualEnd = actualStart + match[0].length - (match[0].startsWith('*') ? 0 : 1);
    
    // Check if it's not already part of bold or bold-italic
    const isPartOfOther = markdownSegments.some(
      seg => actualStart >= seg.start && actualStart < seg.end
    );
    if (!isPartOfOther) {
      markdownSegments.push({
        start: actualStart,
        end: actualEnd,
        type: "italic",
        content: match[1],
      });
    }
  }

  // Sort by start position
  markdownSegments.sort((a, b) => a.start - b.start);

  // Build segments
  let lastIndex = 0;
  for (const mdSeg of markdownSegments) {
    // Add text before this markdown segment
    if (mdSeg.start > lastIndex) {
      const beforeText = currentText.slice(lastIndex, mdSeg.start);
      segments.push(...parsePlainText(beforeText, segmentIndex));
      segmentIndex += beforeText.split(/(\s+)/).filter(Boolean).length;
    }

    // Add markdown segment
    segments.push({
      type: mdSeg.type,
      content: mdSeg.content,
      key: `md-${segmentIndex++}`,
    });

    lastIndex = mdSeg.end;
  }

  // Add remaining text
  if (lastIndex < currentText.length) {
    const remainingText = currentText.slice(lastIndex);
    segments.push(...parsePlainText(remainingText, segmentIndex));
  }

  // Replace link placeholders with actual link segments
  const finalSegments: TextSegment[] = [];
  for (const seg of segments) {
    if (seg.type === "text" || seg.type === "space") {
      const content = seg.content;
      if (content.includes("__LINK_PLACEHOLDER_")) {
        // Split text around placeholders
        const parts = content.split(/(__LINK_PLACEHOLDER_\d+__)/);
        for (const part of parts) {
          if (part.startsWith("__LINK_PLACEHOLDER_")) {
            const index = parseInt(part.match(/\d+/)![0]);
            finalSegments.push(linkPlaceholders[index].segment);
          } else if (part) {
            finalSegments.push(...parsePlainText(part, segmentIndex));
            segmentIndex += part.split(/(\s+)/).filter(Boolean).length;
          }
        }
      } else {
        finalSegments.push(seg);
      }
    } else {
      finalSegments.push(seg);
    }
  }

  return finalSegments;
}

function parsePlainText(text: string, startIndex: number): TextSegment[] {
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
    return parseMarkdown(text);
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
          className={cn(
            "inline-block underline underline-offset-2 transition-colors",
            isIntense 
              ? "text-white/90 hover:text-white" 
              : "text-primary hover:text-primary/80"
          )}
          style={{ whiteSpace: "pre" }}
        >
          {segment.content}
        </motion.a>
      );
    }

    if (segment.type === "bold") {
      return (
        <motion.strong
          key={segment.key}
          variants={wordVariants}
          className="inline-block font-bold"
          style={{ whiteSpace: "pre" }}
        >
          {segment.content}
        </motion.strong>
      );
    }

    if (segment.type === "italic") {
      return (
        <motion.em
          key={segment.key}
          variants={wordVariants}
          className="inline-block italic"
          style={{ whiteSpace: "pre" }}
        >
          {segment.content}
        </motion.em>
      );
    }

    if (segment.type === "boldItalic") {
      return (
        <motion.strong
          key={segment.key}
          variants={wordVariants}
          className="inline-block font-bold italic"
          style={{ whiteSpace: "pre" }}
        >
          {segment.content}
        </motion.strong>
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
        isIntense && "text-white",
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
