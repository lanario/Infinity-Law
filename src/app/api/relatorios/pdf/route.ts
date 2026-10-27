import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { buildReport } from "@/lib/relatorios/data";

export const runtime = "nodejs";
export const maxDuration = 30;

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const bodySchema = z.object({ tipo: z.enum(["faturamento", "processos", "responsavel"]), periodo: z.object({ inicio: date, fim: date }) });

export async function POST(request: NextRequest) {
  const supabase = createClient();
  // getUser e permissão são independentes: rodam juntos; o 401 continua precedendo o 403.
  const [{ data: { user } }, { data: allowed }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("has_permission", { modulo: "relatorios", acao: "read" }),
  ]);
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.periodo.inicio > parsed.data.periodo.fim) return NextResponse.json({ error: "Informe um período válido." }, { status: 400 });

  try {
    const { tipo, periodo } = parsed.data;
    const report = await buildReport(supabase, tipo, periodo.inicio, periodo.fim);
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: report.cabecalhos.length > 4 ? "landscape" : "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const tableWidth = pageWidth - margin * 2;
    const columnWidth = tableWidth / report.cabecalhos.length;

    const drawHeader = (page = false) => {
      if (page) doc.addPage();
      doc.setFillColor(23, 25, 26);
      doc.roundedRect(margin, 12, tableWidth, 25, 3, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(212, 175, 55);
      doc.text("INFINITY LAW", margin + 5, 21);
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(report.titulo, margin + 5, 29);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 113, 108);
      doc.text(`Período: ${periodo.inicio.split("-").reverse().join("/")} a ${periodo.fim.split("-").reverse().join("/")}  ·  ${report.resumo}`, margin, 44);
      const y = 53;
      doc.setFillColor(251, 246, 233);
      doc.rect(margin, y - 5, tableWidth, 9, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(110, 85, 20);
      report.cabecalhos.forEach((label, index) => doc.text(label.slice(0, 28), margin + index * columnWidth + 2, y));
      return y + 7;
    };

    let y = drawHeader();
    if (!report.linhas.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120, 113, 108);
      doc.text("Nenhum registro encontrado neste período.", margin, y + 4);
    }
    for (const [rowIndex, row] of report.linhas.entries()) {
      const cells = row.map((value, index) => {
        if (report.cabecalhos[index] === "Valor (R$)") return Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
        return String(value ?? "—");
      });
      const wrapped = cells.map((value) => doc.splitTextToSize(value, columnWidth - 4) as string[]);
      const height = Math.max(6, ...wrapped.map((parts) => parts.length * 3.6 + 2));
      if (y + height > doc.internal.pageSize.getHeight() - 15) y = drawHeader(true);
      if (rowIndex % 2 === 0) { doc.setFillColor(250, 249, 247); doc.rect(margin, y - 4.5, tableWidth, height, "F"); }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(52, 54, 55);
      wrapped.forEach((parts, index) => doc.text(parts, margin + index * columnWidth + 2, y));
      y += height;
    }
    const pdfBytes = doc.output("arraybuffer");
    return new NextResponse(pdfBytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="relatorio-${tipo}.pdf"` } });
  } catch (error) {
    console.error("[relatorios/pdf] Falha ao gerar relatório:", error);
    return NextResponse.json({ error: "Não foi possível montar o relatório." }, { status: 500 });
  }
}
