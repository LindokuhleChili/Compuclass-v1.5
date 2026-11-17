// Learning copy matches the step-by-step PC Assembly lesson.
// The cooler is the one extra step: it cannot go on before the CPU.

export const ASSEMBLY_PARTS = [
  {
    id: 'motherboard',
    name: 'Motherboard',
    tip: 'Screw the motherboard onto the standoffs on the back plate of the case.',
    fit: 2.32,
    position: [-0.9, 0.4, -0.9],
    guide: [2.3, 1.9, 0.08],
    axes: { longAxis: 'x', thinAxis: 'z' },
  },
  {
    id: 'cpu',
    name: 'CPU',
    tip: 'Line up the golden triangle and drop the CPU into the socket — no force needed.',
    fit: 0.42,
    position: [-0.4, 0.9, -0.56],
    guide: [0.5, 0.5, 0.08],
    axes: { longAxis: 'x', thinAxis: 'z' },
  },
  {
    id: 'cooler',
    name: 'CPU Cooler',
    tip: 'Seat the cooler on the CPU and tighten it evenly. The processor has to be in the socket first.',
    fit: 0.7,
    position: [-0.4, 0.9, -0.32],
    guide: [0.7, 0.7, 0.4],
    axes: { longAxis: 'x', thinAxis: 'z' },
  },
  {
    id: 'ram',
    name: 'RAM',
    tip: 'Push the RAM sticks into the DIMM slots beside the CPU until the clips click.',
    fit: 0.92,
    position: [0.24, 1.0, -0.54],
    guide: [0.58, 1.0, 0.14],
    axes: { longAxis: 'y', thinAxis: 'x' },
  },
  {
    id: 'gpu',
    name: 'Graphics Card',
    tip: 'Seat the graphics card in the long PCIe x16 slot and screw it to the rear bracket.',
    fit: 1.7,
    position: [0.05, -0.1, -0.2],
    guide: [1.75, 0.32, 0.58],
    axes: { longAxis: 'x', thinAxis: 'y' },
  },
  {
    id: 'storage',
    name: 'SSD',
    tip: 'Mount the SSD in the drive bay behind the motherboard tray.',
    fit: 0.64,
    position: [1.48, -0.38, -0.32],
    guide: [0.72, 0.46, 0.14],
    axes: { longAxis: 'x', thinAxis: 'z' },
  },
  {
    id: 'psu',
    name: 'Power Supply',
    tip: 'Slide the power supply into the bottom shroud, fan facing down.',
    fit: 1.28,
    position: [-0.78, -1.42, -0.02],
    guide: [1.35, 0.58, 0.95],
    axes: { longAxis: 'x', thinAxis: 'y' },
  },
];

export const ASSEMBLY_ORDER = ASSEMBLY_PARTS.map((part) => part.id);

export const PART_BY_ID = Object.fromEntries(ASSEMBLY_PARTS.map((part) => [part.id, part]));

// Parts with no usable model in the repo. Reported to the owner; the scene uses a simple mesh.
export const MODEL_GAPS = [
  {
    part: 'Case',
    note: 'No empty open-case model ships with the app. inside_a_pc and personal_computer are full scans, so the chassis is a simple open frame with a motherboard tray, standoffs, fans and a PSU shroud.',
  },
  {
    part: 'Graphics card',
    note: 'The RTX 3060 glTF is about 25MB and 290 meshes, too heavy for a mid-range phone. The card is a simple dual-fan mesh.',
  },
  {
    part: 'NVMe',
    note: 'There is no NVMe model. Storage uses the 2.5-inch SSD from computer_components, matching the existing SSD step.',
  },
];

export const GESTURE_LEGEND = [
  { gesture: 'Open palm, move', action: 'Rotate the case' },
  { gesture: 'Open palm, hold', action: 'Explode the build' },
  { gesture: 'Fist up or down', action: 'Zoom' },
  { gesture: 'Fist, hold', action: 'Assemble the build' },
  { gesture: 'Point', action: 'Select a part and open its info' },
  { gesture: 'Pinch', action: 'Grab a part and place it' },
  { gesture: 'Peace sign', action: 'Next part' },
  { gesture: 'Three fingers', action: 'Previous part' },
  { gesture: 'OK sign, hold', action: 'Reset the build' },
];
