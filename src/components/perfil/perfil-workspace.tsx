"use client";

import { startTransition, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  CircleHelp,
  IdCard,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  ZoomIn,
} from "lucide-react";
import { salvarDadosPessoaisPerfil, salvarAvatarPerfil } from "@/app/actions/perfil";
import { useProfileAvatarUrl } from "@/components/layout/profile-avatar";
import { TelegramHeader } from "@/components/ui/telegram-profile-header";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useUser } from "@/components/layout/user-context";
import { formatarTelefone } from "@/lib/telefone";
import { createClient } from "@/lib/supabase/client";
import { cn, formatCPF } from "@/lib/utils";
import type { ProfileSex } from "@/types/permissions";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const CROP_OUTPUT_SIZE = 512;

const SEX_OPTIONS = [
  { value: "masculino", label: "Masculino", icon: UserRound },
  { value: "feminino", label: "Feminino", icon: UserRound },
  { value: "outro", label: "Outro", icon: CircleHelp },
] as const satisfies ReadonlyArray<{ value: ProfileSex; label: string; icon: typeof UserRound }>;

const fieldClass =
  "mt-1 h-11 w-full min-w-0 rounded-xl border border-stone-200/90 bg-[#FAFAFA] px-3.5 text-sm font-medium text-[#17191A] outline-none transition placeholder:text-stone-400 focus:border-[#D4AF37] focus:bg-white focus:ring-4 focus:ring-[#D4AF37]/10 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:focus:bg-zinc-800";

function localDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function clampCropOffset(x: number, y: number, renderedWidth: number, renderedHeight: number, viewportSize: number) {
  return {
    x: Math.min(0, Math.max(viewportSize - renderedWidth, x)),
    y: Math.min(0, Math.max(viewportSize - renderedHeight, y)),
  };
}

async function createCroppedAvatar(
  file: File,
  imageSize: { width: number; height: number },
  offset: { x: number; y: number },
  zoom: number,
  viewportSize: number,
) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.max(viewportSize / imageSize.width, viewportSize / imageSize.height) * zoom;
  const sourceSize = viewportSize / scale;
  const sourceX = Math.max(0, Math.min(imageSize.width - sourceSize, -offset.x / scale));
  const sourceY = Math.max(0, Math.min(imageSize.height - sourceSize, -offset.y / scale));
  const canvas = document.createElement("canvas");
  canvas.width = CROP_OUTPUT_SIZE;
  canvas.height = CROP_OUTPUT_SIZE;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Não foi possível preparar o recorte da foto.");
  }

  context.drawImage(bitmap, sourceX, sourceY, sourceSize, sourceSize, 0, 0, CROP_OUTPUT_SIZE, CROP_OUTPUT_SIZE);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) throw new Error("Não foi possível gerar o recorte da foto.");
  return new File([blob], "foto-perfil.jpg", { type: "image/jpeg" });
}

