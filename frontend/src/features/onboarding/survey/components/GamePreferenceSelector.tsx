import { SurveyGameOption } from '../constants';

interface GamePreferenceSelectorProps {
  options: SurveyGameOption[];
  selectedGames: string[];
  onToggle: (game: string) => void;
  exclusiveNote?: string;
}

const GamePreferenceSelector = ({
  options,
  selectedGames,
  onToggle,
  exclusiveNote = '선택 시 탈락',
}: GamePreferenceSelectorProps) => {
  const categories = Array.from(new Set(options.map(option => option.category)));

  return (
    <div className="chip-grid">
      {categories.map(category => (
        <div key={category} className="chip-group">
          <p className="hint-text">[{category}]</p>
          <div className="chip-grid">
            {options
              .filter(option => option.category === category)
              .map(option => {
                const isSelected = selectedGames.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`chip ${isSelected ? 'selected' : ''}`}
                    onClick={() => onToggle(option.value)}
                  >
                    {option.label}
                    {option.exclusive && <span className="chip-note">{exclusiveNote}</span>}
                    {option.requiresDetail && (
                      <span className="chip-note">주력 FPS 직접 기재</span>
                    )}
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default GamePreferenceSelector;
