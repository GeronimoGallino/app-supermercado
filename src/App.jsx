import { useState, useEffect } from 'react';

function App() {
  const [pantalla, setPantalla] = useState('inicio');
  const [faltantes, setFaltantes] = useState([]);
  const [maestro, setMaestro] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Estado para el modal de tachar en góndola
  const [itemAConfirmar, setItemAConfirmar] = useState(null);
  
  // NUEVO: Estado para el modal de pedir cantidad al agregar
  const [modalCantidad, setModalCantidad] = useState({ visible: false, producto: '', cantidad: 1 });

  useEffect(() => {
    cargarDatos();
  }, []);

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

  // Función actualizada para recibir cantidad
  const agregarFaltante = async () => {
    const { producto, cantidad } = modalCantidad;
    
    // 1. Optimistic UI
    const nuevo = { id: Date.now().toString(), producto, cantidad, estado: 'Pendiente' };
    setFaltantes(prev => [...prev, nuevo]);
    setModalCantidad({ visible: false, producto: '', cantidad: 1 }); // Cerramos el modal

    // 2. POST en segundo plano
    try {
      await fetch(import.meta.env.VITE_API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'add', producto, cantidad })
      });
    } catch (error) {
      console.error("Error guardando:", error);
    }
  };

  const marcarComprado = async (producto) => {
    setFaltantes(prev => prev.map(f => 
      f.producto === producto ? { ...f, estado: 'Comprado' } : f
    ));

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
      setFaltantes([]);
      setPantalla('inicio');
    } catch (err) {
      console.error("Error al limpiar base:", err);
    } finally {
      setLoading(false);
    }
  };

  const necesitaComprarse = (producto) => {
    return !faltantes.some(f => f.producto === producto);
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-slate-50 min-h-screen text-slate-800 font-sans relative">
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
            <button onClick={() => setPantalla('inicio')} className="text-blue-500 font-semibold">
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
                          // Ahora abrimos el modal en lugar de agregar directo
                          onClick={() => setModalCantidad({ visible: true, producto, cantidad: 1 })}
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
              [...faltantes]
                .sort((a, b) => (a.estado === 'Comprado' ? 1 : -1))
                .map((item, idx) => {
                  const esComprado = item.estado === 'Comprado';
                  
                  return (
                    <button 
                      key={idx}
                      onClick={() => !esComprado && setItemAConfirmar(item.producto)}
                      disabled={esComprado}
                      className={`w-full p-5 rounded-xl shadow-sm border flex justify-between items-center transition-all text-left ${
                        esComprado 
                          ? 'bg-slate-50 border-slate-200 opacity-60' 
                          : 'bg-white border-slate-100 active:bg-emerald-50 active:scale-[0.98]'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className={`text-xl font-medium transition-all ${
                          esComprado ? 'text-slate-400 line-through' : 'text-slate-700'
                        }`}>
                          {item.producto}
                        </span>
                        {/* NUEVO: Etiqueta de cantidad */}
                        <span className={`text-sm font-bold mt-1 ${esComprado ? 'text-slate-400' : 'text-blue-500'}`}>
                          Cantidad: {item.cantidad || 1}
                        </span>
                      </div>
                      
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ml-4 ${
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
      
      {/* --- MODAL 1: CONFIRMAR COMPRA --- */}
      {itemAConfirmar && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🛒</div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">¿Tachar producto?</h3>
            <p className="text-slate-500 mb-6">¿Confirmás que ya pusiste <strong>{itemAConfirmar}</strong> en el changuito?</p>
            <div className="flex gap-3">
              <button onClick={() => setItemAConfirmar(null)} className="flex-1 bg-slate-100 text-slate-700 p-3 rounded-xl font-bold active:bg-slate-200">Cancelar</button>
              <button onClick={() => { marcarComprado(itemAConfirmar); setItemAConfirmar(null); }} className="flex-1 bg-emerald-500 text-white p-3 rounded-xl font-bold active:bg-emerald-600">Sí, tachar</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: PEDIR CANTIDAD --- */}
      {modalCantidad.visible && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl text-center">
            <h3 className="text-xl font-bold text-slate-800 mb-2">¿Cuánto agregamos?</h3>
            <p className="text-slate-500 mb-6 font-medium">{modalCantidad.producto}</p>
            
            <div className="flex items-center justify-center gap-6 mb-8">
              <button 
                onClick={() => setModalCantidad(p => ({ ...p, cantidad: Math.max(1, p.cantidad - 1) }))}
                className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 text-2xl font-bold active:bg-slate-200 flex items-center justify-center"
              >-</button>
              <span className="text-4xl font-black text-slate-800 w-12 text-center">{modalCantidad.cantidad}</span>
              <button 
                onClick={() => setModalCantidad(p => ({ ...p, cantidad: p.cantidad + 1 }))}
                className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 text-2xl font-bold active:bg-blue-200 flex items-center justify-center"
              >+</button>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setModalCantidad({ visible: false, producto: '', cantidad: 1 })} 
                className="flex-1 bg-slate-100 text-slate-700 p-3 rounded-xl font-bold active:bg-slate-200"
              >
                Cancelar
              </button>
              <button 
                onClick={agregarFaltante} 
                className="flex-1 bg-blue-500 text-white p-3 rounded-xl font-bold active:bg-blue-600"
              >
                Anotar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;