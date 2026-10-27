"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Download, FileText, FileUp, LoaderCircle, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const BUCKET = "cliente-documentos";
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  txt: "text/plain",
};

export type ClienteDocumento = {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  createdAt: string | null;
};

function fileSizeLabel(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

function fileDateLabel(value: string | null) {
  if (!value) return "Data indisponível";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function safeObjectName(fileName: string) {
  const normalized = fileName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-120);
  return normalized || "documento";
}

export function ClienteDocumentos({
  clienteId,
  escritorioId,
  documentos,
  canUpload,
}: {
  clienteId: string;
  escritorioId: string;
  documentos: ClienteDocumento[];
  canUpload: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClienteDocumento | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function uploadFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const validFiles: Array<{ file: File; mimeType: string }> = [];
    const invalidFileNames: string[] = [];
    for (const file of files) {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      const mimeType = MIME_BY_EXTENSION[extension];
      if (!mimeType || (file.type && file.type !== mimeType)) {
        invalidFileNames.push(file.name);
      } else if (file.size === 0 || file.size > MAX_FILE_SIZE) {
        invalidFileNames.push(file.name);
      } else {
        validFiles.push({ file, mimeType });
      }
    }

    setError(invalidFileNames.length ? `Verifique o formato ou o tamanho (máximo 20 MB): ${invalidFileNames.join(", ")}` : null);
    setNotice(null);
    if (validFiles.length === 0) return;

    const supabase = createClient();
    let uploadedCount = 0;
    setUploading(true);
    try {
      for (const [index, item] of validFiles.entries()) {
        setUploadProgress(`Enviando ${index + 1} de ${validFiles.length}…`);
        const path = `${escritorioId}/${clienteId}/${crypto.randomUUID()}__${safeObjectName(item.file.name)}`;
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, item.file, {
          cacheControl: "3600",
          contentType: item.mimeType,
          upsert: false,
        });
        if (uploadError) throw new Error("Não foi possível enviar um dos arquivos. Confira sua conexão e tente novamente.");
        uploadedCount += 1;
      }
      if (uploadedCount) {
        setNotice(`${uploadedCount} documento${uploadedCount === 1 ? " enviado" : "s enviados"} para o prontuário.`);
        router.refresh();
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Não foi possível enviar os documentos.");
      if (uploadedCount) router.refresh();
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }

  async function downloadFile(documento: ClienteDocumento) {
    setError(null);
    setNotice(null);
    setWorkingId(documento.id);
    try {
      const supabase = createClient();
      const { data, error: downloadError } = await supabase.storage.from(BUCKET).download(documento.path);
      if (downloadError || !data) throw new Error("Não foi possível abrir este documento.");

      const url = URL.createObjectURL(data);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = documento.name;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Não foi possível baixar o documento.");
    } finally {
      setWorkingId(null);
    }
  }

  async function deleteFile() {
    if (!deleteTarget || !canUpload) return;
    setError(null);
    setNotice(null);
    setWorkingId(deleteTarget.id);
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase.storage.from(BUCKET).remove([deleteTarget.path]);
      if (deleteError) throw new Error("Não foi possível remover o documento.");
      setNotice("Documento removido do prontuário.");
      setDeleteTarget(null);
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Não foi possível remover o documento.");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_8px_24px_-20px_rgba(23,25,26,0.4)]">
      <div className="flex flex-col gap-3 border-b border-stone-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold-dark"><FileText className="h-5 w-5" aria-hidden="true" /></span>
          <div><h2 className="text-sm font-black text-[#17191a]">Documentos do cliente</h2><p className="mt-0.5 text-[11px] text-stone-400">Arquivos privados deste prontuário{canUpload ? " · até 20 MB por arquivo" : ""}</p></div>
        </div>
        {canUpload && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
              onChange={uploadFiles}
              className="sr-only"
              aria-label="Selecionar documentos para enviar"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl gold-sheen px-4 text-xs font-bold text-[#17191a] shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileUp className="h-4 w-4" aria-hidden="true" />}
              {uploading ? uploadProgress : "Adicionar documento"}
            </button>
          </>
        )}
      </div>

      <AnimatePresence initial={false}>
        {(error || notice) && (
          <motion.p
            key={error ?? notice}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            role={error ? "alert" : "status"}
            className={cn(
              "mx-4 mt-4 rounded-xl border px-3.5 py-2.5 text-xs sm:mx-5",
              error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700",
            )}
          >
            {error ?? notice}
          </motion.p>
        )}
      </AnimatePresence>

      {documentos.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-50 text-stone-300"><FileText className="h-6 w-6" aria-hidden="true" /></span>
          <p className="mt-3 text-sm font-bold text-stone-700">Nenhum documento anexado</p>
          <p className="mt-1 text-xs text-stone-400">Contratos, procurações e demais arquivos deste cliente aparecerão aqui.</p>
        </div>
      ) : (
        <ul className="divide-y divide-stone-100">
          {documentos.map((documento) => (
            <li key={documento.id} className="flex min-w-0 items-center gap-3 px-4 py-3.5 sm:px-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-50 text-gold-dark"><FileText className="h-5 w-5" aria-hidden="true" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-stone-800" title={documento.name}>{documento.name}</p>
                <p className="mt-1 text-[10px] text-stone-400">{fileSizeLabel(documento.size)} · {fileDateLabel(documento.createdAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => void downloadFile(documento)}
                disabled={workingId === documento.id}
                className="rounded-lg p-2 text-stone-400 transition hover:bg-gold-soft hover:text-gold-dark disabled:opacity-50"
                aria-label={`Baixar ${documento.name}`}
              >
                {workingId === documento.id ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
              </button>
              {canUpload && (
                <button
                  type="button"
                  onClick={() => setDeleteTarget(documento)}
                  disabled={workingId === documento.id}
                  className="rounded-lg p-2 text-stone-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  aria-label={`Remover ${documento.name}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && !workingId && setDeleteTarget(null)}>
        <DialogContent showCloseButton={false} className="max-w-md rounded-3xl border border-stone-200 bg-white p-5 shadow-[0_24px_80px_-24px_rgba(23,25,26,0.4)] sm:max-w-md">
          <button type="button" onClick={() => setDeleteTarget(null)} disabled={Boolean(workingId)} className="absolute right-3 top-3 rounded-lg p-2 text-stone-400 hover:bg-stone-100 disabled:opacity-50" aria-label="Fechar confirmação"><X className="h-4 w-4" aria-hidden="true" /></button>
          <DialogTitle className="pr-8 text-base font-black text-[#17191a]">Remover documento?</DialogTitle>
          <DialogDescription className="mt-2 break-all text-xs leading-relaxed text-stone-500">
            {deleteTarget?.name} será removido do prontuário do cliente.
          </DialogDescription>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setDeleteTarget(null)} disabled={Boolean(workingId)} className="h-10 rounded-xl border border-stone-200 px-4 text-xs font-bold text-stone-600 transition hover:bg-stone-50 disabled:opacity-50">Cancelar</button>
            <button type="button" onClick={() => void deleteFile()} disabled={Boolean(workingId)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-60">
              {workingId ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
              {workingId ? "Removendo..." : "Remover documento"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
