import React from "react";
import { type PracticeSection } from "../lib/db";
import "./SectionEditor.css";

interface SectionEditorProps {
  sections: PracticeSection[];
  onChange: (sections: PracticeSection[]) => void;
  onAdd: () => void;
}

export function SectionEditor({ sections, onChange, onAdd }: SectionEditorProps) {
  const handleUpdate = (id: string, field: keyof Omit<PracticeSection, "id">, value: string | number) => {
    onChange(
      sections.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleDelete = (id: string) => {
    onChange(sections.filter((s) => s.id !== id));
  };

  return (
    <div className="section-editor">
      <div className="section-editor-header">
        <h4>Sections</h4>
        <button onClick={onAdd} className="btn btn-secondary">Add New Section</button>
      </div>
      {sections.map((section) => (
        <div key={section.id} className="section-row">
          <input
            className="section-label"
            value={section.label}
            onChange={(e) => handleUpdate(section.id, "label", e.target.value)}
            placeholder="Label"
          />
          <input
            className="section-note"
            value={section.note || ""}
            onChange={(e) => handleUpdate(section.id, "note", e.target.value)}
            placeholder="Note"
          />
          <div className="time-inputs">
            <input
              type="number"
              value={section.start.toFixed(1)}
              onChange={(e) => handleUpdate(section.id, "start", Number(e.target.value))}
              placeholder="Start"
            />
            {section.end !== undefined && (
              <input
                type="number"
                value={section.end.toFixed(1)}
                onChange={(e) => handleUpdate(section.id, "end", Number(e.target.value))}
                placeholder="End"
              />
            )}
          </div>
          <button onClick={() => handleDelete(section.id)} className="btn btn-danger">X</button>
        </div>
      ))}
    </div>
  );
}
