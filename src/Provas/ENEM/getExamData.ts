export async function getExamData(ano: string, dia: string) {
    const key = `${ano}-${dia}`;
    switch (key) {
        case "2017-dia1":
            return import("@/Provas/ENEM/2017/enem-2017-dia1.json");
        case "2025-dia1":
            return import("@/Provas/ENEM/2025/enem-2025-dia1.json");
        case "2025-dia2":
            return import("@/Provas/ENEM/2025/enem-2025-dia2.json");
        default:
            throw new Error(`Data for exam ${key} not found`);
    }
}
