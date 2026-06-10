import { SetMetadata } from "@nestjs/common";
import { RolStaff } from "@prisma/client";

export const ROLES_KEY = "roles";
// Restringe un endpoint a ciertos roles. Ej: @Roles("ADMIN")
export const Roles = (...roles: RolStaff[]) => SetMetadata(ROLES_KEY, roles);
