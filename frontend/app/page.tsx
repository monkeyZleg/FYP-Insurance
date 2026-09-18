import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="flex items-center justify-between px-8 py-4 bg-white shadow-sm">
        <h1 className="text-xl font-bold text-blue-900">BEICVS</h1>
        <Link
          href="/login"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Login
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-20 text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-6">
          Blockchain-Enhanced Insurance
          <br />
          Claim Verification System
        </h2>
        <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
          A tamper-proof, independently verifiable audit trail for insurance
          claims powered by Ethereum blockchain technology.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="text-3xl mb-3">&#x1F512;</div>
            <h3 className="font-semibold text-lg mb-2 text-gray-900">Tamper-Proof</h3>
            <p className="text-sm text-gray-500">
              Every claim status change is recorded immutably on the Ethereum
              blockchain.
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="text-3xl mb-3">&#x1F50D;</div>
            <h3 className="font-semibold text-lg mb-2 text-gray-900">Transparent</h3>
            <p className="text-sm text-gray-500">
              Full audit trail accessible to authorized auditors at any time.
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="text-3xl mb-3">&#x2705;</div>
            <h3 className="font-semibold text-lg mb-2 text-gray-900">Verifiable</h3>
            <p className="text-sm text-gray-500">
              Document integrity verified through SHA-256 hashing anchored
              on-chain.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
