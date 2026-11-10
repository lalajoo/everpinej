import { expect, it, vi } from 'vitest';
import { shareService } from './share';
it('uses the native sheet and never shares city data', async () => {
  const share=vi.fn().mockResolvedValue(undefined), copy=vi.fn();
  expect(await shareService('title','message',{secure:true,share,copy})).toBe('shared');
  expect(share).toHaveBeenCalledWith({title:'title',text:'message',url:'https://everpinej.com/phonecity/'}); expect(copy).not.toHaveBeenCalled();
});
it('falls back to copy, then to a selectable dialog without prompt()', async () => {
  const share=vi.fn().mockRejectedValue(new Error('blocked')),copy=vi.fn().mockResolvedValue(undefined);
  expect(await shareService('title','text',{secure:true,share,copy})).toBe('copied');
  copy.mockRejectedValue(new Error('blocked'));
  expect(await shareService('title','text',{secure:true,share,copy})).toBe('manual');
  expect(await shareService('title','text',{secure:false,share,copy})).toBe('manual');
});
it('treats cancelling the share sheet as cancellation',async () => {
  const error=new Error('cancel');error.name='AbortError'; const copy=vi.fn();
  expect(await shareService('title','text',{secure:true,share:async()=>{throw error},copy})).toBe('cancelled');expect(copy).not.toHaveBeenCalled();
});
