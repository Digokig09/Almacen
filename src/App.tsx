import { useEffect, useState } from 'react';
import { supabase } from './supabase';

function App() {
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [fechaFiltro, setFechaFiltro] = useState('');

  useEffect(() => {
    cargarDatos();
    const canal = supabase
      .channel('cambios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'retiros' }, () => {
        cargarDatos();
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [fechaFiltro]);

  const agruparPorFolio = (data: any[]) => {
    const grupos = data.reduce((acc: any, item: any) => {
      const clave = item.folio || item.id;
      if (!acc[clave]) {
        acc[clave] = {
          folio: item.folio || 'Sin Folio',
          contacto: item.contactos?.nombre,
          entrego: item.entrego,
          fecha_retiro: item.fecha_retiro,
          fecha_cerrado: item.fecha_cerrado, // Carga la fecha de cierre
          estado: item.estado,
          almacenes: new Set(),
          items: []
        };
      }
      acc[clave].almacenes.add(item.almacen);
      acc[clave].items.push(item);
      return acc;
    }, {});

    // Convertimos el Set de almacenes a texto separado por comas
    return Object.values(grupos).map((g: any) => ({
      ...g,
      almacenes: Array.from(g.almacenes).join(', ')
    }));
  };

  async function cargarDatos() {
    const { data: dataPendientes } = await supabase
      .from('retiros')
      .select('*, contactos(nombre)')
      .in('estado', ['Pendiente', 'En Revisión'])
      .order('fecha_retiro', { ascending: false });
    if (dataPendientes) setPendientes(agruparPorFolio(dataPendientes));

    let query = supabase
      .from('retiros')
      .select('*, contactos(nombre)')
      .eq('estado', 'Regresado')
      .order('fecha_retiro', { ascending: false });

    if (fechaFiltro) {
      const inicioDia = new Date(`${fechaFiltro}T00:00:00`).toISOString();
      const finDia = new Date(`${fechaFiltro}T23:59:59`).toISOString();
      query = query.gte('fecha_retiro', inicioDia).lte('fecha_retiro', finDia);
    } else {
      query = query.limit(100);
    }

    const { data: dataHistorial } = await query;
    if (dataHistorial) setHistorial(agruparPorFolio(dataHistorial));
  }

  const finalizarTicket = async (ticket: any) => {
    if (window.confirm(`¿Aprobar y FINALIZAR definitivamente el Ticket: ${ticket.folio}?`)) {
      const ids = ticket.items.map((i: any) => i.id);
      const fechaHoy = new Date().toISOString(); // Hora exacta en que aprueba el jefe

      // Actualiza a Regresado y estampa la fecha de cierre
      await supabase.from('retiros').update({ estado: 'Regresado', fecha_cerrado: fechaHoy }).in('id', ids);
    }
  };

  const revertirTicket = async (ticket: any) => {
    if (window.confirm(`¿Rechazar y regresar el Ticket ${ticket.folio} a estado PENDIENTE normal?`)) {
      const ids = ticket.items.map((i: any) => i.id);
      await supabase.from('retiros').update({ estado: 'Pendiente' }).in('id', ids);
    }
  };

  const borrarTicket = async (ticket: any) => {
    if (window.confirm(`⚠️ ADVERTENCIA: ¿Estás seguro de BORRAR el Ticket: ${ticket.folio}? Esto no se puede deshacer.`)) {
      const ids = ticket.items.map((i: any) => i.id);
      await supabase.from('retiros').delete().in('id', ids);
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto' }}>

      {/* ENCABEZADO CON LOGOTIPOS DISTRIBUIDOS */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
          <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_ZRYDi9qI-xDdT-TmR834_IlTq0jujTVsz5nQuo4ZJOf-ejDd-y-R55Mx&s=10" alt="Granjero Feliz" style={{ height: '60px', objectFit: 'contain' }} />
          <img src="https://d2q79iu7y748jz.cloudfront.net/s/_squarelogo/256x256/0eeddcd0b0605bcfc8e61a4ce7d42bd2" alt="Cicaba" style={{ height: '60px', objectFit: 'contain' }} />
        </div>
        <div style={{ textAlign: 'center', padding: '0 30px' }}>
          <h1 style={{ margin: 0, color: '#2c3e50', fontSize: '32px', whiteSpace: 'nowrap' }}>Panel de Control de Almacén</h1>
          <p style={{ margin: '5px 0 0 0', color: '#7f8c8d', fontSize: '16px' }}>Monitor en tiempo real de tickets y devoluciones</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'flex-start' }}>
          <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTVKLe0G2a1oPaeRzXOuCikUpi9vl07fkN5m9ZKGGAZ2sidRRz6gGcjPsE&s=10" alt="VSB" style={{ height: '60px', objectFit: 'contain' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* COLUMNA PENDIENTES */}
        <div style={{ flex: 1, minWidth: '400px', backgroundColor: '#fff9e6', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.08)', borderTop: '5px solid #f1c40f' }}>
          <h2 style={{ color: '#d35400', marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⏱️</span> Control de Tickets ({pendientes.length})
          </h2>
          {pendientes.length === 0 ? <p style={{ color: '#7f8c8d' }}>Todo al corriente. 🎉</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {pendientes.map((ticket, idx) => {
                const enRevision = ticket.estado === 'En Revisión';

                return (
                  <div key={idx} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', borderLeft: enRevision ? '5px solid #3498db' : '5px solid #f39c12', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 'bold', color: enRevision ? '#2980b9' : '#007AFF' }}>
                        Folio: {ticket.folio} {enRevision && " 🔍 (Por Validar)"}
                      </span>
                      <span style={{ fontSize: '14px', color: '#95a5a6' }}>{new Date(ticket.fecha_retiro).toLocaleString('es-MX')}</span>
                    </div>

                    <ul style={{ margin: '0 0 15px 20px', padding: 0, color: '#2c3e50', fontWeight: 'bold' }}>
                      {ticket.items.map((prod: any, i: number) => (
                        <li key={i}>{prod.cantidad} {prod.umb} de {prod.material} <span style={{ color: '#7f8c8d', fontWeight: 'normal' }}>(Cód: {prod.codigo})</span></li>
                      ))}
                    </ul>

                    <div style={{ fontSize: '14px', color: '#34495e', display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span>👤 Retiró: <b>{ticket.contacto}</b></span>
                      <span>📦 Entregó: <b>{ticket.entrego}</b></span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#34495e', display: 'flex', justifyContent: 'flex-start' }}>
                      <span>🏢 Almacén: <b>{ticket.almacenes}</b></span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                      {enRevision ? (
                        <>
                          <button onClick={() => finalizarTicket(ticket)} style={{ flex: 1, backgroundColor: '#2ecc71', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                            ✅ Aprobar
                          </button>
                          <button onClick={() => revertirTicket(ticket)} style={{ flex: 1, backgroundColor: '#f39c12', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                            ↩️ Rechazar
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => finalizarTicket(ticket)} style={{ flex: 1, backgroundColor: '#2ecc71', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                            ✅ Forzar Finalizado
                          </button>
                          <button onClick={() => borrarTicket(ticket)} style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                            🗑️ Borrar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMNA HISTORIAL */}
        <div style={{ flex: 1, minWidth: '400px', backgroundColor: '#eafaf1', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.08)', borderTop: '5px solid #2ecc71' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ color: '#27ae60', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>🗄️</span> Historial de Tickets Finalizados
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="date" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #bdc3c7', outline: 'none' }} />
              {fechaFiltro && (
                <button onClick={() => setFechaFiltro('')} style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '9px 12px', borderRadius: '6px', cursor: 'pointer' }}>
                  Todos
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {historial.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#7f8c8d' }}>No hay registros.</p>
            ) : (
              historial.map((ticket, idx) => (
                <div key={idx} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #2ecc71', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#27ae60' }}>Folio: {ticket.folio}</span>
                    <span style={{ fontSize: '14px', color: '#95a5a6' }}>Retirado: {new Date(ticket.fecha_retiro).toLocaleString('es-MX')}</span>
                  </div>

                  <ul style={{ margin: '0 0 15px 20px', padding: 0, color: '#34495e' }}>
                    {ticket.items.map((prod: any, i: number) => (
                      <li key={i}>{prod.cantidad} {prod.umb} de {prod.material} <span style={{ color: '#95a5a6', fontSize: '12px' }}>(Cód: {prod.codigo})</span></li>
                    ))}
                  </ul>

                  <div style={{ fontSize: '14px', color: '#7f8c8d', display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span>Retiró: <b>{ticket.contacto}</b></span>
                    <span>Entregó: <b>{ticket.entrego}</b></span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#7f8c8d', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Almacén: <b>{ticket.almacenes}</b></span>
                    <span style={{ color: '#27ae60' }}>Cierre: <b>{ticket.fecha_cerrado ? new Date(ticket.fecha_cerrado).toLocaleString('es-MX') : 'N/A'}</b></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;