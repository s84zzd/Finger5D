import { MDXRemote } from "next-mdx-remote/rsc";
import { Citation } from "@/components/Citation";
import { Tag } from "@/components/Tag";
import { MoveRight } from "lucide-react";

// Define custom components available in MDX files
const components = {
    Citation,
    Tag,
    // Accessible Callout Component
    Callout: ({ children, type = "info" }: { children: React.ReactNode; type?: "info" | "warning" | "tip" }) => {
        const bg = type === "warning" ? "bg-amber-50 border-amber-200" : type === "tip" ? "bg-emerald-50 border-emerald-200" : "bg-blue-50 border-blue-200";
        const text = type === "warning" ? "text-amber-900" : type === "tip" ? "text-emerald-900" : "text-blue-900";
        return (
            <div className={`my-6 rounded-lg border-l-4 p-4 ${bg} ${text}`}>
                {children}
            </div>
        );
    },
    // Custom Link Component for Accessibility
    a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
        const isExternal = href?.startsWith("http");
        return (
            <a
                href={href}
                className="font-medium text-blue-600 underline decoration-blue-300 underline-offset-4 hover:text-blue-800"
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                {...props}
            >
                {children}
                {isExternal && <span className="sr-only">(opens in a new tab)</span>}
            </a>
        );
    },
};

export function MDXRenderer({ source }: { source: string }) {
    return (
        <div className="prose prose-lg prose-slate max-w-none 
      prose-headings:font-bold prose-headings:text-slate-900 
      prose-p:text-slate-700 prose-p:leading-relaxed
      prose-strong:text-slate-900 prose-strong:font-semibold
      prose-ul:list-disc prose-ul:pl-6
      prose-ol:list-decimal prose-ol:pl-6
      prose-li:my-1
      prose-img:rounded-xl prose-img:shadow-md
    ">
            <MDXRemote source={source} components={components} />
        </div>
    );
}
