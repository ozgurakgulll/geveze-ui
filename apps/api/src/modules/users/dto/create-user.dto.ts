import {
  IsString,
  IsEmail,
  IsOptional,
  IsIn,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

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
