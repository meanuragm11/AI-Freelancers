type SettingsAlertProps = {
  message: string;
  type?: 'success' | 'error' | 'info';
};

export default function SettingsAlert({ message, type = 'info' }: SettingsAlertProps) {
  const styles =
    type === 'success'
      ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
      : type === 'error'
        ? 'border-rose-100 bg-rose-50 text-rose-700'
        : 'border-blue-100 bg-blue-50 text-blue-700';

  return (
    <div className={`mb-6 rounded-2xl border px-4 py-3 text-xs font-bold ${styles}`}>
      {message}
    </div>
  );
}
