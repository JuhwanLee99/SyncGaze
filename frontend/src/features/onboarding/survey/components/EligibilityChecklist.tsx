import { ChangeEvent } from 'react';

type EligibilityField = 'ageCheck' | 'webcamCheck';

interface EligibilityChecklistProps {
  values: Record<EligibilityField, boolean>;
  onToggle: (field: EligibilityField, checked: boolean) => void;
  labelOverrides?: Partial<Record<EligibilityField, string>>;
}

const defaultLabels: Record<EligibilityField, string> = {
  ageCheck: '만 18세 이상이며 연구 목적을 이해하고 자발적으로 참여합니다.',
  webcamCheck: '연구에 사용할 수 있는 작동하는 PC/노트북 웹캠이 있습니다.',
};

const EligibilityChecklist = ({ values, onToggle, labelOverrides }: EligibilityChecklistProps) => {
  const fields: EligibilityField[] = ['ageCheck', 'webcamCheck'];

  const handleChange = (field: EligibilityField) => (event: ChangeEvent<HTMLInputElement>) => {
    onToggle(field, event.target.checked);
  };

  return (
    <>
      {fields.map(field => (
        <label key={field} className="checkbox-row">
          <input type="checkbox" checked={values[field]} onChange={handleChange(field)} />
          {labelOverrides?.[field] ?? defaultLabels[field]}
        </label>
      ))}
    </>
  );
};

export default EligibilityChecklist;
