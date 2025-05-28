export interface IConfigPanel {
    onSave: (config: any) => void;
    onCancel: () => void;
    isDirty: boolean;
  }
  