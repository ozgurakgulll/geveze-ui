import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsObject,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import type {
  PortfolioStatus,
  SocialMediaAccount,
  BrandIdentity,
  CompanyContact,
  ContentCalendarItem,
  ActivityLogItem,
} from '@geveze/shared';

class MonthlyQuotasDto {
  @IsNumber() @Min(0) video: number;
  @IsNumber() @Min(0) post: number;
  @IsNumber() @Min(0) story: number;
  @IsOptional() @IsNumber() @Min(0) render3d?: number;
}

export class CreatePortfolioCompanyDto {
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsString()
  name: string;

  @IsEnum(['active', 'on-hold', 'left'])
  status: PortfolioStatus;

  @IsString()
  startDate: string;

  @IsOptional()
  @IsString()
  exitDate?: string;

  @IsArray()
  @IsString({ each: true })
  servicesTaken: string[];

  @ValidateNested()
  @Type(() => MonthlyQuotasDto)
  monthlyQuotas: MonthlyQuotasDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedTeamMemberIds?: string[];

  @IsOptional()
  @IsArray()
  socialMediaAccounts?: SocialMediaAccount[];

  @IsOptional()
  @IsObject()
  brandIdentity?: BrandIdentity;

  @IsOptional()
  @IsArray()
  contacts?: CompanyContact[];

  @IsOptional()
  @IsArray()
  monthlyContentCalendar?: ContentCalendarItem[];

  @IsOptional()
  @IsArray()
  activityLog?: ActivityLogItem[];
}

export class UpdatePortfolioCompanyDto extends PartialType(CreatePortfolioCompanyDto) {}
