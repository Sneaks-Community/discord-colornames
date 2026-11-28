import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

// Config is read at import time, so these must be set before the dynamic imports below.
process.env.DRY_RUN = 'true';
process.env.PIN_CHANNEL_ID = '600000000000000001';
const { default: colorCommand } = await import('../dist/commands/color.js');
const { config } = await import('../dist/config/index.js');
const { default: memberUpdate } = await import('../dist/events/guild-member-update.js');
const { default: readyEvent } = await import('../dist/events/ready.js');
const { reconcileColorRoles } = await import('../dist/utils/role-utilities.js');
const { colorIndex, fakeGuild, fakeInteraction, fakeMember, fakeRole, ids, lastReply } = await import(
  './fakes.js'
);

const { allowed, blue, red } = ids();
const guild = () => fakeGuild([allowed, blue, red].map((id) => fakeRole(id)));
const BOT = '100000000000000001';

function fakeClient(pins) {
  const channel = {
    guild: { members: { fetch: async () => ({ roles: { highest: { position: 1 } } }) } },
    isTextBased: () => true,
    isThread: () => false,
    messages: { edit: mock.fn(async () => {}), fetchPins: async () => ({ items: pins }) },
    name: 'colors',
    permissionsFor: () => null,
    send: mock.fn(async () => ({ id: '700000000000000002', pin: async () => {} })),
    type: 0,
  };
  const client = {
    channels: { fetch: async () => channel },
    user: { id: BOT, setPresence: () => {}, tag: 'bot' },
  };
  return { channel, client };
}

test('automatic removal changes nothing in dry run', async () => {
  const member = fakeMember(guild(), [red]);
  await memberUpdate.execute({ partial: true, roles: { cache: new Map() } }, member);
  assert.equal(member.roles.remove.mock.callCount(), 0);
});

test('reconcile counts the members it would change but changes none in dry run', async () => {
  const g = guild();
  const member = fakeMember(g, [blue]);
  assert.equal(await reconcileColorRoles(g), 1);
  assert.equal(member.roles.remove.mock.callCount(), 0);
});

test('/color says what it would do and changes nothing in dry run', async () => {
  const member = fakeMember(guild(), [allowed, red]);
  const interaction = fakeInteraction(member, colorIndex('blue'));
  await colorCommand.execute(interaction);
  assert.equal(lastReply(interaction).content, 'Dry run: would set your color to blue.');
  assert.equal(member.roles.remove.mock.callCount(), 0);
  assert.equal(member.roles.add.mock.callCount(), 0);
  assert.equal(member.roles.set.mock.callCount(), 0);
});

test('/color 0 says what it would do and changes nothing in dry run', async () => {
  const member = fakeMember(guild(), [allowed, red]);
  const interaction = fakeInteraction(member, 0);
  await colorCommand.execute(interaction);
  assert.equal(lastReply(interaction).content, 'Dry run: would remove all your color roles.');
  assert.equal(member.roles.remove.mock.callCount(), 0);
});

test('does not post a new color list in dry run', async () => {
  const { channel, client } = fakeClient([]);
  await readyEvent.execute(client);
  assert.equal(channel.send.mock.callCount(), 0);
});

test('does not edit the pinned color list in dry run', async () => {
  const pin = { message: { author: { id: BOT }, embeds: [{ title: config.colorListTitle }], id: '1' } };
  const { channel, client } = fakeClient([pin]);
  await readyEvent.execute(client);
  assert.equal(channel.messages.edit.mock.callCount(), 0);
});
