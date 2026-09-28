import { useEffect, useState } from 'react';
import { supabase } from './supabase';

function App() {
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [fechaFiltro, setFechaFiltro] = useState(''); // Estado para el filtro de fecha

  useEffect(() => {
    cargarDatos();

    const canal = supabase
      .channel('cambios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'retiros' }, () => {
        cargarDatos();
      })
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [fechaFiltro]); // Se recarga automáticamente cuando cambias la fecha

  async function cargarDatos() {
    // 1. Cargar Pendientes (esos siempre salen todos, sin importar la fecha)
    const { data: dataPendientes } = await supabase
      .from('retiros')
      .select('*, contactos(nombre)')
      .eq('estado', 'Pendiente')
      .order('fecha_retiro', { ascending: false });
    
    if (dataPendientes) setPendientes(dataPendientes);

    // 2. Cargar Historial con o sin filtro
    let query = supabase
      .from('retiros')
      .select('*, contactos(nombre)')
      .order('fecha_retiro', { ascending: false });

    if (fechaFiltro) {
      // Si el usuario eligió una fecha, calculamos el inicio y fin de ese día
      const inicioDia = new Date(`${fechaFiltro}T00:00:00`).toISOString();
      const finDia = new Date(`${fechaFiltro}T23:59:59`).toISOString();
      
      query = query.gte('fecha_retiro', inicioDia).lte('fecha_retiro', finDia);
    } else {
      // Si no hay fecha elegida, mostramos los últimos 50 para no saturar
      query = query.limit(50);
    }

    const { data: dataHistorial } = await query;
    if (dataHistorial) setHistorial(dataHistorial);
  }

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Encabezado Blanco */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, color: '#2c3e50', fontSize: '32px' }}>📦 Panel de Control de Almacén</h1>
        <p style={{ margin: '10px 0 0 0', color: '#7f8c8d', fontSize: '16px' }}>Monitor en tiempo real de salidas y devoluciones</p>
      </div>
      
      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        
        {/* Columna Izquierda: PENDIENTES */}
        <div style={{ flex: 1, minWidth: '350px', backgroundColor: '#fff9e6', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.08)', borderTop: '5px solid #f1c40f' }}>
          <h2 style={{ color: '#d35400', marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⏱️</span> Retiros Pendientes ({pendientes.length})
          </h2>
          {pendientes.length === 0 ? <p style={{ color: '#7f8c8d' }}>Todo al corriente. 🎉</p> : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {pendientes.map((item) => (
                <li key={item.id} style={{ backgroundColor: 'white', margin: '15px 0', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #f39c12', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }}>{item.cantidad} {item.umb} de {item.material}</div>
                  <div style={{ fontSize: '14px', color: '#7f8c8d', margin: '8px 0' }}>Almacén: <b>{item.almacen}</b> | Código: <b>{item.codigo}</b></div>
                  <div style={{ fontSize: '15px', color: '#34495e' }}>👤 Retiró: <b>{item.contactos?.nombre}</b></div>
                  <div style={{ fontSize: '12px', color: '#95a5a6', marginTop: '5px' }}>{new Date(item.fecha_retiro).toLocaleString('es-MX')}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Columna Derecha: HISTORIAL */}
        <div style={{ flex: 2, minWidth: '400px', backgroundColor: '#eafaf1', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.08)', borderTop: '5px solid #2ecc71' }}>
          
          {/* Encabezado con Filtro de Fecha */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ color: '#27ae60', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>🗄️</span> Historial
            </h2>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ color: '#2c3e50', fontWeight: 'bold', fontSize: '14px' }}>Buscar día:</label>
              <input 
                type="date" 
                value={fechaFiltro}
                onChange={(e) => setFechaFiltro(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #bdc3c7', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              />
              {fechaFiltro && (
                <button 
                  onClick={() => setFechaFiltro('')}
                  style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '9px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}
                >
                  Ver todos
                </button>
              )}
            </div>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            {historial.length === 0 ? (
              <p style={{ padding: '20px', textAlign: 'center', color: '#7f8c8d', margin: 0 }}>No hay registros para este día.</p>
            ) : (
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f8f9fa' }}>
                  <tr>
                    <th style={{ padding: '15px', color: '#2c3e50', borderBottom: '2px solid #eaeded' }}>Material</th>
                    <th style={{ padding: '15px', color: '#2c3e50', borderBottom: '2px solid #eaeded' }}>Retiró</th>
                    <th style={{ padding: '15px', color: '#2c3e50', borderBottom: '2px solid #eaeded' }}>Estatus</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #eaeded' }}>
                      <td style={{ padding: '15px', color: '#34495e' }}>
                        <b>{item.cantidad}</b> {item.umb} {item.material}
                        <br/>
                        <small style={{ color: '#95a5a6' }}>{new Date(item.fecha_retiro).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</small>
                      </td>
                      <td style={{ padding: '15px', color: '#34495e' }}>{item.contactos?.nombre}</td>
                      <td style={{ padding: '15px' }}>
                        <span style={{ 
                          backgroundColor: item.estado === 'Regresado' ? '#d4efdf' : '#fcf3cf', 
                          color: item.estado === 'Regresado' ? '#1e8449' : '#b7950b',
                          padding: '6px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' 
                        }}>
                          {item.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;