import { ASSEMBLY_ORDER, PART_BY_ID } from '../catalog';
import { judgeDrop, orderMessage, sanitizeInstalled } from '../rules';

describe('assembly order', () => {
  it('keeps the existing lesson and seats the cooler only after the CPU', () => {
    expect(ASSEMBLY_ORDER).toEqual(['motherboard', 'cpu', 'cooler', 'ram', 'gpu', 'storage', 'psu']);
    expect(PART_BY_ID.cpu.tip).toBe('Line up the golden triangle and drop the CPU into the socket — no force needed.');
    expect(PART_BY_ID.motherboard.tip).toMatch(/standoffs/);
    expect(PART_BY_ID.ram.tip).toMatch(/DIMM/);
    expect(PART_BY_ID.gpu.tip).toMatch(/PCIe/);
    expect(PART_BY_ID.storage.tip).toMatch(/drive bay/);
    expect(PART_BY_ID.psu.tip).toMatch(/fan facing down/);
  });

  it('drops a saved list that skips a step', () => {
    expect(sanitizeInstalled(['motherboard', 'cpu', 'ram'])).toEqual(['motherboard', 'cpu']);
    expect(sanitizeInstalled(['cpu'])).toEqual([]);
    expect(sanitizeInstalled(null)).toEqual([]);
  });
});

describe('drop judgements', () => {
  const installed = ['motherboard'];

  it('installs the CPU in its own slot', () => {
    expect(judgeDrop({ partId: 'cpu', installed, slotId: 'cpu', onTarget: true, overCase: true }).outcome).toBe('install');
  });

  it('explains a cooler before the CPU', () => {
    const result = judgeDrop({ partId: 'cooler', installed, slotId: 'cooler', onTarget: true, overCase: true });
    expect(result.outcome).toBe('reject');
    expect(result.text).toMatch(/cooler sits on the CPU/i);
  });

  it('explains a part before the motherboard is seated', () => {
    expect(orderMessage('ram', [])).toMatch(/not seated/i);
  });

  it('names the slot you actually hit', () => {
    const result = judgeDrop({ partId: 'cpu', installed, slotId: 'ram', onTarget: true, overCase: true });
    expect(result.text).toMatch(/RAM/);
  });

  it('sends a drop back to the bench when it misses the case', () => {
    expect(judgeDrop({ partId: 'cpu', installed, slotId: null, onTarget: false, overCase: false }).outcome).toBe('return');
  });
});
