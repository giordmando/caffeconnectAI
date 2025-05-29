export interface IConfigSection<T> {
    config: T;
    onChange: (field: string, value: any) => void;
    onValidate?: () => string[];
    className?: string;
  }