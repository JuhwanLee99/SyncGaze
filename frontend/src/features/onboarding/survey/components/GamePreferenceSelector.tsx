interface GamePreferenceSelectorProps {
  options: string[];
  selectedGames: string[];
  onToggle: (game: string) => void;
  exclusiveOption?: string;
  exclusiveNote?: string;
}

const GamePreferenceSelector = ({
  options,
  selectedGames,
  onToggle,
  exclusiveOption,
  exclusiveNote = '선택 시 탈락',
}: GamePreferenceSelectorProps) => {
  return (
    <div className="chip-grid">
      {options.map(game => {
        const isSelected = selectedGames.includes(game);
        const shouldShowNote = exclusiveOption && game === exclusiveOption;
        return (
          <button
            key={game}
            type="button"
            className={`chip ${isSelected ? 'selected' : ''}`}
            onClick={() => onToggle(game)}
          >
            {game}
            {shouldShowNote && <span className="chip-note">{exclusiveNote}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default GamePreferenceSelector;
