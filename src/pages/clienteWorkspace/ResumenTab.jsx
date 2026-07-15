import { Link } from 'react-router-dom';
import CopyableValue from '../../components/ui/CopyableValue';
import { fmtMoney, fmtDate, fmtDateTime, contratoIdDisplay } from '../../utils/formatters';
import { Icon } from './ui';

function Row({ label, children }) {
  return (
    <div className="ct-date-row">
      <span className="ct-date-label">{label}</span>
      <span className="ct-date-value">{children}</span>
    </div>
  );
}

const STATUS_PILL = {
  ACTIVO: 'ok',
  MORA: 'danger',
  GRACIA: 'warn',
  SUSPENDIDO: 'danger',
  VENCIDO: '',
};

export default function ResumenTab({ data }) {
  const { perfil, tipo, contratos, incidencias, usuarios_cuenta: usuariosCuenta } = data;
  const esJuridica = tipo === 'juridica';

  return (
    <div className="ct-tab-resumen">
      <div className="ct-resumen-grid cw-grid-fichas">
        <div className="ct-resumen-card">
          <p className="ct-resumen-card-title">
            <Icon d={esJuridica
              ? ['M3 21h18', 'M5 21V7l8-4v18', 'M19 21V11l-6-4']
              : ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z']}
              color="var(--primary)" w={14} />
            {esJuridica ? 'Ficha Empresa' : 'Ficha Persona'}
          </p>
          <div className="ct-resumen-dates">
            <Row label={esJuridica ? 'Razón social' : 'Nombre completo'}>{perfil.razon_social}</Row>
            <Row label={esJuridica ? 'RUT' : 'RUN'}>
              <CopyableValue value={perfil.id_fiscal}>{perfil.id_fiscal || '—'}</CopyableValue>
            </Row>
            {esJuridica && <Row label="Giro">{perfil.sector || '—'}</Row>}
            <Row label="Registro">{fmtDate(perfil.fecha_registro)}</Row>
            <Row label="Última modificación">{fmtDateTime(perfil.fecha_modificacion)}</Row>
          </div>
        </div>

        <div className="ct-resumen-card">
          <p className="ct-resumen-card-title">
            <Icon d={['M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z']} color="var(--success-alt)" w={14} />
            Contacto
          </p>
          <div className="ct-resumen-dates">
            <Row label="Email principal">
              <CopyableValue value={perfil.email}>{perfil.email || '—'}</CopyableValue>
            </Row>
            <Row label="Teléfono">
              <CopyableValue value={perfil.telefono}>{perfil.telefono || '—'}</CopyableValue>
            </Row>
            {esJuridica && (perfil.contactos || []).map((c, i) => (
              <div key={i}>
                <Row label={`Representante${perfil.contactos.length > 1 ? ` ${i + 1}` : ''}`}>
                  {c.nombre}{c.cargo ? ` · ${c.cargo}` : ''}
                </Row>
                <Row label="Email rep.">
                  <CopyableValue value={c.email}>{c.email || '—'}</CopyableValue>
                </Row>
              </div>
            ))}
            {esJuridica && (perfil.contactos || []).length === 0 && (
              <Row label="Representante">Sin registrar</Row>
            )}
          </div>
        </div>

        {usuariosCuenta && (
          <div className="ct-resumen-card">
            <p className="ct-resumen-card-title">
              <Icon d={['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75']} color="var(--violet-bright)" w={14} />
              Cuentas de Usuario
            </p>
            <div className="ct-resumen-dates">
              {usuariosCuenta.length === 0 ? (
                <Row label="Acceso">Sin cuentas registradas</Row>
              ) : usuariosCuenta.map((u) => (
                <Row key={u.id} label={u.username}>
                  {u.last_login ? fmtDateTime(u.last_login) : 'Nunca ingresó'}{' '}
                  <span className={`cw-pill ${u.is_active ? 'ok' : 'danger'}`}>
                    {u.is_active ? 'Activa' : 'Desactivada'}
                  </span>
                </Row>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="ct-resumen-card">
        <p className="ct-resumen-card-title">
          <Icon d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6']} color="var(--primary)" w={14} />
          Contratos ({contratos.length})
        </p>
        {contratos.length === 0 ? (
          <p className="cw-empty">Este cliente aún no tiene contratos</p>
        ) : (
          <div className="cw-table-wrap">
            <table className="cw-table">
              <thead>
                <tr>
                  <th>Contrato</th><th>Software</th><th>Estado</th><th>Monto</th>
                  <th>Inicio</th><th>Vencimiento</th>
                </tr>
              </thead>
              <tbody>
                {contratos.map((c) => (
                  <tr key={c.id}>
                    <td><Link to={`/contratos/${c.id}`}>{contratoIdDisplay(c.id)}</Link></td>
                    <td>{c.software}</td>
                    <td><span className={`cw-pill ${STATUS_PILL[c.status] || ''}`}>{c.status}</span></td>
                    <td>{fmtMoney(c.monto)}</td>
                    <td>{fmtDate(c.fecha_inicio)}</td>
                    <td>{fmtDate(c.fecha_vencimiento)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="ct-resumen-card">
        <p className="ct-resumen-card-title">
          <Icon d={['M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', 'M12 9v4', 'M12 17h.01']} color="var(--warning-bright)" w={14} />
          Incidencias Recientes
        </p>
        <div className="ct-resumen-dates">
          {incidencias.length === 0 ? (
            <p className="cw-empty">Sin incidencias</p>
          ) : incidencias.map((i) => (
            <Row key={i.id} label={`#${i.id} · ${fmtDate(i.fecha_creacion)}`}>
              {i.titulo}{' '}
              <span className={`cw-pill ${i.estado === 'ABIERTO' ? 'warn' : ''}`}>{i.estado}</span>
            </Row>
          ))}
        </div>
      </div>
    </div>
  );
}
