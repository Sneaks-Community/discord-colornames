export interface ColorRoleEntry {
  name: string;
  roleId: string;
}

export interface BotConfig {
  token: string;
  clientId: string;
  serverId: string;
  embedColor: number;
  logLevel: string;
  healthPort: number;
  version: string;
  colorRoles: ColorRoleEntry[];
  allowedRoles: string[];
  pinChannelId?: string;
  accessDeniedDescription: string;
}
