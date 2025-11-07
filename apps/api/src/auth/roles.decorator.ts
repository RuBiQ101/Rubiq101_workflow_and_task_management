import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to specify required roles for a route
 * @param roles - Array of role keys (e.g., 'owner', 'admin', 'member')
 * @example @Roles('owner', 'admin')
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
