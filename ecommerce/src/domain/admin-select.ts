export interface SelectableOption {
  disabled?: boolean;
}

export function firstEnabledIndex(options: SelectableOption[]) {
  return options.findIndex((option) => !option.disabled);
}

export function lastEnabledIndex(options: SelectableOption[]) {
  for (let index = options.length - 1; index >= 0; index -= 1) {
    if (!options[index].disabled) return index;
  }
  return -1;
}

export function nextEnabledIndex(
  options: SelectableOption[],
  current: number,
  direction: 1 | -1,
) {
  if (!options.length) return -1;
  let candidate = current;
  for (let attempt = 0; attempt < options.length; attempt += 1) {
    candidate = (candidate + direction + options.length) % options.length;
    if (!options[candidate].disabled) return candidate;
  }
  return -1;
}
