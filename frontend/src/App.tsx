import { useState, useEffect, useCallback } from 'react';
import Toolbar from './components/Toolbar';
import RegisterTable from './components/RegisterTable';
import MitigationTable from './components/MitigationTable';
import AnalysisView from './components/AnalysisView';
import * as api from './api/client';
import type { Register, Risk, Mitigation, CommentCount, MitigationCommentCount } from './types';

export default function App() {
  const [register, setRegister] = useState<Register | null>(null);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [mitigations, setMitigations] = useState<Mitigation[]>([]);
  const [commentCounts, setCommentCounts] = useState<CommentCount[]>([]);
  const [mitigationCommentCounts, setMitigationCommentCounts] = useState<MitigationCommentCount[]>([]);
  const [activeTab, setActiveTab] = useState('Register');
  const [loading, setLoading] = useState(true);

  const refreshCommentCounts = useCallback(async () => {
    if (!register) return;
    const counts = await api.getCommentCounts(register.id);
    setCommentCounts(counts);
  }, [register]);

  const refreshMitigationCommentCounts = useCallback(async () => {
    if (!register) return;
    const counts = await api.getMitigationCommentCounts(register.id);
    setMitigationCommentCounts(counts);
  }, [register]);

  // Bootstrap: load or create a register
  useEffect(() => {
    (async () => {
      try {
        const registers = await api.listRegisters();
        let reg: Register;
        if (registers.length > 0) {
          reg = registers[0];
        } else {
          reg = await api.createRegister('New Risk Register');
        }
        setRegister(reg);
        const [riskData, counts, mitData, mitCounts] = await Promise.all([
          api.listRisks(reg.id),
          api.getCommentCounts(reg.id),
          api.listMitigations(reg.id),
          api.getMitigationCommentCounts(reg.id),
        ]);
        setRisks(riskData);
        setCommentCounts(counts);
        setMitigations(mitData);
        setMitigationCommentCounts(mitCounts);
      } catch (err) {
        console.error('Failed to load register:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleNameChange = useCallback(async (name: string) => {
    if (!register) return;
    setRegister(prev => prev ? { ...prev, name } : prev);
    try {
      const updated = await api.updateRegister(register.id, { name });
      setRegister(updated);
    } catch {
      setRegister(prev => prev ? { ...prev, name: register.name } : prev);
    }
  }, [register]);

  const handleCellChange = useCallback(async (riskId: string, field: string, value: unknown) => {
    try {
      if (field === 'cost_single') {
        const risk = risks.find(r => r.id === riskId);
        await api.updateRisk(riskId, {
          cost_single: risk?.cost_single,
          cost_min: null,
          cost_expected: null,
          cost_max: null,
        } as Partial<Risk>);
      } else {
        await api.updateRisk(riskId, { [field]: value } as Partial<Risk>);
      }
    } catch (err) {
      console.error('Failed to save:', err);
      if (register) {
        const fresh = await api.listRisks(register.id);
        setRisks(fresh);
      }
    }
  }, [register, risks]);

  const handleAddRow = useCallback(async () => {
    if (!register) return;
    try {
      const newRisk = await api.createRisk(register.id);
      setRisks(prev => [...prev, newRisk]);
    } catch (err) {
      console.error('Failed to add risk:', err);
    }
  }, [register]);

  const handleTriangularChange = useCallback(async (riskId: string, min: number, expected: number, max: number) => {
    setRisks(prev => prev.map(r =>
      r.id === riskId ? { ...r, cost_min: min, cost_expected: expected, cost_max: max, cost_single: null } : r
    ));
    try {
      await api.updateRisk(riskId, { cost_min: min, cost_expected: expected, cost_max: max, cost_single: null } as Partial<Risk>);
    } catch {
      if (register) {
        const fresh = await api.listRisks(register.id);
        setRisks(fresh);
      }
    }
  }, [register]);

  const handleClearTriangular = useCallback(async (riskId: string, singleValue: number) => {
    setRisks(prev => prev.map(r =>
      r.id === riskId ? { ...r, cost_single: singleValue, cost_min: null, cost_expected: null, cost_max: null } : r
    ));
    try {
      await api.updateRisk(riskId, { cost_single: singleValue, cost_min: null, cost_expected: null, cost_max: null } as Partial<Risk>);
    } catch {
      if (register) {
        const fresh = await api.listRisks(register.id);
        setRisks(fresh);
      }
    }
  }, [register]);

  const handleDeleteRow = useCallback(async (riskId: string) => {
    const prev = risks;
    setRisks(r => r.filter(risk => risk.id !== riskId));
    try {
      await api.deleteRisk(riskId);
    } catch {
      setRisks(prev);
    }
  }, [risks]);

  const handleRiskUpdated = useCallback((updatedRisk: Risk) => {
    setRisks(prev => prev.map(r => r.id === updatedRisk.id ? updatedRisk : r));
  }, []);

  // --- Mitigation handlers ---

  const handleMitigationCellChange = useCallback(async (mitigationId: string, field: string, value: unknown) => {
    try {
      const updated = await api.updateMitigation(mitigationId, { [field]: value } as Partial<Mitigation>);
      setMitigations(prev => prev.map(m => m.id === updated.id ? updated : m));
    } catch (err) {
      console.error('Failed to save mitigation:', err);
      if (register) {
        const fresh = await api.listMitigations(register.id);
        setMitigations(fresh);
      }
    }
  }, [register]);

  const handleAddMitigation = useCallback(async () => {
    if (!register) return;
    try {
      const newMit = await api.createMitigation(register.id);
      setMitigations(prev => [...prev, newMit]);
    } catch (err) {
      console.error('Failed to add mitigation:', err);
    }
  }, [register]);

  const handleDeleteMitigation = useCallback(async (mitigationId: string) => {
    const prev = mitigations;
    setMitigations(m => m.filter(mit => mit.id !== mitigationId));
    try {
      await api.deleteMitigation(mitigationId);
    } catch {
      setMitigations(prev);
    }
  }, [mitigations]);

  const handleLinkRisk = useCallback(async (mitigationId: string, riskId: string) => {
    setMitigations(prev => prev.map(m =>
      m.id === mitigationId ? { ...m, linked_risk_ids: [...m.linked_risk_ids, riskId] } : m
    ));
    try {
      await api.linkRisk(mitigationId, riskId);
    } catch {
      if (register) {
        const fresh = await api.listMitigations(register.id);
        setMitigations(fresh);
      }
    }
  }, [register]);

  const handleUnlinkRisk = useCallback(async (mitigationId: string, riskId: string) => {
    setMitigations(prev => prev.map(m =>
      m.id === mitigationId ? { ...m, linked_risk_ids: m.linked_risk_ids.filter(id => id !== riskId) } : m
    ));
    try {
      await api.unlinkRisk(mitigationId, riskId);
    } catch {
      if (register) {
        const fresh = await api.listMitigations(register.id);
        setMitigations(fresh);
      }
    }
  }, [register]);

  const handleNavigateToRisk = useCallback(() => {
    setActiveTab('Register');
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>;
  }

  if (!register) {
    return <div className="flex items-center justify-center h-full text-red-500">Failed to load register</div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <Toolbar
        registerName={register.name}
        onNameChange={handleNameChange}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <div className="flex-1 overflow-hidden">
        {activeTab === 'Register' && (
          <RegisterTable
            risks={risks}
            commentCounts={commentCounts}
            onCellChange={handleCellChange}
            onTriangularChange={handleTriangularChange}
            onClearTriangular={handleClearTriangular}
            onAddRow={handleAddRow}
            onDeleteRow={handleDeleteRow}
            onRiskUpdated={handleRiskUpdated}
            onRefreshCommentCounts={refreshCommentCounts}
          />
        )}
        {activeTab === 'Mitigations' && (
          <MitigationTable
            mitigations={mitigations}
            risks={risks}
            commentCounts={mitigationCommentCounts}
            onCellChange={handleMitigationCellChange}
            onAddRow={handleAddMitigation}
            onDeleteRow={handleDeleteMitigation}
            onLinkRisk={handleLinkRisk}
            onUnlinkRisk={handleUnlinkRisk}
            onNavigateToRisk={handleNavigateToRisk}
            onRefreshCommentCounts={refreshMitigationCommentCounts}
          />
        )}
        {activeTab === 'Analysis' && (
          <AnalysisView registerId={register.id} />
        )}
      </div>
    </div>
  );
}
