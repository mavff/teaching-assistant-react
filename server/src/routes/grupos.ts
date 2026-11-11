import { NextFunction, Request, Response, Router } from 'express';
import { DomainError } from '../models/DomainError';
import {
  MOTIVO_ACUMULO, MOTIVO_ALOCACAO, MOTIVO_AVISO, MOTIVO_ENTRADA, MOTIVO_REMOCAO, MOTIVO_SAIDA, Services
} from '../models/Services';
import { Notificacao } from '../models/Notificacao';

const TIPOS: Record<string, string> = {
  [MOTIVO_ALOCACAO]: 'alocacao',
  [MOTIVO_AVISO]: 'aviso',
  [MOTIVO_SAIDA]: 'saida',
  [MOTIVO_ENTRADA]: 'entrada',
  [MOTIVO_REMOCAO]: 'remocao',
  [MOTIVO_ACUMULO]: 'acumulo'
};

/** Representação de uma Notificacao exposta pela API. */
const paraJson = (n: Notificacao) => ({
  id: n.id,
  grupo: n.grupoRegistrado,
  destinatario: n.nomeDestinatario,
  tipo: TIPOS[n.motivo] ?? n.motivo,
  mensagem: n.motivo,
  resultado: n.resultado,
  descricaoFalha: n.descricaoFalha
});

/**
 * Runs a handler and reports a violated business rule (DomainError) as 400 with
 * the message shown to the user, like the other routes of the server; anything
 * else is a failure of the server itself (500).
 */
const tratar = (handler: (req: Request, res: Response) => void) =>
  (req: Request, res: Response, _next: NextFunction) => {
    try {
      handler(req, res);
    } catch (error) {
      if (error instanceof DomainError) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };

/**
 * Routes for groups, monitors and the notifications sent when the composition
 * of a group changes. Mounted at /api.
 *
 * The rules live in Services; a violated rule is raised as DomainError and
 * reported by `tratar` as 400.
 */
export function grupoRoutes(services: Services): Router {
  const router = Router();

  router.get('/grupos', tratar((req, res) => {
    res.json(services.grupos.listar().map(g => g.toJSON()));
  }));

  router.post('/grupos', tratar((req, res) => {
    res.status(201).json(services.criarGrupo(req.body.nome, req.body.alunos).toJSON());
  }));

  router.post('/monitores', tratar((req, res) => {
    services.cadastrarMonitor(req.body.login);
    res.status(201).json({ login: req.body.login });
  }));

  // Lists the monitors that are not allocated to any group
  router.get('/monitores', tratar((req, res) => {
    res.json(services.monitoresDisponiveis());
  }));

  router.post('/grupos/:nome/monitor', tratar((req, res) => {
    res.status(201).json(services.alocarMonitor(req.params.nome, req.body.monitor).toJSON());
  }));

  // Lista de monitores da disciplina, com a situação de cada um
  router.get('/monitores/situacao', tratar((req, res) => {
    res.json(services.situacaoDosMonitores());
  }));

  router.post('/grupos/:nome/alocacao-automatica', tratar((req, res) => {
    res.status(201).json(services.alocarAutomaticamente(req.params.nome).toJSON());
  }));

  router.delete('/grupos/:nome/monitor', tratar((req, res) => {
    res.json(services.removerMonitor(req.params.nome).toJSON());
  }));

  router.post('/grupos/:nome/realocar-monitor', tratar((req, res) => {
    res.status(201).json(
      services.realocarMonitor(req.params.nome, req.body.monitor, req.body.destino).toJSON());
  }));

  router.post('/grupos/:nome/alunos', tratar((req, res) => {
    res.status(201).json(services.adicionarAluno(req.params.nome, req.body.aluno).toJSON());
  }));

  router.get('/grupos/:nome/notificacoes', tratar((req, res) => {
    res.json(services.consultarHistorico(req.params.nome).map(paraJson));
  }));

  router.get('/notificacoes', tratar((req, res) => {
    res.json(services.consultarHistorico().map(paraJson));
  }));

  // Endpoints used only by the automated tests to isolate scenarios
  if (process.env.NODE_ENV !== 'production') {
    router.post('/test/reset', (req, res) => {
      services.grupos.limpar();
      services.monitores.limpar();
      services.historico.limpar();
      res.status(204).send();
    });
    router.post('/test/reset-notificacoes', (req, res) => {
      services.historico.limpar();
      res.status(204).send();
    });
    router.post('/test/reset-monitores', (req, res) => {
      services.monitores.limpar();
      res.status(204).send();
    });
  }

  return router;
}
