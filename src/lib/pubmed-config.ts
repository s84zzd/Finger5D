// PubMed API 基础配置
export const PUBMED_CONFIG = {
    baseUrl: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils",
    apiKey: process.env.NCBI_API_KEY ?? process.env.PUBMED_API_KEY ?? "",
    email: process.env.PUBMED_EMAIL ?? "Zenbalasmith@gmail.com",
    rateLimit: {
        withoutKey: "3 requests/second",
        withKey: "10 requests/second"
    },
    timeout: 30,
    retry: {
        maxAttempts: 3,
        backoffFactor: 2
    }
};

export type PubMedConfig = typeof PUBMED_CONFIG;

// 用法示例：
// import { PUBMED_CONFIG } from "@/lib/pubmed-config";
// fetch(`${PUBMED_CONFIG.baseUrl}/esearch.fcgi?...&api_key=${PUBMED_CONFIG.apiKey}&email=${PUBMED_CONFIG.email}`)
