import axios from 'axios';
import type { Register, Risk } from '../types';

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
