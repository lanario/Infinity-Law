import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA]">
      <h1 className="text-6xl font-bold text-gold-text">404</h1>
      <p className="mt-4 text-lg text-gray-500">Página não encontrada</p>
      <Link
        href="/dashboard"
        className="mt-8 px-6 py-2 bg-gold text-white rounded-md hover:bg-gold-hover transition-colors"
      >
        Voltar ao Dashboard
      </Link>
    </div>
  );
}
