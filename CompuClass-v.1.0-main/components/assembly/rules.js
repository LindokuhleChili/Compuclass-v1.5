import { ASSEMBLY_ORDER, PART_BY_ID } from './catalog';

export function partName(id) {
  return PART_BY_ID[id]?.name || 'part';
}

export function partTip(id) {
  return PART_BY_ID[id]?.tip || '';
}

export function nextPartId(installed) {
  return ASSEMBLY_ORDER[installed.length] || null;
}

// Keep a saved list only when it is a prefix of the real install order.
export function sanitizeInstalled(ids) {
  if (!Array.isArray(ids)) return [];
  const kept = [];
  for (const id of ASSEMBLY_ORDER) {
    if (!ids.includes(id)) break;
    kept.push(id);
  }
  return kept;
}

export function orderMessage(partId, installed) {
  const next = nextPartId(installed);
  if (!next || partId === next) return null;
  if (partId === 'cooler' && !installed.includes('cpu')) {
    return 'The cooler sits on the CPU. Drop the processor into the socket first — no force needed.';
  }
  if (partId !== 'motherboard' && !installed.includes('motherboard')) {
    return 'The motherboard is not seated yet. Screw it onto the standoffs before anything else.';
  }
  if (partId === 'ram' && !installed.includes('cpu')) {
    return 'Install the CPU before the RAM. The DIMM slots sit right beside the socket.';
  }
  const upcoming = PART_BY_ID[next];
  return `Not yet — install the ${upcoming.name} first. ${upcoming.tip}`;
}

// onTarget: the drop is near a slot. overCase: it landed in the chassis but not on a slot.
export function judgeDrop({ partId, installed, slotId, onTarget, overCase }) {
  if (!onTarget && !overCase) return { outcome: 'return' };
  const blocked = orderMessage(partId, installed);
  if (blocked) return { outcome: 'reject', text: blocked };
  if (!onTarget || slotId !== partId) {
    if (slotId && slotId !== partId) {
      return {
        outcome: 'reject',
        text: `That spot is for the ${partName(slotId)}. ${partTip(partId)}`,
      };
    }
    return {
      outcome: 'reject',
      text: `The ${partName(partId)} goes in the glowing spot. ${partTip(partId)}`,
    };
  }
  return { outcome: 'install', text: `Correct! ${partName(partId)} installed.` };
}
