import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface WikiPageMarkdownProps {
  text: string;
}

export default function WikiPageMarkdown({ text }: WikiPageMarkdownProps) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>;
}
