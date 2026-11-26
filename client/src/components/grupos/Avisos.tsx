import React from 'react';

interface AvisosProps {
  erro: string;
  sucesso: string;
  onFecharErro: () => void;
}

/** Avisos fixos no canto da janela: visíveis em qualquer ponto da rolagem. */
const Avisos: React.FC<AvisosProps> = ({ erro, sucesso, onFecharErro }) => (
  <div className="gp-avisos">
    {erro && (
      <div className="gp-aviso gp-aviso--erro" role="alert">
        <span className="gp-aviso-texto" data-cy="mensagem-erro">{erro}</span>
        <button
          type="button"
          className="gp-aviso-fechar"
          aria-label="Close message"
          onClick={onFecharErro}
        >×</button>
      </div>
    )}
    {sucesso && (
      <div className="gp-aviso gp-aviso--sucesso" role="status">
        <span className="gp-aviso-texto" data-cy="mensagem-sucesso">{sucesso}</span>
      </div>
    )}
  </div>
);

export default Avisos;