export function PerfilWorkspace({ presentation = "page" }: { presentation?: "page" | "modal" }) {
  const isModal = presentation === "modal";
  const user = useUser();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const cropViewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [avatarPath, setAvatarPath] = useState(user?.avatar_path ?? null);
  const [legacyAvatarUrl, setLegacyAvatarUrl] = useState(user?.avatar_url ?? null);
  const { imageUrl: resolvedAvatarUrl } = useProfileAvatarUrl(avatarPath, legacyAvatarUrl);
  const [profileName, setProfileName] = useState(user?.nome ?? "");
  const [birthDate, setBirthDate] = useState(user?.data_nascimento ?? "");
  const [profileSex, setProfileSex] = useState<ProfileSex | "">(user?.sexo ?? "");
  const [cpf, setCpf] = useState(user?.cpf ? formatCPF(user.cpf) : "");
  const [phone, setPhone] = useState(user?.telefone ? formatarTelefone(user.telefone) : "");
  const [uploading, setUploading] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropUrl, setCropUrl] = useState<string | null>(null);
  const [cropImageSize, setCropImageSize] = useState<{ width: number; height: number } | null>(null);
  const [cropViewportSize, setCropViewportSize] = useState(256);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    setAvatarPath(user?.avatar_path ?? null);
    setLegacyAvatarUrl(user?.avatar_url ?? null);
    setProfileName(user?.nome ?? "");
    setBirthDate(user?.data_nascimento ?? "");
    setProfileSex(user?.sexo ?? "");
    setCpf(user?.cpf ? formatCPF(user.cpf) : "");
    setPhone(user?.telefone ? formatarTelefone(user.telefone) : "");
  }, [
    user?.avatar_path,
    user?.avatar_url,
    user?.cpf,
    user?.data_nascimento,
    user?.nome,
    user?.sexo,
    user?.telefone,
  ]);

  useEffect(() => {
    if (!cropUrl) return;
    const image = new window.Image();
    image.onload = () => setCropImageSize({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => setCropError("Não foi possível abrir essa imagem.");
    image.src = cropUrl;
    return () => URL.revokeObjectURL(cropUrl);
  }, [cropUrl]);

  useEffect(() => {
    if (!cropDialogOpen || !cropViewportRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry?.contentRect.width) setCropViewportSize(entry.contentRect.width);
    });
    observer.observe(cropViewportRef.current);
    return () => observer.disconnect();
  }, [cropDialogOpen]);

  const cropScale = cropImageSize
    ? Math.max(cropViewportSize / cropImageSize.width, cropViewportSize / cropImageSize.height) * cropZoom
    : 0;
  const cropRenderedWidth = cropImageSize ? cropImageSize.width * cropScale : 0;
  const cropRenderedHeight = cropImageSize ? cropImageSize.height * cropScale : 0;

  useEffect(() => {
    if (!cropImageSize || !cropDialogOpen) return;
    setCropOffset({
      x: (cropViewportSize - cropRenderedWidth) / 2,
      y: (cropViewportSize - cropRenderedHeight) / 2,
    });
  }, [cropDialogOpen, cropImageSize, cropRenderedHeight, cropRenderedWidth, cropViewportSize]);

  function closeCropDialog(force = false) {
    if (uploading && !force) return;
    setCropDialogOpen(false);
    setCropFile(null);
    setCropUrl(null);
    setCropImageSize(null);
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setCropError(null);
    setIsDraggingCrop(false);
  }

  const initials = profileName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const cpfDigits = cpf.replace(/\D/g, "");
  const phoneDigits = phone.replace(/\D/g, "");
  const hasProfileChanges = Boolean(user && (
    profileName.trim() !== user.nome.trim()
    || birthDate !== (user.data_nascimento ?? "")
    || profileSex !== (user.sexo ?? "")
    || cpfDigits !== (user.cpf ?? "")
    || phoneDigits !== (user.telefone ?? "")
  ));

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || savingProfile || !hasProfileChanges) return;

    setSavingProfile(true);
    setMessage(null);
    try {
      const result = await salvarDadosPessoaisPerfil({
        nome: profileName,
        data_nascimento: birthDate,
        sexo: profileSex || null,
        cpf,
        telefone: phone,
      });
      if ("error" in result) {
        setMessage({ kind: "error", text: result.error });
        return;
      }

      setMessage({ kind: "success", text: "Dados do perfil atualizados." });
      startTransition(() => router.refresh());
    } catch {
      setMessage({ kind: "error", text: "Não foi possível salvar seus dados agora." });
    } finally {
      setSavingProfile(false);
    }
  }

  async function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage({ kind: "error", text: "Use uma imagem JPG, PNG ou WebP." });
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setMessage({ kind: "error", text: "A imagem precisa ter no máximo 2 MB." });
      return;
    }

    setMessage(null);
    setCropError(null);
    setCropFile(file);
    setCropImageSize(null);
    setCropZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setCropUrl(URL.createObjectURL(file));
    setCropDialogOpen(true);
  }

  async function persistAvatar(file: File) {
    if (!user) return;

    const supabase = createClient();
    const previousPath = avatarPath;
    const path = `${user.id}/${crypto.randomUUID()}.jpg`;

    const { error: uploadError } = await supabase.storage.from("perfis").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) throw new Error("Não foi possível enviar a imagem. Tente novamente.");

    const saved = await salvarAvatarPerfil(path);
    if ("error" in saved) {
      await supabase.storage.from("perfis").remove([path]);
      throw new Error(saved.error);
    }

    if (previousPath && previousPath !== path) {
      await supabase.storage.from("perfis").remove([previousPath]);
    }

    setAvatarPath(path);
    setLegacyAvatarUrl(null);
    setMessage({ kind: "success", text: "Foto de perfil atualizada." });
    startTransition(() => router.refresh());
  }

  async function confirmAvatarCrop() {
    if (!cropFile || !cropImageSize || uploading) return;
    setUploading(true);
    setCropError(null);
    setMessage(null);
    try {
      const croppedFile = await createCroppedAvatar(cropFile, cropImageSize, cropOffset, cropZoom, cropViewportSize);
      if (croppedFile.size > MAX_IMAGE_SIZE) throw new Error("O recorte final excedeu o limite de 2 MB.");
      await persistAvatar(croppedFile);
      closeCropDialog(true);
    } catch (error) {
      setCropError(error instanceof Error ? error.message : "Não foi possível atualizar a foto agora.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={cn(
        "mx-auto max-w-2xl font-sans",
        isModal && "max-w-none",
      )}
    >
      <div className="space-y-3.5 rounded-[28px] border border-stone-200/70 bg-[#F4F4F6]/85 p-3 sm:p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
        <TelegramHeader
          avatar={resolvedAvatarUrl ?? ""}
          name={profileName || "Usuário"}
          phone={phone || "Telefone não informado"}
          username={user?.email ?? "@usuario"}
          roleBadge={user?.cargo_nome ?? "Integrante do escritório"}
          initials={initials}
          uploading={uploading}
          actionButton={{
            text: uploading ? "Enviando..." : avatarPath || legacyAvatarUrl ? "Trocar foto" : "Adicionar foto",
            onClick: () => inputRef.current?.click(),
            backgroundColor: "#D4AF37",
          }}
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={chooseAvatar}
          className="sr-only"
          aria-label="Selecionar foto do perfil"
        />

        <AnimatePresence mode="wait" initial={false}>
          {message && (
            <motion.p
              key={message.text}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="status"
              className={cn(
                "rounded-2xl border px-4 py-3 text-xs font-medium",
                message.kind === "error"
                  ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
              )}
            >
              {message.kind === "success" && <Check className="mr-1.5 inline h-3.5 w-3.5" aria-hidden="true" />}
              {message.text}
            </motion.p>
          )}
        </AnimatePresence>

        <form onSubmit={saveProfile} className="space-y-3.5">
          <section className="overflow-hidden rounded-[22px] border border-stone-200/60 bg-white shadow-[0_2px_12px_-4px_rgba(23,25,26,0.05)] dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#FBF6E9] text-[#9A7A1A] dark:bg-[#D4AF37]/15 dark:text-[#E5C158]">
                <IdCard className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A7A1A] dark:text-[#E5C158]">Identificação</p>
                <h3 className="text-sm font-black tracking-tight text-[#17191A] dark:text-zinc-100">Dados pessoais</h3>
              </div>
            </div>
            <div className="h-[1px] bg-[#F1F1F6] dark:bg-zinc-800" />
            <div className="grid gap-x-4 gap-y-4 p-4 sm:grid-cols-2 sm:p-5">
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-stone-600 dark:text-zinc-400">Nome completo</span>
                <input
                  type="text"
                  autoComplete="name"
                  maxLength={120}
                  required
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  className={fieldClass}
                />
              </label>

              <DatePicker
                label="Data de nascimento"
                value={birthDate}
                max={localDateValue(new Date())}
                onChange={setBirthDate}
                autoComplete="bday"
                inputClassName="h-11 bg-[#FAFAFA] focus:bg-white text-[#17191A] font-medium dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:focus:bg-zinc-800"
              />

              <fieldset className="min-w-0">
                <legend className="text-xs font-semibold text-stone-600 dark:text-zinc-400">Sexo</legend>
                <div
                  role="radiogroup"
                  aria-label="Sexo"
                  className="mt-1 grid h-11 grid-cols-3 gap-1 rounded-xl border border-stone-200/60 bg-[#F4F4F6] p-1 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  {SEX_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <label
                      key={value}
                      className={cn(
                        "flex min-w-0 cursor-pointer items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-bold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold/40 sm:gap-1.5 sm:text-xs",
                        profileSex === value
                          ? "bg-white text-[#9A7A1A] shadow-sm dark:bg-zinc-700 dark:text-[#F5D77F]"
                          : "text-stone-500 hover:text-stone-800 dark:text-zinc-400 dark:hover:text-zinc-200",
                      )}
                    >
                      <input
                        type="radio"
                        name="profile-sex"
                        value={value}
                        checked={profileSex === value}
                        onChange={() => setProfileSex(value)}
                        className="sr-only"
                      />
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="block min-w-0 sm:col-span-2">
                <span className="text-xs font-semibold text-stone-600 dark:text-zinc-400">CPF</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={14}
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(event) => setCpf(formatCPF(event.target.value))}
                  className={fieldClass}
                />
              </label>
            </div>
          </section>

          <section className="overflow-hidden rounded-[22px] border border-stone-200/60 bg-white shadow-[0_2px_12px_-4px_rgba(23,25,26,0.05)] dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#FBF6E9] text-[#9A7A1A] dark:bg-[#D4AF37]/15 dark:text-[#E5C158]">
                <Phone className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A7A1A] dark:text-[#E5C158]">Comunicação</p>
                <h3 className="text-sm font-black tracking-tight text-[#17191A] dark:text-zinc-100">Contato</h3>
              </div>
            </div>
            <div className="h-[1px] bg-[#F1F1F6] dark:bg-zinc-800" />
            <div className="grid gap-x-4 gap-y-4 p-4 sm:grid-cols-2 sm:p-5">
              <label className="block min-w-0">
                <span className="text-xs font-semibold text-stone-600 dark:text-zinc-400">Telefone</span>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  maxLength={15}
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(event) => setPhone(formatarTelefone(event.target.value))}
                  className={fieldClass}
                />
              </label>

              <div className="min-w-0">
                <label htmlFor="profile-email" className="text-xs font-semibold text-stone-600 dark:text-zinc-400">
                  E-mail de login
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={user?.email ?? ""}
                  readOnly
                  aria-describedby="profile-email-help"
                  className={cn(fieldClass, "cursor-not-allowed bg-[#F4F4F6] text-stone-500 dark:bg-zinc-800/50 dark:text-zinc-400")}
                />
                <p id="profile-email-help" className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-stone-500 dark:text-zinc-400">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9A7A1A] dark:text-[#E5C158]" aria-hidden="true" />
                  Para alterar e-mail ou senha, solicite ao suporte do sistema.
                </p>
              </div>
            </div>
          </section>

          <div className="flex justify-end pt-0.5">
            <button
              type="submit"
              disabled={!user || savingProfile || !hasProfileChanges}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl gold-sheen px-6 text-sm font-bold text-[#17191a] shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {savingProfile ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#17191a]/25 border-t-[#17191a]" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
              {savingProfile ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </div>

      <Dialog
        open={cropDialogOpen}
        onOpenChange={(open) => {
          if (open) setCropDialogOpen(true);
          else closeCropDialog();
        }}
      >
        <DialogContent className="w-[calc(100%-1rem)] max-w-md gap-0 overflow-y-auto rounded-3xl border border-stone-200 bg-white p-0 shadow-[0_24px_80px_-24px_rgba(23,25,26,0.4)] sm:max-w-md dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-stone-100 px-5 py-4 pr-12 sm:px-6 dark:border-zinc-800">
            <DialogTitle className="text-base font-bold text-[#17191a] dark:text-zinc-100">Ajustar foto do perfil</DialogTitle>
            <DialogDescription className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
              Arraste a imagem para enquadrar e ajuste o zoom. A área circular mostra como a foto aparecerá no sistema.
            </DialogDescription>
          </div>

          <div className="flex flex-col items-center gap-5 px-4 py-5 sm:px-6 sm:py-6">
            <div
              ref={cropViewportRef}
              role="img"
              aria-label="Prévia circular da foto de perfil; arraste para ajustar o enquadramento"
              className={cn(
                "relative aspect-square touch-none select-none overflow-hidden rounded-full border-[5px] border-white bg-stone-100 ring-2 ring-gold/70 shadow-[0_12px_32px_-12px_rgba(23,25,26,0.45)] dark:border-zinc-800 dark:bg-zinc-800",
                cropImageSize ? (isDraggingCrop ? "cursor-grabbing" : "cursor-grab") : "cursor-wait",
              )}
              style={{ width: "min(16rem, calc(100vw - 5rem))" }}
              onPointerDown={(event) => {
                if (!cropImageSize || event.button !== 0) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                dragRef.current = {
                  pointerId: event.pointerId,
                  startX: event.clientX,
                  startY: event.clientY,
                  originX: cropOffset.x,
                  originY: cropOffset.y,
                };
                setIsDraggingCrop(true);
              }}
              onPointerMove={(event) => {
                const drag = dragRef.current;
                if (!drag || drag.pointerId !== event.pointerId) return;
                setCropOffset(clampCropOffset(
                  drag.originX + event.clientX - drag.startX,
                  drag.originY + event.clientY - drag.startY,
                  cropRenderedWidth,
                  cropRenderedHeight,
                  cropViewportSize,
                ));
              }}
              onPointerUp={(event) => {
                if (dragRef.current?.pointerId === event.pointerId) {
                  dragRef.current = null;
                  setIsDraggingCrop(false);
                }
              }}
              onPointerCancel={() => {
                dragRef.current = null;
                setIsDraggingCrop(false);
              }}
            >
              {cropUrl && cropImageSize && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute max-w-none bg-no-repeat"
                  style={{
                    left: cropOffset.x,
                    top: cropOffset.y,
                    width: cropRenderedWidth,
                    height: cropRenderedHeight,
                    backgroundImage: `url("${cropUrl}")`,
                    backgroundSize: "100% 100%",
                  }}
                />
              )}
              {!cropImageSize && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-stone-500 dark:text-zinc-400">
                  Preparando imagem...
                </div>
              )}
            </div>

            <div className="w-full max-w-xs">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-zinc-300">
                <label htmlFor="profile-photo-zoom" className="inline-flex items-center gap-1.5">
                  <ZoomIn className="h-4 w-4 text-gold-dark dark:text-[#E5C158]" aria-hidden="true" /> Zoom
                </label>
                <span>{Math.round(cropZoom * 100)}%</span>
              </div>
              <input
                id="profile-photo-zoom"
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={cropZoom}
                onChange={(event) => setCropZoom(Number(event.target.value))}
                disabled={!cropImageSize || uploading}
                className="h-2 w-full cursor-pointer accent-gold disabled:cursor-not-allowed"
              />
              <p className="mt-2 text-center text-[11px] text-stone-400 dark:text-zinc-500">Arraste a foto para posicioná-la no círculo.</p>
            </div>

            {cropError && (
              <p role="alert" className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                {cropError}
              </p>
            )}

            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => closeCropDialog()}
                disabled={uploading}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-200 px-4 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-28 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmAvatarCrop}
                disabled={!cropImageSize || uploading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl gold-sheen px-4 text-sm font-bold text-[#17191a] shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/20 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-36"
              >
                {uploading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#17191a]/25 border-t-[#17191a]" aria-hidden="true" />}
                {uploading ? "Salvando foto..." : "Usar esta foto"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}