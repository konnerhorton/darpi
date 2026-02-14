import axios from 'axios';
import type { Register, Risk, Mitigation, CellComment, CommentCount, MitigationCommentCount } from '../types';

const api = axios.create({ baseURL: '/api/v1' });

// Registers
export const listRegisters = () =>
  api.get<Register[]>('/registers').then(r => r.data);

export const createRegister = (name: string) =>
  api.post<Register>('/registers', { name }).then(r => r.data);

export const updateRegister = (id: string, data: Partial<Register>) =>
  api.patch<Register>(`/registers/${id}`, data).then(r => r.data);

// Risks
export const listRisks = (registerId: string) =>
  api.get<Risk[]>(`/registers/${registerId}/risks`).then(r => r.data);

export const createRisk = (registerId: string, data?: Partial<Risk>) =>
  api.post<Risk>(`/registers/${registerId}/risks`, data ?? {}).then(r => r.data);

export const updateRisk = (id: string, data: Partial<Risk>) =>
  api.patch<Risk>(`/risks/${id}`, data).then(r => r.data);

export const deleteRisk = (id: string) =>
  api.delete(`/risks/${id}`);

// Comments
export const listComments = (riskId: string, columnKey?: string) => {
  const params = columnKey ? { column_key: columnKey } : {};
  return api.get<CellComment[]>(`/risks/${riskId}/comments`, { params }).then(r => r.data);
};

export const getCommentCounts = (registerId: string) =>
  api.get<CommentCount[]>(`/registers/${registerId}/comments/counts`).then(r => r.data);

export const createComment = (riskId: string, data: {
  column_key: string;
  author_name: string;
  content: string;
  proposed_value?: string | null;
}) =>
  api.post<CellComment>(`/risks/${riskId}/comments`, data).then(r => r.data);

export const acceptProposal = (commentId: string) =>
  api.post<CellComment>(`/comments/${commentId}/accept`).then(r => r.data);

export const rejectProposal = (commentId: string) =>
  api.post<CellComment>(`/comments/${commentId}/reject`).then(r => r.data);

// Mitigations
export const listMitigations = (registerId: string) =>
  api.get<Mitigation[]>(`/registers/${registerId}/mitigations`).then(r => r.data);

export const createMitigation = (registerId: string, data?: Partial<Mitigation>) =>
  api.post<Mitigation>(`/registers/${registerId}/mitigations`, data ?? {}).then(r => r.data);

export const updateMitigation = (id: string, data: Partial<Mitigation>) =>
  api.patch<Mitigation>(`/mitigations/${id}`, data).then(r => r.data);

export const deleteMitigation = (id: string) =>
  api.delete(`/mitigations/${id}`);

export const linkRisk = (mitigationId: string, riskId: string) =>
  api.post(`/mitigations/${mitigationId}/risks/${riskId}`);

export const unlinkRisk = (mitigationId: string, riskId: string) =>
  api.delete(`/mitigations/${mitigationId}/risks/${riskId}`);

export const listMitigationComments = (mitigationId: string, columnKey?: string) => {
  const params = columnKey ? { column_key: columnKey } : {};
  return api.get<CellComment[]>(`/mitigations/${mitigationId}/comments`, { params }).then(r => r.data);
};

export const createMitigationComment = (mitigationId: string, data: {
  column_key: string;
  author_name: string;
  content: string;
}) =>
  api.post<CellComment>(`/mitigations/${mitigationId}/comments`, data).then(r => r.data);

export const getMitigationCommentCounts = (registerId: string) =>
  api.get<MitigationCommentCount[]>(`/registers/${registerId}/mitigations/comments/counts`).then(r => r.data);

// Analysis
export const runMonteCarlo = (registerId: string, iterations?: number) =>
  api.get(`/registers/${registerId}/analysis/monte-carlo`, { params: iterations ? { iterations } : {} }).then(r => r.data);

export const getAnalysisSummary = (registerId: string) =>
  api.get(`/registers/${registerId}/analysis/summary`).then(r => r.data);
