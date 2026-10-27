import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import ExcelJS from "exceljs";
import { buildReport } from "@/lib/relatorios/data";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const bodySchema = z.object({ tipo: z.enum(["faturamento", "processos", "responsavel"]), periodo: z.object({ inicio: date, fim: date }) });

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { data: allowed } = await supabase.rpc("has_permission", { modulo: "relatorios", acao: "read" });
  if (!allowed) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.periodo.inicio > parsed.data.periodo.fim) return NextResponse.json({ error: "Informe um período válido." }, { status: 400 });

  try {
    const { tipo, periodo } = parsed.data;
    const report = await buildReport(supabase, tipo, periodo.inicio, periodo.fim);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Infinity Law";
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet(report.titulo.slice(0, 31));
    worksheet.addRow(["INFINITY LAW"]);
    worksheet.addRow([report.titulo]);
    worksheet.addRow([`Período: ${periodo.inicio.split("-").reverse().join("/")} a ${periodo.fim.split("-").reverse().join("/")}`]);
    worksheet.addRow([report.resumo]);
    worksheet.addRow([]);
    worksheet.addRow(report.cabecalhos);
    const heading = worksheet.getRow(6);
    heading.height = 24;
    heading.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF17191A" } };
      cell.font = { bold: true, color: { argb: "FFD4AF37" } };
      cell.alignment = { vertical: "middle" };
      cell.border = { bottom: { style: "medium", color: { argb: "FFD4AF37" } } };
    });
    for (const values of report.linhas) worksheet.addRow(values);
    worksheet.columns = report.cabecalhos.map((label, index) => ({ header: label, key: `col${index}`, width: Math.max(16, Math.min(36, label.length + 8)) }));
    worksheet.getRow(1).font = { size: 15, bold: true, color: { argb: "FFD4AF37" } };
    worksheet.getRow(2).font = { size: 12, bold: true, color: { argb: "FF17191A" } };
    worksheet.views = [{ state: "frozen", ySplit: 6 }];
    worksheet.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: report.cabecalhos.length } };
    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="relatorio-${tipo}.xlsx"` } });
  } catch (error) {
    console.error("[relatorios/excel] Falha ao gerar relatório:", error);
    return NextResponse.json({ error: "Não foi possível montar o relatório." }, { status: 500 });
  }
}
