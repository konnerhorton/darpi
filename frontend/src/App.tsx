import { useState, useEffect, useCallback } from 'react';
import Toolbar from './components/Toolbar';
import RegisterTable from './components/RegisterTable';
import * as api from './api/client';
import type { Register, Risk } from './types';

export default function App() {
  const [register, setRegister] = useState<Register | null>(null);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [activeTab, setActiveTab] = useState('Register');
  const [loading, setLoading] = useState(true);

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
        const riskData = await api.listRisks(reg.id);
        setRisks(riskData);
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
    // Optimistic update already applied by AG Grid's local row data mutation
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
      // Reload to revert
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
    // Optimistic update
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
            onCellChange={handleCellChange}
            onTriangularChange={handleTriangularChange}
            onClearTriangular={handleClearTriangular}
            onAddRow={handleAddRow}
            onDeleteRow={handleDeleteRow}
          />
        )}
        {activeTab === 'Mitigations' && (
          <div className="flex items-center justify-center h-full text-gray-400">
            Mitigations — coming in Phase 4
          </div>
        )}
        {activeTab === 'Analysis' && (
          <div className="flex items-center justify-center h-full text-gray-400">
            Analysis — coming in Phase 5
          </div>
        )}
      </div>
    </div>
  );
}
