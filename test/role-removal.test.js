import assert from 'node:assert/strict';
import { test } from 'node:test';
import memberUpdate from '../dist/events/guild-member-update.js';
import { reconcileColorRoles } from '../dist/utils/role-utilities.js';
import { fakeGuild, fakeMember, fakeRole, ids } from './fakes.js';

const { allowed, blue, red } = ids();
const guild = (roleIds = [allowed, blue, red]) => fakeGuild(roleIds.map((id) => fakeRole(id)));
const partialOld = { partial: true, roles: { cache: new Map() } };
const removedIds = (member) => member.roles.remove.mock.calls[0].arguments[0].map((role) => role.id);

test('removes color roles from a member without an allowed role, even with a partial oldMember', async () => {
  const member = fakeMember(guild(), [red]);
  await memberUpdate.execute(partialOld, member);
  assert.deepEqual(removedIds(member), [red]);
});

test('keeps color roles while the member has an allowed role', async () => {
  const member = fakeMember(guild(), [allowed, red]);
  await memberUpdate.execute(partialOld, member);
  assert.equal(member.roles.remove.mock.callCount(), 0);
});

test('makes no API call for a member without color roles', async () => {
  const member = fakeMember(guild(), []);
  await memberUpdate.execute(partialOld, member);
  assert.equal(member.roles.remove.mock.callCount(), 0);
});

test('leaves color roles alone when an allowed role is missing from the guild', async () => {
  const member = fakeMember(guild([blue, red]), [red]);
  await memberUpdate.execute(partialOld, member);
  assert.equal(member.roles.remove.mock.callCount(), 0);
});

test('reconcileColorRoles strips colors only from members without an allowed role', async () => {
  const g = guild();
  const keeper = fakeMember(g, [allowed, red], '500000000000000001');
  const loser = fakeMember(g, [blue], '500000000000000002');
  fakeMember(g, [], '500000000000000003');
  assert.equal(await reconcileColorRoles(g), 1);
  assert.equal(g.members.fetch.mock.callCount(), 1);
  assert.equal(keeper.roles.remove.mock.callCount(), 0);
  assert.deepEqual(removedIds(loser), [blue]);
});

test('reconcileColorRoles skips everything when an allowed role is missing from the guild', async () => {
  const g = guild([blue, red]);
  const member = fakeMember(g, [red]);
  assert.equal(await reconcileColorRoles(g), 0);
  assert.equal(g.members.fetch.mock.callCount(), 0);
  assert.equal(member.roles.remove.mock.callCount(), 0);
});
