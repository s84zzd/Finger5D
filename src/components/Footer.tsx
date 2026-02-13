import Link from "next/link";

export function Footer() {
    return (
        <footer className="border-t border-slate-200 bg-slate-50 py-12 text-slate-600">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
                    {/* Column 1: Brand & Disclaimer */}
                    <div className="col-span-1 md:col-span-2">
                        <span className="text-xl font-bold text-slate-900">
                            Finger<span className="text-blue-600">5D</span>
                        </span>
                        <p className="mt-4 max-w-sm text-base leading-relaxed">
                            致力于传播衰老科学前沿与循证干预技术。
                            <br />
                            让每个人都能科学地探索生命延长的可能性。
                        </p>
                        <p className="mt-6 text-sm text-slate-500">
                            Disclaimer: 本站内容仅供科普参考，不构成医疗建议。
                        </p>
                    </div>

                    {/* Column 2: Links */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-900">
                            探索
                        </h3>
                        <ul className="space-y-3">
                            <li><FooterLink href="/science">科学前沿</FooterLink></li>
                            <li><FooterLink href="/interventions">干预技术</FooterLink></li>
                            <li><FooterLink href="/lifestyle">生活方式</FooterLink></li>
                        </ul>
                    </div>

                    {/* Column 3: Company */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-900">
                            关于
                        </h3>
                        <ul className="space-y-3">
                            <li><FooterLink href="/about">关于芬格</FooterLink></li>
                            <li><FooterLink href="/contact">联系我们</FooterLink></li>
                            <li><FooterLink href="/privacy">隐私政策</FooterLink></li>
                        </ul>
                    </div>
                </div>

                <div className="mt-12 border-t border-slate-200 pt-8 text-center text-sm">
                    <p>&copy; {new Date().getFullYear()} Finger5D. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link href={href} className="text-base hover:text-blue-600 transition-colors">
            {children}
        </Link>
    );
}
