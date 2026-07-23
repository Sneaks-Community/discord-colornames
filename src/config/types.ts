export interface ColorRoleEntry {
  name: string;
  roleId: string;
}

export interface BotConfig {
  token: string;
  clientId: string;
  serverId: string;
  embedColor: number;
  healthPort: number;
  colorRoles: ColorRoleEntry[];
  allowedRoles: string[];
  pinChannelId?: string;
  accessDeniedDescription: string;
}
