import { createContainer } from '@orcher/workbench-di';
import { CommandService } from './command-service';

describe('CommandService', () => {
  it('keeps a handler registered before its contribution, and takes the contribution', async () => {
    const commands = new CommandService(createContainer());
    const ran: string[] = [];
    commands.registerHandler('explorer.refresh', () => void ran.push('refresh'), 'explorer');
    commands.registerContribution({ id: 'explorer.refresh', title: 'Refresh Explorer' }, 'explorer');

    expect(commands.getCommands().find((c) => c.id === 'explorer.refresh')?.title).toBe('Refresh Explorer');
    await commands.executeCommand('explorer.refresh');
    expect(ran).toEqual(['refresh']);
  });

  it('still refuses a second contribution for the same command', () => {
    const commands = new CommandService(createContainer());
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    commands.registerContribution({ id: 'a', title: 'First' }, 'p');
    commands.registerContribution({ id: 'a', title: 'Second' }, 'q');

    expect(commands.getCommands().find((c) => c.id === 'a')?.title).toBe('First');
    expect(warn).toHaveBeenCalledWith('Command already registered: a');
    warn.mockRestore();
  });
});
