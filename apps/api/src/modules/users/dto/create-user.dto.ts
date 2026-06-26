import {
  IsString,
  IsEmail,
  IsOptional,
  IsIn,
  IsBoolean,
  MaxLength,
  MinLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(3)
  initials: string;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a valid hex color (#RRGGBB)' })
  color: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsIn(['admin', 'manager', 'member'])
  role?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(3)
  initials?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a valid hex color (#RRGGBB)' })
  color?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsIn(['admin', 'manager', 'member'])
  role?: string;
  // passwordHash intentionally excluded — use PATCH /:id/password
}

export class PermissionsDto {
  @IsBoolean() canViewAnalytics: boolean;
  @IsBoolean() canViewArchive: boolean;
  @IsBoolean() canViewTrash: boolean;
  @IsBoolean() canManagePortfolio: boolean;
  @IsBoolean() canCreateTasks: boolean;
  @IsBoolean() canDeleteTasks: boolean;
  @IsBoolean() canEditOthersTasks: boolean;
}

export class UpdateUserPermissionsDto {
  @ValidateNested()
  @Type(() => PermissionsDto)
  permissions: PermissionsDto;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class UpdateUserRoleDto {
  @IsIn(['admin', 'manager', 'member'])
  role: string;
}
