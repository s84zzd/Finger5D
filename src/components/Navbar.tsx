"use client";

import Link from "next/link";
import { Menu, Search, Type } from "lucide-react";
import { useAccessibility } from "@/components/AccessibilityProvider";
import { useState } from "react";

export function Navbar() {
  const { isLargeText, toggleLargeText } = useAccessibility();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo Area */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              Finger<span className="text-blue-600">5D</span>
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:gap-8">
          <NavLink href="/frontiers">科学前沿</NavLink>
          <NavLink href="/articles">文章列表</NavLink>
          <NavLink href="/about">关于芬格</NavLink>
          <NavLink href="/admin">管理后台</NavLink>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {/* Accessibility Toggle */}
          <button
            onClick={toggleLargeText}
            className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${isLargeText
                ? "bg-blue-100 text-blue-700 border-blue-200"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            aria-label={isLargeText ? "Reset font size" : "Increase font size"}
            title="切换大字模式"
          >
            <Type className="h-4 w-4" />
            <span>A+</span>
          </button>

          <Link
            href="/articles"
            className="rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            aria-label="搜索文章"
            title="搜索文章"
          >
            <Search className="h-6 w-6" />
          </Link>

          {/* Mobile Menu Button - Visible only on mobile */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="md:hidden rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            aria-label={isMobileMenuOpen ? "关闭菜单" : "打开菜单"}
            title={isMobileMenuOpen ? "关闭菜单" : "打开菜单"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav-menu"
          >
            <Menu className="h-7 w-7" />
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div id="mobile-nav-menu" className="md:hidden border-t border-slate-200 bg-white px-4 py-3">
          <div className="flex flex-col gap-3">
            <Link href="/frontiers" className="text-base font-medium text-slate-700 hover:text-blue-600 transition-colors" onClick={closeMobileMenu}>
              科学前沿
            </Link>
            <Link href="/articles" className="text-base font-medium text-slate-700 hover:text-blue-600 transition-colors" onClick={closeMobileMenu}>
              文章列表
            </Link>
            <Link href="/about" className="text-base font-medium text-slate-700 hover:text-blue-600 transition-colors" onClick={closeMobileMenu}>
              关于芬格
            </Link>
            <Link href="/admin" className="text-base font-medium text-slate-700 hover:text-blue-600 transition-colors" onClick={closeMobileMenu}>
              管理后台
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-lg font-medium text-slate-600 hover:text-blue-600 transition-colors"
    >
      {children}
    </Link>
  );
}
