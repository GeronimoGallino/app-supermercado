import { useState, useEffect } from 'react';

function App() {
  const [pantalla, setPantalla] = useState('inicio');
  const [faltantes, setFaltantes] = useState([]);
  const [maestro, setMaestro] = useState({});
  const [loading, setLoading] = useState(false);
  const [itemAConfirmar, setItemAConfirmar] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  // Hacemos el fetch de ambas listas en paralelo para ganar velocidad
  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resFaltantes, resMaestro] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}?action=faltantes`),
        fetch(`${import.meta.env.VITE_API_URL}?action=maestro`)
      ]);
      setFaltantes(await resFaltantes.json());
      setMaestro(await resMaestro.json());
    } catch (error) {
      console.error("Error de conexión:", error);
    } finally {
      setLoading(false);
    }
  };

  // Función que dispara tu papá al tocar "+"
  const agregarFaltante = async (producto) => {
    // 1. Optimistic UI: Lo agregamos al estado local instantáneamente
    const nuevo = { id: Date.now().toString(), producto, estado: 'Pendiente' };
    setFaltantes(prev => [...prev, nuevo]);

    // 2. Disparamos el POST en segundo plano
    try {
      await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({ producto })
      });
    } catch (error) {
      console.error("Error guardando:", error);
      // Acá en un futuro podrías revertir el estado si la red falla
    }
  };

  const marcarComprado = async (producto) => {
    // 1. Lo pasamos a estado "Comprado" localmente para que desaparezca
    setFaltantes(prev => prev.map(f => 
      f.producto === producto ? { ...f, estado: 'Comprado' } : f
    ));

    // 2. Disparamos el UPDATE al backend
    fetch(import.meta.env.VITE_API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'buy', producto })
    }).catch(err => console.error("Error al comprar:", err));
  };

  const finalizarCompra = async () => {
    setLoading(true);
    try {
      await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'checkout' })
      });
      // Vaciamos la lista y volvemos al inicio
      setFaltantes([]);
      setPantalla('inicio');
    } catch (err) {
      console.error("Error al limpiar base:", err);
    } finally {
      setLoading(false);
    }
  };

  // Algoritmo de filtrado: true si el producto NO está en la lista de faltantes
  const necesitaComprarse = (producto) => {
    return !faltantes.some(f => f.producto === producto);
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-slate-50 min-h-screen text-slate-800 font-sans">
      <h1 className="text-3xl font-black text-center mb-8 text-slate-700">🛒 SuperApp</h1>

      {loading && (
        <div className="text-center text-slate-500 font-medium animate-pulse">
          Sincronizando base de datos...
        </div>
      )}

      {/* --- PANTALLA 1: INICIO --- */}
      {!loading && pantalla === 'inicio' && (
        <div className="flex flex-col gap-4 mt-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm text-center border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-800">Hay {faltantes.length} cosas anotadas</h2>
            <p className="text-slate-500 mt-1">Lista actualizada por la familia</p>
          </div>
          
          <button 
            onClick={() => setPantalla('repaso')}
            className="w-full bg-blue-500 text-white p-4 rounded-xl text-lg font-bold shadow-md active:scale-95 transition-all"
          >
            📋 Repasar Inventario Maestro
          </button>
          
          <button 
            onClick={() => setPantalla('gondola')}
            className="w-full bg-emerald-500 text-white p-4 rounded-xl text-lg font-bold shadow-md active:scale-95 transition-all"
          >
            🏃‍♂️ Ir directo a comprar
          </button>
        </div>
      )}

      {/* --- PANTALLA 2: REPASO DEL INVENTARIO --- */}
      {!loading && pantalla === 'repaso' && (
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">¿Falta algo de esto?</h2>
            <button 
              onClick={() => setPantalla('inicio')}
              className="text-blue-500 font-semibold"
            >
              Volver
            </button>
          </div>

          <div className="space-y-6 pb-24">
            {Object.keys(maestro).map(categoria => {
              const productosFaltantes = maestro[categoria].filter(necesitaComprarse);
              
              if (productosFaltantes.length === 0) return null;

              return (
                <div key={categoria} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 font-bold text-slate-600">
                    {categoria}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {productosFaltantes.map(producto => (
                      <div key={producto} className="flex justify-between items-center p-4">
                        <span className="text-lg font-medium">{producto}</span>
                        <button 
                          onClick={() => agregarFaltante(producto)}
                          className="bg-blue-100 text-blue-600 w-10 h-10 rounded-full text-2xl font-bold flex items-center justify-center active:bg-blue-200 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-sm border-t border-slate-200">
            <button 
              onClick={() => setPantalla('gondola')}
              className="w-full max-w-md mx-auto block bg-emerald-500 text-white p-4 rounded-xl text-lg font-bold shadow-lg active:scale-95 transition-all"
            >
              Terminé de revisar ({faltantes.length} anotados)
            </button>
          </div>
        </div>
      )}

{/* --- PANTALLA 3: MODO GÓNDOLA --- */}
      {!loading && pantalla === 'gondola' && (
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-slate-800">A comprar</h2>
            <button onClick={() => setPantalla('inicio')} className="text-slate-400">Cancelar</button>
          </div>

          <div className="space-y-3 pb-24">
            {faltantes.length === 0 ? (
              <div className="text-center p-8 text-slate-500 bg-white rounded-xl border border-slate-200">
                ¡No hay nada anotado!
              </div>
            ) : (
              // Copiamos el array y ordenamos: los pendientes arriba, los comprados abajo
              [...faltantes]
                .sort((a, b) => (a.estado === 'Comprado' ? 1 : -1))
                .map((item, idx) => {
                  const esComprado = item.estado === 'Comprado';
                  
                  return (
                    <button 
                      key={idx}
                      // Si ya está comprado, deshabilitamos el botón para que no abra el modal
                      onClick={() => !esComprado && setItemAConfirmar(item.producto)}
                      disabled={esComprado}
                      className={`w-full p-5 rounded-xl shadow-sm border flex justify-between items-center transition-all text-left ${
                        esComprado 
                          ? 'bg-slate-50 border-slate-200 opacity-60' 
                          : 'bg-white border-slate-100 active:bg-emerald-50 active:scale-[0.98]'
                      }`}
                    >
                      <span className={`text-xl font-medium transition-all ${
                        esComprado ? 'text-slate-400 line-through' : 'text-slate-700'
                      }`}>
                        {item.producto}
                      </span>
                      
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                        esComprado ? 'border-emerald-500 bg-emerald-500' : 'border-slate-200'
                      }`}>
                        {esComprado && <span className="text-white font-bold">✓</span>}
                      </div>
                    </button>
                  );
                })
            )}
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-sm border-t border-slate-200">
            <button 
              onClick={finalizarCompra}
              className="w-full max-w-md mx-auto block bg-slate-800 text-white p-4 rounded-xl text-lg font-bold shadow-lg active:scale-95 transition-all"
            >
              🏁 Finalizar Compra y Limpiar
            </button>
          </div>
        </div>
      )}
      
            
      {/* --- CARTEL DE CONFIRMACIÓN (MODAL) --- */}
      {itemAConfirmar && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl text-center transform transition-all">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              🛒
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">¿Tachar producto?</h3>
            <p className="text-slate-500 mb-6">
              ¿Confirmás que ya pusiste <strong>{itemAConfirmar}</strong> en el changuito?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setItemAConfirmar(null)}
                className="flex-1 bg-slate-100 text-slate-700 p-3 rounded-xl font-bold active:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  marcarComprado(itemAConfirmar);
                  setItemAConfirmar(null);
                }}
                className="flex-1 bg-emerald-500 text-white p-3 rounded-xl font-bold active:bg-emerald-600 transition-colors"
              >
                Sí, tachar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;