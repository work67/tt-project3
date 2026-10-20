import { useTrip } from '../lib/trip';

interface Props {
  value: number | null;
  onChange: (id: number | null) => void;
  /** Label for the empty option; omit to require a person. */
  emptyLabel?: string;
  ariaLabel?: string;
}

export default function PersonSelect({ value, onChange, emptyLabel, ariaLabel }: Props) {
  const { users, me } = useTrip();
  return (
    <select
      aria-label={ariaLabel}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
    >
      {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.id === me.id ? `${u.displayName} (me)` : u.displayName}
        </option>
      ))}
    </select>
  );
}
