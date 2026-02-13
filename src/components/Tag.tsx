import Link from "next/link";

interface TagProps {
    label: string;
    href?: string;
    size?: "sm" | "md";
}

export function Tag({ label, href, size = "sm" }: TagProps) {
    const baseStyles = "inline-flex items-center rounded-full font-medium transition-colors bg-blue-50 text-blue-700 hover:bg-blue-100";
    const sizeStyles = size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm";

    if (href) {
        return (
            <Link href={href} className={`${baseStyles} ${sizeStyles}`}>
                {label}
            </Link>
        );
    }

    return (
        <span className={`${baseStyles} ${sizeStyles}`}>
            {label}
        </span>
    );
}
