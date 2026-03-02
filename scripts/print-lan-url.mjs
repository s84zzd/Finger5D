import os from "os";

function getLanIPv4Addresses() {
    const nets = os.networkInterfaces();
    const addresses = [];

    for (const ifaceName of Object.keys(nets)) {
        const iface = nets[ifaceName] ?? [];
        for (const net of iface) {
            if (net && net.family === "IPv4" && !net.internal) {
                addresses.push({ name: ifaceName, address: net.address });
            }
        }
    }

    return addresses;
}

const port = process.env.PORT || "3000";
const addresses = getLanIPv4Addresses();

if (addresses.length === 0) {
    console.log("未检测到可用的局域网 IPv4 地址，请检查网卡连接状态。");
    process.exit(0);
}

console.log("可在局域网访问以下地址：");
for (const item of addresses) {
    console.log(`- ${item.name}: http://${item.address}:${port}`);
}
