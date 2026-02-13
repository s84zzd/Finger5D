import { ExternalLink, BookOpen } from "lucide-react";

interface CitationProps {
    title: string;
    url?: string;
    authors: string;
    journal?: string;
    year?: string;
}

export function Citation({ title, url, authors, journal, year }: CitationProps) {
    return (
        <div className="my-6 rounded-lg border-l-4 border-blue-600 bg-slate-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
                <BookOpen className="mt-1 h-5 w-5 flex-shrink-0 text-blue-600" />
                <div className="flex-1">
                    <h4 className="font-semibold text-slate-900">
                        {url ? (
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-blue-700 hover:underline decoration-blue-300 underline-offset-4"
                            >
                                {title} <ExternalLink className="inline-block h-3 w-3 ml-0.5 opacity-50" />
                            </a>
                        ) : (
                            title
                        )}
                    </h4>
                    <p className="mt-1 text-sm text-slate-600">
                        {authors}
                        {journal && <span className="italic">. {journal}</span>}
                        {year && <span> ({year})</span>}.
                    </p>
                </div>
            </div>
        </div>
    );
}
