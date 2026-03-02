"use client";

import { useState } from "react";

export function CopyPathButton({
    value,
    label = "复制文件路径",
    successLabel = "已复制",
    title
}: {
    value: string;
    label?: string;
    successLabel?: string;
    title?: string;
}) {
    const [copied, setCopied] = useState(false);

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
            setCopied(false);
        }
    }

    return (
        <button
            onClick={handleCopy}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            type="button"
            title={title ?? value}
        >
            {copied ? successLabel : label}
        </button>
    );
}
