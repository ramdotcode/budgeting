import Link from "next/link";
import PageHeader from "@/components/PageHeader";

export default function AddPage() {
  return (
    <div>
      <PageHeader title="Tambah Transaksi" />
      <div className="space-y-4 px-5 py-6">
        <Link
          href="/expense?add=1"
          className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm active:bg-gray-50"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-2xl">
            🧾
          </span>
          <div>
            <p className="font-semibold">Catat Pengeluaran</p>
            <p className="text-sm text-gray-500">Potong dari budget kategori bulan ini</p>
          </div>
        </Link>
        <Link
          href="/income"
          className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm active:bg-gray-50"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">
            💸
          </span>
          <div>
            <p className="font-semibold">Catat Pemasukan</p>
            <p className="text-sm text-gray-500">Gaji, freelance, atau sumber lain</p>
          </div>
        </Link>
        <Link
          href="/budget"
          className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm active:bg-gray-50"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-2xl">
            🎯
          </span>
          <div>
            <p className="font-semibold">Atur Budget</p>
            <p className="text-sm text-gray-500">Alokasikan dana setelah gajian</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
