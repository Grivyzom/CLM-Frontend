import TerminosCondicionesEditor, {
  normalizarTerminos, terminosDifieren, terminosParaEnviar,
} from '../catalogo/TerminosCondicionesEditor';

// Panel del workspace para ajustar el recuadro "Términos y condiciones" de
// ESTE contrato. `contrato.terminos_condiciones === null` = hereda los de la
// plantilla; guardar crea el override, "Restablecer" lo borra (PATCH null).
// El borrador sin guardar (`draft`) vive en ContractDetail para que la vista
// previa en vivo lo pueda usar.
export default function TerminosContratoPanel({
  contrato, terminosPlantilla, draft, setDraft, busy, onGuardar, onRestablecer,
}) {
  const personalizados = contrato.terminos_condiciones != null;
  const guardados = personalizados ? contrato.terminos_condiciones : terminosPlantilla;
  const valor = draft ?? normalizarTerminos(guardados);
  const sucio = draft != null && terminosDifieren(draft, guardados);

  return (
    <aside className="ct-cl-panel" aria-label="Términos y condiciones" style={{ marginTop: 0, flex: 'none', overflow: 'visible' }}>
      <div className="ct-cl-head">
        <div>
          <p className="ct-cl-title">Términos y condiciones</p>
          <p className="ct-cl-sub">
            Recuadro al final del documento: qué está contemplado y qué no.
          </p>
        </div>
        <span className={`ct-cl-badge${personalizados ? ' ct-cl-riesgo-medio' : ''}`}>
          {personalizados ? 'Personalizados' : 'De la plantilla'}
        </span>
      </div>

      <div className="ct-campos-panel-body">
        <TerminosCondicionesEditor
          value={valor}
          onChange={setDraft}
          disabled={busy}
          descripcion={personalizados
            ? 'Este contrato usa términos propios; los cambios en la plantilla ya no lo afectan.'
            : 'Heredados de la plantilla. Al guardar un cambio, este contrato pasa a tener términos propios.'}
        />

        {(sucio || personalizados) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {sucio && (
              <>
                <button type="button" className="ct-btn-primary" disabled={busy}
                  onClick={() => onGuardar(terminosParaEnviar(draft))}>
                  Guardar términos
                </button>
                <button type="button" className="ct-btn-secondary" disabled={busy}
                  onClick={() => setDraft(null)}>
                  Descartar cambios
                </button>
              </>
            )}
            {personalizados && !sucio && (
              <button type="button" className="ct-btn-secondary" disabled={busy} onClick={onRestablecer}>
                Restablecer a los de la plantilla
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
