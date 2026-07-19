import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-3xl font-bold">E-Commerce Platform v1</h1>
      <p className="max-w-md text-gray-600">
        Cash on Delivery marketplace. Browse the catalog, no account required to
        check out.
      </p>
      <Link href="/products" className="text-sm font-medium underline">
        Browse products →
      </Link>
    </main>
  );
}
