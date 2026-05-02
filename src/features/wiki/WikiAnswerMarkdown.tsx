import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink } from "lucide-react";
import { open as openExternal } from "@tauri-apps/plugin-shell";

interface WikiAnswerMarkdownProps {
  text: string;
}

function WikiAnswerLink({ href, children, ...rest }: ComponentPropsWithoutRef<"a">) {
  const isExternal = !!href && /^https?:\/\//i.test(href);

  return (
    <a
      href={href}
      {...rest}
      onClick={(e) => {
        if (isExternal && href) {
          e.preventDefault();
          openExternal(href).catch((err) => {
            console.error("Failed to open external URL:", err);
          });
        }
      }}
      className="inline-flex items-baseline gap-0.5"
    >
      {children}
      {isExternal && (
        <ExternalLink
          size={10}
          className="inline-block flex-shrink-0 opacity-60"
          style={{ transform: "translateY(1px)" }}
        />
      )}
    </a>
  );
}

export default function WikiAnswerMarkdown({ text }: WikiAnswerMarkdownProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: WikiAnswerLink }}>
      {text}
    </ReactMarkdown>
  );
}
