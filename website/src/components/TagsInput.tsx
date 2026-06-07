import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";
import "./TagsInput.css";

type TagsInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
};

export function TagsInput({ value, onChange }: TagsInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !value.includes(newTag)) {
        onChange([...value, newTag]);
        setInputValue("");
      }
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="tags-input-container">
      {value.map((tag) => (
        <span key={tag} className="tag">
          {tag}
          <span className="tag-remove" onClick={() => removeTag(tag)}>
            <X size={14} />
          </span>
        </span>
      ))}
      <input
        type="text"
        className="tag-input"
        placeholder={value.length === 0 ? "Add tags..." : ""}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
