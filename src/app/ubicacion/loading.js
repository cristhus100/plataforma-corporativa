export default function Loading() {
  return (
    <div className="h-[calc(100vh-5rem)] flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
        <p className="text-sm text-gray-500">Cargando mapa...</p>
      </div>
    </div>
  )
}
