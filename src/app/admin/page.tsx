import { cookies } from "next/headers";
import { AdminWorkflowPanel } from "@/components/AdminWorkflowPanel";
import { ADMIN_AUTH_COOKIE, getAuthenticatedUsernameFromCookie } from "@/lib/admin-auth";

export const metadata = {
    title: "管理后台 - Finger5D",
    description: "按五维健康模型规划、选题、选论文并生成科普文章草稿。"
};

export default async function AdminPage() {
    const rawProvider = (process.env.LLM_PROVIDER ?? "deepseek").toLowerCase();
    const provider = rawProvider === "openai" || rawProvider === "deepseek" ? rawProvider : "deepseek";
    const providerName = provider === "openai" ? "OpenAI" : "DeepSeek";
    const providerReady = provider === "openai"
        ? Boolean(process.env.OPENAI_API_KEY)
        : Boolean(process.env.DEEPSEEK_API_KEY);

    const envWarnings: string[] = [];

    if (!process.env.ADMIN_TOKEN) {
        envWarnings.push("未配置 ADMIN_TOKEN：后台将无法正常登录。请在 .env.local 添加 ADMIN_TOKEN。 ");
    }

    if (rawProvider !== "openai" && rawProvider !== "deepseek") {
        envWarnings.push(`LLM_PROVIDER=${rawProvider} 无效，系统已回退为 deepseek。可选值：deepseek | openai。`);
    }

    if (provider === "deepseek" && !process.env.DEEPSEEK_API_KEY) {
        envWarnings.push("当前使用 DeepSeek，但未配置 DEEPSEEK_API_KEY：生成会自动回退模板草稿。");
    }

    if (provider === "openai" && !process.env.OPENAI_API_KEY) {
        envWarnings.push("当前使用 OpenAI，但未配置 OPENAI_API_KEY：生成会自动回退模板草稿。");
    }

    const cookieStore = await cookies();
    const authCookie = cookieStore.get(ADMIN_AUTH_COOKIE)?.value ?? "";
    const currentUsername = getAuthenticatedUsernameFromCookie(authCookie) ?? "未知用户";

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <AdminWorkflowPanel
                llmProviderName={providerName}
                llmProviderReady={providerReady}
                envWarnings={envWarnings}
                currentUsername={currentUsername}
            />
        </div>
    );
}
