import React, { useState, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";
import { SimulationView } from "./components/SimulationView";
import { PathView } from "./components/PathView";
import { EvaluationView } from "./components/EvaluationView";
import { ScenarioBuilderView } from "./components/ScenarioBuilderView";
import { PREDEFINED_SCENARIOS } from "./data/scenarios";
import { SimulationScenario, Message } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState("scenario");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [customScenarios, setCustomScenarios] = useState<SimulationScenario[]>([]);
  const [simulationTrace, setSimulationTrace] = useState<Message[]>([]);
  const [traceHistory, setTraceHistory] = useState<Map<string, Message[]>>(new Map());
  const scenarios = [...PREDEFINED_SCENARIOS, ...customScenarios];

  const [activeScenarioId, setActiveScenarioId] = useState<string>(PREDEFINED_SCENARIOS[0].id);

  const activeScenario = scenarios.find(s => s.id === activeScenarioId) || scenarios[0];

  const handleAddScenario = (newScen: SimulationScenario) => {
    const matchingPreset = PREDEFINED_SCENARIOS.find(s => s.id === newScen.id || s.title === newScen.title);
    if (matchingPreset) {
      setActiveScenarioId(matchingPreset.id);
    } else {
      setCustomScenarios(prev => [...prev, newScen]);
      setActiveScenarioId(newScen.id);
    }
    setSimulationTrace([]);
    setActiveTab("simulation");
  };

  const handleTraceUpdate = useCallback((msgs: Message[]) => {
    setSimulationTrace(msgs);
    if (msgs.length > 0) {
      setTraceHistory(prev => {
        const next = new Map(prev);
        next.set(activeScenarioId, msgs);
        return next;
      });
    }
  }, [activeScenarioId]);

  return (
    <div className="flex h-screen bg-[#0A0A0B] text-[#E4E4E7] overflow-hidden font-sans selection:bg-[#38BDF8]/30">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <main className="flex-1 min-w-0 min-h-0 flex flex-col bg-[#0A0A0B] overflow-hidden">
        <div className={`flex-1 min-h-0 flex-col overflow-hidden ${activeTab === "simulation" ? "flex" : "hidden"}`}>
          <SimulationView scenarios={scenarios} activeScenario={activeScenario} onScenarioChange={setActiveScenarioId} onTraceUpdate={handleTraceUpdate} />
        </div>
        <div className={`flex-1 min-h-0 flex-col overflow-hidden ${activeTab === "path" ? "flex" : "hidden"}`}>
          <PathView trace={simulationTrace} activeScenario={activeScenario} />
        </div>
        <div className={`flex-1 min-h-0 flex-col overflow-hidden ${activeTab === "evaluation" ? "flex" : "hidden"}`}>
          <EvaluationView traceHistory={traceHistory} scenarios={scenarios} />
        </div>
        <div className={`flex-1 min-h-0 flex-col overflow-hidden ${activeTab === "scenario" ? "flex" : "hidden"}`}>
          <ScenarioBuilderView onSave={handleAddScenario} />
        </div>
      </main>
    </div>
  );
}
