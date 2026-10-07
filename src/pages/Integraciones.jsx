import React, { useState, useEffect, useCallback } from 'react';
import { 
  Key, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Cpu, 
  ShieldCheck, 
  Terminal, 
  FileCode2, 
  AlertCircle,
  Clock,
  UserCheck
} from 'lucide-react';
import SEO from '../components/SEO';
import TopbarActions from '../components/layout/TopbarActions';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { getMcpToken, regenerateMcpToken } from '../api';
import './Integraciones.css';

export default function Integraciones() {
  const { user } = useAuth();
  const { confirm } = useConfirm();

  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('json');

  const fetchToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMcpToken();
      setTokenData(data);
    } catch (err) {
      setError(err.message || 'Error al obtener el token MCP');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  const handleCopy = async (text, setCopiedState) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    const ok = await confirm({
      title: '¿Regenerar Token MCP?',
      message: 'Si regeneras tu token, cualquier agente o integración externa que esté usando el token actual dejará de funcionar hasta que actualices la configuración con el nuevo token.',
      isDangerous: true,
    });

    if (!ok) return;

    setRegenerating(true);
    try {
      const updated = await regenerateMcpToken();
      setTokenData(updated);
      setRevealed(true);
    } catch (err) {
      alert(`Error al regenerar token: ${err.message || 'Error desconocido'}`);
    } finally {
      setRegenerating(false);
    }
  };

  const currentToken = tokenData?.token || '';
  const maskedToken = currentToken
    ? `${currentToken.slice(0, 10)}${'•'.repeat(Math.max(12, currentToken.length - 14))}${currentToken.slice(-4)}`
    : '••••••••••••••••••••••••••••••••••••';

  const jsonSnippet = `{
  "mcpServers": {
    "clm": {
      "command": "python3",
      "args": [
        "/grivyzom/webs/CLM/core/mcp_server.py"
      ],
      "env": {
        "MCP_TOKEN": "${currentToken || '<TU_TOKEN_MCP>'}"
      }
    }
  }
}`;

  const cliSnippet = `claude mcp add clm --env MCP_TOKEN=${currentToken || '<TU_TOKEN_MCP>'} -- python3 /grivyzom/webs/CLM/core/mcp_server.py`;

  return (
    <div className="integraciones-container fade-in">
      <SEO 
        title="Integraciones | KyoCLM" 
        description="Gestión de token de conexión MCP para agentes de inteligencia artificial y herramientas externas." 
      />

      {/* Header Sticky */}
      <div className="integraciones-header glass-panel">
        <div className="integraciones-header-left">
          <div className="integraciones-header-icon-wrap">
            <Cpu size={24} color="var(--primary)" />
          </div>
          <div>
            <p className="integraciones-header-label">CONECTIVIDAD EXTERNA</p>
            <h1 className="integraciones-header-title">Integraciones</h1>
          </div>
        </div>
        <TopbarActions />
      </div>

      {/* Único componente UI: Card de Conexión y Token MCP */}
      <div className="integraciones-content">
        <div className="mcp-card glass-panel">
          {/* Card Header */}
          <div className="mcp-card-header">
            <div className="mcp-card-title-group">
              <div className="mcp-badge-protocol">
                <span className="mcp-badge-dot" />
                <span>Protocolo MCP</span>
              </div>
              <h2 className="mcp-card-title">Token de Conexión MCP</h2>
              <p className="mcp-card-desc">
                Conecta agentes de inteligencia artificial (Claude Desktop, Cursor, Windsurf, Cline o Claude Code) a tu cuenta de KyoCLM mediante el servidor Model Context Protocol.
              </p>
            </div>
            <div className="mcp-status-pill">
              <ShieldCheck size={14} className="mcp-status-icon" />
              <span>Autenticación Segura</span>
            </div>
          </div>

          {loading ? (
            <div className="mcp-loading-state">
              <RefreshCw size={24} className="spin-icon" />
              <p>Obteniendo tu token personal de MCP...</p>
            </div>
          ) : error ? (
            <div className="mcp-error-state">
              <AlertCircle size={24} color="var(--danger, #ef4444)" />
              <p className="mcp-error-text">{error}</p>
              <button className="mcp-btn-secondary" onClick={fetchToken}>
                Reintentar
              </button>
            </div>
          ) : (
            <div className="mcp-card-body">
              {/* Token Box */}
              <div className="mcp-token-section">
                <div className="mcp-section-label-row">
                  <label htmlFor="mcp-token-input" className="mcp-section-label">
                    <Key size={14} />
                    <span>Tu Token Personal</span>
                  </label>
                  <span className="mcp-security-note">
                    Mantén este token privado. Otorga acceso a las operaciones permitidas para tu usuario.
                  </span>
                </div>

                <div className="mcp-token-display-box">
                  <div className="mcp-token-text-container">
                    <input
                      id="mcp-token-input"
                      type="text"
                      readOnly
                      value={revealed ? currentToken : maskedToken}
                      className="mcp-token-input"
                      aria-label="Token personal MCP"
                      spellCheck={false}
                    />
                  </div>

                  <div className="mcp-token-actions">
                    <button
                      type="button"
                      className="mcp-action-btn"
                      onClick={() => setRevealed(!revealed)}
                      title={revealed ? 'Ocultar token' : 'Revelar token'}
                    >
                      {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
                      <span>{revealed ? 'Ocultar' : 'Mostrar'}</span>
                    </button>

                    <button
                      type="button"
                      className={`mcp-action-btn mcp-copy-btn ${copiedToken ? 'copied' : ''}`}
                      onClick={() => handleCopy(currentToken, setCopiedToken)}
                      title="Copiar token al portapapeles"
                    >
                      {copiedToken ? <Check size={16} /> : <Copy size={16} />}
                      <span>{copiedToken ? '¡Copiado!' : 'Copiar Token'}</span>
                    </button>

                    <button
                      type="button"
                      className="mcp-action-btn mcp-btn-danger"
                      onClick={handleRegenerate}
                      disabled={regenerating}
                      title="Generar un nuevo token e invalidar el anterior"
                    >
                      <RefreshCw size={15} className={regenerating ? 'spin-icon' : ''} />
                      <span>{regenerating ? 'Regenerando...' : 'Regenerar'}</span>
                    </button>
                  </div>
                </div>

                {/* Metadata Row */}
                <div className="mcp-metadata-row">
                  <div className="mcp-meta-item">
                    <UserCheck size={13} />
                    <span>Usuario: <strong>{tokenData?.username || user?.name || user?.username}</strong></span>
                  </div>
                  {tokenData?.created_at && (
                    <div className="mcp-meta-item">
                      <Clock size={13} />
                      <span>
                        Generado: {new Date(tokenData.created_at).toLocaleDateString('es-CL', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                  <div className="mcp-meta-item">
                    <ShieldCheck size={13} />
                    <span>
                      Último uso:{' '}
                      {tokenData?.last_used_at
                        ? new Date(tokenData.last_used_at).toLocaleString('es-CL', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Nunca'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Guía de Configuración Rápida */}
              <div className="mcp-setup-section">
                <div className="mcp-setup-header">
                  <h3 className="mcp-setup-title">Configuración para tu Agente</h3>
                  <div className="mcp-tabs">
                    <button
                      type="button"
                      className={`mcp-tab-btn ${activeTab === 'json' ? 'active' : ''}`}
                      onClick={() => setActiveTab('json')}
                    >
                      <FileCode2 size={14} />
                      <span>JSON (Cursor / Claude Desktop)</span>
                    </button>
                    <button
                      type="button"
                      className={`mcp-tab-btn ${activeTab === 'cli' ? 'active' : ''}`}
                      onClick={() => setActiveTab('cli')}
                    >
                      <Terminal size={14} />
                      <span>CLI (Claude Code)</span>
                    </button>
                  </div>
                </div>

                {activeTab === 'json' ? (
                  <div className="mcp-code-block-wrapper">
                    <div className="mcp-code-block-header">
                      <span className="mcp-code-filename">claude_desktop_config.json / .cursor/mcp.json</span>
                      <button
                        type="button"
                        className="mcp-code-copy-btn"
                        onClick={() => handleCopy(jsonSnippet, setCopiedConfig)}
                      >
                        {copiedConfig ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedConfig ? '¡Copiado!' : 'Copiar JSON'}</span>
                      </button>
                    </div>
                    <pre className="mcp-code-pre">
                      <code>{jsonSnippet}</code>
                    </pre>
                  </div>
                ) : (
                  <div className="mcp-code-block-wrapper">
                    <div className="mcp-code-block-header">
                      <span className="mcp-code-filename">Terminal / Bash</span>
                      <button
                        type="button"
                        className="mcp-code-copy-btn"
                        onClick={() => handleCopy(cliSnippet, setCopiedCli)}
                      >
                        {copiedCli ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedCli ? '¡Copiado!' : 'Copiar comando'}</span>
                      </button>
                    </div>
                    <pre className="mcp-code-pre">
                      <code>{cliSnippet}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
