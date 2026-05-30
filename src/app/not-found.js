'use client'

import Link from 'next/link'

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto mb-6">
          <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center">
            <span className="text-5xl font-bold text-gray-300">404</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Página no encontrada</h1>
        <p className="text-gray-600 mb-6">
          La página que buscas no existe o ha sido movida.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
