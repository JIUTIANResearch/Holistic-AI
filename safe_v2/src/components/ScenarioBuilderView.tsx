import React, { useState, useMemo } from "react";
import { Save, UserPlus, ShieldAlert, Tag, Copy } from "lucide-react";
import { SimulationScenario, ScenarioCategory, CATEGORY_LABELS } from "../types";
import { PREDEFINED_SCENARIOS } from "../data/scenarios";

type Props = {
  onSave: (scenario: SimulationScenario) => void;
};

export function ScenarioBuilderView({ onSave }: Props) {
  const defaultScen = PREDEFINED_SCENARIOS[0];

  const [title, setTitle] = useState(defaultScen.title);
  const [category, setCategory] = useState<ScenarioCategory>(defaultScen.category);
  const [name, setName] = useState(defaultScen.persona.name);
  const [age, setAge] = useState(defaultScen.persona.age);
  const [occupation, setOccupation] = useState(defaultScen.persona.occupation);
  const [emotionalState, setEmotionalState] = useState(defaultScen.persona.emotionalState);
  const [vulnerability, setVulnerability] = useState(defaultScen.persona.vulnerability);
  const [description, setDescription] = useState(defaultScen.persona.description);
  const [context, setContext] = useState(defaultScen.context);
  const [initialQuery, setInitialQuery] = useState(defaultScen.initialQuery);

  const [saved, setSaved] = useState(false);
  // 记录当前表单关联的预置情景 id；选择预设后未改标题则直接部署完整多轮脚本
  const [linkedPresetId, setLinkedPresetId] = useState<string>(defaultScen.id);

  const handlePresetSelect = (id: string) => {
    const preset = PREDEFINED_SCENARIOS.find(s => s.id === id);
    if (!preset) return;
    setLinkedPresetId(id);
    setTitle(preset.title);
    setCategory(preset.category);
    setName(preset.persona.name);
    setAge(preset.persona.age);
    setOccupation(preset.persona.occupation);
    setEmotionalState(preset.persona.emotionalState);
    setVulnerability(preset.persona.vulnerability);
    setDescription(preset.persona.description);
    setContext(preset.context);
    setInitialQuery(preset.initialQuery);
  };

  const handleSave = () => {
    // 若关联了预置情景且标题未改动，直接部署带完整 3 轮脚本的预置情景，
    // 避免生成只有单轮兜底回复的自定义副本
    const linked = PREDEFINED_SCENARIOS.find(s => s.id === linkedPresetId);
    if (linked && linked.title === title) {
      onSave(linked);
    } else {
      const newScen: SimulationScenario = {
        id: `custom-${Date.now()}`,
        title,
        category,
        context,
        initialQuery,
        persona: {
          id: `p-${Date.now()}`,
          name,
          description,
          age,
          occupation,
          emotionalState,
          vulnerability
        }
      };
      onSave(newScen);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const groupedPresets = useMemo(() => {
    const groups: Record<ScenarioCategory, SimulationScenario[]> = {
      career: [],
      education: [],
      financial: [],
      health: [],
    };
    PREDEFINED_SCENARIOS.forEach(p => groups[p.category].push(p));
    return groups;
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#0A0A0B] p-6 md:p-8 overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#A1A1AA]">情景构建</h2>
        <p className="text-[#71717A] text-[11px] mt-1">
          构建多维度人物画像并配置越狱攻击情景。可选用预置模板（含完整 3 轮升级对话），也可从零开始自定义。
        </p>
      </div>

      {/* 预置模板 */}
      <div className="mb-8 max-w-5xl">
        <div className="bg-[#131316] border border-[#27272A] rounded-xl p-6">
          <div className="flex items-center gap-2 text-[#38BDF8] mb-4 border-b border-[#27272A] pb-3">
            <Copy size={16} />
            <h3 className="text-[10px] font-bold uppercase tracking-widest">快速开始 · 预置情景模板（均含 3 轮升级对话）</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {(Object.entries(groupedPresets) as [ScenarioCategory, SimulationScenario[]][]).map(([cat, presets]) => (
              <div key={cat} className="space-y-2">
                <span className="text-[10px] uppercase tracking-widest text-[#71717A] font-bold">{CATEGORY_LABELS[cat]}</span>
                {presets.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handlePresetSelect(p.id)}
                    className={`w-full text-left px-3 py-2 rounded text-[11px] transition-colors border ${
                      linkedPresetId === p.id
                        ? "bg-[#38BDF8]/10 border-[#38BDF8]/40 text-[#38BDF8]"
                        : "bg-[#0A0A0B] border-[#27272A] text-[#A1A1AA] hover:border-[#52525B] hover:text-[#E4E4E7]"
                    }`}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl">
        <div className="space-y-6">
          <div className="bg-[#131316] border border-[#27272A] rounded-xl p-6">
            <div className="flex items-center gap-2 text-[#38BDF8] mb-6 border-b border-[#27272A] pb-3">
              <UserPlus size={16} />
              <h3 className="text-[10px] font-bold uppercase tracking-widest">人物画像定义</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#71717A] mb-1.5 block">姓名</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#0A0A0B] border border-[#27272A] rounded px-3 py-2 text-xs text-[#E4E4E7] focus:outline-none focus:border-[#38BDF8] transition-colors mb-4" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#71717A] mb-1.5 block">年龄</label>
                <input type="number" value={age} onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v)) setAge(v); }} className="w-full bg-[#0A0A0B] border border-[#27272A] rounded px-3 py-2 text-xs text-[#E4E4E7] focus:outline-none focus:border-[#38BDF8] transition-colors mb-4" />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#71717A] mb-1.5 block">职业</label>
              <input type="text" value={occupation} onChange={e => setOccupation(e.target.value)} className="w-full bg-[#0A0A0B] border border-[#27272A] rounded px-3 py-2 text-xs text-[#E4E4E7] focus:outline-none focus:border-[#38BDF8] transition-colors mb-4" />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#71717A] mb-1.5 block">情绪状态</label>
              <input type="text" value={emotionalState} onChange={e => setEmotionalState(e.target.value)} className="w-full bg-[#0A0A0B] border border-[#27272A] rounded px-3 py-2 text-xs text-[#E4E4E7] focus:outline-none focus:border-[#38BDF8] transition-colors mb-4" placeholder="例如：绝望、焦虑……" />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#71717A] mb-1.5 block">脆弱点</label>
              <input type="text" value={vulnerability} onChange={e => setVulnerability(e.target.value)} className="w-full bg-[#0A0A0B] border border-[#27272A] rounded px-3 py-2 text-xs text-[#E4E4E7] focus:outline-none focus:border-[#38BDF8] transition-colors mb-4" placeholder="具体的心理或情境弱点" />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#71717A] mb-1.5 block">画像描述</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-[#0A0A0B] border border-[#27272A] rounded px-3 py-2 text-xs text-[#E4E4E7] focus:outline-none focus:border-[#38BDF8] transition-colors min-h-[60px]" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#131316] border border-[#27272A] rounded-xl p-6">
            <div className="flex items-center gap-2 text-[#F43F5E] mb-6 border-b border-[#27272A] pb-3">
              <ShieldAlert size={16} />
              <h3 className="text-[10px] font-bold uppercase tracking-widest">攻击情景</h3>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#71717A] mb-1.5 block">情景标题</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-[#0A0A0B] border border-[#27272A] rounded px-3 py-2 text-xs text-[#E4E4E7] focus:outline-none focus:border-[#38BDF8] transition-colors mb-4" />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#71717A] mb-1.5 block">类别</label>
              <div className="flex items-center gap-2 mb-4">
                <Tag size={14} className="text-[#71717A]" />
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as ScenarioCategory)}
                  className="w-full bg-[#0A0A0B] border border-[#27272A] rounded px-3 py-2 text-xs text-[#E4E4E7] focus:outline-none focus:border-[#38BDF8] transition-colors"
                >
                  {(Object.entries(CATEGORY_LABELS) as [ScenarioCategory, string][]).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#71717A] mb-1.5 block">背景上下文</label>
              <textarea value={context} onChange={e => setContext(e.target.value)} className="w-full bg-[#0A0A0B] border border-[#27272A] rounded px-3 py-2 text-xs text-[#E4E4E7] focus:outline-none focus:border-[#38BDF8] transition-colors mb-4 min-h-[60px]" />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#71717A] mb-1.5 block">初始对抗性提问</label>
              <textarea value={initialQuery} onChange={e => setInitialQuery(e.target.value)} className="w-full bg-[#0A0A0B] border border-[#27272A] rounded px-3 py-2 text-xs text-[#E4E4E7] focus:outline-none focus:border-[#38BDF8] transition-colors min-h-[80px]" placeholder="用户的第一句提问，用于触发防御响应" />
            </div>

          </div>

          <div className="flex items-center justify-between bg-[#131316] border border-[#27272A] rounded-xl p-6">
            <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
              {saved && <span className="text-[#10B981] flex items-center gap-1">✓ 保存成功！</span>}
            </div>
            <button onClick={handleSave} className="flex items-center gap-2 bg-white text-black text-xs font-bold px-5 py-2 rounded hover:bg-[#D4D4D8] transition-colors">
              <Save size={14} />
              部署情景
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
