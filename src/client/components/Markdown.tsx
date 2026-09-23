import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { PluggableList } from "unified";

// singleTilde off, or "~5.3%" pairs render as strikethrough.
const plugins = [[remarkGfm, { singleTilde: false }]] as PluggableList;

export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={plugins}
        components={{
          table: (props) => (
            <div className="table-scroll">
              <table {...props} />
            </div>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
